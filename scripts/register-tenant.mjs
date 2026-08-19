#!/usr/bin/env node
/**
 * Registers a tenant in the control plane — the (default) database of the
 * platform project.
 *
 *   node scripts/register-tenant.mjs --project=P --tenant=diaconumaria --name="Diaconu Maria" --dry-run
 *   node scripts/register-tenant.mjs --project=P --tenant=diaconumaria --name="Diaconu Maria" --yes
 *
 * Writes two things:
 *   tenants/{tenantId}        the registry entry (subdomain -> database)
 *   tenant_members/{uid}      one per staff member of that tenant
 *
 * The membership mirror exists only because Storage rules cannot read a named
 * Firestore database — proven by runtime spike. It carries a tenant id and a
 * role and nothing else; never put clinical data in it.
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

/** A handle on one named database of the same project. */
function databaseHandle(project, database) {
  const handle = new Db(project, { allowAnyProject: true });
  handle.base = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents`;
  return handle;
}

const control = new Db(PROJECT, { allowAnyProject: true });
control.dryRun = DRY;

console.log(`\n${C.bold("Register tenant")}`);
console.log(`  project  : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  tenant   : ${TENANT}`);
console.log(`  database : ${databaseId}`);
console.log(`  name     : ${NAME}\n`);

// Staff live in the tenant's own database. Before migration that database may
// not exist yet, which is not an error — the mirror is simply empty until it does.
let staff = [];
try {
  staff = await databaseHandle(PROJECT, databaseId).listAll("team_members");
} catch {
  console.log(`  ${C.dim(`no ${databaseId} database yet — registering with an empty membership mirror`)}`);
}

await control.commit([
  control.setWrite(`tenants/${TENANT}`, {
    tenantId: TENANT,
    databaseId,
    name: NAME,
    status: "active",
    isDemo: TENANT === "demo",
    updatedAt: new Date().toISOString(),
  }),
  ...staff.map((s) =>
    control.setWrite(`tenant_members/${s.__id}`, {
      tenantId: TENANT,
      role: s.role || "",
    }),
  ),
]);

console.log(`  ${C.green("✓")} tenants/${TENANT}`);
console.log(`  ${C.green("✓")} ${staff.length} membership mirror(s)`);
staff.forEach((s) => console.log(`      ${String(s.name || s.__id).padEnd(22)} ${s.role || ""}`));
console.log(`\n  ${DRY ? "would write" : "wrote"} ${control.writes} document(s)\n`);
