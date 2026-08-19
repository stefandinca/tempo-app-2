# Tenant Resolution (Phase 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app able to talk to a per-clinic Firestore database, resolved from the hostname, on both client and server — with **zero behaviour change** until a tenant is explicitly pointed at a named database.

**Architecture:** The database id is derived from the subdomain by convention (`diaconumaria.tempoapp.ro` → `clinic-diaconumaria`), synchronously, with no lookup. `src/lib/firebase.ts` keeps exporting a `db` singleton — 68 files import it and none of them change. The `(default)` database becomes a control plane holding the tenant registry and the membership mirrors that Storage rules need. Everything defaults to `(default)`, so shipping this changes nothing until a tenant is flipped.

**Tech Stack:** Next.js 14 App Router, Firebase JS SDK 10.14.1 (`getFirestore(app, databaseId)`), firebase-admin 12 (root app)

**Spec:** `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`

## Global Constraints

- **Do not refactor the `db` singleton's consumers.** 68 files import `{ db }` from `@/lib/firebase`; the tenant must be resolved before that module initialises, not passed through call sites.
- **Do not use `headers()` or `cookies()` in the root layout.** The layout is fully static today; either call opts the whole app into dynamic rendering. Resolution is client-side by hostname convention instead. This is a deliberate deviation from spec §2, which assumed server injection.
- Database id convention: `clinic-<subdomain-label>`, lowercase. The apex, `www`, `admin`, `localhost` and any unknown host resolve to **`(default)`**.
- Under one project all `NEXT_PUBLIC_FIREBASE_*` values are identical for every tenant. Only the database id varies. Never add per-tenant public config.
- The control-plane mirrors (`tenant_members`, `tenant_parents`) must be `allow read, write: if false` in Firestore. Storage rules read them via a privileged read that bypasses Firestore rules — proven in the phase-2 spike. They must never hold clinical data.
- Everything in this plan is backward compatible. After Task 5, all three tenants still resolve to `(default)` and behave exactly as today.
- Verification is by deploy-to-demo and manual exercise; there is no test suite.
- Never point a live tenant at a named database in this plan. That is phase 4.

---

### Task 1: Tenant resolution helper

**Files:**
- Create: `src/lib/tenant.ts`
- Test: none (no suite) — verified by Task 2's console output

**Interfaces:**
- Produces: `resolveDatabaseId(hostname: string): string` and `DEFAULT_DATABASE_ID`, consumed by Tasks 2 and 4.

- [ ] **Step 1: Write the helper**

Create `src/lib/tenant.ts`:

```ts
/**
 * Which Firestore database a hostname belongs to.
 *
 * Derived by convention rather than looked up, so it resolves synchronously with
 * no I/O: src/lib/firebase.ts needs the answer at module-initialisation time, and
 * 68 files import the `db` singleton it creates.
 *
 * Reading the Host header in the root layout would also work, but `headers()`
 * opts the entire app out of static rendering — a heavy price for one string.
 */

export const DEFAULT_DATABASE_ID = "(default)";

/** Hosts that are the platform itself, not a clinic. */
const RESERVED = new Set(["", "www", "admin", "app", "api", "localhost"]);

export function resolveDatabaseId(hostname: string): string {
  if (!hostname) return DEFAULT_DATABASE_ID;

  const host = hostname.toLowerCase().split(":")[0];

  // Local development and preview deploys have no tenant subdomain.
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) {
    return DEFAULT_DATABASE_ID;
  }

  const parts = host.split(".");
  // A clinic host is <label>.tempoapp.ro — three labels. Anything shorter is the
  // apex; anything else we do not recognise.
  if (parts.length < 3) return DEFAULT_DATABASE_ID;

  const label = parts[0];
  if (RESERVED.has(label)) return DEFAULT_DATABASE_ID;
  if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(label)) return DEFAULT_DATABASE_ID;

  return `clinic-${label}`;
}
```

- [ ] **Step 2: Check it compiles**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Verify the mapping by hand**

