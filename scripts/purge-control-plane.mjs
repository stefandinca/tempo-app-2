#!/usr/bin/env node
/**
 * Removes clinic data from the CONTROL PLANE, leaving the tenant registry.
 *
 *   node scripts/purge-control-plane.mjs --project=tempo-app-2 --dry-run
 *   node scripts/purge-control-plane.mjs --project=tempo-app-2 --yes
 *
 * (default) was Live Better Life's database before the tenancy cutover, and
 * still holds a full copy. The clinic now runs from clinic-livebetterlife. Once
 * the platform console treats team_members in (default) as its authorization
 * source, every leftover staff document there is a grant against the platform
 * itself rather than against a clinic — so the leftovers have to go, and the
 * clinical records they sit beside have no business being there either.
 *
 * THREE SAFETY PROPERTIES, in order of how much they matter:
 *
 *   1. It verifies before it deletes. Every collection is counted here and in
 *      clinic-livebetterlife, and the run ABORTS if the clinic has fewer — i.e.
 *      if this copy is not redundant after all. --force overrides, deliberately
 *      awkwardly.
 *
 *      This runs in TWO passes, because the top-level pass on its own did not
 *      cover most of what gets deleted: each client has up to a dozen
 *      subcollections, so the nested documents outnumber the top-level ones
 *      several times over — and every one of them used to pass the gate
 *      unverified. Pass one counts the root collections up front (step 1).
 *      Pass two runs after the walk (step 3b); it cannot run earlier, because
 *      which subcollections exist is only known once each parent document has
 *      been probed. It compares every nested collection path the walk actually
 *      collected against the same path in the reference. Nothing is backed up
 *      or deleted until both passes have gone through.
 *   2. It backs up everything it deletes, first, to disk.
 *   3. It recurses. Deleting a document does not delete its subcollections, and
 *      each client here has 11 of them.
 *
 * KEEPS: tenants, tenant_members, tenant_parents (the control plane's actual
 * job) and every Superadmin in team_members (without whom the console locks).
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Db } from "./demo-seed/firestore.mjs";

/**
 * Collections whose documents have subcollections, and which therefore need a
 * per-document probe. Firestore cannot list subcollections in bulk, so probing
 * every document everywhere would mean ~11,000 sequential round trips.
 *
 * This list is derived from the code that CREATES subcollections — every
 * collection(db, parent, id, sub) and doc(db, parent, id, sub, ...) call site in
 * src/ — not from sampling the data. Sampling would have missed `clients`
 * entirely: its first five documents have no subcollections, while others have
 * twelve.
 *
 * The canary pass below is a backstop against this list going stale as the
 * schema grows, not the primary evidence. It aborts rather than guessing,
 * because a silent orphan is the exact failure this task exists to prevent.
 */
const KNOWN_PARENTS = new Set(["clients", "threads", "ai_conversations"]);
const CANARY_SAMPLE = 5;
/** How many listCollectionIds probes to have in flight at once. */
const PROBE_BATCH = 20;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const DRY = !!args["dry-run"];
const FORCE = !!args.force;
/** The database that must already hold everything we are about to delete. */
const REFERENCE = args.reference || "clinic-livebetterlife";

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
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to delete without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

/** The control plane's own collections. Never touched. */
const KEEP_WHOLE = new Set(["tenants", "tenant_members", "tenant_parents"]);
/** Emptying this locks the console out; Superadmins are filtered back in below. */
const KEEP_SUPERADMINS = "team_members";

const token = execSync("gcloud auth application-default print-access-token").toString().trim();
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const base = (db) => `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${db}/documents`;

async function collectionIds(database, docPath = "") {
  const url = `${base(database)}${docPath ? "/" + docPath : ""}:listCollectionIds`;
  const r = await fetch(url, { method: "POST", headers: H, body: "{}" });
  // Backs both the canary pass and the per-document subcollection probe. A
  // failed request must never read as "no subcollections" — that is exactly
  // the silent-orphan outcome this script exists to prevent. This is only
  // ever called against (default), which is assumed to exist, so there is no
  // legitimate-absence case to special-case here: any non-ok response throws.
  if (!r.ok) {
    throw new Error(`collectionIds(${database}, ${docPath || "<root>"}) failed: HTTP ${r.status} ${(await r.text()).slice(0, 400)}`);
  }
  return (await r.json()).collectionIds || [];
}

