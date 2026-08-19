#!/usr/bin/env node
/**
 * End-to-end test of the parent portal's sign-in, against a running build.
 *
 *   npm run build:demo
 *   node scripts/tenant-env.mjs demo -- npx next start -p 3100
 *   node scripts/test-parent-link.mjs            # in another terminal
 *
 * Or against a deployed host, which is the post-cutover verification:
 *
 *   node scripts/test-parent-link.mjs --base=https://demo.tempoapp.ro
 *
 * This covers the one flow where a mistake is both invisible and serious: an
 * access code is the ONLY credential a parent has, and what it unlocks is a
 * child's clinical record. The rules tests cover what the database permits; this
 * covers what the route actually does with a real anonymous session.
 *
 * It runs against real infrastructure on purpose. It creates one anonymous user,
 * links it, asserts the outcome in Firestore, unlinks it, and deletes the user.
 * Nothing it creates survives a successful run.
 *
 * Uses node:http rather than fetch because `Host` is a forbidden fetch header —
 * undici silently strips it, the route then resolves localhost to the control
 * plane, and every tenant-scoped lookup misses for reasons nothing explains.
 */
import http from "node:http";
import https from "node:https";
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
const PORT = Number(args.port || 3100);
// Against a deployed host the real hostname selects the tenant, so no spoofing
// is needed and none is done.
const BASE = args.base ? new URL(args.base) : null;
const HOST = args.host || (BASE ? BASE.host : "demo.tempoapp.ro");
const DATABASE = args.database || "clinic-demo";
const BUCKET = args.bucket || "tempo-app-2-demo";
const CODE = args.code || "AMP-2019";
const CLIENT = args.client || "client_001";

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const adcToken = execSync("gcloud auth application-default print-access-token").toString().trim();
const ADC = { Authorization: `Bearer ${adcToken}`, "Content-Type": "application/json" };

function webApiKey() {
  if (args.key) return args.key;
  const root = path.resolve(import.meta.dirname, "..");
  for (const f of [".env.platform", ".env.live", ".env"]) {
    try {
      const m = readFileSync(path.join(root, f), "utf8").match(/^NEXT_PUBLIC_FIREBASE_API_KEY=(.+)$/m);
      if (m) return m[1].trim();
    } catch { /* try the next one */ }
  }
  throw new Error("No web API key found — pass --key=<NEXT_PUBLIC_FIREBASE_API_KEY>");
}
const KEY = webApiKey();

const docUrl = (database, coll, id) =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${database}/documents/${coll}/${id}`;

/** A request that really does carry the Host header, so the tenant resolves. */
function call({ method, token, body, host = HOST }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const transport = BASE && BASE.protocol === "https:" ? https : http;
    const req = transport.request(
      {
        host: BASE ? BASE.hostname : "127.0.0.1",
        port: BASE ? BASE.port || (BASE.protocol === "https:" ? 443 : 80) : PORT,
        // The trailing slash matters: next.config.js sets trailingSlash: true.
        path: "/api/parent/link/",
        method,
        headers: {
          Host: host,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = {};
          try { json = JSON.parse(data); } catch { /* non-JSON body */ }
          resolve({ status: res.statusCode, json });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const parentUidsOf = async () => {
  const d = await (await fetch(docUrl(DATABASE, "clients", CLIENT), { headers: ADC })).json();
  return (d.fields?.parentUids?.arrayValue?.values || []).map((v) => v.stringValue);
};

let passed = 0;
const failures = [];
function assert(label, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  ${C.green("✓")} ${label.padEnd(50)} ${C.dim(detail || "")}`);
  } else {
    failures.push(`${label} — ${detail}`);
    console.log(`  ${C.red("✗")} ${label.padEnd(50)} ${C.red(detail || "")}`);
  }
}

