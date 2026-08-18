#!/usr/bin/env node
/**
 * Demo data seeder for TempoApp.
 *
 * Populates the DEMO Firebase project with realistic Romanian clinical data —
 * sessions, attendance, program scores, evaluations across all five protocols,
 * billing and parent-facing content — so the marketing site can be screenshotted
 * against something that looks like a working clinic.
 *
 *   node scripts/seed-demo-data.mjs --dry-run     # report what would change
 *   node scripts/seed-demo-data.mjs               # apply
 *   node scripts/seed-demo-data.mjs --undo        # delete everything tagged by a run
 *
 * SAFETY. This script may only ever touch the project named in ALLOWED_PROJECT
 * ("tempo-app-demo"). It authenticates with gcloud Application Default
 * Credentials, which belong to a person and can reach the live project too — so
 * the credential is NOT the boundary. The allowlist is, and it is re-asserted
 * inside Db.commit() immediately before every write leaves the process.
 *
 * Documents this script creates carry seedTag: "demo-mock-v1". Documents it
 * repairs in place are backed up to demo-backup/<timestamp>/ first.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { Db, ALLOWED_PROJECT, writeBackup } from "./demo-seed/firestore.mjs";
import { GENERATORS } from "./demo-seed/evaluations.mjs";
import {
  SEED_TAG, makeRng, ageMonths, enrichClients, generateEventsForClient, repairEvent,
  generateInvoices, generatePayouts, generateExpenses, generateHomework, generatePlan,
  generateDocuments, pick, pickN, int, iso,
} from "./demo-seed/generate.mjs";
import * as RO from "./demo-seed/content.ro.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const UNDO = args.includes("--undo");
const HERO_COUNT = 3;
const MONTHS_BACK = 12;
const DAYS_AHEAD = 14;
const JUNK_SERVICES = ["polish-audi-a7"];

const ROOT = path.resolve(import.meta.dirname, "..");
const now = new Date();
const rangeFrom = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, now.getDate());
const rangeTo = new Date(now.getTime() + DAYS_AHEAD * 86400000);

const log = (...a) => console.log(...a);
const section = (t) => log(`\n\x1b[1m${t}\x1b[0m`);

const db = new Db(ALLOWED_PROJECT);
db.dryRun = DRY_RUN;

log(`\x1b[1mTempoApp demo seeder\x1b[0m`);
log(`  project : ${ALLOWED_PROJECT}${DRY_RUN ? "  (DRY RUN — no writes)" : ""}`);
log(`  window  : ${rangeFrom.toISOString().slice(0, 10)} -> ${rangeTo.toISOString().slice(0, 10)}`);

/* ============================ undo ============================ */

if (UNDO) {
  section("Removing seeded documents");
  let removed = 0;
  const collections = ["events", "invoices", "payouts", "expenses"];
  for (const col of collections) {
    const docs = await db.listAll(col);
    const tagged = docs.filter((d) => d.seedTag === SEED_TAG);
    if (tagged.length) {
      await db.commit(tagged.map((d) => db.deleteWrite(`${col}/${d.__id}`)));
      removed += tagged.length;
      log(`  ${col}: removed ${tagged.length}`);
    }
  }
  const clients = await db.listAll("clients");
  for (const c of clients) {
    for (const sub of ["evaluations", "vbmapp_evaluations", "portage_evaluations", "cars_evaluations",
                       "carolina_evaluations", "interventionPlans", "homework", "documents"]) {
      const docs = await db.listAll(`clients/${c.__id}/${sub}`).catch(() => []);
      const tagged = docs.filter((d) => d.seedTag === SEED_TAG);
      if (tagged.length) {
        await db.commit(tagged.map((d) => db.deleteWrite(`clients/${c.__id}/${sub}/${d.__id}`)));
        removed += tagged.length;
      }
    }
  }
  log(`\nRemoved ${removed} documents. Repairs to pre-existing docs are NOT reverted —`);
  log(`restore those from demo-backup/ if needed.`);
  process.exit(0);
}

