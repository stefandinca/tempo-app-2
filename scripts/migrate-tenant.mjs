#!/usr/bin/env node
/**
 * Copies a clinic's Firestore data from one database to another — across
 * projects or within one.
 *
 *   node scripts/migrate-tenant.mjs --from-project=A --to-project=B \
 *        --to-database=clinic-x --dry-run
 *   node scripts/migrate-tenant.mjs ... --yes
 *   node scripts/migrate-tenant.mjs ... --verify    # counts both sides, writes nothing
 *
 * Idempotent: documents keep their ids, so re-running overwrites rather than
 * duplicating. It NEVER deletes anything, at either end — the source stays
 * intact until it is decommissioned deliberately.
 *
 * Control-plane collections (tenants, tenant_members, tenant_parents) are
 * deliberately absent from the copy: they belong to (default) and are written by
 * register-tenant.mjs, not owned by a clinic.
 */
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const FROM_P = args["from-project"];
const FROM_D = args["from-database"] || "(default)";
const TO_P = args["to-project"];
const TO_D = args["to-database"];
const DRY = !!args["dry-run"];
const VERIFY = !!args.verify;

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!FROM_P || !TO_P || !TO_D) {
  console.error(`\n${C.red("✗ --from-project, --to-project and --to-database are required")}\n`);
  process.exit(1);
}
if (FROM_P === TO_P && FROM_D === TO_D) {
  console.error(`\n${C.red("✗ source and destination are the same database")}\n`);
  process.exit(1);
}
if (!DRY && !VERIFY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run / --verify)\n`);
  process.exit(1);
}

/** Everything a clinic owns. */
const TOP_LEVEL = [
  "clients", "team_members", "team_public", "events", "services", "programs",
  "invoices", "payouts", "expenses", "recurring_expenses", "activities",
  "threads", "notifications", "fcm_tokens", "system_settings", "client_codes",
  "user_consents", "user_ai_usage", "ai_conversations", "ai_usage_events",
  "evaluation_protocols", "potential_clients",
];
const CLIENT_SUBS = [
  "evaluations", "vbmapp_evaluations", "portage_evaluations", "cars_evaluations",
  "carolina_evaluations", "interventionPlans", "homework", "documents", "videos",
  "voiceFeedback", "reports",
];

const src = new Db(FROM_P, { allowAnyProject: true, database: FROM_D });
const dst = new Db(TO_P, { allowAnyProject: true, database: TO_D });
dst.dryRun = DRY || VERIFY;

const strip = (d) => {
  const { __id, __name, ...rest } = d;
  return rest;
};

/** Copy one collection; returns the source docs so subcollections can be walked. */
async function copyCollection(path) {
  const docs = await src.listAll(path).catch(() => []);
  if (docs.length && !VERIFY) {
    await dst.commit(docs.map((d) => dst.setWrite(`${path}/${d.__id}`, strip(d))));
  }
  return docs;
}

console.log(`\n${C.bold("Migrate tenant data")}`);
console.log(`  from : ${FROM_P} / ${FROM_D}`);
console.log(`  to   : ${TO_P} / ${TO_D}`);
console.log(`  mode : ${VERIFY ? C.yellow("VERIFY (no writes)") : DRY ? C.yellow("DRY RUN") : C.green("APPLY")}\n`);

const report = [];
let total = 0;
const parents = {};

for (const coll of TOP_LEVEL) {
  const docs = await copyCollection(coll);
  if (docs.length) {
    report.push([coll, docs.length]);
    total += docs.length;
    console.log(`  ${String(docs.length).padStart(7)}  ${coll}`);
  }
  if (coll === "clients" || coll === "threads" || coll === "ai_conversations") parents[coll] = docs;
}

let subTotal = 0;
for (const c of parents.clients || []) {
  for (const s of CLIENT_SUBS) subTotal += (await copyCollection(`clients/${c.__id}/${s}`)).length;
}
for (const t of parents.threads || []) {
  subTotal += (await copyCollection(`threads/${t.__id}/messages`)).length;
}
for (const v of parents.ai_conversations || []) {
  subTotal += (await copyCollection(`ai_conversations/${v.__id}/messages`)).length;
}
if (subTotal) console.log(`  ${String(subTotal).padStart(7)}  ${C.dim("(subcollections)")}`);

const verb = VERIFY ? "found at source" : DRY ? "would be copied" : "copied";
console.log(`\n  ${C.green(String(total + subTotal))} document(s) ${verb}\n`);

// A machine-readable line, so two runs can be diffed for verification.
console.log(C.dim(`  COUNTS ${JSON.stringify(Object.fromEntries([...report, ["__subcollections", subTotal]]))}\n`));
