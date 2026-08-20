#!/usr/bin/env node
/**
 * Assertions for the platform console.
 *
 *   node scripts/test-platform.mjs                       # pure functions only
 *   node scripts/test-platform.mjs --base=https://superadmin.tempoapp.ro
 *
 * The label check is the one that matters most: an unvalidated label reaching
 * adminDb() is how a typo becomes a read of the wrong clinic's database.
 */
import { clinicDatabaseId, isPlatformHost } from "../src/lib/platform/labels.ts";

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
    console.log(`  ${C.green("✓")} ${what.padEnd(52)} ${C.dim(`-> ${actual}`)}`);
  } else {
    failures.push(`${what}: expected ${expected}, got ${actual}`);
    console.log(`  ${C.red("✗")} ${what.padEnd(52)} expected ${expected}, got ${actual}`);
  }
}

console.log(`\n${C.bold("clinic label -> database id")}\n`);

check("a real clinic", clinicDatabaseId("aicaa"), "clinic-aicaa");
check("hyphens are allowed inside", clinicDatabaseId("live-better-life"), "clinic-live-better-life");
check("upper case is refused", clinicDatabaseId("Aicaa"), null);
check("a leading hyphen is refused", clinicDatabaseId("-aicaa"), null);
check("a trailing hyphen is refused", clinicDatabaseId("aicaa-"), null);
check("one character is refused", clinicDatabaseId("a"), null);
check("empty is refused", clinicDatabaseId(""), null);
check("a path traversal is refused", clinicDatabaseId("../default"), null);
check("a slash is refused", clinicDatabaseId("aicaa/x"), null);
check("the control plane cannot be named", clinicDatabaseId("(default)"), null);
check("an already-prefixed id is refused", clinicDatabaseId("clinic-aicaa"), "clinic-clinic-aicaa");

console.log(`
${C.bold("is this request on the platform host?")}
`);

const reqWithHost = (h) => ({ headers: { get: (n) => (n.toLowerCase() === "host" ? h : null) } });

check("the canonical host", isPlatformHost(reqWithHost("superadmin.tempoapp.ro")), true);
check("the canonical host with a port", isPlatformHost(reqWithHost("superadmin.tempoapp.ro:443")), true);
check("mixed case", isPlatformHost(reqWithHost("SuperAdmin.TempoApp.ro")), true);
check("localhost", isPlatformHost(reqWithHost("localhost")), true);
check("localhost with a port", isPlatformHost(reqWithHost("localhost:3000")), true);
check("a bare IP", isPlatformHost(reqWithHost("127.0.0.1")), true);
check("a missing Host header is refused, not accepted", isPlatformHost(reqWithHost(null)), false);
check("a clinic host is not the platform", isPlatformHost(reqWithHost("livebetterlife.tempoapp.ro")), false);
check("a Vercel preview deploy is not the platform", isPlatformHost(reqWithHost("tempo-app-2.vercel.app")), false);
check("an arbitrary domain is not the platform", isPlatformHost(reqWithHost("evil.com")), false);

const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "";

if (BASE) {
  console.log(`\n${C.bold("routes are closed without a token")}  ${C.dim(BASE)}\n`);
  for (const path of [
    "/api/platform/clinics",
    "/api/platform/bug-reports",
    "/api/platform/leads",
    "/api/platform/ai-usage",
    "/api/platform/health",
  ]) {
    const res = await fetch(`${BASE}${path}`);
    check(`GET ${path} unauthenticated`, res.status, 401);
  }

  // A clinic host must not even admit these exist.
  const onClinic = await fetch("https://livebetterlife.tempoapp.ro/api/platform/clinics");
  check("a clinic host hides the platform routes", onClinic.status, 404);
} else {
  console.log(`\n  ${C.dim("no --base given; skipping route assertions")}`);
}

console.log("");
if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