/**
 * How many documents a collection holds. An empty `parentDocPath` counts a
 * top-level collection; set it (e.g. `clients/abc`) to count a subcollection
 * under that document, which is what the nested redundancy pass needs.
 */
async function countOf(database, collection, parentDocPath = "") {
  const r = await fetch(`${base(database)}${parentDocPath ? "/" + parentDocPath : ""}:runAggregationQuery`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: collection }] },
        aggregations: [{ alias: "n", count: {} }],
      },
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    // The redundancy gate is `there >= here`. A sentinel return here used to
    // read as data: if (default)'s count failed, "here" became -1 and every
    // comparison passed, silently disabling the exact check that protects
    // against deleting non-redundant data. So any failure counting (default)
    // throws, unconditionally — there is no safe fallback value for it.
    //
    // The ONE legitimate exception: a REFERENCE clinic database that has
    // never been created (a clinic mid-onboarding). Firestore reports that
    // distinctly — HTTP 404, status NOT_FOUND — from "the collection is
    // empty", which is a normal 200 with count 0 (verified directly against
    // the live API before writing this). Only for that exact signature, and
    // only for a non-(default) database, is "0" an honest answer rather than
    // a fabricated one: the database really does hold zero documents. Every
    // other failure — rate limits, permission errors, timeouts, or anything
    // at all against (default) — throws.
    if (database !== "(default)" && r.status === 404 && /NOT_FOUND/.test(body)) {
      console.log(`    ${C.dim(`(${database} does not exist yet — treating ${collection} as 0)`)}`);
      return 0;
    }
    throw new Error(
      `countOf(${database}, ${parentDocPath ? parentDocPath + "/" : ""}${collection}) failed: HTTP ${r.status} ${body.slice(0, 400)}`,
    );
  }
  const j = await r.json();
  const row = (Array.isArray(j) ? j : [j]).find((x) => x.result);
  return Number(row?.result?.aggregateFields?.n?.integerValue ?? 0);
}

/** IDs of the first `n` documents in a top-level collection — a page, not a full listAll. */
async function sampleDocIds(database, collection, n) {
  const u = new URL(`${base(database)}/${collection}`);
  u.searchParams.set("pageSize", String(n));
  const r = await fetch(u, { headers: H });
  // Same reasoning as collectionIds(): only ever called against (default), so
  // any failure throws rather than being read as "collection is empty".
  if (!r.ok) {
    throw new Error(`sampleDocIds(${database}, ${collection}) failed: HTTP ${r.status} ${(await r.text()).slice(0, 400)}`);
  }
  const j = await r.json();
  return (j.documents || []).map((d) => d.name.split("/").pop());
}

/**
 * listCollectionIds for many document paths at once, PROBE_BATCH in flight at a
 * time. Returns a Map keyed by the input path.
 */
async function probeMany(docPaths) {
  const out = new Map();
  for (let i = 0; i < docPaths.length; i += PROBE_BATCH) {
    const batch = docPaths.slice(i, i + PROBE_BATCH);
    const results = await Promise.all(batch.map((p) => collectionIds("(default)", p)));
    batch.forEach((p, idx) => out.set(p, results[idx]));
  }
  return out;
}

const db = new Db(PROJECT, { allowAnyProject: true }); // (default)
db.dryRun = DRY;

console.log(`\n${C.bold("Purge the control plane")}`);
console.log(`  project   : ${PROJECT}  ${C.dim("database (default)")}${DRY ? C.yellow("  (DRY RUN)") : ""}`);
console.log(`  reference : ${REFERENCE}\n`);

const roots = await collectionIds("(default)");
const toPurge = roots.filter((c) => !KEEP_WHOLE.has(c));

/* ---------- 1. verify redundancy: top-level collections ---------- */

