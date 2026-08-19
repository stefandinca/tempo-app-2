#!/usr/bin/env node
/**
 * Bootstraps a NEW tenant's Firestore: the documents a fresh Firebase project
 * needs before the app is usable at all.
 *
 *   node scripts/bootstrap-tenant.mjs --project=clinic-x --name="Clinic X" --dry-run
 *   node scripts/bootstrap-tenant.mjs --project=clinic-x --name="Clinic X" --yes
 *
 * Writes:
 *   system_settings/config   clinic identity, invoice series, VAT, account limits
 *   services/*               the standard Romanian service catalogue with rates
 *   programs/*               a starter set of ABA programme definitions
 *
 * Does NOT write, because they cannot be done over the Firestore REST API —
 * the script prints them as remaining steps:
 *   - security rules, indexes, Cloud Functions  (firebase deploy)
 *   - Auth providers, authorized domains, FCM VAPID key  (console)
 *   - the first admin user  (Auth user + team_members doc keyed by its UID)
 *
 * SAFETY. Unlike seed-demo-data.mjs there is no project allowlist here — the
 * whole point is arbitrary new projects. Instead it refuses to touch a project
 * that already holds clients or team members unless --force is passed, so it
 * cannot quietly overwrite a live clinic's configuration.
 */
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

const PROJECT = args.project;
const CLINIC = args.name || "Centru de terapie";
const DRY_RUN = !!args["dry-run"];
const FORCE = !!args.force;

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

