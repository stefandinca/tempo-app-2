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
// Must match tenantBucket() in src/lib/tenant.ts, which derives the same name
// from the platform bucket at runtime. If these two ever disagree, the app
// writes to one bucket while the rules authorise another.
const bucket = args.bucket || `${PROJECT}-${TENANT}`;

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
console.log(`\n  ${DRY ? "would write" : "wrote"} ${control.writes} document(s)\n`);