```bash
node --input-type=module -e "
const { loadAppModule } = await import('./scripts/demo-seed/loadAppModule.mjs');
const { resolveDatabaseId } = await loadAppModule('src/lib/tenant.ts');
for (const h of ['diaconumaria.tempoapp.ro','livebetterlife.tempoapp.ro','tempoapp.ro','www.tempoapp.ro','admin.tempoapp.ro','localhost:3000','tempo-app-2.vercel.app','']) {
  console.log('  ' + String(h).padEnd(30), '->', resolveDatabaseId(h));
}"
```

Expected:

```
  diaconumaria.tempoapp.ro       -> clinic-diaconumaria
  livebetterlife.tempoapp.ro     -> clinic-livebetterlife
  tempoapp.ro                    -> (default)
  www.tempoapp.ro                -> (default)
  admin.tempoapp.ro              -> (default)
  localhost:3000                 -> (default)
  tempo-app-2.vercel.app         -> (default)
                                 -> (default)
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/tenant.ts
git commit -m "feat(tenancy): resolve the Firestore database id from the hostname

Convention over lookup so it resolves synchronously — lib/firebase.ts
needs the answer before it creates the db singleton that 68 files import.
Everything unrecognised resolves to (default), so this is inert until a
tenant database actually exists."
```

---

### Task 2: Point the Firestore singleton at the resolved database

**Files:**
- Modify: `src/lib/firebase.ts`

**Interfaces:**
- Consumes: `resolveDatabaseId`, `DEFAULT_DATABASE_ID` from Task 1
- Produces: `db` bound to the tenant's database, and a new export `ACTIVE_DATABASE_ID` used by Task 3's diagnostics.

- [ ] **Step 1: Bind the singleton**

In `src/lib/firebase.ts`, replace:

```ts
export const db = getFirestore(app);
```

with:

```ts
// Which database this browser session talks to. Derived from the hostname
// (src/lib/tenant.ts) so it is known synchronously here — every consumer imports
// this singleton and none of them should have to care about tenancy.
// On the server (SSR/prerender) there is no hostname; those paths do not read
// tenant data, and API routes resolve the database explicitly instead.
export const ACTIVE_DATABASE_ID =
  typeof window !== "undefined"
    ? resolveDatabaseId(window.location.hostname)
    : DEFAULT_DATABASE_ID;

export const db =
  ACTIVE_DATABASE_ID === DEFAULT_DATABASE_ID
    ? getFirestore(app)
    : getFirestore(app, ACTIVE_DATABASE_ID);
```

and add the import at the top:

```ts
import { resolveDatabaseId, DEFAULT_DATABASE_ID } from "@/lib/tenant";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Confirm nothing changed for existing tenants**

```bash
npm run dev:demo
```

Open `http://localhost:3000/login/`, sign in, and confirm the dashboard loads with data. `localhost` resolves to `(default)`, so behaviour must be identical to before this task.

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat(tenancy): bind the Firestore singleton to the resolved database

getFirestore(app, databaseId) when the hostname maps to a clinic,
plain getFirestore(app) otherwise. No consumer changes — all 68 files
that import { db } are untouched."
```

---

### Task 3: Show the active tenant in the UI

**Files:**
- Modify: `src/components/settings/LimitsConfigTab.tsx` (Superadmin-only surface that already exists)

**Interfaces:**
- Consumes: `ACTIVE_DATABASE_ID` from Task 2

- [ ] **Step 1: Add the indicator**

At the top of the rendered output in `LimitsConfigTab`, above the existing heading:

```tsx
<div className="mb-6 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
    {t('settings.limits.active_database')}
  </p>
  <p className="font-mono text-sm text-neutral-900 dark:text-white">{ACTIVE_DATABASE_ID}</p>