console.log(`${C.bold("  verifying every ROOT collection is already in " + REFERENCE)}\n`);
const unsafe = [];
for (const c of toPurge) {
  const [here, there] = await Promise.all([countOf("(default)", c), countOf(REFERENCE, c)]);
  const ok = there >= here;
  if (!ok) unsafe.push(`${c}: (default)=${here}, ${REFERENCE}=${there}`);
  console.log(
    `    ${ok ? C.green("✓") : C.red("✗")} ${c.padEnd(22)} ${String(here).padStart(6)} here, ${String(there).padStart(6)} there`,
  );
}

if (unsafe.length && !FORCE) {
  console.error(`\n${C.red("✗ ABORTING — this copy is not redundant:")}`);
  unsafe.forEach((u) => console.error(`    ${u}`));
  console.error(`\n  ${C.dim("Investigate before deleting. --force overrides, and you should not need it.")}\n`);
  process.exit(1);
}

/* ---------- 2. canary: catch a stale KNOWN_PARENTS before it costs anything ---------- */

console.log(`${C.bold("  canary — sampling collections outside KNOWN_PARENTS for missed subcollections")}\n`);
const nonParents = toPurge.filter((c) => !KNOWN_PARENTS.has(c));
const canaryPaths = [];
for (const c of nonParents) {
  for (const id of await sampleDocIds("(default)", c, CANARY_SAMPLE)) canaryPaths.push(`${c}/${id}`);
}
const canaryResults = await probeMany(canaryPaths);
const staleFound = [...canaryResults.entries()].filter(([, subs]) => subs.length);
if (staleFound.length) {
  console.error(`\n${C.red("✗ ABORTING — KNOWN_PARENTS is stale:")}`);
  staleFound.forEach(([p, subs]) => console.error(`    ${p} has subcollection(s): ${subs.join(", ")}`));
  console.error(`\n  ${C.dim("Add the root collection to KNOWN_PARENTS above and re-run.")}\n`);
  process.exit(1);
}
console.log(
  `  ${C.green("✓")} canary clean — ${canaryPaths.length} sample(s) across ${nonParents.length} collection(s), no missed subcollections\n`,
);

/* ---------- 3. collect, recursively ---------- */

const doomed = []; // { path, data }

async function walk(collectionPath, probe) {
  // db.listAll() already throws on a non-ok response (see
  // scripts/demo-seed/firestore.mjs). Previously that was swallowed here,
  // which meant a failed listing read as an empty collection: for a
  // subcollection, the parent would still be deleted while its children were
  // neither backed up nor removed — orphaned and unrecorded. Let it propagate
  // instead; the run aborts before anything is deleted.
  const docs = await db.listAll(collectionPath);
  const candidates = [];
  for (const d of docs) {
    const docPath = `${collectionPath}/${d.__id}`;
    if (collectionPath === KEEP_SUPERADMINS && String(d.role || "").toLowerCase() === "superadmin") {
      console.log(`    ${C.green("keep")} ${docPath.padEnd(46)} ${d.role} ${C.dim(d.name || "")}`);
      continue;
    }
    candidates.push({ d, docPath });
  }

  // Only KNOWN_PARENTS collections get a per-document subcollection probe — see
  // the comment on KNOWN_PARENTS for why probing everything is too slow, and the
  // canary above for why this is safe.
  const subsByPath = probe ? await probeMany(candidates.map((c) => c.docPath)) : null;

  for (const { d, docPath } of candidates) {
    // Subcollections first: a deleted parent would otherwise orphan them.
    for (const sub of subsByPath?.get(docPath) || []) {
      await walk(`${docPath}/${sub}`, false); // subcollections here are leaves, per KNOWN_PARENTS
    }
    doomed.push({ path: docPath, data: d });
  }
}

console.log(`\n${C.bold("  walking")}\n`);
for (const c of toPurge) await walk(c, KNOWN_PARENTS.has(c));
console.log(`\n  ${doomed.length} document(s) to delete`);

if (!doomed.length) {
  console.log(`\n  ${C.green("nothing to purge")}\n`);
  process.exit(0);
}

/* ---------- 3b. verify redundancy: nested collections ---------- */

/*
 * Step 1 compared the root collections. It could not compare subcollections,
 * because until the walk above ran we did not know which existed — and they are
 * the bulk of what this script deletes. So the same gate is applied again here,
 * now that every nested path is known, and still before anything is backed up
 * or removed.
 *
 * "here" is exact: the number of documents this run has actually collected at
 * that path, rather than a re-count of the database. "there" is one aggregation
 * query per nested path against the reference. Same rule as step 1 —
 * `there >= here`, --force overrides — and the same reason for it: a count that
 * cannot be read throws rather than returning a sentinel, because a sentinel
 * would silently disable the check it is part of.
 */