if (!PROJECT) {
  console.error(`\n${C.red("✗ --project=<firebase-project-id> is required")}\n`);
  console.error(`  node scripts/bootstrap-tenant.mjs --project=clinic-x --name="Clinic X" --dry-run\n`);
  process.exit(1);
}
if (!DRY_RUN && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or use --dry-run to preview).\n`);
  process.exit(1);
}

/* ---------------- content ---------------- */

const SERVICES = [
  { id: "therapy", label: "Terapie ABA", basePrice: 195, color: "#4A90E2", isBillable: true, requiresTime: true },
  { id: "logopedie", label: "Logopedie", basePrice: 195, color: "#10B981", isBillable: true, requiresTime: true },
  { id: "evaluare", label: "Evaluare", basePrice: 250, color: "#8B5CF6", isBillable: true, requiresTime: true },
  { id: "group-therapy", label: "Terapie de grup", basePrice: 150, color: "#EC4899", isBillable: true, requiresTime: true },
  { id: "consiliere-parinti", label: "Consiliere părinți", basePrice: 200, color: "#F97316", isBillable: true, requiresTime: true },
  { id: "psihoterapie", label: "Psihoterapie", basePrice: 250, color: "#F59E0B", isBillable: true, requiresTime: true },
  { id: "dezvoltare-personala", label: "Dezvoltare personală", basePrice: 200, color: "#84CC16", isBillable: true, requiresTime: true },
  { id: "coordination", label: "Coordonare", basePrice: 250, color: "#06B6D4", isBillable: true, requiresTime: true },
  { id: "pauza-masa", label: "Pauză de masă", basePrice: 0, color: "#9CA3AF", isBillable: false, requiresTime: false },
  { id: "day-off", label: "Zi liberă", basePrice: 0, color: "#D1D5DB", isBillable: false, requiresTime: false },
];

const PROGRAMS = [
  ["prog_1", "Imitare orala", "Reproduce miscarile gurii si sunetele produse de terapeut (ex: suflat, deschis gura, pronuntat silabe)."],
  ["prog_2", "Stimulare de limbaj", "Activitati pentru a creste dorinta si capacitatea copilului de a comunica verbal."],
  ["prog_3", "Instructiuni functionale", "Urmeaza comenzi simple din viata de zi cu zi (adu mingea, pune cana pe masa)."],
  ["prog_4", "Imitare motorie cu obiect", "Copiaza actiuni ale adultului care implica obiecte (ex: bate toba, impinge o masinuta)."],
  ["prog_5", "Receptiv obiecte", "Copilul invata sa recunoasca si sa indice obiecte atunci cand sunt denumite."],
  ["prog_6", "Motricitate fina", "Exercitii pentru dezvoltarea miscarilor fine (ex: apucare, tras linii, decupare)."],
  ["prog_7", "Raspuns la nume", "Invata sa se intoarca sau sa raspunda cand isi aude numele."],
  ["prog_8", "Asteapta", "Invata sa astepte pe rand, si sa amane o dorinta sau o actiune."],
  ["prog_9", "Joc social", "Exercitii de interactiune si schimb reciproc in joc (da-mi mingea, hai sa construim impreuna)."],
  ["prog_10", "Gesturi functionale", "Copilul foloseste gesturi sau cuvinte pentru a cere, a refuza sau a comunica nevoi."],
  ["prog_11", "Imitare verbala", "Repeta cuvinte sau propozitii dupa adult (spune mama, spune apa)."],
  ["prog_12", "Joc si miscare", "Activitati care combina jocul cu exercitiile fizice pentru coordonare si socializare."],
  ["prog_13", "Atentie", "Exercitii pentru a creste capacitatea de concentrare pe o sarcina sau pe interlocutor."],
  ["prog_14", "MAND", "Cereri verbale - copilul invata sa ceara ceea ce doreste folosind cuvinte."],
  ["prog_15", "TACT", "Denumire - copilul invata sa numeasca obiecte, actiuni, caracteristici din mediu."],
  ["prog_16", "Potriviri", "Potriveste obiecte identice sau similare dupa forma, culoare sau categorie."],
];

/**
 * Field names here must match what the settings tabs read and write —
 * BillingConfigTab writes `legalEntities` / `invoicing` / `integrations`,
 * LimitsConfigTab writes `maxActiveClients` / `maxActiveTeamMembers`, and
 * useSystemSettings reads the single document system_settings/config.
 */
function configDoc(clinicName) {
  return {
    legalEntities: [
      {
        id: "entity_1",
        name: clinicName,
        cui: "",
        regNo: "",
        address: "",
        bank: "",
        iban: "",
        email: "",
        phone: "",
        isDefault: true,
      },
    ],
    defaultEntityId: "entity_1",
    invoicing: {
      seriesPrefix: "TMP",
      currentNumber: 1,
      defaultDueDays: 14,
      vatRate: 0,
      footerNotes: "",
    },
    integrations: {
      smartbill: { user: "", token: "" },
    },
    maxActiveClients: 0,
    maxActiveTeamMembers: 0,
    bootstrappedAt: new Date().toISOString(),
  };
}

/* ---------------- run ---------------- */

// Opts out of the demo allowlist deliberately: bootstrapping a new tenant means
// targeting a project this repo has never heard of. The guard here is instead
// that the project must be empty (checked below).
const db = new Db(PROJECT, { allowAnyProject: true });
db.dryRun = DRY_RUN;

console.log(`\n${C.bold("TempoApp tenant bootstrap")}`);
console.log(`  project : ${C.bold(PROJECT)}${DRY_RUN ? C.dim("  (DRY RUN — no writes)") : ""}`);
console.log(`  clinic  : ${CLINIC}\n`);

let existingClients, existingTeam;
try {
  [existingClients, existingTeam] = await Promise.all([db.listAll("clients"), db.listAll("team_members")]);
} catch (err) {
  console.error(`${C.red("✗ Could not read the project.")} ${err.message}`);
  console.error(C.dim("  Check the project id, that Firestore is enabled, and that your gcloud ADC has access.\n"));
  process.exit(1);
}

if ((existingClients.length || existingTeam.length) && !FORCE) {
  console.error(
    `${C.red("✗ Refusing to bootstrap.")} This project already has ` +
    `${existingClients.length} client(s) and ${existingTeam.length} team member(s).`,
  );
  console.error(C.dim("  Bootstrap is for empty projects. Pass --force only if you are certain.\n"));
  process.exit(1);
}

const writes = [
  db.setWrite("system_settings/config", configDoc(CLINIC)),
  ...SERVICES.map((s) => db.setWrite(`services/${s.id}`, s)),
  ...PROGRAMS.map(([id, title, description]) => db.setWrite(`programs/${id}`, { id, title, description })),
];
await db.commit(writes);

console.log(`  ${C.green("✓")} system_settings/config`);
console.log(`  ${C.green("✓")} ${SERVICES.length} services`);
console.log(`  ${C.green("✓")} ${PROGRAMS.length} programs`);
console.log(`\n  ${DRY_RUN ? "would write" : "wrote"} ${db.writes} documents\n`);

console.log(C.bold("Still to do by hand — this script cannot do these over the REST API:\n"));
const steps = [
  `firebase deploy --only firestore:rules,firestore:indexes,storage --project ${PROJECT}`,
  `firebase deploy --only functions --project ${PROJECT}`,
  `Auth → enable Email/Password and Anonymous sign-in`,
  `Auth → Settings → Authorized domains → add the tenant's subdomain`,
  `Cloud Messaging → generate a Web Push (VAPID) key → NEXT_PUBLIC_FIREBASE_VAPID_KEY`,
  `Storage → apply cors.json to the bucket (gsutil cors set cors.json gs://${PROJECT}.firebasestorage.app)`,
  `Create the first admin: Auth user + team_members/{that UID} with role "Admin"`,
  `Set deployment env: NEXT_PUBLIC_FIREBASE_*, ANTHROPIC_API_KEY, FIREBASE_SERVICE_ACCOUNT`,
  `Settings → Billing config: fill CUI, address, IBAN, invoice series`,
];
steps.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));
console.log(`\n  Full runbook: ${C.dim("documentation/new-tenant-runbook.md")}\n`);
