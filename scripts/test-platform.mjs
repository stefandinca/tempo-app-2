#!/usr/bin/env node
/**
 * Assertions for the platform console.
 *
 *   node scripts/test-platform.mjs                       # pure functions only
 *   node scripts/test-platform.mjs --base=https://superadmin.tempoapp.ro
 *
 * The label check is the one that matters most: an unvalidated label reaching
 * adminDb() is how a typo becomes a read of the wrong clinic's database.
 *
 * labels.ts is imported DYNAMICALLY, twice, and that is deliberate. Its
 * platform-host allowlist is built once, at import time, from NODE_ENV: the
 * loopback entries are development-only, because `Host` is supplied by the
 * caller and accepting `Host: localhost` on the deployed console would undo
 * the gate. Testing both builds therefore means setting NODE_ENV before each
 * import, which a static import — hoisted and evaluated before any statement
 * here could run — cannot accommodate. It also makes this file's assertions
 * independent of whatever NODE_ENV the runner happened to inherit. The query
 * strings are what stop Node's module cache from handing back the first
 * instance for the second import.
 */
process.env.NODE_ENV = "development";
const { clinicDatabaseId, isPlatformHost } = await import(
  "../src/lib/platform/labels.ts?env=development"
);

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
check("a bare IP with a port", isPlatformHost(reqWithHost("127.0.0.1:3000")), true);
check("a missing Host header is refused, not accepted", isPlatformHost(reqWithHost(null)), false);
check("a clinic host is not the platform", isPlatformHost(reqWithHost("livebetterlife.tempoapp.ro")), false);
check("a Vercel preview deploy is not the platform", isPlatformHost(reqWithHost("tempo-app-2.vercel.app")), false);
check("an arbitrary domain is not the platform", isPlatformHost(reqWithHost("evil.com")), false);
// A prefix match is not a match: the allowlist compares with Set.has (exact
// equality), never startsWith, so a host that merely begins with the
// canonical name must still be refused.
check("a host merely starting with the canonical name is not the platform", isPlatformHost(reqWithHost("superadmin.tempoapp.ro.evil.com")), false);
// `Host` brackets an IPv6 literal because the address itself contains colons
// (RFC 3986 §3.2.2) — `[::1]:3000`, not `::1:3000`. Naive `split(":")[0]`
// port-stripping truncates that to `[`; neither the mangled nor the correctly
// parsed form is on the allowlist, so both are refused — but for the right
// reason, which matters the day this allowlist ever grows to include one.
check("an IPv6 literal with a port is not the platform", isPlatformHost(reqWithHost("[::1]:3000")), false);
check("an IPv6 literal without a port is not the platform", isPlatformHost(reqWithHost("[::1]")), false);

console.log(`
${C.bold("loopback is development-only")}
`);

// A second, separate instance of the module, built as production sees it.
process.env.NODE_ENV = "production";
const prod = await import("../src/lib/platform/labels.ts?env=production");
process.env.NODE_ENV = "development";

check("localhost is refused in a production build", prod.isPlatformHost(reqWithHost("localhost")), false);
check("localhost:3000 is refused in a production build", prod.isPlatformHost(reqWithHost("localhost:3000")), false);
check("127.0.0.1 is refused in a production build", prod.isPlatformHost(reqWithHost("127.0.0.1")), false);
check("the canonical host still passes in production", prod.isPlatformHost(reqWithHost("superadmin.tempoapp.ro")), true);
// The dev-build assertions above are only meaningful if the two builds really
// are separate module instances rather than one cached copy.
check("the dev build still accepts localhost", isPlatformHost(reqWithHost("localhost")), true);

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
