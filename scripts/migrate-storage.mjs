#!/usr/bin/env node
/**
 * Moves a clinic's media into its own Storage bucket, and repoints the database
 * at the new location.
 *
 *   node scripts/migrate-storage.mjs --from-bucket=A --to-bucket=B \
 *        --project=P --database=clinic-x --dry-run
 *   node scripts/migrate-storage.mjs ... --yes
 *   node scripts/migrate-storage.mjs ... --verify   # compare both sides only
 *
 * Two halves, in this order:
 *
 *   1. Copy every object. Cloud Storage `rewrite` preserves custom metadata,
 *      including `firebaseStorageDownloadTokens` — so a copied object keeps its
 *      download token and its public URL differs from the original ONLY in the
 *      bucket name.
 *   2. Substitute that bucket name inside every stored URL. Uploads persist both
 *      `storagePath` and `downloadUrl`; it is the second that hardcodes a bucket.
 *
 * Because of (1) the substitution is a plain string swap rather than a re-upload,
 * and because nothing is deleted at the source, the old URLs keep working until
 * the source project is deliberately decommissioned. That makes this safe to run
 * before a cutover rather than during one.
 */
import { execSync } from "node:child_process";
import { Db } from "./demo-seed/firestore.mjs";
import { deepMapStrings, changed, walkClinic } from "./lib/deep-rewrite.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const FROM = args["from-bucket"];
const TO = args["to-bucket"];
const PROJECT = args.project;
const DATABASE = args.database || "(default)";
const DRY = !!args["dry-run"];
const VERIFY = !!args.verify;

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!FROM || !TO || !PROJECT) {
  console.error(`\n${C.red("✗ --from-bucket, --to-bucket and --project are required")}\n`);
  process.exit(1);
}
if (FROM === TO) {
  console.error(`\n${C.red("✗ source and destination bucket are the same")}\n`);
  process.exit(1);
}
if (!DRY && !VERIFY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run / --verify)\n`);
  process.exit(1);
}

const token = execSync("gcloud auth application-default print-access-token").toString().trim();
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function listObjects(bucket) {
  const out = [];
  let pageToken = "";
  do {
    const u = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
    u.searchParams.set("maxResults", "1000");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const r = await fetch(u, { headers: H });
    if (!r.ok) throw new Error(`list ${bucket}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    out.push(...(j.items || []));
    pageToken = j.nextPageToken || "";
  } while (pageToken);
  return out;
}

/**
 * Server-side copy. Large objects come back with a `rewriteToken` and have to be
 * driven to completion in a loop; a single call is not enough.
 */
async function copyObject(name) {
  let rewriteToken = "";
  for (;;) {
    const u = new URL(
      `https://storage.googleapis.com/storage/v1/b/${FROM}/o/${encodeURIComponent(name)}` +
        `/rewriteTo/b/${TO}/o/${encodeURIComponent(name)}`,
    );
    if (rewriteToken) u.searchParams.set("rewriteToken", rewriteToken);
    const r = await fetch(u, { method: "POST", headers: H });
    if (!r.ok) throw new Error(`copy ${name}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    const j = await r.json();
    if (j.done) return;
    rewriteToken = j.rewriteToken;
  }
}

console.log(`\n${C.bold("Migrate clinic media")}`);
console.log(`  objects  : ${FROM} -> ${TO}`);
console.log(`  database : ${PROJECT} / ${DATABASE}`);
console.log(`  mode     : ${VERIFY ? C.yellow("VERIFY (no writes)") : DRY ? C.yellow("DRY RUN") : C.green("APPLY")}\n`);

/* ---------- 1. objects ---------- */

const source = await listObjects(FROM);
const destination = await listObjects(TO);
const existing = new Map(destination.map((o) => [o.name, o]));

const totalBytes = source.reduce((n, o) => n + Number(o.size || 0), 0);
console.log(`  ${source.length} object(s) at source, ${(totalBytes / 1048576).toFixed(1)} MB`);

let copied = 0;
let skipped = 0;
for (const o of source) {
  // Same name and same content hash means it is already there. Re-running after
  // an interruption should be cheap, not a full re-copy.
  const there = existing.get(o.name);
  if (there && there.md5Hash === o.md5Hash) {
    skipped += 1;
    continue;
  }
  if (!DRY && !VERIFY) await copyObject(o.name);
  copied += 1;
  if (copied % 25 === 0) console.log(C.dim(`    ${copied} copied…`));
}
console.log(
  `  ${C.green(String(copied))} ${DRY || VERIFY ? "would be copied" : "copied"}` +
    (skipped ? C.dim(`, ${skipped} already present`) : ""),
);

if (VERIFY) {
  const missing = source.filter((o) => {
    const there = existing.get(o.name);
    return !there || there.md5Hash !== o.md5Hash;
  });
  console.log(
    missing.length
      ? `  ${C.red(`✗ ${missing.length} object(s) missing or differing at the destination`)}`
      : `  ${C.green("✓ every source object is present at the destination with a matching hash")}`,
  );
  missing.slice(0, 10).forEach((o) => console.log(`      ${o.name}`));
}

/* ---------- 2. stored URLs ---------- */

// A download URL embeds the bucket: .../v0/b/<bucket>/o/<path>?alt=media&token=…
// The token survives the copy, so only the bucket name has to change.
const swap = (s) => (s.includes(FROM) ? s.split(FROM).join(TO) : s);

const db = new Db(PROJECT, { allowAnyProject: true, database: DATABASE });
db.dryRun = DRY || VERIFY;

let touched = 0;
let stale = 0;
const pending = new Map();

await walkClinic(db, (path, doc) => {
  const { __id, __name, ...data } = doc;
  const next = deepMapStrings(data, swap);
  if (!changed(data, next)) return;
  touched += 1;
  if (VERIFY) {
    stale += 1;
    if (stale <= 10) console.log(`      still points at ${FROM}: ${path}/${__id}`);
    return;
  }
  if (!pending.has(path)) pending.set(path, []);
  pending.get(path).push(db.setWrite(`${path}/${__id}`, next));
});

for (const writes of pending.values()) await db.commit(writes);

console.log(
  `\n  ${C.green(String(touched))} document(s) ${VERIFY ? "still reference the old bucket" : DRY ? "would have URLs rewritten" : "had URLs rewritten"}`,
);

if (VERIFY) {
  console.log(
    touched === 0
      ? `  ${C.green("✓ no document still references the old bucket")}\n`
      : `  ${C.red("✗ documents still reference the old bucket")}\n`,
  );
} else {
  console.log(C.dim(`  ${DRY ? "would write" : "wrote"} ${db.writes} operation(s)\n`));
  console.log(
    C.dim("  Nothing was deleted at the source: the original objects and their URLs\n") +
      C.dim("  keep working until that project is deliberately decommissioned.\n"),
  );
}
