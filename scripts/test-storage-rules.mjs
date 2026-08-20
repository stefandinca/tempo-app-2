#!/usr/bin/env node
/**
 * Runtime tests for storage.rules, against the real buckets.
 *
 *   node scripts/test-storage-rules.mjs --project=tempo-app-2
 *
 * Not emulated and not mocked, deliberately. The rules read Firestore through
 * `firestore.get`, and this project has already been bitten once by rules that
 * compiled, deployed, and then behaved differently at runtime (a named-database
 * read denies everything, silently). Only real requests prove anything here.
 *
 * It creates throwaway Auth users and mirror documents, uploads probe objects
 * under clearly-marked test ids, asserts the allow/deny matrix, and removes all
 * of it in a finally block. Nothing it writes survives a successful run; if it is
 * killed mid-way, re-running cleans up first.
 *
 * Requires ADC (`gcloud auth application-default login`) for setup and cleanup —
 * the assertions themselves use ordinary end-user ID tokens, which is the point.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project || "tempo-app-2";
const BUCKET_A = args["bucket-a"] || `${PROJECT}-demo`;
const BUCKET_B = args["bucket-b"] || `${PROJECT}-diaconumaria`;

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Test fixtures are prefixed so a stray object is obviously not clinical data. */
const CLIENT_1 = "ruletest-client-1";
const CLIENT_2 = "ruletest-client-2";
const USERS = {
  staffA: { email: "ruletest-staff-a@example.invalid", pass: "RuleTest!Staff1" },
  adminA: { email: "ruletest-admin-a@example.invalid", pass: "RuleTest!Admin1" },
  parentA: { email: "ruletest-parent-a@example.invalid", pass: "RuleTest!Parent1" },
  staffB: { email: "ruletest-staff-b@example.invalid", pass: "RuleTest!Staff2" },
  superA: { email: "ruletest-super-a@example.invalid", pass: "RuleTest!Super1" },
  outsider: { email: "ruletest-outsider@example.invalid", pass: "RuleTest!Out1" },
};

const adcToken = execSync("gcloud auth application-default print-access-token").toString().trim();
const ADC = { Authorization: `Bearer ${adcToken}`, "Content-Type": "application/json" };

/** The web API key, needed to mint end-user tokens. Read from the tenant env files. */
function webApiKey() {
  if (args.key) return args.key;
  const root = path.resolve(import.meta.dirname, "..");
  for (const f of [".env.live", ".env.demo", ".env"]) {
    try {
      const m = readFileSync(path.join(root, f), "utf8").match(/^NEXT_PUBLIC_FIREBASE_API_KEY=(.+)$/m);
      if (m) return m[1].trim();
    } catch {
      /* try the next one */
    }
  }
  throw new Error("No web API key found — pass --key=<NEXT_PUBLIC_FIREBASE_API_KEY>");
}
const KEY = webApiKey();

async function signIn({ email, pass }) {
  for (const op of ["signUp", "signInWithPassword"]) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${op}?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
    });
    const j = await r.json();
    if (j.idToken) return { uid: j.localId, idToken: j.idToken };
  }
  throw new Error(`could not sign in ${email}`);
}

const docUrl = (coll, id) =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${coll}/${id}`;

const objUrl = (bucket, name) =>
  `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}`;

/** Upload as an end user — governed by the rules. Returns the HTTP status. */
async function userUpload(idToken, bucket, name, contentType = "text/plain") {
  const r = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": contentType },
      body: "probe",
    },
  );
  return r.status;
}

/** Download as an end user, with no download token — also governed by the rules. */
async function userRead(idToken, bucket, name) {
  const r = await fetch(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  return r.status;
}

const created = { mirrors: [], users: [] };

async function adminPut(bucket, name) {
  await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${adcToken}`, "Content-Type": "text/plain" },
      body: "probe",
    },
  );
}

async function mirror(coll, id, fields) {
  await fetch(docUrl(coll, id), { method: "PATCH", headers: ADC, body: JSON.stringify({ fields }) });
  created.mirrors.push([coll, id]);
}

let passed = 0;
const failures = [];

