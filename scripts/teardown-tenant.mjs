#!/usr/bin/env node
/**
 * Remove a clinic created by self-onboarding. FOR TEST CLINICS.
 *
 *   node scripts/teardown-tenant.mjs --tenant=zzprovtest            # dry run
 *   node scripts/teardown-tenant.mjs --tenant=zzprovtest --yes
 *
 * WHY THIS EXISTS
 * Onboarding is now fully automated and the reverse is a person deleting a
 * database by hand at speed. That asymmetry is exactly how the wrong database
 * gets deleted, and it will be exercised repeatedly while the flow is being
 * tested.
 *
 * WHAT IT IS NOT
 * Not the offboarding process for a real clinic. That one has a cooling-off
 * period, an export, notices, and a Superadmin authorising it — see
 * docs/superpowers/specs/2026-08-22-tenant-offboarding-design.md. This deletes
 * immediately and asks nothing, which is only safe because it refuses to touch
 * a clinic with any client records in it.
 *
 * THREE GATES, ALL OF WHICH MUST PASS
 *   1. The label is not one of the four real clinics. Hardcoded, not derived.
 *   2. The clinic holds ZERO clients and ZERO session records.
 *   3. --yes was passed. A dry run is the default.
 *
 * WHAT IT CANNOT DO, AND SAYS SO
 * The Vercel project domain, the Firebase Auth user and the authorised-domain
 * entry need credentials this script does not have. It prints them rather than
 * pretending the teardown was complete.
 */
import { execSync } from "node:child_process";
import { Db } from "./demo-seed/firestore.mjs";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project || "tempo-app-2";
const TENANT = args.tenant;
const APPLY = !!args.yes;

/**
 * The clinics that must never be deleted by this script, named rather than
 * inferred. A rule like "refuse anything without a zz prefix" fails open the
 * day somebody names a real clinic badly; a list fails closed.
 */
const PROTECTED = ["livebetterlife", "aicaa", "diaconumaria", "demo"];

if (!TENANT) {
  console.error(`\n${C.red("✗ --tenant=<label> is required")}\n`);
  process.exit(1);
}
if (PROTECTED.includes(TENANT)) {
  console.error(`\n${C.red("✗ REFUSING.")} "${TENANT}" is a real clinic holding real client records.`);
  console.error(`  This script is for test clinics. Real ones go through the offboarding process.\n`);
  process.exit(1);
}

