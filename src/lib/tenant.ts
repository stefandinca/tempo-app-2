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
const RESERVED = new Set(["", "www", "admin", "app", "api", "localhost"]);

/**
 * `diaconumaria.tempoapp.ro` -> `clinic-diaconumaria`.
 * Anything unrecognised -> `(default)`, which is the control plane and, until
 * the migration completes, where every tenant's data still lives.
 */
export function resolveDatabaseId(hostname: string): string {
  if (!hostname) return DEFAULT_DATABASE_ID;

  const host = hostname.toLowerCase().split(":")[0];

  // Local development and Vercel preview deploys have no tenant subdomain.
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) {
    return DEFAULT_DATABASE_ID;
  }

  // A clinic host is <label>.tempoapp.ro — three labels. Fewer means the apex.
  const parts = host.split(".");
  if (parts.length < 3) return DEFAULT_DATABASE_ID;

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
