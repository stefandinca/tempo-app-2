#!/usr/bin/env node
/**
 * Points a tenant's Vercel project at the platform Firebase project.
 *
 *   node scripts/vercel-tenant-env.mjs --project=tempo-app-diaconumaria --dry-run
 *   node scripts/vercel-tenant-env.mjs --project=tempo-app-diaconumaria --yes
 *   node scripts/vercel-tenant-env.mjs --project=... --from=.env.diaconumaria --yes   # roll back
 *
 * Under the bridge model every clinic shares one Firebase project and is
 * separated by database and bucket, both derived from the hostname. Each tenant
 * still has its own Vercel project (one per domain), so each one's Firebase
 * config has to be repointed at the platform project — otherwise the new code
 * looks for `clinic-<name>` inside the OLD project, where it does not exist.
 *
 * ⚠️ ORDER: apply this only AFTER the new code is live on that domain. The old
 * code reads `(default)` on every host, so old code + platform config would
 * serve one clinic another clinic's records. Broken beats leaked — if these get
 * out of step, be out of step in the direction where the app fails.
 *
 * ANTHROPIC_API_KEY is deliberately never touched: each clinic has its own Mira
 * key, and that stays true after the merge.
 *
 * Values are read from a local env file, so a rollback is `--from=.env.<tenant>`.
 * Nothing is ever printed — only key names and value lengths.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const VERCEL_PROJECT = args.project;
const SOURCE = args.from || ".env.live";
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!VERCEL_PROJECT) {
  console.error(`\n${C.red("✗ --project is required")} (the VERCEL project name)\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

/** Everything that identifies which Firebase project the app talks to. */
const KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
  // Required, not optional: parent portal sign-in goes through the Admin SDK.
  "FIREBASE_SERVICE_ACCOUNT",
];

const ROOT = path.resolve(import.meta.dirname, "..");
const TOKEN_FILE = path.join(
  process.env.APPDATA || path.join(process.env.HOME || "", ".local", "share"),
  "xdg.data",
  "com.vercel.cli",
  "auth.json",
);

function vercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  try {
    const t = JSON.parse(readFileSync(TOKEN_FILE, "utf8")).token;
    if (t) return t;
  } catch { /* fall through */ }
  throw new Error(`No Vercel token. Run \`vercel login\`, or set VERCEL_TOKEN.`);
}

function readEnvFile(file) {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const TOKEN = vercelToken();
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const source = readEnvFile(SOURCE);

const missing = KEYS.filter((k) => !source[k]);
if (missing.length) {
  console.error(`\n${C.red(`✗ ${SOURCE} is missing:`)} ${missing.join(", ")}\n`);
  process.exit(1);
}

console.log(`\n${C.bold("Vercel tenant env")}`);
console.log(`  vercel project : ${VERCEL_PROJECT}`);
console.log(`  values from    : ${SOURCE} ${C.dim(`(firebase project ${source.NEXT_PUBLIC_FIREBASE_PROJECT_ID})`)}`);
console.log(`  mode           : ${DRY ? C.yellow("DRY RUN") : C.green("APPLY")}\n`);

const project = await (await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT}`, { headers: H })).json();
if (!project.id) {
  console.error(`${C.red("✗ no such Vercel project")}: ${JSON.stringify(project).slice(0, 200)}\n`);
  process.exit(1);
}

const existing = await (await fetch(`https://api.vercel.com/v10/projects/${project.id}/env?decrypt=false`, { headers: H })).json();
const byKey = new Map();
for (const e of existing.envs || []) {
  if (!byKey.has(e.key)) byKey.set(e.key, []);
  byKey.get(e.key).push(e);
}

for (const key of KEYS) {
  const current = byKey.get(key) || [];
  const targets = current.length
    ? [...new Set(current.flatMap((e) => e.target || []))]
    : ["production", "preview"];
  const value = source[key];
  const label = `${key.padEnd(42)}`;

  if (DRY) {
    console.log(`  ${C.yellow("~")} ${label} ${C.dim(`${current.length ? "replace" : "create"} · ${value.length} chars · ${targets.join(",")}`)}`);
    continue;
  }

  // Delete then create: the existing entries are stored as "sensitive", which
  // cannot be read back or type-changed in place.
  for (const e of current) {
    await fetch(`https://api.vercel.com/v9/projects/${project.id}/env/${e.id}`, { method: "DELETE", headers: H });
  }

  const res = await fetch(`https://api.vercel.com/v10/projects/${project.id}/env`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      key,
      value,
      // NEXT_PUBLIC_* end up in the client bundle regardless, so keeping them
      // readable makes future audits possible. The service account does not.
      type: key.startsWith("NEXT_PUBLIC_") ? "encrypted" : "sensitive",
      target: targets,
    }),
  });
  const body = await res.json();
  if (res.ok) {
    console.log(`  ${C.green("✓")} ${label} ${C.dim(`${current.length ? "replaced" : "created"} · ${value.length} chars · ${targets.join(",")}`)}`);
  } else {
    console.log(`  ${C.red("✗")} ${label} ${C.red(JSON.stringify(body).slice(0, 160))}`);
  }
}

const untouched = [...byKey.keys()].filter((k) => !KEYS.includes(k));
if (untouched.length) console.log(`\n  ${C.dim(`untouched: ${untouched.join(", ")}`)}`);

console.log(
  `\n  ${DRY ? C.yellow("dry run — nothing written") : C.green("done")} — env changes only take effect on the NEXT deployment.`,
);
console.log(`  ${C.dim("Redeploy that project, or push to its production branch.")}\n`);