</div>
```

with `import { ACTIVE_DATABASE_ID } from "@/lib/firebase";`.

Rationale: during phase 4 the single most useful question is "which database am I actually looking at", and guessing from the URL is how someone edits the wrong clinic.

- [ ] **Step 2: Add the translation keys**

`src/lib/i18n/locales/en.json` → `settings.limits.active_database`: `"Active database"`
`src/lib/i18n/locales/ro.json` → `settings.limits.active_database`: `"Baza de date activă"`

- [ ] **Step 3: Typecheck and view**

Run: `npx tsc --noEmit`, then `npm run dev:demo` and open Settings → Limits as a Superadmin.
Expected: shows `(default)`.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/LimitsConfigTab.tsx src/lib/i18n/locales/en.json src/lib/i18n/locales/ro.json
git commit -m "feat(tenancy): show the active database in Superadmin settings"
```

---

### Task 4: Server-side database resolution

**Files:**
- Modify: `src/lib/firebaseAdmin.ts`
- Modify: `src/lib/serverAuth.ts`, `src/lib/assistant/gate.ts`, `src/lib/assistant/tools.ts`
- Modify: `src/app/api/smartbill/invoice/route.ts`, `src/app/api/assistant/chat/route.ts`, `src/app/api/assistant/insights/route.ts`, `src/app/api/assistant/health/route.ts`

**Interfaces:**
- Consumes: `resolveDatabaseId` from Task 1
- Produces: `adminDb(databaseId?: string)` — existing no-argument calls keep returning `(default)`, so every call site stays valid while being migrated one at a time. `tenantDatabaseFromRequest(req): string` resolves the tenant from a request's Host header.

- [ ] **Step 1: Make `adminDb` accept a database**

In `src/lib/firebaseAdmin.ts`, replace:

```ts
export const adminDb = () => getFirestore(getAdminApp());
```

with:

```ts
/**
 * Admin Firestore handle. Pass the tenant's database id; omitting it targets
 * (default), which is the control plane — correct for registry lookups and for
 * every tenant until phase 4 moves them.
 */
export const adminDb = (databaseId?: string) =>
  databaseId && databaseId !== "(default)"
    ? getFirestore(getAdminApp(), databaseId)
    : getFirestore(getAdminApp());
```

- [ ] **Step 2: Add request-based resolution**

Append to `src/lib/tenant.ts`:

```ts
/** Resolve a tenant's database from an incoming request's Host header. */
export function tenantDatabaseFromRequest(req: { headers: { get(name: string): string | null } }): string {
  return resolveDatabaseId(req.headers.get("host") || "");
}
```

- [ ] **Step 3: Thread the database through the SmartBill route**

In `src/app/api/smartbill/invoice/route.ts`, replace `const db = adminDb();` with:

```ts
    // The clinic's own data lives in its database; the caller's Host header says
    // which. Until phase 4 this resolves to (default) for every tenant.
    const db = adminDb(tenantDatabaseFromRequest(req));
```

and import `tenantDatabaseFromRequest` from `@/lib/tenant`.

- [ ] **Step 4: Thread it through the staff gate**

`src/lib/serverAuth.ts` — `requireStaffRole` must look the caller up in the tenant's database, not `(default)`. Change the signature:

```ts
export async function requireStaffRole(
  req: NextRequest,
  allowedRoles: string[],
  databaseId?: string,
): Promise<StaffAuthResult> {
```

and inside, replace `adminDb()` with `adminDb(databaseId)`.

Update the SmartBill call site to pass it:

```ts
  const database = tenantDatabaseFromRequest(req);
  const auth = await requireStaffRole(req, ['Admin', 'Coordinator'], database);
```

- [ ] **Step 5: Thread it through the assistant**

In `src/lib/assistant/gate.ts`, add a `databaseId?: string` parameter to `requireStaffWithConsent` and replace `const db = adminDb();` with `const db = adminDb(databaseId);`.

In `src/lib/assistant/tools.ts`, add a `databaseId` parameter to `executeAssistantTool`:

```ts
export async function executeAssistantTool(name: string, input: any, databaseId?: string): Promise<any> {
  const db = adminDb(databaseId);
```

In `src/app/api/assistant/chat/route.ts` and `insights/route.ts`, resolve once at the top of the handler and pass it to the gate, to `executeAssistantTool`, and to `adminDb()` for conversation storage:

