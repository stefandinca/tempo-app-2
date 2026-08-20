#!/usr/bin/env node
/**
 * Tests reading a timestamp field that might be either shape.
 *
 *   node --experimental-strip-types scripts/test-timestamps.mjs
 *   npm run test:timestamps
 *
 * Timestamp fields in this database hold TWO types. Anything the app wrote
 * carries a Firestore `Timestamp`; almost everything older carries an ISO
 * **string**, because the tenant migration round-tripped every document through
 * the REST API and its decoder turns `timestampValue` into a plain string.
 *
 * Both ways of getting that wrong shipped to production, so both are asserted
 * here rather than left to a reviewer to notice again:
 *
 *   `value?.toDate()`        threw on a string and crashed the Messages page —
 *                            `?.` guards the field being absent, not the method
 *                            being missing.
 *   `value?.toDate?.() || X` swallowed the string and fell through to X. With
 *                            X = `new Date()`, every row of the audit trail
 *                            claimed to have happened just now.
 */
import { toDateOrNull, toISO, toMillis } from "../src/lib/timestamps.ts";

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
    console.log(`  ${C.green("✓")} ${what.padEnd(56)} ${C.dim(`-> ${actual}`)}`);
  } else {
    failures.push(`${what}: expected ${expected}, got ${actual}`);
    console.log(`  ${C.red("✗")} ${what.padEnd(56)} expected ${expected}, got ${actual}`);
  }
}

/** A Firestore Timestamp, near enough — the helper duck-types `toDate`. */
const stamp = (iso) => ({ toDate: () => new Date(iso) });

const ISO = "2026-04-08T12:12:50.101Z";

console.log(`\n${C.bold("the two shapes the data actually holds")}\n`);

check("a Timestamp becomes its instant", toISO(stamp(ISO)), ISO);
check("a migrated ISO string becomes the SAME instant", toISO(ISO), ISO);
check("both shapes agree", toISO(stamp(ISO)) === toISO(ISO), true);

console.log(`\n${C.bold("regressions — these exact failures shipped")}\n`);

// The audit trail: a string must not be discarded in favour of `now`.
const beforeNow = Date.now() - 60_000;
check(
  "a string is NOT silently replaced by the current time",
  toMillis(ISO) < beforeNow,
  true,
);

// The Messages page: a string must not throw.
let threw = false;
try {
  toDateOrNull(ISO);
  toDateOrNull(stamp(ISO));
} catch {
  threw = true;
}
check("reading a string does not throw", threw, false);

console.log(`\n${C.bold("everything else a field might contain")}\n`);

check("a Date passes through", toISO(new Date(ISO)), ISO);
check("epoch millis are accepted", toISO(new Date(ISO).getTime()), ISO);
check("null is null, not now", toISO(null), null);
check("undefined is null, not now", toISO(undefined), null);
check("an unparseable string is null", toISO("not a date"), null);
check("an empty string is null", toISO(""), null);
check("a bare object is null", toISO({}), null);
check("an Invalid Date is null", toISO(new Date("nonsense")), null);
check("a Timestamp yielding Invalid Date is null", toISO(stamp("nonsense")), null);

// A Timestamp whose toDate() throws must not take the page down with it.
check(
  "a throwing toDate() is null rather than an exception",
  toISO({ toDate: () => { throw new Error("boom"); } }),
  null,
);

console.log(`\n${C.bold("ordering is preserved across the two shapes")}\n`);

const older = "2026-01-01T00:00:00.000Z";
const newer = "2026-09-01T00:00:00.000Z";
check(
  "a string sorts against a Timestamp correctly",
  toMillis(older) < toMillis(stamp(newer)),
  true,
);

console.log("");
if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  console.log("");
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