const doomedByCollection = new Map();
for (const d of doomed) {
  const collectionPath = d.path.slice(0, d.path.lastIndexOf("/"));
  doomedByCollection.set(collectionPath, (doomedByCollection.get(collectionPath) || 0) + 1);
}
// A nested path has slashes (`clients/<id>/sessions`); a root one does not.
const nestedPaths = [...doomedByCollection.keys()].filter((p) => p.includes("/"));

console.log(`\n${C.bold("  verifying every NESTED collection is already in " + REFERENCE)}\n`);

const nestedUnsafe = [];
/** Rolled up per subcollection id, so a thousand paths do not print a thousand lines. */
const perSub = new Map();

for (let i = 0; i < nestedPaths.length; i += PROBE_BATCH) {
  const batch = nestedPaths.slice(i, i + PROBE_BATCH);
  const theres = await Promise.all(
    batch.map((p) => {
      const at = p.lastIndexOf("/");
      return countOf(REFERENCE, p.slice(at + 1), p.slice(0, at));
    }),
  );
  batch.forEach((p, idx) => {
    const here = doomedByCollection.get(p);
    const there = theres[idx];
    if (there < here) nestedUnsafe.push(`${p}: (default)=${here}, ${REFERENCE}=${there}`);
    const sub = p.slice(p.lastIndexOf("/") + 1);
    const roll = perSub.get(sub) || { here: 0, there: 0, paths: 0 };
    perSub.set(sub, { here: roll.here + here, there: roll.there + there, paths: roll.paths + 1 });
  });
}

for (const [sub, roll] of [...perSub.entries()].sort()) {
  const ok = roll.there >= roll.here;
  console.log(
    `    ${ok ? C.green("✓") : C.red("✗")} ${sub.padEnd(22)} ${String(roll.here).padStart(6)} here, ${String(roll.there).padStart(6)} there  ${C.dim(`(${roll.paths} path(s))`)}`,
  );
}
if (!nestedPaths.length) console.log(`    ${C.dim("no nested collections were collected")}`);

if (nestedUnsafe.length && !FORCE) {
  console.error(`\n${C.red("✗ ABORTING — nested documents are not redundant:")}`);
  nestedUnsafe.slice(0, 40).forEach((u) => console.error(`    ${u}`));
  if (nestedUnsafe.length > 40) {
    console.error(`    ${C.dim(`... and ${nestedUnsafe.length - 40} more`)}`);
  }
  console.error(`\n  ${C.dim("Investigate before deleting. --force overrides, and you should not need it.")}\n`);
  process.exit(1);
}
console.log(
  `\n  ${C.green("✓")} ${nestedPaths.length} nested collection path(s) verified${
    nestedUnsafe.length ? C.yellow(`  — ${nestedUnsafe.length} NOT redundant, overridden by --force`) : ""
  }`,
);

/* ---------- 4. back up, then delete ---------- */

const dir = path.join(process.cwd(), "notification-backups", `control-plane-purge_${PROJECT}`);
mkdirSync(dir, { recursive: true });
// Timestamped, not static: commits go in chunks of 400, so a partial failure
// followed by a re-run must not let the smaller second doomed set overwrite
// the first run's backup — that would destroy the only record of what the
// partial run already deleted.
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join(dir, `purged_${stamp}.json`);
writeFileSync(file, JSON.stringify(doomed, null, 1), "utf8");
console.log(`  ${C.green("✓")} backed up to ${C.dim(file)}`);

if (DRY) {
  console.log(`\n  ${C.yellow("dry run — nothing deleted")}\n`);
  process.exit(0);
}

await db.commit(doomed.map((d) => db.deleteWrite(d.path)));

const remaining = await collectionIds("(default)");
console.log(`  ${C.green("✓")} deleted ${doomed.length}`);
console.log(`\n  ${C.bold("remaining root collections:")} ${remaining.join(", ")}\n`);
