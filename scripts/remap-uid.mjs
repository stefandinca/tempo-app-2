#!/usr/bin/env node
/**
 * Rewrites every reference to one Auth UID as another, inside one database.
 *
 *   node scripts/remap-uid.mjs --project=P --database=clinic-x \
 *        --from=OLDUID --to=NEWUID --dry-run
 *   node scripts/remap-uid.mjs ... --yes
 *
 * Why this is needed: each Firebase project has its own Auth pool, so the same
 * person has a different UID in each. When clinics merge into one project, one
 * account wins and the losing UID must be rewritten wherever the clinic's data
 * referenced it — otherwise that person signs in with no role, their events lose
 * their therapist, and their audit-trail entries orphan.
 *
 * UIDs appear as document ids (team_members, team_public, fcm_tokens,
 * user_consents, user_ai_usage), as plain string fields (therapistId, uploadedBy,
 * recipientId, evaluatorId, assignedBy, createdBy, userId, senderId, uid), inside
 * arrays (therapistIds, teamMemberIds, participants, parentUids) and as map keys
 * (threads.participantDetails). The walk in ./lib/deep-rewrite.mjs visits every
 * value rather than enumerating field names, so a field nobody remembered is
 * still caught.
 */
import { Db } from "./demo-seed/firestore.mjs";
import { deepMapStrings, changed, walkClinic } from "./lib/deep-rewrite.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const DATABASE = args.database || "(default)";
const FROM = args.from;
const TO = args.to;
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT || !FROM || !TO) {
  console.error(`\n${C.red("✗ --project, --from and --to are required")}\n`);
  process.exit(1);
}
if (FROM === TO) {
  console.error(`\n${C.red("✗ --from and --to are the same")}\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

const db = new Db(PROJECT, { allowAnyProject: true, database: DATABASE });
db.dryRun = DRY;

console.log(`\n${C.bold("Remap UID")}`);
console.log(`  project  : ${PROJECT} / ${DATABASE}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  from     : ${FROM}`);
console.log(`  to       : ${TO}\n`);

const swap = (s) => (s === FROM ? TO : s);

let fieldEdits = 0;
let idMoves = 0;
const pending = new Map();

function queue(path, write) {
  if (!pending.has(path)) pending.set(path, []);
  pending.get(path).push(write);
}

await walkClinic(db, (path, doc) => {
  const { __id, __name, ...data } = doc;
  const next = deepMapStrings(data, swap);

  if (__id === FROM) {
    // A document keyed by the UID has to be recreated under the new id; there is
    // no rename in Firestore.
    queue(path, db.setWrite(`${path}/${TO}`, next));
    queue(path, db.deleteWrite(`${path}/${__id}`));
    idMoves += 1;
    console.log(`  ${C.green("id")}    ${path}/${__id.slice(0, 12)}… -> ${TO.slice(0, 12)}…`);
  } else if (changed(data, next)) {
    queue(path, db.setWrite(`${path}/${__id}`, next));
    fieldEdits += 1;
    console.log(`  ${C.green("ref")}   ${path}/${__id.slice(0, 16)}`);
  }
});

for (const writes of pending.values()) await db.commit(writes);

console.log(
  `\n  ${C.green(String(idMoves))} document id(s) moved, ${C.green(String(fieldEdits))} document(s) with rewritten references`,
);
console.log(`  ${DRY ? "would write" : "wrote"} ${db.writes} operation(s)\n`);
