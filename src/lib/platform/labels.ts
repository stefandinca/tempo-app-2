/**
 * Pure clinic-label logic, with NO imports.
 *
 * Same reason `src/lib/tenant.ts` has none: `scripts/test-platform.mjs` loads
 * this file directly with plain Node (`--experimental-strip-types`, no
 * bundler), which cannot resolve the `@/*` tsconfig path alias or a bare
 * `next/server` specifier. A dependency-free module sidesteps that entirely
 * instead of asking the test runner to understand the app's resolution rules.
 * `src/lib/platform/gate.ts` — which DOES need `next/server` and `@/lib/*` —
 * imports `clinicDatabaseId` from here rather than defining it itself. Do not
 * fold this back into `gate.ts`; that would reintroduce the load failure.
 */

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
