#!/usr/bin/env node
/**
 * Deletes notifications older than a retention window.
 *
 *   node scripts/prune-notifications.mjs --project=P --database=D --days=30 --dry-run
 *   node scripts/prune-notifications.mjs ... --yes
 *
 * Notifications are the single largest collection by a wide margin — 28,268 of
 * Live Better Life's 37,724 documents, 75% of everything — and they are the
 * least valuable per byte: a delivered "session complete" from months ago is
 * read, acted on, and never looked at again. Trimming them makes every future
 * migration and freeze window dramatically shorter.
 *
 * This DELETES, so unlike the migration tools it always writes a backup first:
 * every document it is about to remove is saved as JSON under `notification-
 * backups/` before anything is committed. A run that cannot write its backup
 * does not delete.
 *
 * A document with no parseable `createdAt` is KEPT, never deleted. Age is the
 * only thing being judged here, so anything whose age cannot be established is
 * out of scope by definition.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Db, writeBackup } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const DATABASE = args.database || "(default)";
const DAYS = Number(args.days || 30);
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project is required")}\n`);
  process.exit(1);
}
if (!Number.isFinite(DAYS) || DAYS < 1) {
  console.error(`\n${C.red(`✗ --days must be a positive number, got "${args.days}"`)}\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to delete without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;
const cutoffIso = new Date(cutoff).toISOString();

const db = new Db(PROJECT, { allowAnyProject: true, database: DATABASE });
db.dryRun = DRY;

console.log(`\n${C.bold("Prune notifications")}`);
console.log(`  target   : ${PROJECT} / ${DATABASE}`);
console.log(`  keep     : the last ${DAYS} days ${C.dim(`(created on or after ${cutoffIso.slice(0, 10)})`)}`);
console.log(`  mode     : ${DRY ? C.yellow("DRY RUN") : C.red("DELETE")}\n`);

const all = await db.listAll("notifications").catch(() => []);
if (!all.length) {
  console.log(`  ${C.dim("no notifications here")}\n`);
  process.exit(0);
}

const age = (d) => {
  const t = Date.parse(d.createdAt);
  return Number.isNaN(t) ? null : t;
};

const undated = all.filter((d) => age(d) === null);
const old = all.filter((d) => {
  const t = age(d);
  return t !== null && t < cutoff;
});
const kept = all.length - old.length;

console.log(`  ${String(all.length).padStart(7)}  total`);
console.log(`  ${String(kept).padStart(7)}  kept`);
console.log(`  ${String(old.length).padStart(7)}  ${DRY ? "would be deleted" : "to delete"}`);
if (undated.length) {
  console.log(`  ${C.yellow(String(undated.length).padStart(7))}  kept because they have no readable createdAt`);
}

if (old.length) {
  const oldest = new Date(Math.min(...old.map(age))).toISOString().slice(0, 10);
  const newest = new Date(Math.max(...old.map(age))).toISOString().slice(0, 10);
  console.log(`  ${C.dim(`spanning ${oldest} to ${newest}`)}`);
}

if (!old.length) {
  console.log(`\n  ${C.green("nothing to prune")}\n`);
  process.exit(0);
}

// Back up BEFORE deleting, even on a dry run — so the file that would have been
// written is proven writable while nothing is at stake.
const stamp = cutoffIso.replace(/[:.]/g, "-");
const dir = path.join(ROOT, "notification-backups", `${PROJECT}_${DATABASE.replace(/[()]/g, "")}_${stamp}`);
mkdirSync(dir, { recursive: true });
const file = writeBackup(dir, "notifications", old);
console.log(`\n  ${C.green("✓")} backed up ${old.length} document(s)`);
console.log(`    ${C.dim(file)}`);

if (DRY) {
  console.log(`\n  ${C.yellow("dry run — nothing deleted")}\n`);
  process.exit(0);
}

await db.commit(old.map((d) => db.deleteWrite(`notifications/${d.__id}`)));

const after = await db.listAll("notifications").catch(() => []);
console.log(`  ${C.green("✓")} deleted ${old.length}, ${after.length} remain`);
if (after.length !== kept) {
  console.log(`  ${C.yellow(`note: expected ${kept} to remain — the collection is live and may have grown`)}`);
}
console.log();