console.log(`\n${C.bold("parent portal sign-in — end to end")}`);
console.log(`  server   : ${BASE ? BASE.origin : `http://127.0.0.1:${PORT}`}  as ${HOST}`);
console.log(`  tenant   : ${DATABASE} / ${BUCKET}`);
console.log(`  code     : ${CODE} -> ${CLIENT}\n`);

let session = null;
try {
  // Fail early and clearly if nothing is listening, rather than 10 confusing
  // connection errors.
  try {
    await call({ method: "DELETE" });
  } catch (err) {
    console.error(`${C.red(`✗ Nothing is answering at ${BASE ? BASE.origin : `port ${PORT}`}.`)}\n`);
    console.error(`  npm run build:demo`);
    console.error(`  node scripts/tenant-env.mjs demo -- npx next start -p ${PORT}\n`);
    process.exit(1);
  }

  // An anonymous user, exactly as the portal creates.
  const signUp = await (
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    })
  ).json();
  if (!signUp.idToken) throw new Error(`could not create an anonymous user: ${JSON.stringify(signUp).slice(0, 200)}`);
  session = signUp;
  const { localId: uid, idToken } = signUp;
  console.log(C.dim(`  anonymous uid ${uid}\n`));

  let r = await call({ method: "POST", token: idToken, body: { code: CODE } });
  assert("a valid access code links the session", r.status === 200 && r.json.clientId === CLIENT,
    `${r.status} ${r.json.clientName || r.json.error || ""}`);

  assert("the uid is added to the client's parentUids", (await parentUidsOf()).includes(uid));

  const m = await fetch(docUrl("(default)", "tenant_parents", `${BUCKET}__${uid}`), { headers: ADC });
  const mirror = await m.json();
  const mirrored = (mirror.fields?.clientIds?.arrayValue?.values || []).map((v) => v.stringValue);
  assert("a Storage mirror is written at {bucket}__{uid}", m.ok && mirrored.includes(CLIENT),
    m.ok ? mirrored.join(",") : "missing");

  // --- what this route exists to prevent -----------------------------------
  r = await call({ method: "POST", token: idToken, body: { code: "NOT-A-REAL-CODE" } });
  assert("an unknown code is rejected", r.status === 404, `${r.status}`);

  r = await call({ method: "POST", token: idToken, body: { code: CODE, clientId: "some-other-child" } });
  assert("a client id in the body is ignored", r.json.clientId === CLIENT, `linked ${r.json.clientId}`);

  r = await call({ method: "POST", body: { code: CODE } });
  assert("an unauthenticated caller is rejected", r.status === 401, `${r.status}`);

  // The same code against a different host must not reach this clinic's data.
  if (!BASE) {
    r = await call({ method: "POST", token: idToken, body: { code: CODE }, host: `localhost:${PORT}` });
    assert("the code does not work on another host", r.status === 404, `${r.status}`);
  }

  // --- sign-out -------------------------------------------------------------
  r = await call({ method: "DELETE", token: idToken });
  assert("sign-out unlinks the session", r.status === 200, `${r.status}`);
  assert("the uid is removed from parentUids", !(await parentUidsOf()).includes(uid));

  const gone = await fetch(docUrl("(default)", "tenant_parents", `${BUCKET}__${uid}`), { headers: ADC });
  assert("the Storage mirror is removed", gone.status === 404, `${gone.status}`);
} finally {
  if (session) {
    const { localId: uid, idToken } = session;
    await fetch(docUrl("(default)", "tenant_parents", `${BUCKET}__${uid}`), { method: "DELETE", headers: ADC }).catch(() => {});
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }).catch(() => {});
    console.log(C.dim("\n  cleaned up the anonymous user and its mirror"));
  }
}

if (failures.length) {
  console.log(`\n${C.red(`✗ ${failures.length} failure(s)`)}`);
  failures.forEach((f) => console.log(`    ${f}`));
  console.log();
  process.exit(1);
}
console.log(`\n${C.green(`✓ ${passed} assertions passed`)}\n`);
