/**
 * Which Firestore database a hostname belongs to.
 *
 * Derived by convention rather than looked up, so it resolves synchronously with
 * no I/O: `src/lib/firebase.ts` needs the answer at module-initialisation time,
 * and 68 files import the `db` singleton it creates. An async lookup would mean
 * refactoring every one of them.
 *
 * Reading the `Host` header in the root layout would also work, but `headers()`
 * opts the entire app out of static rendering — a heavy price for one string.
 * Under a single Firebase project the only value that varies per tenant IS the
 * database id, and the hostname already encodes it.
 */

export const DEFAULT_DATABASE_ID = "(default)";

/** Hosts that are the platform itself rather than a clinic. */
const RESERVED = new Set(["", "www", "admin", "app", "api", "localhost", "superadmin"]);

/**
 * Strips a trailing `:port` from a `Host` header value.
 *
 * `host.split(":")[0]` is wrong for an IPv6 literal: `Host` brackets those
 * (`[::1]:3000`, RFC 3986 §3.2.2) specifically because the address itself
 * contains colons, and naively splitting on the first one truncates it to
 * `[`. No bracketed literal resolves to a tenant here regardless, but the
 * parsing should be correct on its own terms rather than merely harmless by
 * accident — this same helper lives in `src/lib/platform/labels.ts`,
 * duplicated rather than imported because both files are deliberately
 * dependency-free (see that file's header comment).
 */
function stripPort(host: string): string {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end === -1 ? host : host.slice(1, end);
  }
  const colon = host.indexOf(":");
  return colon === -1 ? host : host.slice(0, colon);
}

/**
 * `diaconumaria.tempoapp.ro` -> `clinic-diaconumaria`.
 * Anything unrecognised -> `(default)`, which is the control plane and, until
 * the migration completes, where every tenant's data still lives.
 */
export function resolveDatabaseId(hostname: string): string {
  if (!hostname) return DEFAULT_DATABASE_ID;

  const host = stripPort(hostname.toLowerCase());

  // Local development and Vercel preview deploys have no tenant subdomain.
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) {
    return DEFAULT_DATABASE_ID;
  }

  // A clinic host is EXACTLY <label>.tempoapp.ro.
  //
  // Counting labels is not enough. `parts.length >= 3` accepted any domain
  // whose FIRST label happened to match a clinic, so both
  // `diaconumaria.tempoapp.ro.evil.com` and `diaconumaria.anything.com`
  // resolved to clinic-diaconumaria. Vercel only routes hosts configured on
  // the project, so this was not reachable in production — but this function
  // picks the database, the storage bucket AND the per-clinic API key, and a
  // boundary that load-bearing should not depend on a routing layer to hold.
  const parts = host.split(".");
  if (parts.length !== 3 || parts[1] !== "tempoapp" || parts[2] !== "ro") {
    return DEFAULT_DATABASE_ID;
  }

  const label = parts[0];
  if (RESERVED.has(label)) return DEFAULT_DATABASE_ID;

  // Firestore database ids are lowercase alphanumeric with hyphens, and cannot
  // start or end with one. Anything else is not a tenant we recognise.
  if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(label)) return DEFAULT_DATABASE_ID;

  return `clinic-${label}`;
}

/** Resolve a tenant's database from an incoming request's Host header. */
export function tenantDatabaseFromRequest(req: {
  headers: { get(name: string): string | null };
}): string {
  return resolveDatabaseId(req.headers.get("host") || "");
}

/**
 * Which Cloud Storage bucket a tenant's media lives in.
 *
 * One bucket per clinic, because Storage rules can only read the `(default)`
 * Firestore database — proven by runtime spike — so the bucket name itself has
 * to carry the tenant identity. The rule then reduces to one equality check
 * against the `{bucket}` wildcard, and object paths stay exactly as they are.
 *
 * `platformBucket` is the project's own default bucket, used by the apex host
 * and by local development. It is also the source of the naming prefix, so the
 * derived names are unique across Cloud Storage without another config value.
 */
export function resolveStorageBucket(hostname: string, platformBucket: string): string {
  const databaseId = resolveDatabaseId(hostname);
  if (databaseId === DEFAULT_DATABASE_ID) return platformBucket;
  return tenantBucket(databaseId.slice("clinic-".length), platformBucket);
}

/**
 * `("diaconumaria", "tempo-app-2.firebasestorage.app")` -> `tempo-app-2-diaconumaria`.
 *
 * Bucket names are globally unique across all of Cloud Storage, so the project
 * id has to be part of it. Kept separate from `resolveStorageBucket` because the
 * provisioning scripts know the tenant label but have no hostname to resolve.
 */
export function tenantBucket(label: string, platformBucket: string): string {
  return `${platformBucket.split(".")[0]}-${label}`;
}

/**
 * `diaconumaria.tempoapp.ro` -> `diaconumaria`. The platform itself -> `""`.
 *
 * The tenant label, as opposed to its database or bucket. Used where something
 * is configured per clinic but shares one deployment — a Mira API key, say.
 */
export function tenantIdFromHostname(hostname: string): string {
  const databaseId = resolveDatabaseId(hostname);
  return databaseId === DEFAULT_DATABASE_ID ? "" : databaseId.slice("clinic-".length);
}

/** Resolve a tenant label from an incoming request's Host header. */
export function tenantIdFromRequest(req: {
  headers: { get(name: string): string | null };
}): string {
  return tenantIdFromHostname(req.headers.get("host") || "");
}

/**
 * The suffix identifying a tenant's own environment variable, e.g.
 * `ANTHROPIC_API_KEY_DIACONUMARIA`.
 *
 * One Vercel project now serves every clinic, so anything that must differ per
 * clinic cannot simply be `ANTHROPIC_API_KEY`. Suffixing the name keeps each
 * clinic's secret separate and still inside the secret store.
 */
export function tenantEnvSuffix(tenantId: string): string {
  return tenantId.toUpperCase().replace(/-/g, "_");
}

/** The demo clinic, which hides billing and answers Mira from a canned script. */
export function isDemoHost(hostname: string): boolean {
  return tenantIdFromHostname(hostname) === "demo";
}
