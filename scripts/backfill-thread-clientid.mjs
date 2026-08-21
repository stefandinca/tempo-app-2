#!/usr/bin/env node
/**
 * Restores the top-level `clientId` on staff-to-parent threads that lost it.
 *
 *   node scripts/backfill-thread-clientid.mjs --project=tempo-app-2 --dry-run
 *   node scripts/backfill-thread-clientid.mjs --project=tempo-app-2 --yes
 *
 * WHY THESE THREADS ARE INVISIBLE
 * A parent's anonymous uid changes every session, so useChat lists a parent's
 * threads with `where("clientId", "==", clientId)` rather than by participant.
 * A staff-to-parent thread with no top-level clientId is therefore invisible to
 * the parent for good, while showing normally on the staff side — no error on
 * either end.
 *
 * HOW THEY LOST IT
 * createOrGetThread derived the field from `otherUser.role === 'Parent'`, but
 * NewChatModal sets that role from t("chat.role_parent"). On a Romanian UI the
 * value is "Parinte", the comparison failed, and the thread was written with no
 * clientId. Fixed at source — the field is now keyed off clientId itself, which
 * does not depend on the display language — but that only helps new threads.
 *
 * WHY participantDetails IS A SAFE SOURCE
 * The modal puts clientId on the parent participant even when the top-level
 * field was dropped, so the value is recoverable from the thread itself. It is
 * NOT recovered by looking the uid up in clients.parentUids: expired links have
 * been pruned, so that lookup would miss exactly the older threads this is for,
 * and a wrong clientId here would show one family another family's conversation.
 *
 * Threads where no participant carries a clientId are staff-to-staff and are
 * left alone — they are supposed to have no clientId.
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
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run to preview).\n`);
  process.exit(1);
}

const CLINICS = ["livebetterlife", "demo", "diaconumaria", "aicaa"];

console.log(`\n${C.bold("Backfill thread clientId")}`);
console.log(`  project : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}\n`);

let totalFixed = 0;
let totalStaff = 0;
let totalAmbiguous = 0;

for (const label of CLINICS) {
  const db = new Db(PROJECT, { allowAnyProject: true, database: `clinic-${label}` });
  db.dryRun = DRY;

  const threads = await db.listAll("threads");
  const clientIds = new Set((await db.listAll("clients")).map((c) => c.__id));
  const missing = threads.filter((t) => !t.clientId);

  if (!threads.length) {
    console.log(`  ${label.padEnd(16)} ${C.dim("no threads")}`);
    continue;
  }

  const writes = [];
  let staffOnly = 0;
  let ambiguous = 0;

  for (const t of missing) {
    const candidates = [
      ...new Set(
        Object.values(t.participantDetails || {})
          .map((p) => (p && typeof p === "object" ? p.clientId : null))
          .filter((c) => typeof c === "string" && c),
      ),
    ];

    if (!candidates.length) { staffOnly++; continue; }

    // More than one distinct clientId means the thread cannot be attributed to
    // one child; guessing would hand one family another family's conversation.
    if (candidates.length > 1) {
      ambiguous++;
      console.log(`  ${C.yellow("!")} ${t.__id.slice(0, 40)} has ${candidates.length} client ids — skipped`);
      continue;
    }

    const cid = candidates[0];
    if (!clientIds.has(cid)) {
      ambiguous++;
      console.log(`  ${C.yellow("!")} ${t.__id.slice(0, 40)} points at missing client ${cid} — skipped`);
      continue;
    }

    const who = Object.values(t.participantDetails || {})
      .map((p) => (p && p.name) || "?")
      .join(" / ");
    console.log(`  ${C.green("+")} ${t.__id.slice(0, 40).padEnd(40)} -> ${cid}  ${C.dim(who)}`);
    writes.push(db.mergeWrite(`threads/${t.__id}`, { clientId: cid }));
  }

  for (let i = 0; i < writes.length; i += 400) {
    await db.commit(writes.slice(i, i + 400));
  }

  totalFixed += writes.length;
  totalStaff += staffOnly;
  totalAmbiguous += ambiguous;

  console.log(
    `  ${label.padEnd(16)} ${threads.length} thread(s): ${writes.length} ` +
      `${DRY ? "would be" : ""} repaired, ${staffOnly} staff-to-staff left alone, ` +
      `${ambiguous} skipped\n`,
  );
}

console.log(`${C.bold("Summary")}  ${totalFixed} repaired, ${totalStaff} staff-to-staff untouched, ${totalAmbiguous} skipped\n`);
if (DRY) console.log(`  ${C.dim("Re-run with --yes to apply.")}\n`);
