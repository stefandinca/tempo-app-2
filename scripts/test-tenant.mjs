#!/usr/bin/env node
/**
 * Tests the hostname -> database / bucket mapping.
 *
 *   node --experimental-strip-types scripts/test-tenant.mjs
 *   npm run test:tenant
 *
 * This mapping is a security boundary: it is the only thing deciding which
 * clinic's records a browser session reads and writes. A hostname that resolves
 * one label too generously hands one clinic another clinic's client files, and
 * nothing in the UI would look wrong. So the unrecognised cases matter as much
 * as the happy ones, and every case is asserted rather than eyeballed.
 *
 * Unknown hosts deliberately fall back to `(default)` — the control plane, which
 * holds no clinical records and whose Firestore rules deny clients outright.
 * Failing closed to an empty database beats guessing a tenant.
 */
import {
  resolveDatabaseId,
  resolveStorageBucket,
  tenantBucket,
  tenantIdFromHostname,
  tenantEnvSuffix,
  isDemoHost,
  DEFAULT_DATABASE_ID,
} from "../src/lib/tenant.ts";

const PLATFORM_BUCKET = "tempo-app-2.firebasestorage.app";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
const failures = [];

function check(what, actual, expected) {
  if (actual === expected) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${what} ${C.dim(`-> ${actual}`)}`);
  } else {
    failures.push(`${what}: expected ${expected}, got ${actual}`);
    console.log(`  ${C.red("✗")} ${what} -> ${actual} ${C.red(`(expected ${expected})`)}`);
  }
}

console.log(`\n${C.bold("hostname -> database")}\n`);

const DATABASE_CASES = [
  // A clinic subdomain is the only thing that selects a clinic database.
  ["diaconumaria.tempoapp.ro", "clinic-diaconumaria"],
  ["livebetterlife.tempoapp.ro", "clinic-livebetterlife"],
  ["demo.tempoapp.ro", "clinic-demo"],
  ["DiaconuMaria.TempoApp.ro", "clinic-diaconumaria"],   // case is not significant
  ["diaconumaria.tempoapp.ro:3000", "clinic-diaconumaria"], // a port is not part of the host
  ["clinic-with-hyphens.tempoapp.ro", "clinic-clinic-with-hyphens"],

  // The platform itself, not a clinic.
  ["tempoapp.ro", DEFAULT_DATABASE_ID],
  ["www.tempoapp.ro", DEFAULT_DATABASE_ID],
  ["admin.tempoapp.ro", DEFAULT_DATABASE_ID],
  ["app.tempoapp.ro", DEFAULT_DATABASE_ID],
  ["api.tempoapp.ro", DEFAULT_DATABASE_ID],

  // Development and preview deploys must never reach a clinic by accident.
  ["localhost", DEFAULT_DATABASE_ID],
  ["localhost:3000", DEFAULT_DATABASE_ID],
  ["127.0.0.1", DEFAULT_DATABASE_ID],
  ["tempo-app-2-git-feat-abc.vercel.app", DEFAULT_DATABASE_ID],
  ["anything.preview.vercel.app", DEFAULT_DATABASE_ID],

  // Malformed or hostile labels resolve to nothing rather than to a neighbour.
  ["", DEFAULT_DATABASE_ID],
  ["-leading.tempoapp.ro", DEFAULT_DATABASE_ID],
  ["trailing-.tempoapp.ro", DEFAULT_DATABASE_ID],
  ["UPPER_SCORE.tempoapp.ro", DEFAULT_DATABASE_ID],
  ["a.tempoapp.ro", DEFAULT_DATABASE_ID],               // one character fails the pattern
  [`${"x".repeat(60)}.tempoapp.ro`, DEFAULT_DATABASE_ID], // too long for a database id
];

for (const [host, expected] of DATABASE_CASES) {
  check(`"${host}"`.padEnd(44), resolveDatabaseId(host), expected);
}

console.log(`\n${C.bold("hostname -> storage bucket")}\n`);

const BUCKET_CASES = [
  ["diaconumaria.tempoapp.ro", "tempo-app-2-diaconumaria"],
  ["livebetterlife.tempoapp.ro", "tempo-app-2-livebetterlife"],
  ["demo.tempoapp.ro", "tempo-app-2-demo"],

  // Everything that is not a clinic keeps the project's own bucket.
  ["tempoapp.ro", PLATFORM_BUCKET],
  ["www.tempoapp.ro", PLATFORM_BUCKET],
  ["localhost", PLATFORM_BUCKET],
  ["tempo-app-2-git-feat-abc.vercel.app", PLATFORM_BUCKET],
  ["", PLATFORM_BUCKET],
];

for (const [host, expected] of BUCKET_CASES) {
  check(`"${host}"`.padEnd(44), resolveStorageBucket(host, PLATFORM_BUCKET), expected);
}

console.log(`\n${C.bold("hostname -> tenant label")}\n`);

// One deployment serves every clinic, so anything configured per clinic is
// keyed off this label — including which Anthropic key pays for that clinic's
// Mira usage.
const LABEL_CASES = [
  ["diaconumaria.tempoapp.ro", "diaconumaria"],
  ["livebetterlife.tempoapp.ro", "livebetterlife"],
  ["demo.tempoapp.ro", "demo"],
  ["tempoapp.ro", ""],
  ["www.tempoapp.ro", ""],
  ["localhost", ""],
  ["tempo-app-2-git-abc.vercel.app", ""],
];
for (const [host, expected] of LABEL_CASES) {
  check(`"${host}"`.padEnd(44), tenantIdFromHostname(host), expected);
}

check("env suffix for a hyphenated label".padEnd(44), tenantEnvSuffix("clinic-two"), "CLINIC_TWO");
check("env suffix is upper case".padEnd(44), tenantEnvSuffix("diaconumaria"), "DIACONUMARIA");

// Demo mode used to be a build-time env var. With one deployment serving every
// clinic that would make all of them demos, or none — so it comes from the host.
check("demo host is demo mode".padEnd(44), isDemoHost("demo.tempoapp.ro"), true);
check("a real clinic is NOT demo mode".padEnd(44), isDemoHost("livebetterlife.tempoapp.ro"), false);
check("the other real clinic is NOT demo".padEnd(44), isDemoHost("diaconumaria.tempoapp.ro"), false);
check("the platform host is NOT demo mode".padEnd(44), isDemoHost("tempoapp.ro"), false);

console.log(`\n${C.bold("invariants")}\n`);

// The two resolvers must never disagree: a host on a clinic database must be on
// that clinic's bucket, and a host on (default) must be on the platform bucket.
for (const [host] of [...DATABASE_CASES, ...BUCKET_CASES]) {
  const databaseId = resolveDatabaseId(host);
  const expected =
    databaseId === DEFAULT_DATABASE_ID
      ? PLATFORM_BUCKET
      : tenantBucket(databaseId.slice("clinic-".length), PLATFORM_BUCKET);
  if (resolveStorageBucket(host, PLATFORM_BUCKET) !== expected) {
    failures.push(`database and bucket disagree for "${host}"`);
  }
}
check("database and bucket agree on every case".padEnd(44), failures.length, 0);

// Bucket names are capped at 63 characters; the longest label we accept is 50.
const longest = tenantBucket("x".repeat(50), PLATFORM_BUCKET);
check(`longest possible name is a legal bucket`.padEnd(44), longest.length <= 63, true);

// No clinic may ever derive the platform's own bucket.
check(
  "no clinic can derive the platform bucket".padEnd(44),
  DATABASE_CASES.some(
    ([h]) => resolveDatabaseId(h) !== DEFAULT_DATABASE_ID && resolveStorageBucket(h, PLATFORM_BUCKET) === PLATFORM_BUCKET,
  ),
  false,
);

if (failures.length) {
  console.log(`\n${C.red(`✗ ${failures.length} failure(s)`)}`);
  failures.forEach((f) => console.log(`    ${f}`));
  console.log();
  process.exit(1);
}
console.log(`\n${C.green(`✓ ${passed} assertions passed`)}\n`);
