#!/usr/bin/env node
/**
 * Expires stale parent access links.
 *
 *   node scripts/expire-parent-links.mjs --project=tempo-app-2 --days=90 --dry-run
 *   node scripts/expire-parent-links.mjs --project=tempo-app-2 --days=90 --yes
 *
 * WHAT ACCUMULATES AND WHY
 * Every anonymous parent session that enters an access code is appended to
 * `clients/{id}.parentUids` and keeps read access to that child for good.
 * Signing out unlinks properly, and there is a 30-minute idle timeout that
 * signs out too — so these are not idle sessions, they are orphans from an
 * unlink that never ran because the tab was closed. Measured 21 Aug 2026:
 * 268 links across 88 clients at one clinic, 237 of them unused for 90+ days.
 *
 * WHAT COUNTS AS "USED"
 * Firestore records nothing about parent activity, so this asks Firebase Auth
 * for `lastRefreshAt` on each anonymous account — the only real signal that
 * somebody still has that session on a device.
 *
 * WHY A REGISTERED DEVICE IS EXEMPT — the important part
 * `notifyParents*` resolves recipients from `clients.parentUids`
 * (src/lib/notificationService.ts:325). Removing a link therefore stops the
 * notification being CREATED, so push dies with the link no matter what
 * happens to the FCM token. Five devices at livebetterlife already demonstrate
 * this: live tokens, no link, receiving nothing.
 *
 * For most parents push is the only part of the portal they use — only 3 of
 * 268 had opened it in the previous week. Expiring the link of somebody who
 * holds a working device would silence them permanently and tell nobody. So a
 * uid holding an `fcm_tokens` document is treated as active, however long ago
 * it last opened the app. Dead tokens prune themselves: the push function
 * deletes a registration as soon as FCM reports it unregistered.
 *
 * This script never touches `fcm_tokens`.
 */
import { execSync } from "node:child_process";
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
const DAYS = Number(args.days || 90);
const DRY = !!args["dry-run"];

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project is required")}\n`);
  process.exit(1);
}
if (!Number.isFinite(DAYS) || DAYS < 1) {
  console.error(`\n${C.red("✗ --days must be a positive number")}\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to modify links without --yes")} (or --dry-run to preview).\n`);
  process.exit(1);
}

const CLINICS = ["livebetterlife", "demo", "diaconumaria", "aicaa"];
const CUTOFF = Date.now() - DAYS * 86400000;

const accessToken = execSync("gcloud auth application-default print-access-token").toString().trim();