```ts
  const database = tenantDatabaseFromRequest(req);
  const gate = await requireStaffWithConsent(req, database);
  ...
  const db = adminDb(database);
  ...
  res = await executeAssistantTool(tu.name, tu.input, database);
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. If a call site was missed, the optional parameter means it still compiles — grep to confirm none remain:

```bash
git grep -n "adminDb()" -- src
```

Expected: only `src/app/api/assistant/health/route.ts`, which deliberately probes the control plane.

- [ ] **Step 7: Verify the AI routes still work**

```bash
npm run dev:live
```

Then in the app, ask Mira a question about a client. Expected: answers as before — `livebetterlife.tempoapp.ro` is not the local hostname, so `localhost` resolves to `(default)` and nothing changes.

- [ ] **Step 8: Commit**

```bash
git add src/lib/firebaseAdmin.ts src/lib/tenant.ts src/lib/serverAuth.ts src/lib/assistant src/app/api
git commit -m "feat(tenancy): resolve the Firestore database per request server-side

adminDb() takes an optional database id and defaults to (default), so
every existing call site stays correct while the tenant is threaded
through the gates, the assistant tools and the SmartBill route."
```

---

### Task 5: Control plane — registry and mirrors

**Files:**
- Modify: `firestore.rules`
- Modify: `scripts/test-rules.mjs`
- Create: `scripts/register-tenant.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `tenants/{tenantId}` and `tenant_members/{uid}` in `(default)`, and a script that writes them.

- [ ] **Step 1: Add the control-plane rules**

In `firestore.rules`, above `// --- Collections ---`:

```js
    // ---- CONTROL PLANE (the (default) database only) ----
    // The tenant registry and the membership mirrors that Storage rules need.
    // Storage rules read Firestore with a PRIVILEGED read that bypasses these
    // rules (proven in the phase-2 storage spike), so locking these to `false`
    // hides them from every client while keeping them usable for authorisation.
    // They must never hold clinical data.
    match /tenants/{tenantId} {
      allow read: if isSuperadmin();
      allow write: if false;
    }
    match /tenant_members/{uid} {
      allow read, write: if false;
    }
    match /tenant_parents/{uid} {
      allow read, write: if false;
    }
```

- [ ] **Step 2: Add rules tests**

In `scripts/test-rules.mjs`, add to the `cases` array:

```js
  // --- control plane ---
  ["anonymous reads tenant_members", "DENY", "get", `${D}/tenant_members/u1`,
    { uid: "anon" }, [{ function: "exists", args: [{ exact_value: `${D}/team_members/anon` }], result: { value: false } }]],
  ["admin reads tenant_members", "DENY", "get", `${D}/tenant_members/u1`,
    { uid: "a1" }, member("a1", "Admin")],
  ["superadmin reads the tenant registry", "ALLOW", "get", `${D}/tenants/clinic-x`,
    { uid: "s1" }, member("s1", "Superadmin")],
  ["admin reads the tenant registry", "DENY", "get", `${D}/tenants/clinic-x`,
    { uid: "a1" }, member("a1", "Admin")],
```

- [ ] **Step 3: Run the rules tests**

Run: `node scripts/test-rules.mjs`
Expected: 22 passed, 0 failed.

- [ ] **Step 4: Write the registration script**

Create `scripts/register-tenant.mjs`:

```js
#!/usr/bin/env node
/**
 * Registers a tenant in the control plane — the (default) database of the
 * platform project. Writes tenants/{tenantId} and the tenant_members entries
 * that Storage rules consult.
 *
 *   node scripts/register-tenant.mjs --project=P --tenant=diaconumaria --name="Diaconu Maria" --dry-run
 */
import { Db } from "./demo-seed/firestore.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, "").split("=");
  return [k, v.length ? v.join("=") : true];
}));

const { project, tenant, name } = args;
const DRY = !!args["dry-run"];
if (!project || !tenant || !name) {
  console.error("\n  --project, --tenant and --name are required\n");
  process.exit(1);
}
if (!DRY && !args.yes) {
  console.error("\n  Refusing to write without --yes (or --dry-run)\n");
  process.exit(1);
}

const databaseId = `clinic-${tenant}`;
const db = new Db(project, { allowAnyProject: true });
db.dryRun = DRY;

// Staff live in the tenant's own database; the mirror in (default) exists only
// so Storage rules — which cannot read a named database — can authorise uploads.
const tenantDb = new Db(project, { allowAnyProject: true });
tenantDb.base = `https://firestore.googleapis.com/v1/projects/${project}/databases/${databaseId}/documents`;
const staff = await tenantDb.listAll("team_members").catch(() => []);

