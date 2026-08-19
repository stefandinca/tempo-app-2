/**
 * Server-side caller verification for API routes.
 *
 * The rule this exists to enforce: **a caller's role must come from a verified
 * ID token, never from the request body.** The SmartBill route previously read
 * `userRole` straight out of the JSON payload, so any unauthenticated client
 * could send `{"userRole":"Admin"}` and pass the check.
 *
 * `src/lib/assistant/gate.ts` does the same verification plus AI-specific
 * consent and rate-limit steps. It is left separate deliberately — the AI gate
 * has extra failure modes and its own tests; this is the minimal shared piece.
 */
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export interface StaffCaller {
  uid: string;
  role: string;
  name: string;
}

export type StaffAuthResult =
  | { ok: true; caller: StaffCaller }
  | { ok: false; status: number; error: string };

/**
 * Verifies the Bearer token and checks the caller's role against `allowedRoles`
 * (compared lower-case). Superadmin always passes.
 *
 * Distinguishes a bad token (401) from the Admin SDK failing to initialise
 * (500) — otherwise a missing service account looks like an auth failure and
 * sends everyone hunting in the wrong place.
 */
export async function requireStaffRole(
  req: NextRequest,
  allowedRoles: string[],
  databaseId?: string,
): Promise<StaffAuthResult> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "missing_token" };

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/FIREBASE_SERVICE_ACCOUNT|service.?account|credential|private_key|initializeApp/i.test(msg)) {
      console.error("[serverAuth] Admin init failed:", msg);
      return { ok: false, status: 500, error: "server_misconfigured" };
    }
    return { ok: false, status: 401, error: "invalid_token" };
  }

  try {
    const snap = await adminDb(databaseId).collection("team_members").doc(uid).get();
    if (!snap.exists) return { ok: false, status: 403, error: "not_staff" };
    const member = snap.data() as { role?: string; name?: string };
    const role = String(member.role || "").toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (role !== "superadmin" && !allowed.includes(role)) {
      return { ok: false, status: 403, error: "insufficient_role" };
    }
    return { ok: true, caller: { uid, role, name: member.name || "" } };
  } catch (e: any) {
    console.error("[serverAuth] Firestore access failed:", String(e?.message || e));
    return { ok: false, status: 500, error: "server_misconfigured" };
  }
}