const token = () =>
  execSync("gcloud auth application-default print-access-token", { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();

async function api(url, method = "GET") {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${new URL(url).pathname}: ${res.status} ${text.slice(0, 160)}`);
  return text ? JSON.parse(text) : {};
}

const databaseId = `clinic-${TENANT}`;
const bucket = `${PROJECT}-${TENANT}`;

console.log(`\n${C.bold("Tenant teardown")}`);
console.log(`  project : ${PROJECT}`);
console.log(`  tenant  : ${C.bold(TENANT)}${APPLY ? "" : C.dim("  (DRY RUN)")}`);
console.log(`  database: ${databaseId}`);
console.log(`  bucket  : ${bucket}\n`);

const control = new Db(PROJECT, { allowAnyProject: true, database: "(default)" });

// --- gate 2: is it actually empty? ------------------------------------------

let clients = [];
let sessions = [];
let databaseExists = true;
try {
  const clinic = new Db(PROJECT, { allowAnyProject: true, database: databaseId });
  [clients, sessions] = await Promise.all([clinic.listAll("clients"), clinic.listAll("activities")]);
} catch (e) {
  if (/404|NOT_FOUND/.test(String(e.message))) {
    databaseExists = false;
    console.log(`  ${C.dim("database already gone")}`);
  } else {
    console.error(`\n${C.red("✗ could not read the clinic:")} ${e.message}\n`);
    process.exit(1);
  }
}

if (clients.length || sessions.length) {
  console.error(
    `\n${C.red("✗ REFUSING.")} This clinic holds ${clients.length} client(s) and ${sessions.length} activity record(s).`,
  );
  console.error(`  A label that ever held client records is never reissued, and these are somebody's`);
  console.error(`  clinical notes. Use the offboarding process, which exports before it deletes.\n`);
  process.exit(1);
}
if (databaseExists) console.log(`  ${C.green("✓")} clinic is empty (0 clients, 0 activities)`);

// --- what will go -----------------------------------------------------------

const tenant = (await control.listAll("tenants")).find((d) => d.__id === TENANT);
const memberMirrors = (await control.listAll("tenant_members")).filter((d) => d.__id.startsWith(`${bucket}__`));
const parentMirrors = (await control.listAll("tenant_parents")).filter((d) => d.__id.startsWith(`${bucket}__`));
const provisions = (await control.listAll("provisions")).filter((d) => d.label === TENANT);
const signups = (await control.listAll("signups")).filter((d) => d.label === TENANT);

console.log(`\n${C.bold("Would delete")}`);
console.log(`  ${databaseExists ? "database" : C.dim("database (already gone)")}`);
console.log(`  bucket`);
console.log(`  tenants/${TENANT}                 ${tenant ? "" : C.dim("(absent)")}`);
console.log(`  tenant_members mirrors            ${memberMirrors.length}`);
console.log(`  tenant_parents mirrors            ${parentMirrors.length}`);
console.log(`  provisions                        ${provisions.length}`);
console.log(`  signups                           ${signups.length}`);

if (!APPLY) {
  console.log(`\n  ${C.yellow("DRY RUN")} — pass --yes to delete.\n`);
  process.exit(0);
}

// --- delete -----------------------------------------------------------------

console.log(`\n${C.bold("Deleting")}`);

const writes = [
  ...(tenant ? [control.deleteWrite(`tenants/${TENANT}`)] : []),
  ...memberMirrors.map((d) => control.deleteWrite(`tenant_members/${d.__id}`)),
  ...parentMirrors.map((d) => control.deleteWrite(`tenant_parents/${d.__id}`)),
  ...provisions.map((d) => control.deleteWrite(`provisions/${d.__id}`)),
  ...signups.map((d) => control.deleteWrite(`signups/${d.__id}`)),
];
if (writes.length) {
  await control.commit(writes);
  console.log(`  ${C.green("✓")} ${writes.length} control-plane document(s)`);
}

try {
  await api(`https://storage.googleapis.com/storage/v1/b/${bucket}`, "DELETE");
  console.log(`  ${C.green("✓")} bucket deleted`);
} catch (e) {
  console.log(`  ${/404/.test(e.message) ? C.dim("· bucket already gone") : C.red("✗ bucket: " + e.message)}`);
}

if (databaseExists) {
  try {
    const db = await api(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${databaseId}`);
    await api(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${databaseId}?etag=${encodeURIComponent(db.etag)}`,
      "DELETE",
    );
    console.log(`  ${C.green("✓")} database deletion started`);
  } catch (e) {
    console.log(`  ${C.red("✗")} database: ${e.message}`);
  }
}

// --- what a human still has to do -------------------------------------------

console.log(`\n${C.bold("Still yours to remove")} ${C.dim("— this script has no credential for these")}`);
console.log(`  1. Vercel → tempo-app-2 → Settings → Domains → remove ${TENANT}.tempoapp.ro`);
console.log(`  2. Firebase Auth → delete the clinic's Admin user, if it was only ever for this test`);
console.log(`  3. Firebase Auth → Settings → Authorized domains → remove ${TENANT}.tempoapp.ro`);
console.log(
  `\n  ${C.dim(`None is harmful left behind: the subdomain resolves to a database that no longer`)}` +
    `\n  ${C.dim(`exists rather than to the control plane, and the Auth user has no membership.`)}\n`,
);
