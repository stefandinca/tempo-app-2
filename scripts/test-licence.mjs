#!/usr/bin/env node
/**
 * Licence maths, and the rules enforcement matrix that depends on it.
 *
 *   npm run test:licence
 *
 * The maths matters because `graceEndsAtMillis` is what Firestore rules compare
 * against. Get it wrong and either a paid clinic is frozen or an expired one
 * never stops — and neither is visible until it happens to someone.
 *
 * The rules half evaluates `firestore.rules` against simulated requests through
 * the Firebase Rules test API, exactly as `scripts/test-rules.mjs` does: it
 * DEPLOYS NOTHING and touches no data. What it really guards is not that an
 * expired clinic stops writing — that is the easy half — but that it keeps
 * READING, that its parents are untouched, and that its audit trail keeps
 * accepting entries. Those are the assertions to be afraid of breaking.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
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
check("notes over 2000 characters are refused",
  buildLicence({ plan: "lifetime", expiresAt: null, graceDays: 14, notes: "x".repeat(2001) }, "u").error,
  "notes_too_long");

// ---------------------------------------------------------------------------
// Rules enforcement. Evaluated through the Firebase Rules test API against the
// local firestore.rules text — nothing is deployed and no data is touched.
// ---------------------------------------------------------------------------

const PROJECT = "tempo-app-demo";
const D = "/databases/(default)/documents";
const NOW = "2026-08-21T10:00:00Z";
const NOW_MS = Date.parse(NOW);

/** The mirror at system_settings/licence, mocked three ways. */
const licenceMock = (graceEndsAtMillis) => [
  { function: "exists", args: [{ exact_value: `${D}/system_settings/licence` }], result: { value: true } },
  {
    function: "get",
    args: [{ exact_value: `${D}/system_settings/licence` }],
    result: {
      value: {
        data: graceEndsAtMillis === null
          ? { plan: "lifetime", graceEndsAtMillis: null }
          : { plan: "term", graceEndsAtMillis },
      },
    },
  },
];
/** No mirror at all — where every clinic sits until its mirror is written. */
const NO_LICENCE = [
  { function: "exists", args: [{ exact_value: `${D}/system_settings/licence` }], result: { value: false } },
  { function: "get", args: [{ exact_value: `${D}/system_settings/licence` }], result: { value: { data: {} } } },
];
const LIVE = licenceMock(NOW_MS + 30 * 86400000);
const EXPIRED = licenceMock(NOW_MS - 86400000);
const LIFETIME = licenceMock(null);

const member = (uid, role) => [
  { function: "exists", args: [{ exact_value: `${D}/team_members/${uid}` }], result: { value: true } },
  { function: "get", args: [{ exact_value: `${D}/team_members/${uid}` }], result: { value: { data: { role } } } },
];
/** A parent signs in anonymously: no team_members document at all. */
const outsider = (uid) => [
  { function: "exists", args: [{ exact_value: `${D}/team_members/${uid}` }], result: { value: false } },
];
const client = (id, data) => [
  { function: "get", args: [{ exact_value: `${D}/clients/${id}` }], result: { value: { data } } },
];
/** The protocol opt-out list of this clinic; null means no document, all enabled. */
const evalAccess = (disabled) => [
  {
    function: "exists",
    args: [{ exact_value: `${D}/system_settings/evaluation_access` }],
    result: { value: disabled !== null },
  },
  {
    function: "get",
    args: [{ exact_value: `${D}/system_settings/evaluation_access` }],
    result: { value: { data: { disabled: disabled || [] } } },
  },
];
const thread = (id, data) => [
  { function: "get", args: [{ exact_value: `${D}/threads/${id}` }], result: { value: { data } } },
];

