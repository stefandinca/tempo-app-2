/**
 * The gate for every /api/platform/* route.
 *
 * These routes read and write EVERY clinic with the Admin SDK, which bypasses
 * Firestore rules entirely. The gate is therefore the only thing standing
 * between a request and all four clinics' records, and it checks two
 * independent things:
 *
 *   who    a verified ID token whose team_members doc in the CONTROL PLANE
 *          carries role Superadmin
 *   where  the request arrived on the platform host
 *
 * Neither alone is enough. Host-only would let any clinic's domain reach these
 * routes. Role-only would work, but the host check means a session stolen on a
 * clinic domain cannot be replayed against the platform.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireStaffRole } from "@/lib/serverAuth";
import { tenantIdFromRequest } from "@/lib/tenant";
import { clinicDatabaseId } from "@/lib/platform/labels";

export { clinicDatabaseId };

export interface PlatformCaller {
  uid: string;
  role: string;
  name: string;
}

export type PlatformAuthResult =
  | { ok: true; caller: PlatformCaller }
  | { ok: false; status: number; error: string };

/** True when this request arrived on the platform host rather than a clinic's. */
export function isPlatformHost(req: NextRequest): boolean {
  return tenantIdFromRequest(req) === "";
}

export async function requireSuperadmin(req: NextRequest): Promise<PlatformAuthResult> {
  // Cheapest check first, and it needs no I/O.
  if (!isPlatformHost(req)) {
    return { ok: false, status: 404, error: "not_found" };
  }
  // Undefined database => the control plane, which is where platform staff live.
  const staff = await requireStaffRole(req, ["superadmin"], undefined);
  if (!staff.ok) return staff;
  if (staff.caller.role !== "superadmin") {
    return { ok: false, status: 403, error: "not_superadmin" };
  }
  return { ok: true, caller: staff.caller };
}

/** The NextResponse for a failed gate. */
export function platformError(result: { status: number; error: string }): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