await db.commit([
  db.setWrite(`tenants/${tenant}`, {
    tenantId: tenant,
    databaseId,
    name,
    status: "active",
    isDemo: false,
    createdAt: new Date().toISOString(),
  }),
  ...staff.map((s) => db.setWrite(`tenant_members/${s.__id}`, { tenantId: tenant, role: s.role || "" })),
]);

console.log(`\n  ${DRY ? "would register" : "registered"} ${tenant} -> ${databaseId}`);
console.log(`  staff mirrored: ${staff.length}\n`);
```

- [ ] **Step 5: Dry-run it against demo**

```bash
node scripts/register-tenant.mjs --project=tempo-app-demo --tenant=demo --name="Demo Clinic" --dry-run
```

Expected: reports `would register demo -> clinic-demo` and `staff mirrored: 0` (there is no `clinic-demo` database yet, so the staff read fails and returns empty — that is correct at this stage).

- [ ] **Step 6: Commit**

```bash
git add firestore.rules scripts/test-rules.mjs scripts/register-tenant.mjs
git commit -m "feat(tenancy): control-plane registry and membership mirrors

tenants/ and tenant_members/ live in (default) and are invisible to every
client — Storage rules read them with a privileged read that bypasses
Firestore rules, which is what makes the lockdown safe."
```

---

### Task 6: Rules fan-out tooling

**Files:**
- Create: `scripts/deploy-rules.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: one command that deploys the current rules to every database of a project.

- [ ] **Step 1: Write the script**

Create `scripts/deploy-rules.mjs`:

```js
#!/usr/bin/env node
/**
 * Deploys firestore.rules to EVERY database of a project.
 *
 * Rules are per-database and do not sync. With a database per clinic, the
 * failure mode of forgetting one is silent — a clinic quietly missing a
 * security fix — so this exists to make "all of them" the easy path.
 *
 *   node scripts/deploy-rules.mjs --project=tempo-app-demo
 */
import { execSync } from "node:child_process";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, "").split("=");
  return [k, v.length ? v.join("=") : true];
}));
if (!args.project) {
  console.error("\n  --project is required\n");
  process.exit(1);
}

const raw = execSync(`firebase firestore:databases:list --project ${args.project}`, { encoding: "utf8" });
const databases = [...raw.matchAll(/databases\/([^\s│]+)/g)].map((m) => m[1]);
if (!databases.length) {
  console.error("  no databases found — is the project id right?");
  process.exit(1);
}

console.log(`\n  ${args.project}: ${databases.length} database(s)\n`);
let failed = 0;
for (const database of databases) {
  process.stdout.write(`  ${database} … `);
  try {
    execSync(
      `firebase deploy --only firestore:rules --project ${args.project} --database "${database}"`,
      { stdio: "pipe" },
    );
    console.log("ok");
  } catch (err) {
    failed += 1;
    console.log("FAILED");
    console.log("    " + String(err.stdout || err.message).split("\n").slice(-3).join("\n    "));
  }
}
console.log(`\n  ${databases.length - failed}/${databases.length} deployed\n`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Verify the CLI accepts `--database` for a rules deploy**

```bash
firebase deploy --only firestore:rules --project tempo-app-demo --database "(default)" --dry-run
```

Expected: compiles and reports a dry run. **If `--database` is rejected**, fall back to the multi-database `firebase.json` form (an array of `{database, rules}` entries) — that form is known to work, and was used in the phase-2 spike. Record whichever mechanism works in the script's header comment.

- [ ] **Step 3: Run it against demo**

```bash
node scripts/deploy-rules.mjs --project=tempo-app-demo
```

Expected: `1/1 deployed` (demo has only `(default)` today).

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy-rules.mjs
git commit -m "feat(tenancy): deploy rules to every database of a project

Rules are per-database and do not sync; forgetting one leaves a clinic
silently missing a security fix."
```

