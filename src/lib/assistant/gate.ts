// Server-side gate for AI routes: verify the Firebase ID token, require a staff
// role, require recorded consent, and enforce a per-user daily call cap.
// All reads use Admin (rule-bypass) so the route never needs the user's auth ctx.
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const STAFF_ROLES = new Set(["superadmin", "admin", "coordinator", "therapist"]);
const DAILY_LIMIT = 100;

// Bump when the consent copy materially changes; forces re-consent.
export const CONSENT_VERSION = "1";

export interface GateContext {
  uid: string;
  role: string;
  name: string;
}

export type GateResult =
  | { ok: true; ctx: GateContext }
  | { ok: false; status: number; error: string };

export async function requireStaffWithConsent(req: NextRequest): Promise<GateResult> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "missing_token" };

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return { ok: false, status: 401, error: "invalid_token" };
  }

  const db = adminDb();

  // Staff role (the role comes from the verified user, NOT the request body).
  const memberSnap = await db.collection("team_members").doc(uid).get();
  if (!memberSnap.exists) return { ok: false, status: 403, error: "not_staff" };
  const member = memberSnap.data() as { role?: string; name?: string };
  const role = String(member.role || "").toLowerCase();
  if (!STAFF_ROLES.has(role)) return { ok: false, status: 403, error: "not_staff" };

  // Consent.
  const consentSnap = await db.collection("user_consents").doc(uid).get();
  const consent = consentSnap.data() as { allowExternalAI?: boolean; version?: string } | undefined;
  if (!consent?.allowExternalAI || consent.version !== CONSENT_VERSION) {
    return { ok: false, status: 403, error: "consent_required" };
  }

  // Per-user daily rate limit (server-authoritative; client writes denied by rules).
  const usageRef = db.collection("user_ai_usage").doc(uid);
  const today = new Date().toISOString().slice(0, 10);
  const usageSnap = await usageRef.get();
  const usage = usageSnap.data() as { date?: string; count?: number } | undefined;
  const count = usage && usage.date === today ? usage.count || 0 : 0;
  if (count >= DAILY_LIMIT) return { ok: false, status: 429, error: "rate_limited" };
  await usageRef.set({ date: today, count: count + 1 }, { merge: true });

  return { ok: true, ctx: { uid, role, name: member.name || "" } };
}
