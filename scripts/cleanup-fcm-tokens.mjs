#!/usr/bin/env node
/**
 * Reconciles fcm_tokens with the one-owner-per-token invariant.
 *
 *   node scripts/cleanup-fcm-tokens.mjs --project=tempo-app-2 --dry-run
 *   node scripts/cleanup-fcm-tokens.mjs --project=tempo-app-2 --yes
 *
 * An FCM token belongs to the BROWSER, not the account. Before the ownership
 * trigger existed (functions/src/index.ts), every account that ever signed in
 * on a shared device accumulated the same token, and nothing removed the old
 * ones. Measured 21 Aug 2026 at clinic-livebetterlife: 46 registrations across
 * 14 real devices, one token held by 12 accounts. Since notification bodies
 * name children, a push meant for one recipient was delivered to whoever was
 * using that browser.
 *
 * The trigger fixes this going forward, for tokens written from now on. It
 * cannot fix what is already stored, because it only fires on a write. This
 * reconciles the backlog.
 *
 * RULE: for each distinct token, keep the registration with the newest
 * updatedAt/createdAt and delete the rest. Newest wins because that is the
 * account that most recently signed in on that device, which is exactly the
 * invariant the trigger maintains.
 *
 * It deliberately does NOT delete by age. Every token at livebetterlife
 * validated as live against FCM regardless of age, so age is not evidence of
 * staleness, and deleting a live registration silently turns push off for
 * somebody.
 */
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v === undefined ? true : v];
  }),
);

const C = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

const PROJECT = args.project;
const DRY = !!args["dry-run"];

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project is required")}\n`);
  console.error(`  node scripts/cleanup-fcm-tokens.mjs --project=tempo-app-2 --dry-run\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to delete without --yes")} (or --dry-run to preview).\n`);
  process.exit(1);
}

const CLINICS = ["livebetterlife", "demo", "diaconumaria", "aicaa"];

const freshness = (t) => {
  const raw = t.updatedAt || t.createdAt;
  if (raw && typeof raw === "object" && typeof raw.toDate === "function") return raw.toDate().getTime();
  const ms = Date.parse(String(raw));
  return Number.isNaN(ms) ? 0 : ms;
};

const when = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : "unknown");

console.log(`\n${C.bold("Reconcile fcm_tokens")}`);
console.log(`  project : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}\n`);

let totalKept = 0;
let totalDeleted = 0;

for (const label of CLINICS) {
  const database = `clinic-${label}`;
  const db = new Db(PROJECT, { allowAnyProject: true, database });
  db.dryRun = DRY;

  let docs;
  try {
    docs = await db.listAll("fcm_tokens");
  } catch (e) {
    console.log(`  ${C.red("✗")} ${label}: could not read fcm_tokens — ${e.message}\n`);
    process.exitCode = 1;
    continue;
  }

  if (!docs.length) {
    console.log(`  ${label.padEnd(16)} ${C.dim("no registrations")}`);
    continue;
  }

  const byToken = new Map();
  const noToken = [];
  for (const d of docs) {
    const t = String(d.token || "");
    if (!t) {
      noToken.push(d);
      continue;
    }
    if (!byToken.has(t)) byToken.set(t, []);
    byToken.get(t).push(d);
  }

  const deletions = [];
  for (const [tok, holders] of byToken) {
    if (holders.length < 2) continue;
    const sorted = [...holders].sort((a, b) => freshness(b) - freshness(a));
    const keep = sorted[0];
    const drop = sorted.slice(1);
    console.log(
      `  ${C.bold(label)} ${C.dim(tok.slice(0, 16) + "...")} held by ${holders.length} accounts`,
    );
    console.log(`      ${C.green("keep")}   ${keep.__id}  ${C.dim(when(freshness(keep)))}`);
    for (const d of drop) {
      console.log(`      ${C.yellow("drop")}   ${d.__id}  ${C.dim(when(freshness(d)))}`);
      deletions.push(d.__id);
    }
  }

  // A registration with no token field can never receive anything and only
  // confuses the next audit.
  for (const d of noToken) {
    console.log(`  ${C.bold(label)} ${C.yellow("drop")}   ${d.__id}  ${C.dim("(no token field)")}`);
    deletions.push(d.__id);
  }

  if (deletions.length) {
    await db.commit(deletions.map((id) => db.deleteWrite(`fcm_tokens/${id}`)));
  }

  const kept = docs.length - deletions.length;
  totalKept += kept;
  totalDeleted += deletions.length;
  console.log(
    `  ${label.padEnd(16)} ${docs.length} registration(s) -> ${kept} kept, ` +
      `${deletions.length} ${DRY ? "would be removed" : "removed"}\n`,
  );
}

console.log(
  `${C.bold("Summary")}  ${totalKept} kept, ${totalDeleted} ${DRY ? "would be removed" : "removed"}\n`,
);
if (DRY) console.log(`  ${C.dim("Re-run with --yes to apply.")}\n`);
