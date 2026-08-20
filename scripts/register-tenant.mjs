#!/usr/bin/env node
/**
 * Registers a tenant in the control plane — the (default) database of the
 * platform project.
 *
 *   node scripts/register-tenant.mjs --project=P --tenant=diaconumaria --name="Diaconu Maria" --dry-run
 *   node scripts/register-tenant.mjs --project=P --tenant=diaconumaria --name="Diaconu Maria" --yes
 *
 * Writes three things:
 *   tenants/{tenantId}        the registry entry (subdomain -> database -> bucket)
 *   tenant_members/{bucket}__{uid}   one per staff member of that tenant
 *   tenant_parents/{bucket}__{uid}   one per parent uid already linked to a client
 *
 * ...and adds the clinic's hostname to Firebase Auth's authorized domains,
 * because that list is project-wide and sign-in on an unlisted origin fails.
 *
 * The mirrors exist only because Storage rules cannot read a named Firestore
 * database — proven by runtime spike. They carry a tenant id, a bucket, and a
 * role or client list; never put clinical data in them.
 *
 * The document KEY is the load-bearing part: storage.rules looks up
 * `{bucket}__{uid}` directly, so a uid with no document for that bucket is not a
 * member of that clinic. Keying by uid alone would break anyone who works at two
 * clinics — a Superadmin works at all of them — because registering the second
 * would overwrite their membership in the first.
 *
 * Mirrors must exist BEFORE the new storage rules are deployed to a bucket, or
 * every upload and playback there denies.
 *
 * Re-runnable: it rewrites the registry entry and refreshes the mirror from the
 * tenant's current staff list.
 */
import { execSync } from "node:child_process";
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const TENANT = args.tenant;
const NAME = args.name;
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT || !TENANT || !NAME) {
  console.error(`\n${C.red("✗ --project, --tenant and --name are all required")}\n`);
  console.error(`  node scripts/register-tenant.mjs --project=tempo-app-2 --tenant=diaconumaria --name="Diaconu Maria" --dry-run\n`);
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(TENANT)) {
  console.error(`\n${C.red(`✗ "${TENANT}" is not a valid tenant label`)} — lowercase alphanumeric and hyphens, not starting or ending with one.\n`);
  console.error(`  It must match the subdomain, because src/lib/tenant.ts derives the database from it.\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run to preview).\n`);
  process.exit(1);
}

const databaseId = `clinic-${TENANT}`;
// Same convention as everything else: the hostname IS the tenant.
const host = args.host || `${TENANT}.tempoapp.ro`;
// Must match tenantBucket() in src/lib/tenant.ts, which derives the same name
// from the platform bucket at runtime. If these two ever disagree, the app
// writes to one bucket while the rules authorise another.
const bucket = args.bucket || `${PROJECT}-${TENANT}`;

/**
 * Put the clinic's hostname on Firebase Auth's authorized-domains list.
 *
 * That list is PROJECT-WIDE — it is not per database and not per tenant — so a
 * new clinic inherits nothing and has to be added. Miss it and email/password
 * sign-in still works, which is what makes this so easy to ship broken: only
 * the federated and redirect flows fail (`signInWithPopup` refuses to run on an
 * unlisted origin), and they fail in the console where nobody is looking. Two
 * of the first three clinics were live for months without it.
 *
 * Read-modify-write against one shared list, so this appends and never
 * replaces, and writes nothing at all when the host is already there — a
 * re-run of this script must not risk clobbering another clinic's entry.
 */
