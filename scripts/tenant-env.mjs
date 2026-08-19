#!/usr/bin/env node
/**
 * Tenant-aware launcher for dev and build.
 *
 * Why this exists: `.env` is loaded by Next on every run and used to carry the
 * LIVE Firebase project, so `npm run dev` silently talked to the production
 * clinic database. With more than one tenant that is a matter of time before
 * someone writes test data into a real clinic. Selecting a tenant is now
 * explicit, and a run with no tenant fails instead of guessing.
 *
 *   node scripts/tenant-env.mjs demo -- next dev
 *   node scripts/tenant-env.mjs live -- next build
 *   node scripts/tenant-env.mjs --check demo      # validate only, run nothing
 *
 * On Vercel the environment comes from the dashboard rather than a file, so if
 * the Firebase config is already present in process.env the run is allowed
 * through without a tenant argument (and the resolved project is still printed).
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dotenv = require("dotenv");

const ROOT = path.resolve(import.meta.dirname, "..");

/** Firebase project each tenant name is expected to resolve to. */
const TENANTS = {
  demo: { project: "tempo-app-demo", label: "Demo" },
  live: { project: "tempo-app-2", label: "LIVE — Live Better Life (real clinic data)" },
  diaconumaria: { project: "tempo-diaconumaria", label: "LIVE — Diaconu Maria (real clinic data)" },
};

/** Tenants holding real client records — flagged red and warned about. */
const PRODUCTION_TENANTS = new Set(["live", "diaconumaria"]);

const REQUIRED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

/** Absent, these degrade a feature rather than break the app — warn, don't fail. */
const OPTIONAL = {
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: "push notifications will not register",
  ANTHROPIC_API_KEY: "the Mira assistant returns ai_unavailable",
  FIREBASE_SERVICE_ACCOUNT: "AI and SmartBill API routes cannot authenticate",
};

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function usage(message) {
  console.error(`\n${C.red("✗ " + message)}\n`);
  console.error("Pick a tenant explicitly — there is no default, on purpose:\n");
  // Generated from TENANTS so adding a clinic cannot leave this list stale.
  for (const [name, cfg] of Object.entries(TENANTS)) {
    const warn = PRODUCTION_TENANTS.has(name) ? "REAL clinic data" : "safe to write to";
    console.error(`  ${C.bold(`npm run dev:${name}`.padEnd(28))} ${C.dim(`# ${cfg.project} — ${warn}`)}`);
  }
  console.error("");
  console.error(C.dim("Each reads .env.<tenant>. On Vercel the dashboard environment is used instead.\n"));
  process.exit(1);
}

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const rest = argv.filter((a) => a !== "--check");
const sepIndex = rest.indexOf("--");
const tenant = sepIndex === -1 ? rest[0] : rest.slice(0, sepIndex)[0];
const command = sepIndex === -1 ? [] : rest.slice(sepIndex + 1);

let env = { ...process.env };
let source;

if (tenant) {
  if (!TENANTS[tenant]) {
    usage(`Unknown tenant "${tenant}". Known tenants: ${Object.keys(TENANTS).join(", ")}.`);
  }
  const file = path.join(ROOT, `.env.${tenant}`);
  if (!existsSync(file)) {
    usage(`Tenant "${tenant}" selected but ${path.basename(file)} does not exist.`);
  }
  // File values win over the ambient shell, so a stale exported var cannot
  // quietly redirect the run to another project.
  env = { ...env, ...dotenv.parse(readFileSync(file)) };
  source = path.basename(file);
} else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  source = "inherited environment (CI / Vercel)";
} else {
  usage("No tenant selected and no Firebase config in the environment.");
}

const missing = REQUIRED.filter((k) => !env[k]);
if (missing.length) {
  console.error(`\n${C.red("✗ Missing required variables")} (from ${source}):`);
  missing.forEach((k) => console.error(`    ${k}`));
  console.error("");
  process.exit(1);
}

const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const expected = tenant ? TENANTS[tenant].project : null;
if (expected && project !== expected) {
  console.error(
    `\n${C.red("✗ Refusing to run.")} Tenant "${tenant}" should target ${C.bold(expected)}, ` +
    `but ${source} resolves to ${C.bold(project)}.\n`,
  );
  process.exit(1);
}

const isLive = tenant ? PRODUCTION_TENANTS.has(tenant) : project !== TENANTS.demo.project;
const label = tenant ? TENANTS[tenant].label : project;

console.log("");
console.log(`  ${C.bold("tenant  ")} ${isLive ? C.red(label) : C.green(label)}`);
console.log(`  ${C.bold("project ")} ${isLive ? C.red(project) : C.green(project)}`);
console.log(`  ${C.bold("source  ")} ${C.dim(source)}`);
if (isLive) {
  console.log(`  ${C.red("⚠  This is the production clinic database. Writes affect real client records.")}`);
}
for (const [key, consequence] of Object.entries(OPTIONAL)) {
  if (!env[key]) console.log(`  ${C.yellow("!")} ${C.dim(`${key} not set — ${consequence}`)}`);
}
console.log("");

// The FCM service worker is served per-deployment and must carry THIS tenant's
// Firebase config. Generated here, once the env is resolved, so neither the local
// nor the Vercel build path can skip it.
try {
  const { generateMessagingSw } = await import("./generate-messaging-sw.mjs");
  const target = generateMessagingSw(env);
  console.log(`  ${C.dim(`generated public/firebase-messaging-sw.js for ${target}`)}\n`);
} catch (err) {
  console.error(`  ${C.red("✗ " + err.message)}`);
  console.error(`  ${C.dim("Push notifications would silently target the wrong project — refusing to continue.")}\n`);
  process.exit(1);
}

if (checkOnly || command.length === 0) process.exit(0);

// Passed as one string rather than an argv array: `next` is a .cmd shim on
// Windows so a shell is required, and cmd.exe re-parses an argv array, mangling
// any quoting. Joining lets the shell parse the line exactly once.
const child = spawn(command.join(" "), { stdio: "inherit", env, shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(C.red(`✗ Failed to start "${command.join(" ")}": ${err.message}`));
  process.exit(1);
});