/** `expect` is "allow" or "deny"; anything 2xx counts as allowed. */
function assert(label, status, expect) {
  const allowed = status >= 200 && status < 300;
  const ok = expect === "allow" ? allowed : !allowed;
  if (ok) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${label.padEnd(58)} ${C.dim(`${status} ${allowed ? "ALLOW" : "DENY"}`)}`);
  } else {
    failures.push(`${label} — got ${status} (${allowed ? "ALLOW" : "DENY"}), expected ${expect.toUpperCase()}`);
    console.log(`  ${C.red("✗")} ${label.padEnd(58)} ${C.red(`${status} ${allowed ? "ALLOW" : "DENY"}, expected ${expect}`)}`);
  }
}

console.log(`\n${C.bold("storage.rules — runtime")}`);
console.log(`  project  : ${PROJECT}`);
console.log(`  bucket A : ${BUCKET_A}`);
console.log(`  bucket B : ${BUCKET_B}\n`);

try {
  // ---- fixtures ------------------------------------------------------------
  const u = {};
  for (const [name, creds] of Object.entries(USERS)) {
    u[name] = await signIn(creds);
    created.users.push(u[name].idToken);
  }

  await mirror("tenant_members", `${BUCKET_A}__${u.staffA.uid}`, {
    tenantId: { stringValue: "ruletest-a" },
    role: { stringValue: "Therapist" },
  });
  await mirror("tenant_members", `${BUCKET_A}__${u.adminA.uid}`, {
    tenantId: { stringValue: "ruletest-a" },
    role: { stringValue: "Admin" },
  });
  await mirror("tenant_members", `${BUCKET_A}__${u.superA.uid}`, {
    tenantId: { stringValue: "ruletest-a" },
    role: { stringValue: "Superadmin" },
  });
  await mirror("tenant_members", `${BUCKET_B}__${u.staffB.uid}`, {
    tenantId: { stringValue: "ruletest-b" },
    role: { stringValue: "Therapist" },
  });
  await mirror("tenant_parents", `${BUCKET_A}__${u.parentA.uid}`, {
    tenantId: { stringValue: "ruletest-a" },
    clientIds: { arrayValue: { values: [{ stringValue: CLIENT_1 }] } },
  });

  const DOC_1 = `clients/${CLIENT_1}/documents/probe.txt`;
  const VID_1 = `clients/${CLIENT_1}/videos/ruletest-event/probe.txt`;
  const VOICE_1 = `clients/${CLIENT_1}/voiceFeedback/ruletest-event/probe.txt`;
  const DOC_2 = `clients/${CLIENT_2}/documents/probe.txt`;
  const AVATAR_A = `avatars/${u.staffA.uid}/probe.txt`;
  const AVATAR_B = `avatars/${u.staffB.uid}/probe.txt`;
  const STRAY = "ruletest-stray/probe.txt";

  const BRAND = "branding/logo-ruletest.txt";
  for (const n of [DOC_1, VID_1, VOICE_1, DOC_2, AVATAR_A, STRAY, BRAND]) await adminPut(BUCKET_A, n);
  await adminPut(BUCKET_B, DOC_1);

  // ---- the boundary that matters -------------------------------------------
  console.log(`${C.bold("  cross-tenant isolation")}\n`);
  assert("staff A reads a client document in their own bucket", await userRead(u.staffA.idToken, BUCKET_A, DOC_1), "allow");
  assert("staff A reads the SAME path in the other bucket", await userRead(u.staffA.idToken, BUCKET_B, DOC_1), "deny");
  assert("staff B reads a client document in their own bucket", await userRead(u.staffB.idToken, BUCKET_B, DOC_1), "allow");
  assert("staff B reads the SAME path in the other bucket", await userRead(u.staffB.idToken, BUCKET_A, DOC_1), "deny");
  assert("staff A writes into the other clinic's bucket", await userUpload(u.staffA.idToken, BUCKET_B, DOC_1), "deny");
  assert("parent A reads anything in the other clinic's bucket", await userRead(u.parentA.idToken, BUCKET_B, DOC_1), "deny");

  console.log(`\n${C.bold("  staff")}\n`);
  assert("staff A writes a client document", await userUpload(u.staffA.idToken, BUCKET_A, DOC_1), "allow");
  assert("staff A reads a session video", await userRead(u.staffA.idToken, BUCKET_A, VID_1), "allow");
  assert("staff A reads voice feedback", await userRead(u.staffA.idToken, BUCKET_A, VOICE_1), "allow");
  assert("staff A writes their own avatar", await userUpload(u.staffA.idToken, BUCKET_A, AVATAR_A), "allow");
  assert("staff A writes SOMEONE ELSE's avatar", await userUpload(u.staffA.idToken, BUCKET_A, AVATAR_B), "deny");
  assert("admin A writes someone else's avatar", await userUpload(u.adminA.idToken, BUCKET_A, AVATAR_B), "allow");

  console.log(`\n${C.bold("  parents")}\n`);
  assert("parent A reads their own child's video", await userRead(u.parentA.idToken, BUCKET_A, VID_1), "allow");
  assert("parent A reads their own child's voice feedback", await userRead(u.parentA.idToken, BUCKET_A, VOICE_1), "allow");
  assert("parent A reads their own child's document", await userRead(u.parentA.idToken, BUCKET_A, DOC_1), "allow");
  assert("parent A reads ANOTHER child's document", await userRead(u.parentA.idToken, BUCKET_A, DOC_2), "deny");
  assert("parent A writes into their own child's folder", await userUpload(u.parentA.idToken, BUCKET_A, DOC_1), "deny");
  assert("parent A reads a staff avatar", await userRead(u.parentA.idToken, BUCKET_A, AVATAR_A), "allow");

  console.log(`\n${C.bold("  branding")}\n`);
  assert("a Superadmin writes the clinic logo", await userUpload(u.superA.idToken, BUCKET_A, BRAND, "image/png"), "allow");
  assert("a therapist writes the clinic logo", await userUpload(u.staffA.idToken, BUCKET_A, BRAND, "image/png"), "deny");
  assert("an admin writes the clinic logo", await userUpload(u.adminA.idToken, BUCKET_A, BRAND, "image/png"), "deny");
  assert("a Superadmin of ANOTHER clinic writes it", await userUpload(u.superA.idToken, BUCKET_B, BRAND, "image/png"), "deny");
  assert("a Superadmin uploads a NON-image as the logo", await userUpload(u.superA.idToken, BUCKET_A, BRAND, "text/plain"), "deny");
  assert("an outsider reads the logo (it is public)", await userRead(u.outsider.idToken, BUCKET_A, BRAND), "allow");

  console.log(`\n${C.bold("  everyone else")}\n`);
  assert("signed-in outsider reads a client document", await userRead(u.outsider.idToken, BUCKET_A, DOC_1), "deny");
  assert("signed-in outsider writes a client document", await userUpload(u.outsider.idToken, BUCKET_A, DOC_1), "deny");
  assert("signed-in outsider reads an avatar", await userRead(u.outsider.idToken, BUCKET_A, AVATAR_A), "deny");
  assert("staff A reads an unmatched path", await userRead(u.staffA.idToken, BUCKET_A, STRAY), "deny");
  assert("staff A writes an unmatched path", await userUpload(u.staffA.idToken, BUCKET_A, STRAY), "deny");
} finally {
  // ---- cleanup -------------------------------------------------------------
  // Driven by listing the test prefixes rather than by what this run uploaded
  // deliberately, so an object a probe unexpectedly managed to write is removed
  // too — including from a previous run that was killed part-way.
  for (const bucket of [BUCKET_A, BUCKET_B]) {
    for (const prefix of ["clients/ruletest-", "avatars/", "ruletest-stray/", "spike/", "branding/logo-ruletest"]) {
      const r = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`,
        { headers: ADC },
      );
      if (!r.ok) continue;
      for (const o of (await r.json()).items || []) {
        await fetch(objUrl(bucket, o.name), { method: "DELETE", headers: ADC }).catch(() => {});
      }
    }
  }
  for (const [coll, id] of created.mirrors) {
    await fetch(docUrl(coll, id), { method: "DELETE", headers: ADC }).catch(() => {});
  }
  for (const idToken of created.users) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }).catch(() => {});
  }
  console.log(
    C.dim(`\n  cleaned up ${created.mirrors.length} mirror(s), ${created.users.length} test user(s), and all probe objects`),
  );
}

if (failures.length) {
  console.log(`\n${C.red(`✗ ${failures.length} failure(s)`)}`);
  failures.forEach((f) => console.log(`    ${f}`));
  console.log();
  process.exit(1);
}
console.log(`\n${C.green(`✓ ${passed} assertions passed`)}\n`);
