/**
 * Pure platform-identity logic, with NO imports.
 *
 * Same reason `src/lib/tenant.ts` has none: `scripts/test-platform.mjs` loads
 * this file directly with plain Node (`--experimental-strip-types`, no
 * bundler), which cannot resolve the `@/*` tsconfig path alias or a bare
 * `next/server` specifier. A dependency-free module sidesteps that entirely
 * instead of asking the test runner to understand the app's resolution rules.
 * `src/lib/platform/gate.ts` — which DOES need `next/server` and `@/lib/*` —
 * imports `clinicDatabaseId` and `isPlatformHost` from here rather than
 * defining them itself. Do not fold this back into `gate.ts`; that would
 * reintroduce the load failure.
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

/**
 * Hosts that ARE the platform. Deliberately an allowlist, not a negation.
 *
 * `tenant.ts`'s `resolveDatabaseId` fails OPEN for any hostname it does not
 * recognise as a clinic — it resolves to `(default)`, which is correct for
 * the app (an unknown host should not 500). But that means "not a clinic"
 * is not the same question as "is the platform": it also covers
 * `localhost`, every `*.vercel.app` preview deployment, a bare IP, and any
 * domain on the internet that happens to hit this deployment with the wrong
 * `Host` header. A gate this security-sensitive has to state a positive fact
 * about the request, not the absence of a negative one — so this is an
 * explicit list of the one hostname the console is actually reached at (plus
 * local development), not "everything `tenant.ts` didn't claim".
 *
 * Vercel preview URLs are deliberately NOT included: the console lives at its
 * own hostname, and a preview deployment is not the console. Widening this
 * should be a considered decision, not a side effect of reusing `tenant.ts`'s
 * fallback.
 *
 * The loopback entries exist for `npm run dev` and are DEVELOPMENT ONLY. In a
 * production build they are not in the set at all, because `Host` is supplied
 * by the caller: sending `Host: localhost` to the deployed console costs
 * nothing, and accepting it would hand back exactly the property the host
 * check is here for — that a session stolen on a clinic domain cannot be
 * replayed against the platform. Phase 2 turns these routes into writers,
 * which raises the stakes rather than lowering them. `next dev` and the test
 * runner both leave NODE_ENV at something other than "production", so local
 * work is unaffected; `npm start` against a production build is not, and that
 * is the intended trade.
 */
const PLATFORM_HOSTS = new Set([
  "superadmin.tempoapp.ro",
  ...(process.env.NODE_ENV !== "production" ? ["localhost", "127.0.0.1"] : []),
]);

/**
 * True when this request arrived on the platform host rather than a
 * clinic's — or anywhere else. `Host` is case-insensitive and may carry a
 * port, so both are normalised before comparing. A MISSING `Host` header is
 * refused, not accepted: it is the worst case, not a neutral one.
 */
export function isPlatformHost(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  return PLATFORM_HOSTS.has(host);
}
