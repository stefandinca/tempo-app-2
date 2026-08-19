#!/usr/bin/env node
/**
 * Populates /team_public/{uid} from existing /team_members records.
 *
 * Run once per tenant when the team_public mirror is introduced. New and edited
 * staff are mirrored automatically (src/lib/teamPublicSync.ts and the
 * createTeamMember Cloud Function); this covers everyone who already existed.
 *
 *   node scripts/backfill-team-public.mjs --project=tempo-app-demo --dry-run
 *   node scripts/backfill-team-public.mjs --project=tempo-app-demo --yes
 *
 * Without it, /team_members becomes staff-only and the parent portal shows no
 * therapist names at all — so this must run BEFORE the rules are deployed, or
 * immediately after.
 */
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const DRY_RUN = !!args["dry-run"];
const C = { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m` };

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project=<firebase-project-id> is required")}\n`);
  process.exit(1);
}
if (!DRY_RUN && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run to preview).\n`);
  process.exit(1);
}

/** Only these fields. Anything else here would be visible to every anonymous session. */
function toPublic(m) {
  const name = String(m.name || "");
  return {
    name,
    initials:
      m.initials || name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 2),
    color: m.color || "#9CA3AF",
    role: String(m.role || ""),
  };
}

const db = new Db(PROJECT, { allowAnyProject: true });
db.dryRun = DRY_RUN;

const members = await db.listAll("team_members");
console.log(`\n  project : ${PROJECT}${DRY_RUN ? C.dim("  (DRY RUN)") : ""}`);
console.log(`  staff   : ${members.length}`);

await db.commit(members.map((m) => db.setWrite(`team_public/${m.__id}`, toPublic(m))));

for (const m of members) {
  const p = toPublic(m);
  console.log(`    ${C.green("✓")} ${p.name.padEnd(20)} ${p.role.padEnd(12)} ${p.initials}`);
}
console.log(`\n  ${DRY_RUN ? "would write" : "wrote"} ${members.length} mirror documents\n`);
