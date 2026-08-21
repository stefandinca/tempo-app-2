#!/usr/bin/env node
/**
 * Sets the four clinics' licences.
 *
 * TWO WRITES PER CLINIC, AND THE ORDER IS THE SAFETY PROPERTY — the same
 * property src/app/api/platform/clinics/[id]/licence/route.ts enforces for the
 * console, and this script exists to seed the same records in bulk:
 *
 *   1. `tenants/{tenantId}.licence` in the CONTROL PLANE (the `(default)`
 *      database of the platform project) — the source of truth.
 *   2. `system_settings/licence` in the CLINIC'S OWN database — the mirror
 *      Firestore rules actually enforce against, because a rule cannot read
 *      another database.
 *
 * Registry first, mirror second, PER CLINIC (not all four registries then all
 * four mirrors). If a mirror write fails after its registry succeeded, the
 * console shows a licence that is not yet enforced: the clinic keeps working.
 * The reverse order would risk enforcing a licence the console cannot see — a
 * clinic frozen with no visible reason. Fail open, always, in the direction of
 * the clinic continuing to work — which is also why a mirror failure does not
 * abort the run or flip the exit code: the Health screen reports that drift
 * separately, so it is visible rather than assumed.
 *
 *   node scripts/set-licences.mjs --project=tempo-app-2 --dry-run
 *   node scripts/set-licences.mjs --project=tempo-app-2 --yes
 *
 * The licence maths (grace-period addition, plan validation) is NOT
 * recomputed here — it is imported from src/lib/platform/licence.ts, the same
 * dependency-free module scripts/test-licence.mjs loads directly, so this
 * script and the console route can never compute two different answers for
 * the same clinic.
 *
 * Every tenant document is verified to exist BEFORE anything is written. A
 * typo'd label must abort the whole run loudly — Firestore's `set()` would
 * otherwise happily create a stray `tenants/{typo}` document instead of
 * failing, which is a far worse outcome than refusing to run.
 */
import { Db } from "./demo-seed/firestore.mjs";
import { buildLicence, licenceMirror, DEFAULT_GRACE_DAYS } from "../src/lib/platform/licence.ts";
import { clinicDatabaseId } from "../src/lib/platform/labels.ts";

// Every existing clinic is on enterprise: they were onboarded by hand, before
// tiers were sold, and none of them agreed to a user or client ceiling. Putting
// a real clinic on a tier it never bought would cap it the moment limits start
// being enforced.
const LICENCES = {
  livebetterlife: { plan: "lifetime", tier: "enterprise", expiresAt: null },
  demo:           { plan: "lifetime", tier: "enterprise", expiresAt: null },
  diaconumaria:   { plan: "term", tier: "enterprise", expiresAt: "2027-08-20T00:00:00.000Z" },
  aicaa:          { plan: "term", tier: "enterprise", expiresAt: "2027-08-20T00:00:00.000Z" },
};

