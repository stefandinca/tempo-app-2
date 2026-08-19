# Tenant Migration (Phase 4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all three clinics into one Firebase project as per-clinic Firestore databases, and cut the app over to them without losing data or logging parents out.

**Architecture:** `tempo-app-2` becomes the platform project. Live Better Life's data moves from its `(default)` database to `clinic-livebetterlife` **inside the same project**, so its Auth pool never moves — 8 staff keep their UIDs and 329 anonymous parent sessions keep working. Demo and Diaconu Maria migrate in from their own projects, which needs `auth:import` for 5 staff accounts in total. `(default)` is then purged of clinic data and left as the control plane.

**Tech Stack:** Firestore REST (`scripts/demo-seed/firestore.mjs`), `firebase auth:export`/`auth:import`, Cloud Storage JSON API

**Spec:** `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`

## Global Constraints

- 🚨 **Do not push the phase-3 commits until every tenant database exists and is populated.** `resolveDatabaseId` is deterministic: the moment that code deploys, `livebetterlife.tempoapp.ro` starts reading `clinic-livebetterlife`. If that database is empty, the clinic sees an empty app. Phase 3 is 9 local commits and `src/lib/tenant.ts` is **not** on `origin` — keep it that way until Task 8.
- Platform project: **`tempo-app-2`**. Database ids: `clinic-livebetterlife`, `clinic-diaconumaria`, `clinic-demo`.
- **UIDs must be preserved.** `team_members` document ids, `clients.therapistIds`, `clients.parentUids`, `events.teamMemberIds`, `threads.participants`, `homework.assignedBy`, evaluations' `evaluatorId`, `notifications.recipientId`, `fcm_tokens` ids and `ai_conversations.uid` are all Auth UIDs. `auth:import` preserves them; creating users any other way does not.
- **Anonymous users are not migrated.** Parents re-authenticate with their access code and `ParentAuthContext` re-registers the new UID — existing behaviour. This only applies to demo and Diaconu Maria; Live Better Life's anonymous users stay in place because its project is the platform.
- Live dataset is ~37,580 documents (28,268 of them notifications). Copy everything; do not truncate an audit trail or a notification history to save minutes.
- Every migration step must be **idempotent** — re-running copies the same documents to the same ids.
- Verify by **document count per collection**, source vs destination, before declaring a tenant migrated.
- Never delete source data in the same session as the copy. Old projects are decommissioned in Task 9, after the tenants have run on the new databases.

---

### Task 1: Reconcile the spec with what was actually built

**Files:**
- Modify: `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`

- [ ] **Step 1: Record the resolution deviation**

§2 says the root layout server-injects the tenant config from the `Host` header. Phase 3 resolves client-side by hostname convention instead. Replace the "Client-side resolution" paragraph with:

```markdown
**Client-side resolution:** `src/lib/tenant.ts` derives the database id from the
hostname by convention (`diaconumaria.tempoapp.ro` → `clinic-diaconumaria`), with
no lookup. Chosen over reading the `Host` header in the root layout because
`headers()` opts the whole app out of static rendering, and under a single
project the database id is the *only* value that varies per tenant — which the
hostname already encodes. It also keeps `getFirestore` synchronous, which matters
because 68 files import the `db` singleton.
```

- [ ] **Step 2: Record the platform decision**

Replace the open question "Do we keep `tempo-app-2` as the platform project…" with:

```markdown
- **Platform project: `tempo-app-2`** (decided 19 Aug). Live Better Life's Auth
  pool never moves, so its 8 staff keep their UIDs and its 329 anonymous parent
  sessions keep working — no re-login for any family. Its data moves within the
  project and its Storage objects only change path, not bucket. The cost is a
  project name that reads oddly for a platform, which surfaces only in storage
  URLs and the auth domain.
```

- [ ] **Step 3: Commit**

```bash
git add -f docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md
git commit -m "docs(spec): reconcile with the built resolution and the platform decision"
```

---

### Task 2: The migration tool

**Files:**
- Create: `scripts/migrate-tenant.mjs`

**Interfaces:**
- Consumes: `Db` from `scripts/demo-seed/firestore.mjs` (its `database` option, fixed in phase 3)
- Produces: a command that copies every collection and subcollection from one database to another and reports per-collection counts.

- [ ] **Step 1: Write the tool**

Create `scripts/migrate-tenant.mjs`:

