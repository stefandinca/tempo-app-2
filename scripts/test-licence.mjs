#!/usr/bin/env node
/**
 * Licence maths and, from Task 6, the rules enforcement matrix.
 *
 *   npm run test:licence
 *
 * The maths matters because `graceEndsAtMillis` is what Firestore rules compare
 * against. Get it wrong and either a paid clinic is frozen or an expired one
 * never stops — and neither is visible until it happens to someone.
 */
import { buildLicence, DEFAULT_GRACE_DAYS } from "../src/lib/platform/licence.ts";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
const failures = [];

function check(what, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${what.padEnd(58)} ${C.dim(`-> ${JSON.stringify(actual)}`)}`);
  } else {
    failures.push(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ${C.red("✗")} ${what.padEnd(58)} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log(`\n${C.bold("licence maths")}\n`);

const lifetime = buildLicence(
  { plan: "lifetime", expiresAt: null, graceDays: DEFAULT_GRACE_DAYS, notes: "" },
  "uid1",
);
check("a lifetime licence never expires", lifetime.graceEndsAtMillis, null);
check("a lifetime licence keeps no expiry date", lifetime.expiresAt, null);

const term = buildLicence(
  { plan: "term", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: 14, notes: "" },
  "uid1",
);
check(
  "grace is added to the expiry",
  term.graceEndsAtMillis,
  Date.parse("2027-08-20T00:00:00.000Z") + 14 * 86400000,
);
check("zero grace means the expiry itself",
  buildLicence({ plan: "term", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: 0, notes: "" }, "u").graceEndsAtMillis,
  Date.parse("2027-08-20T00:00:00.000Z"));

console.log(`\n${C.bold("refusals — a bad licence must never be stored")}\n`);

check("a term licence with no date is refused",
  buildLicence({ plan: "term", expiresAt: null, graceDays: 14, notes: "" }, "u").error,
  "expiry_required");
check("an unparseable date is refused",
  buildLicence({ plan: "term", expiresAt: "not a date", graceDays: 14, notes: "" }, "u").error,
  "invalid_expiry");
check("negative grace is refused",
  buildLicence({ plan: "term", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: -1, notes: "" }, "u").error,
  "invalid_grace");
check("an unknown plan is refused",
  buildLicence({ plan: "forever", expiresAt: null, graceDays: 14, notes: "" }, "u").error,
  "invalid_plan");
check("a lifetime licence ignores any date it is handed",
  buildLicence({ plan: "lifetime", expiresAt: "2027-08-20T00:00:00.000Z", graceDays: 14, notes: "" }, "u").expiresAt,
  null);

console.log("");
if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