/** Who `updatedBy` names on a script-written licence, as opposed to a console admin's uid. */
const ACTOR = "script:set-licences.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const DRY = !!args["dry-run"];
const YES = !!args.yes;

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project is required")}\n`);
  console.error(`  node scripts/set-licences.mjs --project=tempo-app-2 --dry-run\n`);
  process.exit(1);
}
if (!DRY && !YES) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run to preview).\n`);
  process.exit(1);
}

/**
 * A human date for a value only Firestore rules should ever read as a raw
 * integer. Formatted by hand rather than through `toLocaleDateString` — that
 * depends on the ICU data the running Node build was compiled with, and this
 * script's whole purpose is a review a person can trust regardless of where
 * it runs. UTC, not local time: `expiresAt` is always UTC midnight, and
 * `graceEndsAtMillis` is derived from it, so reading either through a
 * negative-offset local timezone would print the wrong day.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function humanDate(ms) {
  if (ms === null) return "never (lifetime)";
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** A handle on one named database of the same project — mirrors register-tenant.mjs. */
function databaseHandle(project, database) {
  const db = new Db(project, { allowAnyProject: true, database });
  db.dryRun = DRY;
  return db;
}

const control = new Db(PROJECT, { allowAnyProject: true });
control.dryRun = DRY;

console.log(`\n${C.bold("Set clinic licences")}`);
console.log(`  project : ${PROJECT}${DRY ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  clinics : ${Object.keys(LICENCES).length}\n`);

// ---------------------------------------------------------------------------
// Pre-flight: every tenant document must exist, and if the registry names an
// explicit databaseId, it must agree with clinic-<label>. Nothing is written
// until every clinic in the table has cleared this — a partial run that wrote
// three clinics and then discovered the fourth was a typo would leave the
// registry and the mirrors disagreeing about how many clinics have a licence.
// ---------------------------------------------------------------------------
let tenantDocs;
try {
  tenantDocs = await control.listAll("tenants");
} catch (e) {
  console.error(`\n${C.red("✗ could not read the tenant registry")}: ${e.message}\n`);
  process.exit(1);
}
const byLabel = Object.fromEntries(tenantDocs.map((d) => [d.__id, d]));

const problems = [];
const resolved = [];
for (const label of Object.keys(LICENCES)) {
  const doc = byLabel[label];
  if (!doc) {
    problems.push(`"${label}" has no tenants/${label} document — run register-tenant.mjs first, or fix the typo.`);
    continue;
  }
  const expected = clinicDatabaseId(label);
  const registered = typeof doc.databaseId === "string" && doc.databaseId ? doc.databaseId : null;
  if (registered && registered !== expected) {
    problems.push(
      `"${label}": tenants/${label}.databaseId is "${registered}", but the label derives "${expected}" — ` +
      `these must agree before a licence is written to either.`,
    );
    continue;
  }
  resolved.push({ label, name: doc.name || label, databaseId: registered || expected });
}

if (problems.length) {
  console.error(`${C.red(`✗ ${problems.length} clinic(s) failed pre-flight — nothing was written`)}\n`);
  problems.forEach((p) => console.error(`  ${C.red("-")} ${p}`));
  console.error("");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Per clinic: build the licence, print it for review, then write registry
// before mirror.
// ---------------------------------------------------------------------------
const results = [];

for (const { label, name, databaseId } of resolved) {
  const cfg = LICENCES[label];
  const built = buildLicence(
    { plan: cfg.plan, tier: cfg.tier, expiresAt: cfg.expiresAt, graceDays: DEFAULT_GRACE_DAYS, notes: "" },
    ACTOR,
  );
  if ("error" in built) {
    console.error(`\n${C.red(`✗ ${label}: licence table is invalid`)} — ${built.error}. Aborting, nothing more will be written.\n`);
    process.exit(1);
  }

  console.log(`${C.bold(name)} ${C.dim(`(${label} -> ${databaseId})`)}`);
  console.log(`  plan            : ${built.plan}`);
  console.log(`  tier            : ${built.tier}`);
  console.log(`  expires         : ${built.expiresAt ? `${built.expiresAt}  ${C.dim(`(${humanDate(Date.parse(built.expiresAt))})`)}` : "never"}`);
  console.log(`  graceEndsAtMillis: ${built.graceEndsAtMillis === null ? "null" : built.graceEndsAtMillis}  ${C.dim(`-> ${humanDate(built.graceEndsAtMillis)}`)}`);

  // 1. Source of truth.
  let registryOk = true;
  try {
    await control.commit([control.mergeWrite(`tenants/${label}`, { licence: built })]);
    console.log(`  ${C.green("✓")} ${DRY ? "would merge" : "merged"} tenants/${label}.licence`);
  } catch (e) {
    registryOk = false;
    console.log(`  ${C.red("✗")} registry write failed: ${e.message}`);
  }

  // 2. The mirror rules read. A failure here leaves the clinic unrestricted —
  //    the safe direction — so it is reported rather than retried or rolled
  //    back. Attempted only if the registry write actually landed.
  let mirrored = false;
  if (registryOk) {
    try {
      const clinicDb = databaseHandle(PROJECT, databaseId);
      await clinicDb.commit([clinicDb.mergeWrite("system_settings/licence", licenceMirror(built))]);
      mirrored = true;
      console.log(`  ${C.green("✓")} ${DRY ? "would mirror" : "mirrored"} ${databaseId}/system_settings/licence`);
    } catch (e) {
      console.log(`  ${C.yellow("!")} mirror failed — clinic stays unrestricted until this is retried: ${e.message}`);
    }
  } else {
    console.log(`  ${C.dim("- mirror skipped (registry write did not land)")}`);
  }

  console.log("");
  results.push({ label, registryOk, mirrored });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const registryCount = results.filter((r) => r.registryOk).length;
const mirrorCount = results.filter((r) => r.mirrored).length;
const verb = DRY ? "would write" : "wrote";

console.log(`${C.bold("Summary")}`);
results.forEach((r) => {
  const mark = r.registryOk ? C.green("✓") : C.red("✗");
  const mirrorMark = r.mirrored ? C.green("mirrored") : r.registryOk ? C.yellow("NOT mirrored") : C.dim("skipped");
  console.log(`  ${mark} ${r.label.padEnd(16)} registry: ${r.registryOk ? "ok" : "FAILED"}   mirror: ${mirrorMark}`);
});
console.log(`\n  ${verb} ${registryCount}/${results.length} registry entries, ${mirrorCount}/${results.length} mirrors\n`);

if (registryCount !== results.length) {
  console.error(`${C.red("✗ one or more registry writes failed")} — re-run for the affected clinic(s) once the cause is fixed.\n`);
  process.exitCode = 1;
} else if (mirrorCount !== results.length && !DRY) {
  console.log(`${C.yellow("! one or more mirrors did not land")} — those clinics are unrestricted, not broken. Check Health and re-run.\n`);
}