```js
#!/usr/bin/env node
/**
 * Copies a clinic's Firestore data from one database to another — across
 * projects or within one.
 *
 *   node scripts/migrate-tenant.mjs --from-project=A --to-project=B \
 *        --to-database=clinic-x --dry-run
 *   node scripts/migrate-tenant.mjs ... --yes
 *   node scripts/migrate-tenant.mjs ... --verify   (counts only, copies nothing)
 *
 * Idempotent: documents keep their ids, so re-running overwrites rather than
 * duplicating. Never deletes anything at the source.
 */
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, "").split("=");
  return [k, v.length ? v.join("=") : true];
}));

const FROM_P = args["from-project"];
const FROM_D = args["from-database"] || "(default)";
const TO_P = args["to-project"];
const TO_D = args["to-database"];
const DRY = !!args["dry-run"];
const VERIFY = !!args.verify;

const C = { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`,
            dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` };

if (!FROM_P || !TO_P || !TO_D) {
  console.error(`\n${C.red("✗ --from-project, --to-project and --to-database are required")}\n`);
  process.exit(1);
}
if (!DRY && !VERIFY && !args.yes) {
  console.error(`\n${C.red("✗ Refusing to write without --yes")} (or --dry-run / --verify)\n`);
  process.exit(1);
}

/** Everything a clinic owns. Control-plane collections are deliberately absent. */
const TOP_LEVEL = [
  "clients", "team_members", "team_public", "events", "services", "programs",
  "invoices", "payouts", "expenses", "recurring_expenses", "activities",
  "threads", "notifications", "fcm_tokens", "system_settings", "client_codes",
  "user_consents", "user_ai_usage", "ai_conversations", "ai_usage_events",
  "evaluation_protocols", "potential_clients",
];
const CLIENT_SUBS = [
  "evaluations", "vbmapp_evaluations", "portage_evaluations", "cars_evaluations",
  "carolina_evaluations", "interventionPlans", "homework", "documents", "videos",
  "voiceFeedback", "reports",
];
/** Subcollections that hang off a thread. */
const THREAD_SUBS = ["messages"];
/** Subcollections that hang off an AI conversation. */
const CONVO_SUBS = ["messages"];

const src = new Db(FROM_P, { allowAnyProject: true, database: FROM_D });
const dst = new Db(TO_P, { allowAnyProject: true, database: TO_D });
dst.dryRun = DRY || VERIFY;

const strip = (d) => { const { __id, __name, ...rest } = d; return rest; };

async function copyCollection(path) {
  const docs = await src.listAll(path).catch(() => []);
  if (!docs.length) return { path, copied: 0, docs: [] };
  if (!VERIFY) {
    await dst.commit(docs.map((d) => dst.setWrite(`${path}/${d.__id}`, strip(d))));
  }
  return { path, copied: docs.length, docs };
}

console.log(`\n${C.bold("Migrate tenant data")}`);
console.log(`  from : ${FROM_P} / ${FROM_D}`);
console.log(`  to   : ${TO_P} / ${TO_D}`);
console.log(`  mode : ${VERIFY ? "VERIFY (no writes)" : DRY ? "DRY RUN" : "APPLY"}\n`);

let copied = 0;
const counts = [];
for (const coll of TOP_LEVEL) {
  const r = await copyCollection(coll);
  if (r.copied) { counts.push(r); copied += r.copied; console.log(`  ${String(r.copied).padStart(6)}  ${coll}`); }
}

// Subcollections, walked from the parents we just read.
const clients = counts.find((c) => c.path === "clients")?.docs || [];
let subCopied = 0;
for (const c of clients) {
  for (const s of CLIENT_SUBS) {
    const r = await copyCollection(`clients/${c.__id}/${s}`);
    subCopied += r.copied;
  }
}
const threads = counts.find((c) => c.path === "threads")?.docs || [];
for (const t of threads) {
  for (const s of THREAD_SUBS) subCopied += (await copyCollection(`threads/${t.__id}/${s}`)).copied;
}
const convos = counts.find((c) => c.path === "ai_conversations")?.docs || [];
for (const v of convos) {
  for (const s of CONVO_SUBS) subCopied += (await copyCollection(`ai_conversations/${v.__id}/${s}`)).copied;
}
console.log(`  ${String(subCopied).padStart(6)}  (subcollections)`);

console.log(`\n  ${C.green("total")} ${copied + subCopied} document(s) ${VERIFY ? "found at source" : DRY ? "would be copied" : "copied"}\n`);
```

- [ ] **Step 2: Dry-run it demo → a throwaway database**

