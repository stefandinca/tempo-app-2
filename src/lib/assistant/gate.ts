// Server-side gate for AI routes: verify the Firebase ID token, require a staff
// role, require recorded consent, and enforce a per-user daily call cap.
// All reads use Admin (rule-bypass) so the route never needs the user's auth ctx.
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { limitsFor } from "@/lib/platform/licence";

const STAFF_ROLES = new Set(["superadmin", "admin", "coordinator", "therapist"]);
const DAILY_LIMIT = 100;

// Bump when the consent copy materially changes; forces re-consent.
// v2: assistant may now send IDENTIFIABLE client data (names, contact, billing)
// when staff ask about a specific child — a material change from v1.
export const CONSENT_VERSION = "2";

export interface GateContext {
  uid: string;
  role: string;
  name: string;
}

export type GateResult =
  | { ok: true; ctx: GateContext }
  | { ok: false; status: number; error: string };

export async function requireStaffWithConsent(req: NextRequest, databaseId?: string): Promise<GateResult> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "missing_token" };

  // Verify the ID token. Distinguish a genuinely bad token (401) from the Admin
  // SDK failing to initialize because the service-account env var is missing or
  // malformed (500) — otherwise a config problem masquerades as an auth problem.
  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/FIREBASE_SERVICE_ACCOUNT|service.?account|credential|private_key|initializeApp/i.test(msg)) {
      console.error("[assistant/gate] Admin init failed:", msg);
      return { ok: false, status: 500, error: "server_misconfigured" };
    }
    return { ok: false, status: 401, error: "invalid_token" };
  }

  // Firestore reads/writes need a valid OAuth token minted from the private key.
  // A malformed key passes verifyIdToken (public-cert check) but fails here — so
  // wrap it and report a config error instead of crashing with a generic 500.
  try {
    const db = adminDb(databaseId);

    // Staff role (the role comes from the verified user, NOT the request body).
    const memberSnap = await db.collection("team_members").doc(uid).get();
    if (!memberSnap.exists) return { ok: false, status: 403, error: "not_staff" };
    const member = memberSnap.data() as { role?: string; name?: string; isActive?: boolean };
    const role = String(member.role || "").toLowerCase();
    if (!STAFF_ROLES.has(role)) return { ok: false, status: 403, error: "not_staff" };

    // Deactivating a member has to revoke Mira too, not just Firestore. This
    // path sends client data to Anthropic, so it is the last one that should
    // outlive an offboarding. Superadmin is exempt for the same reason as in
    // serverAuth.ts: a live clinic carries a platform account with
    // isActive: false. Missing means active — most members predate the field.
    if (role !== "superadmin" && member.isActive === false) {
      return { ok: false, status: 403, error: "deactivated" };
    }

    // Does this clinic's plan include Mira at all?
    //
    // Checked BEFORE consent, deliberately: asking somebody to agree to their
    // clients' data being sent to Anthropic, and then refusing them the feature,
    // is both rude and a consent record we have no business holding.
    //
    // The tier comes from the licence mirror in the clinic's own database, so
    // this needs no control-plane read. A clinic with no mirror, or an
    // unrecognised tier, is ALLOWED — limitsFor() falls back to the most
    // permissive tier, matching the licence itself failing open. Switching off
    // a paying clinic's assistant because we could not read a document is the
    // worse error.
    const licenceSnap = await db.collection("system_settings").doc("licence").get();
    const tier = licenceSnap.exists ? licenceSnap.data()?.tier : undefined;
    if (!limitsFor(tier).miraEnabled) {
      return { ok: false, status: 403, error: "not_in_plan" };
    }

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
  } catch (e: any) {
    console.error("[assistant/gate] Firestore access failed:", String(e?.message || e));
    return { ok: false, status: 500, error: "server_misconfigured" };
  }
}