---

### Task 7: End-to-end proof on demo

**Files:** none — verification only.

**Interfaces:**
- Consumes: Tasks 1–6

This is the acceptance test for the whole phase: prove the app can serve a clinic from a named database, without migrating anything real.

- [ ] **Step 1: Create a throwaway tenant database**

```bash
firebase firestore:databases:create clinic-spike --project tempo-app-demo --location eur3
node scripts/deploy-rules.mjs --project=tempo-app-demo
```

- [ ] **Step 2: Bootstrap it and add yourself as staff**

```bash
node scripts/bootstrap-tenant.mjs --project=tempo-app-demo --name="Spike Clinic" --yes
```

This writes to `(default)`, which is wrong for this test — instead point the bootstrap at the new database by temporarily editing its `Db` construction, or write the three documents by hand with `scripts/demo-seed/firestore.mjs`. Record which you did.

Then add a `team_members/{your-demo-uid}` document with `role: "Superadmin"` **in `clinic-spike`**.

- [ ] **Step 3: Serve the app as that tenant**

`resolveDatabaseId` keys off the hostname, and `localhost` deliberately resolves to `(default)`. To exercise the real path, add a hosts-file entry mapping `spike.tempoapp.ro` to `127.0.0.1`, then:

```bash
npm run dev:demo
```

and open `http://spike.tempoapp.ro:3000/login/`.

- [ ] **Step 4: Confirm the isolation end to end**

Sign in with the demo Superadmin account.

Expected:
- Settings → Limits shows **`clinic-spike`** as the active database
- The client list is **empty** — the 20 demo clients live in `(default)`, not here
- Services and programmes show the bootstrap's catalogue
- Opening `http://localhost:3000/` in another tab shows the **normal demo data**, from `(default)`, in the same browser session

The last point is the one that matters: two hostnames, one browser, one Firebase project, completely separate data.

- [ ] **Step 5: Tear down**

```bash
firebase firestore:databases:delete clinic-spike --project tempo-app-demo --force
```

Remove the hosts-file entry.

- [ ] **Step 6: Record the result**

No code change. Note in the handover that phase 3 is proven end to end, and that phase 4 (migration) is unblocked.

---

## Self-Review

**Spec coverage.** §2 client resolution (Tasks 1–2), §2 server resolution (Task 4), §3 control plane (Task 5), §4 mirrors — `tenant_members` is created in Task 5; `tenant_parents` is **deliberately deferred** to phase 4, because it is only consumed by the Storage rules that phase 4 rewrites, and writing it earlier would mean maintaining a mirror nothing reads. §6 rules fan-out (Task 6).

**Deviation from spec.** §2 specifies server-side injection of the tenant config via the `Host` header. This plan resolves client-side by hostname convention instead, because `headers()` in the root layout opts the entire app out of static rendering, and under a single project the only per-tenant value is the database id — which the hostname already encodes. The spec should be amended to match after this phase lands.

**Placeholders.** None. Task 7 Step 2 deliberately offers two routes and asks which was used, because `bootstrap-tenant.mjs` currently targets `(default)` only; making it database-aware is phase-4 work.

**Type consistency.** `resolveDatabaseId(hostname: string): string` and `DEFAULT_DATABASE_ID` are defined in Task 1 and used in Tasks 2 and 4. `tenantDatabaseFromRequest(req)` is added in Task 4 Step 2 and used in Steps 3–5. `adminDb(databaseId?: string)` keeps its no-argument form working, which is what lets Task 4 migrate call sites incrementally.

**Out of scope, by design.** Moving tenant data, moving Storage objects, rewriting `storage.rules` for `tenants/{tenantId}/…` paths, the `tenant_parents` mirror, and pointing any live tenant at a named database. All phase 4.
