#!/usr/bin/env node
/**
 * Security-rule tests. Evaluates firestore.rules against simulated requests via
 * the Firebase Rules test API — it DEPLOYS NOTHING and touches no data.
 *
 *   node scripts/test-rules.mjs
 *
 * Run this before every `firebase deploy --only firestore:rules`. Rules are
 * per-project and do not sync, so a mistake has to be caught here rather than by
 * one tenant discovering their app broke.
 *
 * Authenticates with gcloud Application Default Credentials. The project named
 * below only hosts the evaluation — the local rules text is what is under test.
 *
 * NOTE: always give a DOCUMENT-shaped path, even for "list" — the evaluator has
 * to bind the wildcard (e.g. /clients/c1, not /clients). A collection path makes
 * every rule miss and every case look like a denial.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PROJECT = "tempo-app-demo";
const src = readFileSync("firestore.rules", "utf8");
const token = execSync("gcloud auth application-default print-access-token").toString().trim();
const D = "/databases/(default)/documents";

const member = (uid, role) => [
  { function: "exists", args: [{ exact_value: `${D}/team_members/${uid}` }], result: { value: true } },
  { function: "get", args: [{ exact_value: `${D}/team_members/${uid}` }], result: { value: { data: { role } } } },
];
const client = (id, data) => [
  { function: "get", args: [{ exact_value: `${D}/clients/${id}` }], result: { value: { data } } },
];

/** The clinic-wide protocol list. `null` means the document does not exist. */
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

/**
 * No licence mirror — which is where every clinic sits until one is written,
 * and what every case in this file assumes. Appended to EVERY case below
 * rather than to the ones that happen to hit a gated rule: an unmocked
 * get/exists is a service-call ERROR in the test API, not a `false`, so a case
 * that reaches licenceActive() without this mock fails for the wrong reason.
 * Licence enforcement itself is asserted in scripts/test-licence.mjs.
 */
const noLicence = [
  { function: "exists", args: [{ exact_value: `${D}/system_settings/licence` }], result: { value: false } },
  { function: "get", args: [{ exact_value: `${D}/system_settings/licence` }], result: { value: { data: {} } } },
];