/* ============================ load ============================ */

section("Reading current state");
const [clients, team, services, programs, existingEvents] = await Promise.all([
  db.listAll("clients"),
  db.listAll("team_members"),
  db.listAll("services"),
  db.listAll("programs"),
  db.listAll("events"),
]);
log(`  clients=${clients.length} team=${team.length} services=${services.length} programs=${programs.length} events=${existingEvents.length}`);

const therapists = team.filter((t) => /therapist|coordinator/i.test(t.role || ""));
const coordinator = team.find((t) => /coordinator/i.test(t.role || "")) || team[0];
const admin = team.find((t) => /admin/i.test(t.role || "")) || team[0];
if (!therapists.length) {
  console.error("No therapists or coordinators found — cannot assign sessions. Aborting.");
  process.exit(1);
}

// Heroes: the deeply-populated clients you open for a screenshot. Chosen by a
// stable rule (first by name) so re-runs pick the same children.
const sortedClients = [...clients].sort((a, b) => String(a.name).localeCompare(String(b.name)));
const heroes = new Set(sortedClients.slice(0, HERO_COUNT).map((c) => c.__id));
log(`  heroes  : ${sortedClients.slice(0, HERO_COUNT).map((c) => c.name).join(", ")}`);

const backupDir = path.join(ROOT, "demo-backup", now.toISOString().replace(/[:.]/g, "-"));
if (!DRY_RUN) mkdirSync(backupDir, { recursive: true });

/* ============================ cleanup ============================ */

section("Cleanup");
const junk = services.filter((s) => JUNK_SERVICES.includes(s.__id));
const junkInUse = junk.filter((s) => existingEvents.some((e) => e.type === s.__id));
if (junk.length) {
  const removable = junk.filter((s) => !junkInUse.includes(s));
  if (removable.length) {
    if (!DRY_RUN) writeBackup(backupDir, "services-deleted", removable);
    await db.commit(removable.map((s) => db.deleteWrite(`services/${s.__id}`)));
    log(`  deleted junk service(s): ${removable.map((s) => s.label).join(", ")}`);
  }
  junkInUse.forEach((s) => log(`  KEPT ${s.label} — ${existingEvents.filter((e) => e.type === s.__id).length} events reference it`));
} else {
  log("  nothing to clean");
}

// Abandoned evaluation drafts (started, one or two items scored, never finished)
// surface in the list at 0% and make a client's progress read as a regression.
const EVAL_SUBS = ["evaluations", "vbmapp_evaluations", "portage_evaluations", "cars_evaluations", "carolina_evaluations"];
const abandoned = [];
for (const client of clients) {
  for (const sub of EVAL_SUBS) {
    for (const doc of await db.listAll(`clients/${client.__id}/${sub}`)) {
      if (doc.seedTag) continue;
      const scored = Object.keys(doc.scores || doc.milestoneScores || {}).length;
      if (doc.status !== "completed" && scored < 5) {
        abandoned.push({ path: `clients/${client.__id}/${sub}/${doc.__id}`, doc });
      }
    }
  }
}
if (abandoned.length) {
  if (!DRY_RUN) writeBackup(backupDir, "abandoned-evaluations", abandoned.map((a) => a.doc));
  await db.commit(abandoned.map((a) => db.deleteWrite(a.path)));
}
log(`  abandoned evaluation drafts removed: ${abandoned.length}`);

// Each client should have exactly one ACTIVE plan — DataContext keys active plans
// by clientId, so several actives means an arbitrary one wins. Retire the older
// pre-existing plans; the seeded plan below becomes the current one.
const stalePlans = [];
for (const client of clients) {
  for (const plan of await db.listAll(`clients/${client.__id}/interventionPlans`)) {
    if (plan.seedTag || plan.status !== "active") continue;
    stalePlans.push({ path: `clients/${client.__id}/interventionPlans/${plan.__id}`, doc: plan });
  }
}
if (stalePlans.length) {
  if (!DRY_RUN) writeBackup(backupDir, "plans-before-retire", stalePlans.map((p) => p.doc));
  await db.commit(stalePlans.map((p) => db.mergeWrite(p.path, { status: "completed", seedRepaired: SEED_TAG })));
}
log(`  older intervention plans retired: ${stalePlans.length}`);