async function ensureAuthorizedDomain(project, hostname) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
  const token = execSync("gcloud auth application-default print-access-token", {
    stdio: ["ignore", "pipe", "pipe"],
  })
    .toString()
    .trim();
  // ADC is a user credential, and Identity Toolkit refuses one without a quota
  // project. The error it gives otherwise names neither the header nor this API.
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-goog-user-project": project,
  };

  const res = await fetch(url, { headers });
  const config = await res.json();
  if (!res.ok) {
    console.log(`  ${C.red("✗")} could not read the auth config: ${config?.error?.message || res.status}`);
    console.log(`  ${C.dim("Add " + hostname + " by hand: Firebase console -> Authentication -> Settings -> Authorized domains")}`);
    return false;
  }

  const domains = config.authorizedDomains || [];
  if (domains.includes(hostname)) {
    console.log(`  ${C.green("✓")} ${hostname} already an authorized domain`);
    return true;
  }
  if (DRY) {
    console.log(`  ${C.dim(`would add ${hostname} to ${domains.length} authorized domain(s)`)}`);
    return true;
  }

  const patch = await fetch(`${url}?updateMask=authorizedDomains`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ authorizedDomains: [...domains, hostname] }),
  });
  const body = await patch.json();
  if (!patch.ok) {
    console.log(`  ${C.red("✗")} could not add ${hostname}: ${body?.error?.message || patch.status}`);
    return false;
  }
  console.log(`  ${C.green("✓")} ${hostname} added to authorized domains (${(body.authorizedDomains || []).length} total)`);
  return true;
}

/** A handle on one named database of the same project. */
function databaseHandle(project, database) {
  // Pass `database` to the constructor — overriding `base` alone leaves writes
  // pointed at (default) while reads come from the named database.
  return new Db(project, { allowAnyProject: true, database });
}

const control = new Db(PROJECT, { allowAnyProject: true });
control.dryRun = DRY;

console.log(`\n${C.bold("Register tenant")}`);
console.log(`  project  : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  tenant   : ${TENANT}`);
console.log(`  database : ${databaseId}`);
console.log(`  bucket   : ${bucket}`);
console.log(`  host     : ${host}`);
console.log(`  name     : ${NAME}\n`);

// Staff and clients live in the tenant's own database. Before migration that
// database may not exist yet, which is not an error — the mirrors are simply
// empty until it does.
let staff = [];
let clients = [];
try {
  const tenantDb = databaseHandle(PROJECT, databaseId);
  staff = await tenantDb.listAll("team_members");
  clients = await tenantDb.listAll("clients");
} catch {
  console.log(`  ${C.dim(`no ${databaseId} database yet — registering with empty mirrors`)}`);
}

// Parents are anonymous users already linked to a client. The portal refreshes
// this itself on every login (api/parent/storage-access), but a parent who is
// signed in across the cutover never logs in again — backfilling here is what
// keeps their videos playing.
const parentClients = {};
for (const c of clients) {
  for (const uid of c.parentUids || []) {
    (parentClients[uid] ||= []).push(c.__id);
  }
}

await control.commit([
  control.setWrite(`tenants/${TENANT}`, {
    tenantId: TENANT,
    databaseId,
    bucket,
    name: NAME,
    status: "active",
    isDemo: TENANT === "demo",
    updatedAt: new Date().toISOString(),
  }),
  ...staff.map((s) =>
    control.setWrite(`tenant_members/${bucket}__${s.__id}`, {
      tenantId: TENANT,
      role: s.role || "",
    }),
  ),
  ...Object.entries(parentClients).map(([uid, clientIds]) =>
    control.setWrite(`tenant_parents/${bucket}__${uid}`, {
      tenantId: TENANT,
      clientIds,
      updatedAt: new Date().toISOString(),
    }),
  ),
]);

console.log(`  ${C.green("✓")} tenants/${TENANT}`);
console.log(`  ${C.green("✓")} ${staff.length} membership mirror(s)`);
staff.forEach((s) => console.log(`      ${String(s.name || s.__id).padEnd(22)} ${s.role || ""}`));
console.log(`  ${C.green("✓")} ${Object.keys(parentClients).length} parent mirror(s)`);

// Not part of the Firestore commit above: a different API, and a project-wide
// one. Done here anyway so onboarding cannot forget it — the failure is silent
// enough that it went unnoticed on two live clinics.
const authorized = await ensureAuthorizedDomain(PROJECT, host);

console.log(`\n  ${DRY ? "would write" : "wrote"} ${control.writes} document(s)\n`);
if (!authorized) {
  console.log(
    `  ${C.red("The tenant is registered, but " + host + " is NOT an authorized domain.")}\n` +
    `  ${C.dim("Sign-in with Google will fail there until it is. Re-run this, or add it in the console.")}\n`,
  );
  process.exitCode = 1;
}