const cases = [
  // --- evaluation gating (per CLINIC, not per child) ---
  ["therapist reads a DISABLED protocol", "DENY", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(["cars"])]],
  ["therapist reads an ENABLED protocol", "ALLOW", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(["carolina"])]],
  ["therapist reads when NO document exists (default on)", "ALLOW", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(null)]],
  ["therapist reads when the list is EMPTY", "ALLOW", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess([])]],
  ["admin reads a DISABLED protocol", "DENY", "get", `${D}/clients/c1/evaluations/e1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...evalAccess(["ablls"])]],
  ["SUPERADMIN reads a DISABLED protocol", "ALLOW", "get", `${D}/clients/c1/evaluations/e1`,
    { uid: "s1" }, [...member("s1", "Superadmin"), ...evalAccess(["ablls"])]],
  ["parent reads a DISABLED protocol", "DENY", "get", `${D}/clients/c1/vbmapp_evaluations/e1`,
    { uid: "p1" }, [...client("c1", { parentUids: ["p1"] }), ...evalAccess(["vbmapp"])]],
  ["parent reads an ENABLED protocol", "ALLOW", "get", `${D}/clients/c1/vbmapp_evaluations/e1`,
    { uid: "p1" }, [...client("c1", { parentUids: ["p1"] }), ...evalAccess(["cars"])]],
  ["therapist WRITES a disabled protocol", "DENY", "create", `${D}/clients/c1/portage_evaluations/e2`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...evalAccess(["portage"])], { scores: {} }],

  // --- who may change the clinic's protocol list ---
  ["superadmin sets evaluation_access", "ALLOW", "update", `${D}/system_settings/evaluation_access`,
    { uid: "s1" }, member("s1", "Superadmin"), { disabled: ["cars"] }, { disabled: [] }],
  ["admin sets evaluation_access", "DENY", "update", `${D}/system_settings/evaluation_access`,
    { uid: "a1" }, member("a1", "Admin"), { disabled: ["cars"] }, { disabled: [] }],
  ["coordinator sets evaluation_access", "DENY", "update", `${D}/system_settings/evaluation_access`,
    { uid: "c3" }, member("c3", "Coordinator"), { disabled: ["cars"] }, { disabled: [] }],
  ["admin still writes other settings", "ALLOW", "update", `${D}/system_settings/config`,
    { uid: "a1" }, member("a1", "Admin"), { x: 1 }, { x: 2 }],
  ["therapist reads evaluation_access", "ALLOW", "get", `${D}/system_settings/evaluation_access`,
    { uid: "t1" }, member("t1", "Therapist")],
  ["a parent reads evaluation_access", "ALLOW", "get", `${D}/system_settings/evaluation_access`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],

  // --- clinic branding ---
  // The logo renders before anyone signs in, so the document is public.
  // Setting it is ours alone: an Admin runs the clinic, not the brand.
  ["a signed-out visitor reads branding", "ALLOW", "get", `${D}/system_settings/branding`,
    null, []],
  ["superadmin sets branding", "ALLOW", "update", `${D}/system_settings/branding`,
    { uid: "s1" }, member("s1", "Superadmin"), { logoUrl: "x" }, { logoUrl: "" }],
  ["admin sets branding", "DENY", "update", `${D}/system_settings/branding`,
    { uid: "a1" }, member("a1", "Admin"), { logoUrl: "x" }, { logoUrl: "" }],
  ["coordinator sets branding", "DENY", "update", `${D}/system_settings/branding`,
    { uid: "c3" }, member("c3", "Coordinator"), { logoUrl: "x" }, { logoUrl: "" }],
  ["a signed-out visitor still cannot read config", "DENY", "get", `${D}/system_settings/config`,
    null, []],
  // --- bug reports ---
  // Written only by the server. A clinic must not be able to forge one, read
  // another clinic's, or read its own.
  ["superadmin reads a bug report", "ALLOW", "get", `${D}/bug_reports/r1`,
    { uid: "s1" }, member("s1", "Superadmin")],
  ["admin reads a bug report", "DENY", "get", `${D}/bug_reports/r1`,
    { uid: "a1" }, member("a1", "Admin")],
  ["therapist reads a bug report", "DENY", "get", `${D}/bug_reports/r1`,
    { uid: "t1" }, member("t1", "Therapist")],
  ["a signed-out visitor reads a bug report", "DENY", "get", `${D}/bug_reports/r1`,
    null, []],
  ["admin writes a bug report from the browser", "DENY", "create", `${D}/bug_reports/r2`,
    { uid: "a1" }, member("a1", "Admin"), { title: "x" }],
  ["superadmin writes a bug report from the browser", "DENY", "create", `${D}/bug_reports/r2`,
    { uid: "s1" }, member("s1", "Superadmin"), { title: "x" }],
  // --- parent self-linking ---
  // A signed-in stranger used to be able to write their own uid into any
  // client's parentUids, and most client ids are firstname + a birthday.
  // Linking is now server-side, against the access code, so these all deny.
  ["anonymous adds itself to parentUids", "DENY", "update", `${D}/clients/c1`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }],
    { name: "X", parentUids: ["anon"] }, { name: "X", parentUids: [] }],
  ["existing parent adds another uid to parentUids", "DENY", "update", `${D}/clients/c1`,
    { uid: "p1" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/p1` }], result: { value: false } }],
    { name: "X", parentUids: ["p1", "p2"] }, { name: "X", parentUids: ["p1"] }],
  ["coordinator still edits a client", "ALLOW", "update", `${D}/clients/c1`,
    { uid: "c2" }, member("c2", "Coordinator"), { name: "Y", parentUids: [] }, { name: "X", parentUids: [] }],
  ["therapist edits a client (never was allowed)", "DENY", "update", `${D}/clients/c1`,
    { uid: "t1" }, member("t1", "Therapist"), { name: "Y", parentUids: [] }, { name: "X", parentUids: [] }],
  // --- control plane ---
  ["anonymous reads tenant_members", "DENY", "get", `${D}/tenant_members/u1`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],
  ["admin reads tenant_members", "DENY", "get", `${D}/tenant_members/u1`,
    { uid: "a1" }, member("a1", "Admin")],
  ["superadmin reads tenant_members", "DENY", "get", `${D}/tenant_members/u1`,
    { uid: "s1" }, member("s1", "Superadmin")],
  ["superadmin reads the tenant registry", "ALLOW", "get", `${D}/tenants/clinic-x`,
    { uid: "s1" }, member("s1", "Superadmin")],
  ["admin reads the tenant registry", "DENY", "get", `${D}/tenants/clinic-x`,
    { uid: "a1" }, member("a1", "Admin")],

  // --- staff roster exposure ---
  ["anonymous reads team_members", "DENY", "get", `${D}/team_members/t1`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],
  ["anonymous reads team_public", "ALLOW", "get", `${D}/team_public/t1`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],
  ["therapist reads team_members", "ALLOW", "get", `${D}/team_members/t2`,
    { uid: "t1" }, member("t1", "Therapist")],
  ["therapist writes team_public", "DENY", "update", `${D}/team_public/t2`,
    { uid: "t1" }, member("t1", "Therapist"), { name: "X" }, { name: "Y" }],
  ["coordinator writes team_public", "ALLOW", "update", `${D}/team_public/t2`,
    { uid: "c1" }, member("c1", "Coordinator"), { name: "X" }, { name: "Y" }],

  // --- system_settings split ---
  ["anonymous reads system_settings/config", "DENY", "get", `${D}/system_settings/config`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],
  ["anonymous reads translations_ro", "ALLOW", "get", `${D}/system_settings/translations_ro`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],
  ["therapist reads system_settings/config", "ALLOW", "get", `${D}/system_settings/config`,
    { uid: "t1" }, member("t1", "Therapist")],

  // --- public lead form (unauthenticated) ---
  // login/page.tsx always sets createdAt via serverTimestamp() alongside
  // name/email/phone/clinic, but the RULE used to only check source, consent
  // and a key count — nothing stopped a create that skipped createdAt from
  // saving anyway. The console's leads reader orders by createdAt, and
  // Firestore's orderBy silently DROPS a document missing the ordered field,
  // so that lead would be invisible with no error anywhere.
  ["public lead create WITHOUT createdAt is denied", "DENY", "create", `${D}/potential_clients/lead1`,
    null, [], {
      source: "demo_platform_entry", consent: true,
      name: "Ana Pop", email: "ana@example.com", phone: "0700000000", clinic: "Centrul Ana",
    }],
  ["public lead create WITH createdAt still passes", "ALLOW", "create", `${D}/potential_clients/lead2`,
    null, [], {
      source: "demo_platform_entry", consent: true, createdAt: "2026-08-19T10:00:00Z",
      name: "Ana Pop", email: "ana@example.com", phone: "0700000000", clinic: "Centrul Ana",
    }],
  ["public lead create with an over-long field is denied", "DENY", "create", `${D}/potential_clients/lead3`,
    null, [], {
      source: "demo_platform_entry", consent: true, createdAt: "2026-08-19T10:00:00Z",
      name: "A".repeat(500), email: "ana@example.com", phone: "0700000000", clinic: "Centrul Ana",
    }],
];

const testCases = cases.map(([, expectation, method, path, auth, mocks, resource, before]) => ({
  expectation,
  request: {
    // A null auth is a signed-out visitor, which some rules must still allow
    // (the clinic logo) and most must still refuse.
    ...(auth ? { auth: { uid: auth.uid, token: {} } } : {}),
    path, method, time: "2026-08-19T10:00:00Z",
    ...(resource ? { resource: { data: resource } } : {}),
  },
  ...(before ? { resource: { data: before } } : {}),
  functionMocks: [...mocks, ...noLicence],
}));

const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content: src }] }, testSuite: { testCases } }),
});
const out = await res.json();
if (!res.ok) { console.error("API error:", JSON.stringify(out).slice(0, 600)); process.exit(1); }
if (out.issues?.length) { console.error("Rule issues:", JSON.stringify(out.issues).slice(0, 600)); }

let pass = 0, fail = 0;
(out.testResults || []).forEach((r, i) => {
  const ok = r.state === "SUCCESS";
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${cases[i][0]}  (expected ${cases[i][1]})`);
  if (!ok && r.debugMessages) console.log("        " + String(r.debugMessages[0]).slice(0, 160));
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
