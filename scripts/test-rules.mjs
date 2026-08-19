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

const cases = [
  // --- evaluation gating ---
  ["therapist reads a DISABLED protocol", "DENY", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...client("c1", { disabledEvaluations: ["cars"] })]],
  ["therapist reads an ENABLED protocol", "ALLOW", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...client("c1", { disabledEvaluations: ["carolina"] })]],
  ["therapist reads when NO field set (default on)", "ALLOW", "get", `${D}/clients/c1/cars_evaluations/e1`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...client("c1", {})]],
  ["admin reads a DISABLED protocol", "DENY", "get", `${D}/clients/c1/evaluations/e1`,
    { uid: "a1" }, [...member("a1", "Admin"), ...client("c1", { disabledEvaluations: ["ablls"] })]],
  ["SUPERADMIN reads a DISABLED protocol", "ALLOW", "get", `${D}/clients/c1/evaluations/e1`,
    { uid: "s1" }, [...member("s1", "Superadmin"), ...client("c1", { disabledEvaluations: ["ablls"] })]],
  ["parent reads a DISABLED protocol", "DENY", "get", `${D}/clients/c1/vbmapp_evaluations/e1`,
    { uid: "p1" }, [...client("c1", { parentUids: ["p1"], disabledEvaluations: ["vbmapp"] })]],
  ["therapist WRITES a disabled protocol", "DENY", "create", `${D}/clients/c1/portage_evaluations/e2`,
    { uid: "t1" }, [...member("t1", "Therapist"), ...client("c1", { disabledEvaluations: ["portage"] })], { scores: {} }],

  // --- who may change the flag ---
  ["admin changes disabledEvaluations", "DENY", "update", `${D}/clients/c1`,
    { uid: "a1" }, [...member("a1", "Admin")], { name: "X", disabledEvaluations: ["cars"] }, { name: "X" }],
  ["superadmin changes disabledEvaluations", "ALLOW", "update", `${D}/clients/c1`,
    { uid: "s1" }, [...member("s1", "Superadmin")], { name: "X", disabledEvaluations: ["cars"] }, { name: "X" }],
  ["admin edits an unrelated field", "ALLOW", "update", `${D}/clients/c1`,
    { uid: "a1" }, [...member("a1", "Admin")], { name: "Y" }, { name: "X" }],

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
];

const testCases = cases.map(([, expectation, method, path, auth, mocks, resource, before]) => ({
  expectation,
  request: {
    auth: { uid: auth.uid, token: {} },
    path, method, time: "2026-08-19T10:00:00Z",
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
