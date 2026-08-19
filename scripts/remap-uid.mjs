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
 * arrays (therapistIds, teamMemberIds, participants, parentUids) and as MAP KEYS
 * (threads.participantDetails). This walks every value rather than enumerating
 * field names, so a field nobody remembered is still caught.
 */
import { Db } from "./demo-seed/firestore.mjs";

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

const TOP_LEVEL = [
  "clients", "team_members", "team_public", "events", "services", "programs",
  "invoices", "payouts", "expenses", "recurring_expenses", "activities",
  "threads", "notifications", "fcm_tokens", "system_settings", "client_codes",
  "user_consents", "user_ai_usage", "ai_conversations", "ai_usage_events",
];
const CLIENT_SUBS = [
  "evaluations", "vbmapp_evaluations", "portage_evaluations", "cars_evaluations",
  "carolina_evaluations", "interventionPlans", "homework", "documents", "videos",
  "voiceFeedback", "reports",
];

/** Deep-replace the uid anywhere in a value — strings, array items, map keys. */
function rewrite(value) {
  if (typeof value === "string") return value === FROM ? TO : value;
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k === FROM ? TO : k] = rewrite(v);
    }
    return out;
  }
  return value;
}

const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

const db = new Db(PROJECT, { allowAnyProject: true, database: DATABASE });
db.dryRun = DRY;

console.log(`\n${C.bold("Remap UID")}`);
console.log(`  project  : ${PROJECT} / ${DATABASE}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  from     : ${FROM}`);
console.log(`  to       : ${TO}\n`);

let fieldEdits = 0;
let idMoves = 0;

async function process_(path) {
  const docs = await db.listAll(path).catch(() => []);
  const writes = [];
  for (const d of docs) {
    const { __id, __name, ...data } = d;
    const next = rewrite(data);
    const idNeedsMove = __id === FROM;

    if (idNeedsMove) {
      // A document keyed by the UID has to be recreated under the new id; there
      // is no rename in Firestore.
      writes.push(db.setWrite(`${path}/${TO}`, next));
      writes.push(db.deleteWrite(`${path}/${__id}`));
      idMoves += 1;
      console.log(`  ${C.green("id")}    ${path}/${__id.slice(0, 12)}… -> ${TO.slice(0, 12)}…`);
    } else if (changed(data, next)) {
      writes.push(db.setWrite(`${path}/${__id}`, next));
      fieldEdits += 1;
      console.log(`  ${C.green("ref")}   ${path}/${__id.slice(0, 16)}`);
    }
  }
  if (writes.length) await db.commit(writes);
  return docs;
}

for (const coll of TOP_LEVEL) {
  const docs = await process_(coll);
  if (coll === "clients") {
    for (const c of docs) for (const s of CLIENT_SUBS) await process_(`clients/${c.__id}/${s}`);
  }
  if (coll === "threads") for (const t of docs) await process_(`threads/${t.__id}/messages`);
  if (coll === "ai_conversations") for (const v of docs) await process_(`ai_conversations/${v.__id}/messages`);
}

console.log(`\n  ${C.green(String(idMoves))} document id(s) moved, ${C.green(String(fieldEdits))} document(s) with rewritten references`);
console.log(`  ${DRY ? "would write" : "wrote"} ${db.writes} operation(s)\n`);