/** Firebase Auth metadata for up to 100 uids at a time. */
async function lastUsed(uids) {
  const out = new Map();
  for (let i = 0; i < uids.length; i += 100) {
    const batch = uids.slice(i, i + 100);
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "x-goog-user-project": PROJECT,
        },
        body: JSON.stringify({ localId: batch }),
      },
    );
    if (!r.ok) throw new Error(`accounts:lookup ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    for (const u of j.users || []) {
      const ms = u.lastRefreshAt ? Date.parse(u.lastRefreshAt) : Number(u.lastLoginAt || 0);
      out.set(u.localId, Number.isNaN(ms) ? 0 : ms);
    }
  }
  return out;
}

console.log(`\n${C.bold("Expire stale parent links")}`);
console.log(`  project : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  cutoff  : unused for ${DAYS}+ days ${C.dim(`(before ${new Date(CUTOFF).toISOString().slice(0, 10)})`)}`);
console.log(`  exempt  : any uid holding an fcm_tokens document\n`);

const control = new Db(PROJECT, { allowAnyProject: true });
control.dryRun = DRY;

let totalRemoved = 0;
let totalKeptActive = 0;
let totalKeptDevice = 0;
let totalMirrors = 0;

for (const label of CLINICS) {
  const database = `clinic-${label}`;
  const db = new Db(PROJECT, { allowAnyProject: true, database });
  db.dryRun = DRY;

  const clients = await db.listAll("clients");
  const withParents = clients.filter((c) => (c.parentUids || []).length);
  if (!withParents.length) {
    console.log(`  ${label.padEnd(16)} ${C.dim("no parent links")}`);
    continue;
  }

  const devices = new Set((await db.listAll("fcm_tokens")).map((t) => t.__id));
  const allUids = [...new Set(withParents.flatMap((c) => c.parentUids))];
  const used = await lastUsed(allUids);

  // Decide once per uid; a uid can be linked to siblings.
  const expired = new Set();
  let keptActive = 0;
  let keptDevice = 0;
  for (const uid of allUids) {
    if (devices.has(uid)) { keptDevice++; continue; }        // receives push — never cull
    const last = used.get(uid);
    if (last === undefined) { expired.add(uid); continue; }  // auth account gone entirely
    if (last >= CUTOFF) { keptActive++; continue; }
    expired.add(uid);
  }

  let linksRemoved = 0;
  for (const c of withParents) {
    const keep = c.parentUids.filter((u) => !expired.has(u));
    if (keep.length === c.parentUids.length) continue;
    linksRemoved += c.parentUids.length - keep.length;
    await db.commit([db.mergeWrite(`clients/${c.__id}`, { parentUids: keep })]);
  }

  // The control-plane mirror is what Storage rules read, so it has to go with
  // the Firestore link — otherwise a parent keeps reaching a child's videos and
  // documents after losing the record itself. A uid is expired for the whole
  // clinic or not at all, and the mirror id is bucket-scoped, so there is
  // never a partial case to preserve.
  const bucket = `${PROJECT}-${label}`;
  const doomed = new Set([...expired].map((uid) => `${bucket}__${uid}`));

  // Reconcile, rather than only deleting what this run expired. A mirror whose
  // uid is linked to no client is Storage access with no record access behind
  // it — a parent who can still fetch a child's videos and documents but not
  // the child. Four of these existed before this script did, left by unlinks
  // where the Firestore write landed and the mirror delete did not.
  const survivors = new Set(
    (await db.listAll("clients")).flatMap((c) => c.parentUids || []),
  );
  for (const m of await control.listAll("tenant_parents")) {
    if (m.tenantId !== label) continue;
    const uid = m.__id.split("__")[1];
    if (uid && !survivors.has(uid)) doomed.add(m.__id);
  }

  const mirrorWrites = [...doomed].map((id) => control.deleteWrite(`tenant_parents/${id}`));
  for (let i = 0; i < mirrorWrites.length; i += 400) {
    await control.commit(mirrorWrites.slice(i, i + 400));
  }

  totalRemoved += linksRemoved;
  totalKeptActive += keptActive;
  totalKeptDevice += keptDevice;
  totalMirrors += mirrorWrites.length;

  console.log(
    `  ${C.bold(label.padEnd(16))} ${allUids.length} linked uid(s): ` +
      `${C.yellow(String(expired.size))} expired, ` +
      `${C.green(String(keptActive))} recently active, ` +
      `${C.green(String(keptDevice))} kept for push`,
  );
  console.log(
    `  ${"".padEnd(16)} ${linksRemoved} link(s) ${DRY ? "would be" : ""} removed across ` +
      `${withParents.length} client(s); ${mirrorWrites.length} tenant_parents mirror(s) ` +
      `${DRY ? "would be" : ""} deleted\n`,
  );
}

console.log(`${C.bold("Summary")}`);
console.log(`  ${totalRemoved} link(s) ${DRY ? "would be" : ""} removed`);
console.log(`  ${totalMirrors} mirror(s) ${DRY ? "would be" : ""} deleted`);
console.log(`  ${totalKeptActive} kept as recently active, ${totalKeptDevice} kept because they hold a device`);
console.log(`  fcm_tokens: untouched\n`);
if (DRY) console.log(`  ${C.dim("Re-run with --yes to apply.")}\n`);
