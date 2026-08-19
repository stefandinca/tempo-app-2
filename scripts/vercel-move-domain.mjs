#!/usr/bin/env node
/**
 * Moves a domain from one Vercel project to another.
 *
 *   node scripts/vercel-move-domain.mjs --domain=diaconumaria.tempoapp.ro \
 *     --from=tempo-app-diaconumaria --to=tempo-app-2 --dry-run
 *   node scripts/vercel-move-domain.mjs ... --yes
 *
 * Vercel will not accept a domain that another project already holds — adding it
 * returns 409 `domain_already_in_use` — so a move is necessarily remove-then-add,
 * with roughly a second where the hostname resolves to no deployment. The two
 * calls are issued back to back with nothing in between for that reason.
 *
 * Before moving a live clinic, check the destination project has everything that
 * clinic needs. The one that bites is `ANTHROPIC_API_KEY_<TENANT>`: Vercel stores
 * env vars as "sensitive" and will not read them back, so a per-clinic key cannot
 * be copied between projects and has to be re-entered before the move. Moving
 * without it leaves Mira dead on a live clinic.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const DOMAIN = args.domain;
const FROM = args.from;
const TO = args.to;
const DRY = !!args["dry-run"];

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

if (!DOMAIN || !FROM || !TO) {
  console.error(`\n${C.red("✗ --domain, --from and --to are required")}\n`);
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to move without --yes")} (or --dry-run)\n`);
  process.exit(1);
}

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
  throw new Error("No Vercel token. Run `vercel login`, or set VERCEL_TOKEN.");
}

const H = { Authorization: `Bearer ${vercelToken()}`, "Content-Type": "application/json" };
const project = async (name) => {
  const p = await (await fetch(`https://api.vercel.com/v9/projects/${name}`, { headers: H })).json();
  if (!p.id) throw new Error(`no such Vercel project: ${name}`);
  return p;
};

console.log(`\n${C.bold("Move domain")}`);
console.log(`  domain : ${DOMAIN}`);
console.log(`  from   : ${FROM}`);
console.log(`  to     : ${TO}`);
console.log(`  mode   : ${DRY ? C.yellow("DRY RUN") : C.green("APPLY")}\n`);

const src = await project(FROM);
const dst = await project(TO);

const held = await (await fetch(`https://api.vercel.com/v9/projects/${src.id}/domains`, { headers: H })).json();
if (!(held.domains || []).some((d) => d.name === DOMAIN)) {
  console.error(`${C.red(`✗ ${FROM} does not hold ${DOMAIN}`)}`);
  console.error(`  it holds: ${(held.domains || []).map((d) => d.name).join(", ") || "(none)"}\n`);
  process.exit(1);
}

// A per-clinic Mira key cannot be copied between projects, so warn loudly rather
// than silently taking Mira down for a live clinic.
const label = DOMAIN.split(".")[0].toUpperCase().replace(/-/g, "_");
const dstEnv = await (await fetch(`https://api.vercel.com/v10/projects/${dst.id}/env`, { headers: H })).json();
const keys = new Set((dstEnv.envs || []).map((e) => e.key));
const wanted = `ANTHROPIC_API_KEY_${label}`;
if (!keys.has(wanted) && !keys.has("ANTHROPIC_API_KEY")) {
  console.log(`  ${C.yellow("!")} ${TO} has neither ${wanted} nor ANTHROPIC_API_KEY.`);
  console.log(`  ${C.yellow(" ")} Mira will answer ai_unavailable on this domain after the move.\n`);
  if (!DRY && !args.force) {
    console.error(`${C.red("✗ Refusing.")} Set the key first, or pass --force if that is intended.\n`);
    process.exit(1);
  }
}

if (DRY) {
  console.log(`  ${C.yellow("dry run — nothing moved")}\n`);
  process.exit(0);
}

const started = Date.now();
const removed = await fetch(`https://api.vercel.com/v9/projects/${src.id}/domains/${DOMAIN}`, {
  method: "DELETE",
  headers: H,
});
const added = await fetch(`https://api.vercel.com/v10/projects/${dst.id}/domains`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ name: DOMAIN }),
});
const result = await added.json();
const elapsed = Date.now() - started;

if (!removed.ok || !added.ok) {
  console.error(`\n${C.red("✗ move failed")} — removed=${removed.status} added=${added.status}`);
  console.error(`  ${JSON.stringify(result).slice(0, 300)}`);
  console.error(`\n  ${C.red("The domain may now be on NEITHER project.")} Re-add it to one of them.\n`);
  process.exit(1);
}

console.log(`  ${C.green("✓")} moved in ${elapsed}ms  ${C.dim(`verified=${result.verified}`)}`);
console.log(`\n  ${C.dim("The domain serves the destination's CURRENT production deployment.")}`);
console.log(`  ${C.dim("If its env changed, redeploy it — env is bound at build time.")}\n`);
