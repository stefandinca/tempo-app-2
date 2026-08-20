#!/usr/bin/env node
/**
 * Creates a clinic's Storage bucket and wires it up.
 *
 *   node scripts/create-tenant-bucket.mjs --project=tempo-app-2 --tenant=clinicx --dry-run
 *   node scripts/create-tenant-bucket.mjs --project=tempo-app-2 --tenant=clinicx --yes
 *
 * Each clinic gets its own bucket, because Storage rules cannot read a named
 * Firestore database — so the bucket name itself is the tenant key that
 * `storage.rules` authorises against. The name must match `tenantBucket()` in
 * `src/lib/tenant.ts` exactly: the app derives it from the hostname at runtime,
 * and a mismatch means the app writes to one bucket while the rules authorise
 * another.
 *
 * Does four things, all idempotent:
 *   1. creates the GCS bucket in the EU with uniform access
 *   2. restricts CORS to that clinic's own origin
 *   3. registers it with Firebase, so rules apply and the SDK can address it
 *   4. adds it to the `storage` array in firebase.json
 *
 * Deliberately does NOT deploy storage rules. The rules deny everything until
 * `tenant_members` mirrors exist, so the order is register-tenant.mjs FIRST,
 * then deploy — the reverse locks the clinic out of every document, video and
 * voice note.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const TENANT = args.tenant;
const HOST = args.host || (TENANT ? `${TENANT}.tempoapp.ro` : "");
const LOCATION = args.location || "EU";
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!PROJECT || !TENANT) {
  console.error(`\n${C.red("✗ --project and --tenant are required")}\n`);
  console.error(`  node scripts/create-tenant-bucket.mjs --project=tempo-app-2 --tenant=clinicx --dry-run\n`);
  process.exit(1);
}
// The same pattern src/lib/tenant.ts accepts. A label it rejects resolves to the
// control plane, and the clinic would stare at an empty app.
if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(TENANT)) {
  console.error(`\n${C.red(`✗ "${TENANT}" is not a valid tenant label`)} — lowercase alphanumeric and hyphens, not starting or ending with one, at least two characters.\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to create without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

const BUCKET = `${PROJECT}-${TENANT}`;
if (BUCKET.length > 63) {
  console.error(`\n${C.red(`✗ "${BUCKET}" is ${BUCKET.length} characters; Cloud Storage allows 63`)}\n`);
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const token = execSync("gcloud auth application-default print-access-token").toString().trim();
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

console.log(`\n${C.bold("Create tenant bucket")}`);
console.log(`  project : ${PROJECT}`);
console.log(`  tenant  : ${TENANT}`);
console.log(`  bucket  : ${BUCKET}`);
console.log(`  origin  : https://${HOST}`);
console.log(`  location: ${LOCATION}`);
console.log(`  mode    : ${DRY ? C.yellow("DRY RUN") : C.green("APPLY")}\n`);

const CORS = [
  {
    // Only this clinic's own origin may reach this bucket from a browser.
    origin: [`https://${HOST}`, "http://localhost:3000"],
    method: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    responseHeader: [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Content-Disposition",
      "Authorization",
      "x-goog-resumable",
      "X-Firebase-Storage-Version",
    ],
    maxAgeSeconds: 3600,
  },
];

if (DRY) {
  console.log(`  ${C.yellow("would create the bucket, set CORS, link Firebase, and update firebase.json")}`);
  console.log(`  ${C.yellow("dry run — nothing written")}\n`);
  process.exit(0);
}

/* ---------- 1 & 2. the bucket ---------- */

let created = false;
{
  const res = await fetch(`https://storage.googleapis.com/storage/v1/b?project=${PROJECT}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      name: BUCKET,
      location: LOCATION,
      storageClass: "STANDARD",
      iamConfiguration: { uniformBucketLevelAccess: { enabled: true } },
      cors: CORS,
    }),
  });
  if (res.status === 409) {
    console.log(`  ${C.dim("bucket already exists — leaving its contents alone, refreshing CORS")}`);
    const patch = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({ cors: CORS }),
    });
    if (!patch.ok) {
      console.error(`  ${C.red("✗ could not update CORS")}: ${patch.status} ${(await patch.text()).slice(0, 200)}`);
      process.exit(1);
    }
  } else if (!res.ok) {
    console.error(`  ${C.red("✗ could not create the bucket")}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  } else {
    created = true;
  }
  console.log(`  ${C.green("✓")} bucket ${created ? "created" : "present"} in ${LOCATION}, CORS restricted to https://${HOST}`);
}

/* ---------- 3. register it with Firebase ---------- */

{
  const res = await fetch(
    `https://firebasestorage.googleapis.com/v1beta/projects/${PROJECT}/buckets/${BUCKET}:addFirebase`,
    { method: "POST", headers: H, body: "{}" },
  );
  const body = await res.text();
  if (res.ok) console.log(`  ${C.green("✓")} registered with Firebase Storage`);
  else if (/already exists|ALREADY_EXISTS/i.test(body)) console.log(`  ${C.green("✓")} already registered with Firebase Storage`);
  else {
    console.error(`  ${C.red("✗ could not register with Firebase")}: ${res.status} ${body.slice(0, 250)}`);
    console.error(`  ${C.dim("The bucket exists but rules will not apply to it until this succeeds.")}`);
    process.exit(1);
  }
}

/* ---------- 4. firebase.json ---------- */

{
  const file = path.join(ROOT, "firebase.json");
  const raw = readFileSync(file, "utf8");
  const config = JSON.parse(raw);
  const entries = Array.isArray(config.storage) ? config.storage : config.storage ? [config.storage] : [];

  if (entries.some((e) => e.bucket === BUCKET)) {
    console.log(`  ${C.green("✓")} firebase.json already lists it`);
  } else {
    entries.push({ bucket: BUCKET, rules: "storage.rules" });
    config.storage = entries;
    writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
    console.log(`  ${C.green("✓")} added to firebase.json (${entries.length} bucket(s) now listed)`);
  }
}

console.log(`\n${C.bold("Next, in this order:")}`);
console.log(`  1. node scripts/register-tenant.mjs --project=${PROJECT} --tenant=${TENANT} --name="..." --yes`);
console.log(`  2. firebase deploy --only storage --project=${PROJECT}`);
console.log(`\n  ${C.yellow("The order matters.")} These rules deny everything until the tenant_members`);
console.log(`  mirrors exist. Deploying first locks the clinic out of every document,`);
console.log(`  video and voice note it has.\n`);