// [name, expectation, method, path, auth, mocks, request.resource.data, resource.data]
const rulesCases = [
  // --- the gate itself ---
  ["no licence document — therapist creates an event", "ALLOW", "create", `${D}/events/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...NO_LICENCE], { clientId: "c1", therapistId: "t1" }],
  ["grace not elapsed — therapist creates an event", "ALLOW", "create", `${D}/events/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...LIVE], { clientId: "c1", therapistId: "t1" }],
  ["lifetime licence — therapist creates an event", "ALLOW", "create", `${D}/events/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...LIFETIME], { clientId: "c1", therapistId: "t1" }],
  ["grace elapsed — therapist creates an event", "DENY", "create", `${D}/events/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED], { clientId: "c1", therapistId: "t1" }],
  ["grace elapsed — therapist updates their own event", "DENY", "update", `${D}/events/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED],
    { clientId: "c1", therapistId: "t1", notes: "x" }, { clientId: "c1", therapistId: "t1" }],

  // --- READS ARE NEVER GATED ---
  ["grace elapsed — therapist READS an event", "ALLOW", "get", `${D}/events/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED], null, { clientId: "c1", therapistId: "t1" }],
  ["grace elapsed — admin READS a client", "ALLOW", "get", `${D}/clients/c1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED]],
  ["grace elapsed — staff READS an evaluation", "ALLOW", "get", `${D}/clients/c1/evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(null), ...EXPIRED]],
  ["grace elapsed — admin READS an invoice", "ALLOW", "get", `${D}/invoices/i1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], null, { clientId: "c1", total: 100 }],
  ["grace elapsed — staff READS the roster", "ALLOW", "get", `${D}/team_members/t2`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED]],

  // --- staff writes stop ---
  ["grace elapsed — admin updates a client", "DENY", "update", `${D}/clients/c1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { name: "Y" }, { name: "X" }],
  ["grace elapsed — coordinator creates a client", "DENY", "create", `${D}/clients/c2`,
    { uid: "c2" }, [...member("c2", "Coordinator"), ...EXPIRED], { name: "New" }],
  ["grace elapsed — staff writes an ABLLS-R evaluation", "DENY", "create", `${D}/clients/c1/evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(null), ...EXPIRED], { scores: {} }],
  ["grace elapsed — staff writes a VB-MAPP evaluation", "DENY", "create", `${D}/clients/c1/vbmapp_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(null), ...EXPIRED], { scores: {} }],
  ["grace elapsed — coordinator writes an intervention plan", "DENY", "create", `${D}/clients/c1/interventionPlans/p1`,
    { uid: "c2" }, [...member("c2", "Coordinator"), ...EXPIRED], { goals: [] }],
  ["grace elapsed — therapist creates homework", "DENY", "create", `${D}/clients/c1/homework/h1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED], { title: "T" }],
  ["grace elapsed — therapist uploads a video", "DENY", "create", `${D}/clients/c1/videos/v1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED], { url: "x" }],
  ["grace elapsed — admin creates an invoice", "DENY", "create", `${D}/invoices/i2`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { clientId: "c1", total: 100 }],
  ["grace elapsed — admin writes an expense", "DENY", "create", `${D}/expenses/x1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { amount: 10 }],
  ["grace elapsed — admin writes a service", "DENY", "create", `${D}/services/s1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { name: "ABA" }],
  ["grace elapsed — coordinator writes a client code", "DENY", "create", `${D}/client_codes/CODE1`,
    { uid: "c2" }, [...member("c2", "Coordinator"), ...EXPIRED], { clientId: "c1" }],
  ["grace elapsed — coordinator writes team_public", "DENY", "update", `${D}/team_public/t2`,
    { uid: "c2" }, [...member("c2", "Coordinator"), ...EXPIRED], { name: "X" }, { name: "Y" }],
  ["grace elapsed — admin edits another member", "DENY", "update", `${D}/team_members/t2`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { name: "X" }, { name: "Y" }],

  // --- NOTHING A PARENT DOES IS GATED ---
  ["grace elapsed — parent reads their child", "ALLOW", "get", `${D}/clients/c1`,
    { uid: "p1" }, [...outsider("p1"), ...client("c1", { parentUids: ["p1"] }), ...EXPIRED]],
  ["grace elapsed — parent marks homework complete", "ALLOW", "update", `${D}/clients/c1/homework/h1`,
    { uid: "p1" }, [...outsider("p1"), ...client("c1", { parentUids: ["p1"] }), ...EXPIRED],
    { title: "T", completed: true, completedAt: "2026-08-21" }, { title: "T", completed: false }],
  ["grace elapsed — parent still cannot rewrite homework", "DENY", "update", `${D}/clients/c1/homework/h1`,
    { uid: "p1" }, [...outsider("p1"), ...client("c1", { parentUids: ["p1"] }), ...EXPIRED],
    { title: "REWRITTEN", completed: false }, { title: "T", completed: false }],
  ["grace elapsed — parent reads a shared report", "ALLOW", "get", `${D}/clients/c1/reports/r1`,
    { uid: "p1" }, [...outsider("p1"), ...client("c1", { parentUids: ["p1"] }), ...EXPIRED],
    null, { sharedWithParent: true }],
  ["grace elapsed — parent messages the clinic", "ALLOW", "create", `${D}/threads/th1/messages/m1`,
    { uid: "p1" }, [...outsider("p1"), ...client("c1", { parentUids: ["p1"] }),
      ...thread("th1", { participants: ["t1"], clientId: "c1" }), ...EXPIRED], { text: "hello" }],
  ["grace elapsed — parent creates a notification", "ALLOW", "create", `${D}/notifications/n1`,
    { uid: "p1" }, [...outsider("p1"), ...client("c1", { parentUids: ["p1"] }), ...EXPIRED],
    { clientId: "c1", recipientId: "t1" }],

  // --- THE AUDIT TRAIL IS NEVER GATED ---
  ["grace elapsed — therapist writes an activity", "ALLOW", "create", `${D}/activities/a1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED], { type: "client_updated" }],
  ["grace elapsed — admin writes an activity", "ALLOW", "create", `${D}/activities/a2`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { type: "invoice_created" }],

  // --- the ways out stay open ---
  ["grace elapsed — staff messages a parent", "ALLOW", "create", `${D}/threads/th1/messages/m2`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...thread("th1", { participants: ["t1"], clientId: "c1" }), ...EXPIRED],
    { text: "hello" }],
  ["grace elapsed — a member edits their own profile", "ALLOW", "update", `${D}/team_members/t1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED], { phone: "1" }, { phone: "2" }],
  ["grace elapsed — admin still writes system_settings", "ALLOW", "update", `${D}/system_settings/config`,
    { uid: "a1" }, [...member("a1", "Admin"), ...EXPIRED], { x: 1 }, { x: 2 }],
  ["grace elapsed — staff marks a notification read", "ALLOW", "update", `${D}/notifications/n1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...EXPIRED],
    { read: true, recipientId: "t1" }, { read: false, recipientId: "t1" }],
];

console.log(`\n${C.bold("rules — an expired licence makes staff read-only")}\n`);

const src = readFileSync("firestore.rules", "utf8");
const token = execSync("gcloud auth application-default print-access-token").toString().trim();

const testCases = rulesCases.map(([, expectation, method, path, auth, mocks, resource, before]) => ({
  expectation,
  request: {
    ...(auth ? { auth: { uid: auth.uid, token: {} } } : {}),
    path, method, time: NOW,
    ...(resource ? { resource: { data: resource } } : {}),
  },
  ...(before ? { resource: { data: before } } : {}),
  functionMocks: mocks,
}));

const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: src }] }, testSuite: { testCases } }),
});
const out = await res.json();
if (!res.ok) {
  console.error("API error:", JSON.stringify(out).slice(0, 800));
  process.exit(1);
}
if (out.issues?.length) console.error("Rule issues:", JSON.stringify(out.issues).slice(0, 800));

(out.testResults || []).forEach((r, i) => {
  const [what, expectation] = rulesCases[i];
  const ok = r.state === "SUCCESS";
  const label = `${what.padEnd(56)} ${C.dim(`(${expectation})`)}`;
  if (ok) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${label}`);
  } else {
    failures.push(`${what}: the rule did not ${expectation === "ALLOW" ? "allow" : "deny"} it`);
    console.log(`  ${C.red("✗")} ${label}`);
    if (r.debugMessages) console.log(`      ${C.dim(String(r.debugMessages[0]).slice(0, 200))}`);
  }
});

console.log("");
if (failures.length) {
  console.log(`${C.red(`✗ ${failures.length} failed`)}, ${passed} passed\n`);
  failures.forEach((f) => console.log(`  ${C.red("-")} ${f}`));
  process.exit(1);
}
console.log(`${C.green(`✓ ${passed} assertions passed`)}\n`);