/* ============================ team ============================ */

section("Team");
const salaryWrites = [];
const newSalaries = new Map();
for (const member of team) {
  // Recompute salaries this run set; never overwrite a figure that was already
  // there before the seeder touched this project.
  if (member.baseSalary && member.seedTag !== SEED_TAG) continue;
  const rng = makeRng(`salary:${member.__id}`);
  const role = String(member.role || "").toLowerCase();
  // Scaled against what the centre actually bills, so the billing page shows a
  // believable margin rather than a clinic running at a loss every month.
  const baseSalary = role.includes("admin") ? int(rng, 4800, 5400)
    : role.includes("coordinator") ? int(rng, 4400, 4900)
    : int(rng, 3200, 3900);
  newSalaries.set(member.__id, baseSalary);
  salaryWrites.push(db.mergeWrite(`team_members/${member.__id}`, { baseSalary, seedTag: SEED_TAG }));
}
if (salaryWrites.length) {
  if (!DRY_RUN) writeBackup(backupDir, "team_members", team);
  await db.commit(salaryWrites);
}
log(`  base salaries set: ${salaryWrites.length}`);
// Must reflect the salaries just written — `team` is the snapshot from BEFORE
// this update, so using it directly would price payouts off stale figures.
const teamWithSalary = team.map((t) => ({
  ...t,
  baseSalary: newSalaries.get(t.__id) ?? t.baseSalary ?? 3600,
}));

/* ============================ clients ============================ */

section("Clients");
const { writes: clientPatches } = enrichClients({ clients, therapists, heroes });
const realPatches = clientPatches.filter((w) => Object.keys(w.patch).length > 1);
if (realPatches.length) {
  if (!DRY_RUN) writeBackup(backupDir, "clients", clients);
  await db.commit(realPatches.map((w) => db.mergeWrite(`clients/${w.id}`, w.patch)));
}
log(`  enriched: ${realPatches.length}/${clients.length}`);
// Work from the enriched view from here on — invoices depend on the billing fields.
const enrichedClients = clients.map((c) => {
  const p = clientPatches.find((w) => w.id === c.__id);
  return p ? { ...c, ...p.patch } : c;
});

/* ============================ events ============================ */

section("Sessions");
const repairs = [];
for (const ev of existingEvents) {
  const client = enrichedClients.find((c) => c.__id === ev.clientId);
  const patch = repairEvent({ event: ev, client, programs, now });
  if (Object.keys(patch).length) repairs.push({ id: ev.__id, patch });
}
if (repairs.length) {
  if (!DRY_RUN) writeBackup(backupDir, "events-before-repair", existingEvents.filter((e) => repairs.some((r) => r.id === e.__id)));
  await db.commit(repairs.map((r) => db.mergeWrite(`events/${r.id}`, r.patch)));
}
log(`  repaired existing: ${repairs.length}/${existingEvents.length}`);

// Generate only into the gaps the existing data leaves, so we neither duplicate
// nor overwrite what is already on the calendar.
const existingTimes = new Set(existingEvents.map((e) => `${e.clientId}|${String(e.startTime).slice(0, 13)}`));
const newEvents = [];
for (const client of enrichedClients) {
  const generated = generateEventsForClient({
    client, therapists, programs, isHero: heroes.has(client.__id),
    from: rangeFrom, to: rangeTo, now,
  });
  for (const ev of generated) {
    if (existingTimes.has(`${ev.clientId}|${ev.startTime.slice(0, 13)}`)) continue;
    newEvents.push(ev);
  }
}
await db.commit(newEvents.map((e, i) => db.setWrite(`events/seed_${e.clientId}_${String(i).padStart(5, "0")}`, e)));
log(`  generated new: ${newEvents.length}`);

