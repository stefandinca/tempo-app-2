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
 *   node scripts/tenant-env.mjs livebetterlife -- next build
 *   node scripts/tenant-env.mjs --check demo      # validate only, run nothing
 *
 * Every clinic now shares ONE Firebase project and is separated by database and
 * bucket, both derived from the hostname (src/lib/tenant.ts). So a tenant is no
 * longer a different set of Firebase credentials — it is a different HOST, and
 * that is all this sets. A dev server answers on localhost, which resolves to the
 * control plane and shows an empty app, so NEXT_PUBLIC_TENANT_HOST is what makes
 * a local run reach a clinic at all.
 *
 * On Vercel the environment comes from the dashboard rather than a file, and the
 * real request hostname already selects the tenant, so a run with the Firebase
 * config already in process.env is allowed through with no tenant argument.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Loaded only when a tenant file actually has to be parsed. `dotenv` reaches us
 * transitively through `dotenv-cli` (a devDependency), so requiring it at module
 * load would make every build — including Vercel's, which needs no file at all —
 * depend on a transitive dev dependency being installed.
 */
function parseEnvFile(file) {
  let dotenv;
  try {
    dotenv = require("dotenv");
  } catch {
    usage(
      `Reading .env files needs the "dotenv" package, which is not installed. ` +
      `Run npm install, or set the Firebase variables in the environment instead.`,
    );
  }
  return dotenv.parse(readFileSync(file));
}

const ROOT = path.resolve(import.meta.dirname, "..");

/** The single Firebase project every tenant now lives in. */
const PLATFORM_PROJECT = "tempo-app-2";

/**
 * The host each tenant answers on. This is the whole of tenant selection: the
 * app derives the Firestore database and the Storage bucket from it.
 */
const TENANTS = {
  demo: { host: "demo.tempoapp.ro", label: "Demo" },
  livebetterlife: { host: "livebetterlife.tempoapp.ro", label: "LIVE — Live Better Life (real clinic data)" },
  diaconumaria: { host: "diaconumaria.tempoapp.ro", label: "LIVE — Diaconu Maria (real clinic data)" },
};

/** Old name for a tenant, kept working so existing muscle memory does not break. */
const ALIASES = { live: "livebetterlife" };

/** Tenants holding real client records — flagged red and warned about. */
const PRODUCTION_TENANTS = new Set(["livebetterlife", "diaconumaria"]);

/**
 * One project means one set of Firebase credentials, so there is one env file
 * rather than one per clinic. `.env.live` is accepted as its previous name.
 */
const ENV_FILES = [".env.platform", ".env.live"];

const REQUIRED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  // Required, not optional: parent portal sign-in now goes through
  // /api/parent/link, which needs the Admin SDK. Without this, no parent can
  // reach the portal at all.
  "FIREBASE_SERVICE_ACCOUNT",
];

/** Absent, these degrade a feature rather than break the app — warn, don't fail. */
const OPTIONAL = {
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: "push notifications will not register",
  ANTHROPIC_API_KEY: "the Mira assistant returns ai_unavailable",
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
    console.error(`  ${C.bold(`npm run dev:${name}`.padEnd(28))} ${C.dim(`# ${cfg.host} — ${warn}`)}`);
  }
  console.error("");
  console.error(C.dim(`All tenants share ${PLATFORM_PROJECT} and read ${ENV_FILES[0]}; the tenant sets the host.\n`));
  process.exit(1);
}

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const rest = argv.filter((a) => a !== "--check");
const sepIndex = rest.indexOf("--");
const requested = sepIndex === -1 ? rest[0] : rest.slice(0, sepIndex)[0];
const tenant = requested && ALIASES[requested] ? ALIASES[requested] : requested;
const command = sepIndex === -1 ? [] : rest.slice(sepIndex + 1);

let env = { ...process.env };
let source;

if (tenant) {
  if (!TENANTS[tenant]) {
    usage(`Unknown tenant "${tenant}". Known tenants: ${Object.keys(TENANTS).join(", ")}.`);
  }
  const file = ENV_FILES.map((f) => path.join(ROOT, f)).find(existsSync);
  if (!file) {
    usage(`None of ${ENV_FILES.join(" or ")} exists — one of them must hold the ${PLATFORM_PROJECT} config.`);
  }
  // File values win over the ambient shell, so a stale exported var cannot
  // quietly redirect the run to another project.
  env = { ...env, ...parseEnvFile(file) };
  // The whole of tenant selection. Without it a dev server answers on localhost,
  // which resolves to the control plane and shows an empty app.
  env.NEXT_PUBLIC_TENANT_HOST = TENANTS[tenant].host;
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
if (tenant && project !== PLATFORM_PROJECT) {
  console.error(
    `\n${C.red("✗ Refusing to run.")} Every tenant now lives in ${C.bold(PLATFORM_PROJECT)}, ` +
    `but ${source} resolves to ${C.bold(project)}.\n` +
    `  A per-clinic project is the OLD architecture — its data no longer receives writes.\n`,
  );
  process.exit(1);
}

const isLive = tenant ? PRODUCTION_TENANTS.has(tenant) : true;
const label = tenant ? TENANTS[tenant].label : project;

console.log("");
console.log(`  ${C.bold("tenant  ")} ${isLive ? C.red(label) : C.green(label)}`);
console.log(`  ${C.bold("project ")} ${C.green(project)}`);
if (tenant) console.log(`  ${C.bold("host    ")} ${isLive ? C.red(TENANTS[tenant].host) : C.green(TENANTS[tenant].host)}`);
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
