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
import { NextResponse, type NextRequest } from "next/server.js";

/**
 * `requireStaffRole` and `tenantIdFromRequest` are imported dynamically (below,
 * inside the functions that call them) rather than at module scope.
 *
 * `scripts/test-platform.mjs` loads this file directly with plain Node — no
 * bundler — to exercise `clinicDatabaseId` without standing up a server. Plain
 * Node has no idea what `@/*` means (that mapping is `tsconfig.json`'s `paths`,
 * resolved by Next's bundler and by `tsc`, never by Node's own resolver), so a
 * static `import ... from "@/lib/serverAuth"` throws the moment this module
 * loads — before any test even runs. Deferring the import into the functions
 * that need it means the plain-Node test path, which only calls
 * `clinicDatabaseId`, never reaches the `@/*` specifier at all. Inside the real
 * app, Next's bundler resolves a literal-string dynamic `import()` exactly like
 * a static one, so production behaviour is unchanged.
 */

export interface PlatformCaller {
  uid: string;
  role: string;
  name: string;
}

export type PlatformAuthResult =
  | { ok: true; caller: PlatformCaller }
  | { ok: false; status: number; error: string };

/**
 * `"aicaa"` -> `"clinic-aicaa"`. Anything that is not a well-formed clinic
 * label -> `null`.
 *
 * The same pattern `src/lib/tenant.ts` applies to hostnames. This exists
 * because the clinic arrives as a URL path segment: an unvalidated label
 * reaching `adminDb()` is how a typo, or a caller, reads the wrong database.
 *
 * It PREFIXES rather than sanitises — `clinic-aicaa` in gives
 * `clinic-clinic-aicaa` out, which resolves to nothing. Do not make it
 * idempotent: that would let a caller name `(default)`, or any other database,
 * directly.
 */
export function clinicDatabaseId(label: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(label)) return null;
  return `clinic-${label}`;
}

/**
 * True when this request arrived on the platform host rather than a clinic's.
 *
 * Async only because of the deferred-import note above — the check itself is
 * still pure and does no I/O.
 */
export async function isPlatformHost(req: NextRequest): Promise<boolean> {
  const { tenantIdFromRequest } = await import("@/lib/tenant");
  return tenantIdFromRequest(req) === "";
}

export async function requireSuperadmin(req: NextRequest): Promise<PlatformAuthResult> {
  // Cheapest check first, and it needs no I/O.
  if (!(await isPlatformHost(req))) {
    return { ok: false, status: 404, error: "not_found" };
  }
  const { requireStaffRole } = await import("@/lib/serverAuth");
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
