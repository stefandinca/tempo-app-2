#!/usr/bin/env node
/**
 * The window logic for licence-expiry notices.
 *
 * Both failure modes here are silent. Sending twice looks like an eager system;
 * never sending looks like a quiet one — and the second is what charges a card
 * with no warning. Neither throws, neither fails a build, and neither is
 * visible from any screen. So they are asserted.
 *
 *   node --experimental-strip-types --no-warnings scripts/test-notices.mjs
 */
import { WINDOWS, daysUntil, windowFor } from "../src/lib/platform/noticeWindows.ts";

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

console.log(`\n${C.bold("licence notice windows")}\n`);

const NOW = Date.parse("2026-08-22T08:00:00.000Z");
const inDays = (n) => new Date(NOW + n * 86400000).toISOString();
const key = (d, already = {}) => windowFor(d, already)?.key ?? null;

check("two windows, seven days and one", WINDOWS.map((w) => w.days), [7, 1]);

check("30 days out: nothing yet", key(30), null);
check("8 days out: still nothing", key(8), null);
check("exactly 7 days: the first notice", key(7), "d7");
check("4 days: still the 7-day one if unsent", key(4), "d7");
check("1 day: the last call", key(1, { d7: "sent" }), "d1");
check("0 days — expires today, still warn", key(0, { d7: "sent" }), "d1");

// The one that decides whether a customer is emailed twice a week.
check("already sent d7, 5 days left: silence", key(5, { d7: "sent" }), null);
check("both sent: silence", key(1, { d7: "s", d1: "s" }), null);

// A cron that missed days must send LATE, never not at all. `<=` rather than
// `===` is the whole reason; a deploy or an outage on day 23 would otherwise
// skip the notice permanently.
check("cron missed the 7-day mark, 3 days left", key(3), "d7");
check("cron missed everything, 1 day left", key(1), "d7");

// Past expiry there is nothing to warn about — the charge or the lapse has
// already happened, and a warning would be a lie about the future.
check("expired yesterday: nothing", key(-1), null);
check("long expired: nothing", key(-40), null);

// A licence with no usable expiry must not be treated as "expires now", which
// would email every clinic holding a malformed date.
check("unparseable expiry yields NaN", Number.isNaN(daysUntil("not-a-date")), true);
check("NaN selects no window", key(daysUntil("not-a-date")), null);

console.log(`\n${C.bold("day counting")}\n`);
check("exactly 7 days ahead", daysUntil(inDays(7), NOW), 7);
check("same instant is zero", daysUntil(inDays(0), NOW), 0);
// Rounded UP, so a licence expiring in 6 hours reads as 1 day rather than 0 —
// "expires tomorrow" is the honest thing to tell somebody at 8am.
check("six hours ahead rounds to one day", daysUntil(new Date(NOW + 6 * 3600000).toISOString(), NOW), 1);

if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