```bash
firebase firestore:databases:create clinic-demo --project tempo-app-2 --location eur3
node scripts/deploy-rules.mjs --project=tempo-app-2
node scripts/migrate-tenant.mjs --from-project=tempo-app-demo --to-project=tempo-app-2 --to-database=clinic-demo --dry-run
```

Expected: reports each collection with the counts from the demo survey — 20 clients, 7 team_members, ~3,200 events.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-tenant.mjs
git commit -m "feat(migration): copy a clinic's Firestore data between databases"
```

---

### Task 3: Rehearse the whole migration on demo

**Files:** none — execution and verification.

This is the rehearsal. Demo is expendable and its shape matches the live clinics.

- [ ] **Step 1: Copy**

```bash
node scripts/migrate-tenant.mjs --from-project=tempo-app-demo --to-project=tempo-app-2 --to-database=clinic-demo --yes
```

- [ ] **Step 2: Verify counts match**

```bash
node scripts/migrate-tenant.mjs --from-project=tempo-app-demo --to-project=tempo-app-2 --to-database=clinic-demo --verify
node scripts/migrate-tenant.mjs --from-project=tempo-app-2 --from-database=clinic-demo --to-project=tempo-app-2 --to-database=clinic-demo --verify
```

The two `--verify` runs report source-side counts for each side. Every collection must match. Any mismatch stops the plan.

- [ ] **Step 3: Migrate demo's 2 staff accounts**

```bash
firebase auth:export demo-users.json --project tempo-app-demo
firebase auth:import demo-users.json --project tempo-app-2 --hash-algo=SCRYPT --hash-key=<from export> --salt-separator=<from export> --rounds=<from export> --mem-cost=<from export>
```

`auth:export` prints the hash parameters; pass them verbatim or passwords will not work. **Delete `demo-users.json` afterwards — it contains password hashes.**

Skip the anonymous users; they will not import cleanly and are not needed.

- [ ] **Step 4: Register the tenant**

```bash
node scripts/register-tenant.mjs --project=tempo-app-2 --tenant=demo --name="TempoApp Demo" --yes
```

- [ ] **Step 5: Prove it end to end**

Point a local dev server at the platform project with a `demo.tempoapp.ro` hosts entry and confirm the app serves demo's data from `clinic-demo`. This is the browser confirmation deferred from phase 3 — it must pass here, before any live clinic moves.

---

### Task 4: Storage isolation

**Files:**
- Modify: `storage.rules`
- Modify: `src/context/ParentAuthContext.tsx`
- Create: `scripts/migrate-storage.mjs`

**Interfaces:**
- Consumes: `tenant_members` (phase 3), and a new `tenant_parents` mirror
- Produces: Storage paths under `tenants/{tenantId}/…` authorised from the `(default)` mirrors

- [ ] **Step 1: Write the parent mirror**

In `ParentAuthContext`, wherever `parentUids` is written (both `authenticateWithCode` and the UID-refresh path in `onAuthStateChanged`), also write:

```ts
// Storage rules cannot read a named database, so parent authorisation for media
// paths resolves against this mirror in (default). Same churn as parentUids.
await setDoc(doc(db, "tenant_parents", currentUser.uid), {
  tenantId: TENANT_ID,
  clientIds: arrayUnion(validatedClientId),
}, { merge: true });
```

`TENANT_ID` comes from `ACTIVE_DATABASE_ID` with the `clinic-` prefix removed.

> ⚠️ `db` is bound to the **tenant's** database, but `tenant_parents` must live in
> `(default)`. Export a second handle from `src/lib/firebase.ts`:
> `export const controlDb = getFirestore(app);` and use that here.

- [ ] **Step 2: Rewrite `storage.rules` for tenant paths**

```
match /tenants/{tenantId}/clients/{clientId}/{allPaths=**} {
  function isTenantStaff() {
    return request.auth != null &&
      firestore.exists(/databases/(default)/documents/tenant_members/$(request.auth.uid)) &&
      firestore.get(/databases/(default)/documents/tenant_members/$(request.auth.uid)).data.tenantId == tenantId;
  }
  function isTenantParent() {
    return request.auth != null &&
      firestore.exists(/databases/(default)/documents/tenant_parents/$(request.auth.uid)) &&
      firestore.get(/databases/(default)/documents/tenant_parents/$(request.auth.uid)).data.tenantId == tenantId &&
      clientId in firestore.get(/databases/(default)/documents/tenant_parents/$(request.auth.uid)).data.clientIds;
  }
  allow read: if isTenantStaff() || isTenantParent();
  allow write: if isTenantStaff();
}
```

Keep the existing `clients/{clientId}/…` rules **in place** until Task 6 has moved every object — deleting them first breaks media for every clinic.

- [ ] **Step 3: Write the object mover**

`scripts/migrate-storage.mjs` copies `clients/{id}/…` to `tenants/{tenantId}/clients/{id}/…` using the Storage JSON API `rewrite` method, then updates the `url` field on the corresponding `documents`, `videos` and `voiceFeedback` Firestore records. Only `tempo-app-2` has objects (32, 11.6 MB), so this runs once for Live Better Life.

- [ ] **Step 4: Verify on demo first**

Demo has zero objects, so upload two test files, run the mover, and confirm a parent can read the moved object and a different tenant's parent cannot.

---

### Task 5: Migrate Diaconu Maria

Same sequence as Task 3, for a clinic with 3 staff, 1 anonymous user and no parents yet — the lowest-risk live tenant.

- [ ] **Step 1:** create `clinic-diaconumaria`, deploy rules
- [ ] **Step 2:** copy, verify counts
- [ ] **Step 3:** `auth:export`/`auth:import` her 3 staff accounts, preserving UIDs
- [ ] **Step 4:** register the tenant
- [ ] **Step 5:** repoint her Vercel project's `NEXT_PUBLIC_FIREBASE_*` at `tempo-app-2` and redeploy
- [ ] **Step 6:** verify sign-in, client list, calendar, and that Settings → Limits shows `clinic-diaconumaria`

---

### Task 6: Migrate Live Better Life

The riskiest step. Data moves **within** `tempo-app-2`, so Auth and Storage buckets do not change.

- [ ] **Step 1: Announce a freeze window** outside therapy hours. ~37,580 documents copy in a few minutes; budget 30.
- [ ] **Step 2:** create `clinic-livebetterlife`, deploy rules to it
- [ ] **Step 3:** full copy `(default)` → `clinic-livebetterlife`, verify counts
- [ ] **Step 4:** during the freeze, **re-run the copy** to pick up anything written since — it is idempotent and only minutes
- [ ] **Step 5:** move Storage objects (Task 4's mover) and verify media loads
- [ ] **Step 6:** register the tenant
- [ ] **Step 7: cut over** — push the phase-3 commits, let Vercel build, confirm `livebetterlife.tempoapp.ro` now reads `clinic-livebetterlife`
- [ ] **Step 8:** verify sign-in, clients, calendar, billing, a parent login, and Mira

---

### Task 7: Purge the control plane and decommission

- [ ] **Step 1:** confirm all three tenants have run on their databases for at least a few days
- [ ] **Step 2:** delete the clinic collections from `tempo-app-2`'s `(default)`, leaving only `tenants`, `tenant_members`, `tenant_parents`. Back up first.
- [ ] **Step 3:** remove the now-duplicate `clients/{clientId}/…` block from `storage.rules`
- [ ] **Step 4:** delete the `tempo-app-demo` and `tempo-diaconumaria` projects, and their Vercel projects
- [ ] **Step 5:** collapse to a single Vercel project on a wildcard domain — the remaining half of the bridge model
- [ ] **Step 6:** update `documentation/new-tenant-runbook.md` for the multi-database process

---

## Self-Review

**Spec coverage.** §7 migration (Tasks 3, 5, 6), §4 storage (Task 4), §3 control plane purge (Task 7). The wildcard-domain consolidation is Task 7 Step 5 — it is the last thing that should move, because until then each tenant's Vercel project is an independent rollback point.

**Placeholders.** Task 4 Step 3 describes the object mover rather than giving its code, because the URL-rewriting half depends on what `documents`/`videos`/`voiceFeedback` actually store in their `url` fields on live — which must be inspected before the code is written. That inspection is the first action of Task 4.

**Type consistency.** `--from-project` / `--from-database` / `--to-project` / `--to-database` are used consistently. `controlDb` is introduced in Task 4 Step 1 and used by the same step's mirror write.

**Ordering risk.** Task 6 Step 7 is the single irreversible-feeling moment: pushing phase 3 flips all three tenants at once, because resolution is deterministic. That is why demo and Diaconu Maria migrate first — by the time it is pushed, two of the three databases are already proven. Rollback is `git revert` plus a Vercel redeploy; the old `(default)` data is still there until Task 7.
