#!/usr/bin/env node
/**
 * Deploys firestore.rules (and indexes) to EVERY database of a project.
 *
 * Rules are per-database and do not sync. With a database per clinic the failure
 * mode of forgetting one is silent — a clinic quietly missing a security fix —
 * so this exists to make "all of them" the easy path.
 *
 *   node scripts/deploy-rules.mjs --project=tempo-app-demo --dry-run
 *   node scripts/deploy-rules.mjs --project=tempo-app-demo
 *
 * Mechanism: `firebase deploy --only firestore:rules` has **no `--database`
 * flag** (verified on CLI 14.26 — "unknown option"). The supported route is the
 * multi-database form of firebase.json, where `firestore` is an array of
 * { database, rules, indexes } entries and one deploy covers them all.
 *
 * This rewrites firebase.json for the duration of the deploy and restores it in
 * a finally block. If the process is killed mid-run, restore it from
 * firebase.json.deploy-rules.bak.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG = path.join(ROOT, "firebase.json");
const BACKUP = path.join(ROOT, "firebase.json.deploy-rules.bak");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const PROJECT = args.project;
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project is required")}\n`);
  process.exit(1);
}
if (existsSync(BACKUP)) {
  console.error(`\n${C.red("✗ firebase.json.deploy-rules.bak exists")} — a previous run was interrupted.`);
  console.error(`  Restore firebase.json from it and delete the backup before retrying.\n`);
  process.exit(1);
}

const listed = execSync(`firebase firestore:databases:list --project ${PROJECT}`, { encoding: "utf8" })
  // The CLI colourises its table; an un-stripped escape ends up inside the
  // database name and silently corrupts the generated firebase.json.
  .replace(/\[[0-9;]*m/g, "");
const databases = [...listed.matchAll(/databases\/([^\s│]+)/g)].map((m) => m[1]);
if (!databases.length) {
  console.error(`\n${C.red("✗ no databases found")} — is the project id right?\n`);
  process.exit(1);
}

console.log(`\n${C.bold("Deploy rules")}`);
console.log(`  project   : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  databases : ${databases.length}`);
databases.forEach((d) => console.log(`      ${d}`));
console.log("");

const original = readFileSync(CONFIG, "utf8");
copyFileSync(CONFIG, BACKUP);

try {
  const config = JSON.parse(original);
  // Every database gets the same rules AND the same indexes — a tenant database
  // without the composite indexes would fail the calendar and billing queries.
  config.firestore = databases.map((database) => ({
    database,
    rules: "firestore.rules",
    indexes: "firestore.indexes.json",
  }));
  writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");

  const cmd = `firebase deploy --only firestore --project ${PROJECT}${DRY ? " --dry-run" : ""}`;
  const out = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
  if (DRY) {
    const compiled = /compiled successfully/.test(out);
    console.log(`  ${compiled ? C.green("✓") : C.red("✗")} rules compile; would deploy to ${databases.length} database(s)`);
    if (!compiled) process.exitCode = 1;
  } else {
    const released = (out.match(/released rules/g) || []).length;
    const ok = released === databases.length;
    console.log(`  ${ok ? C.green("✓") : C.red("✗")} rules released to ${released}/${databases.length} database(s)`);
    if (!ok) process.exitCode = 1;
  }
} catch (err) {
  console.error(`\n${C.red("✗ deploy failed")}`);
  console.error(String(err.stdout || err.message).split("\n").slice(-8).join("\n"));
  process.exitCode = 1;
} finally {
  writeFileSync(CONFIG, original);
  unlinkSync(BACKUP);
  console.log(`  ${C.dim("firebase.json restored")}\n`);
}