const allEvents = [
  ...existingEvents.map((e) => {
    const r = repairs.find((x) => x.id === e.__id);
    return r ? { ...e, ...r.patch } : e;
  }),
  ...newEvents,
];

/* ============================ evaluations ============================ */

section("Evaluations");
let evalCount = 0;
for (const client of enrichedClients) {
  const isHero = heroes.has(client.__id);
  const count = isHero ? 3 : 1;
  const writes = [];

  for (const [collectionId, gen] of Object.entries(GENERATORS)) {
    // Non-hero clients get one instrument, not all five — a real clinic does not
    // run every protocol on every child.
    if (!isHero && collectionId !== "evaluations" && collectionId !== "vbmapp_evaluations") continue;
    const rng = makeRng(`eval:${client.__id}:${collectionId}`);
    if (!isHero && collectionId === "vbmapp_evaluations" && rng() < 0.5) continue;

    for (let i = 0; i < count; i++) {
      // Spread across the year, ending near today, with ability rising each time.
      const monthsAgo = count === 1 ? 4 : [10, 5, 1][i];
      const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 12, 11, 0, 0);
      const baseAbility = 0.22 + (makeRng(`ability:${client.__id}`)() * 0.25);
      const ability = Math.min(0.85, baseAbility + i * 0.2);
      const evaluator = pick(makeRng(`evaluator:${client.__id}:${i}`), therapists);

      const doc = gen.generate({
        clientId: client.__id,
        ability,
        ageMonths: ageMonths(client.birthDate, date),
        rng: makeRng(`${collectionId}:${client.__id}:${i}`),
        dateISO: iso(date),
        evaluator: { id: evaluator.__id, name: evaluator.name },
      });
      doc.seedTag = SEED_TAG;
      writes.push(db.setWrite(`clients/${client.__id}/${collectionId}/seed_${collectionId}_${i}`, doc));
      evalCount += 1;
    }
  }
  await db.commit(writes);
}
log(`  generated: ${evalCount}`);

/* ============================ billing ============================ */

section("Billing");
const invoices = generateInvoices({ clients: enrichedClients, events: allEvents, services, now });
await db.commit(invoices.map((i) => db.setWrite(`invoices/${i.id}`, i.data)));
log(`  invoices: ${invoices.length}`);

const payouts = generatePayouts({ team: teamWithSalary, events: allEvents, now });
await db.commit(payouts.map((p) => db.setWrite(`payouts/${p.id}`, p.data)));
log(`  payouts : ${payouts.length}`);

const expenses = generateExpenses({ now, monthsBack: MONTHS_BACK });
await db.commit(expenses.map((e) => db.setWrite(`expenses/${e.id}`, e.data)));
log(`  expenses: ${expenses.length}`);

/* ============================ parent-facing ============================ */

section("Parent-facing data");
let hwCount = 0, planCount = 0, docCount = 0;
for (const client of enrichedClients) {
  const therapist = therapists.find((t) => (client.therapistIds || []).includes(t.__id)) || therapists[0];
  const writes = [];

  for (const hw of generateHomework({ client, therapist, now })) {
    writes.push(db.setWrite(`clients/${client.__id}/homework/${hw.id}`, hw.data));
    hwCount += 1;
  }
  const plan = generatePlan({ client, programs, coordinator, now });
  writes.push(db.setWrite(`clients/${client.__id}/interventionPlans/${plan.id}`, plan.data));
  planCount += 1;

  for (const d of generateDocuments({ client, uploader: coordinator, now })) {
    writes.push(db.setWrite(`clients/${client.__id}/documents/${d.id}`, d.data));
    docCount += 1;
  }
  await db.commit(writes);
}
log(`  homework: ${hwCount}  plans: ${planCount}  documents: ${docCount}`);

/* ============================ done ============================ */

section("Done");
log(`  ${DRY_RUN ? "would write" : "wrote"} ${db.writes} documents`);
if (!DRY_RUN) log(`  backups: ${path.relative(ROOT, backupDir)}`);
log(`  undo generated docs with: node scripts/seed-demo-data.mjs --undo\n`);
