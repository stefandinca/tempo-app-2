# Cloud Functions v2 + Node 22 Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get all three Cloud Functions off the Node 20 runtime before it is decommissioned on 30 October 2026, and move the Firestore trigger to the v2 API so it can target a named database later.

**Architecture:** Minimal blast radius. Only `sendPushNotification` migrates to the v2 API, because only it needs per-database triggering. The two HTTP functions stay on the v1 API — imported explicitly from `firebase-functions/v1` — so their public URLs do not change and `src/app/api/cloud-functions/route.ts` keeps working untouched.

**Tech Stack:** Firebase Cloud Functions, TypeScript, Node 22, `firebase-functions` 7.x, `firebase-admin` 13.x

**Spec:** `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md` (§5)

## Global Constraints

- Node runtime: **22** (`functions/package.json` → `engines.node`)
- `firebase-functions`: **^7.3.2**. In v7 the root export is **v2**; the v1 API is only reachable at `firebase-functions/v1`. The current code imports the root and uses v1 APIs, so it will not compile after the bump until imports are fixed.
- `firebase-admin` in `functions/`: **^13.10.0** — not 14. `firebase-functions-test@3.5.0` peers at `^13` maximum, and 14 makes `npm install` fail with ERESOLVE. `firebase-functions@7` accepts 11.10–14, so 13 satisfies both without `--legacy-peer-deps`. Do **not** change the root app's `firebase-admin` — it is deliberately pinned to `^12.7.0` (commit 98ae912, "downgrade firebase-admin to v12 to end the jose ESM crash for good"). That pin is about Vercel's bundler; functions run on GCP and are unaffected.
- TypeScript in `functions/`: **^5.9** — matching the root app. Do not jump to 7.x.
- Function region stays **`us-central1`** for all three. Changing it changes URLs.
- Public URLs of `createTeamMember` and `migrateTeamMember` must not change.
- There is **no test suite** in this repo. Verification is: `tsc` build, deploy to `tempo-app-demo`, functional smoke test against demo, then deploy to the two live tenants.
- Never deploy to `tempo-app-2` or `tempo-diaconumaria` until the demo smoke test passes.

---

### Task 1: Upgrade dependencies and the Node runtime

**Files:**
- Modify: `functions/package.json`
- Modify: `functions/tsconfig.json`

**Interfaces:**
- Consumes: nothing
- Produces: a `functions/` package that installs cleanly on Node 22 and fails to compile until Task 2 fixes the imports (expected).

- [ ] **Step 1: Bump the runtime and dependencies**

In `functions/package.json`, set:

```json
  "engines": {
    "node": "22"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^13.10.0",
    "firebase-functions": "^7.3.2"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "firebase-functions-test": "^3.5.0"
  },
```

- [ ] **Step 2: Raise the TypeScript target**

`firebase-functions` 7.x ships modern type definitions; `es2017` is too low. In `functions/tsconfig.json` change only the target:

```json
    "target": "es2022",
```

Leave `module: "commonjs"` — Cloud Functions v1 and v2 both load CommonJS here, and switching module systems is a separate risk.

- [ ] **Step 3: Install**

```bash
cd functions && npm install
```

Expected: installs without peer-dependency errors.

- [ ] **Step 4: Confirm the build fails for the reason we expect**

```bash
cd functions && npm run build
```

Expected: FAIL, with errors on `functions.https.onRequest` and `functions.firestore` — in v7 the root import is v2, which has neither. This confirms the version actually changed rather than silently resolving to the old one.

- [ ] **Step 5: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/tsconfig.json
git commit -m "chore(functions): Node 22, firebase-functions 7.x, admin 14.x

Node 20 is decommissioned 2026-10-30. Build is intentionally broken by
this commit: firebase-functions 7 makes the root export v2, so the v1
APIs this code uses move to firebase-functions/v1. Fixed in the next
commit."
```

---

### Task 2: Pin the HTTP functions to the v1 API

**Files:**
- Modify: `functions/src/index.ts:1` (imports), and the two `functions.https.onRequest` declarations

**Interfaces:**
- Consumes: Task 1's dependency versions
- Produces: `createTeamMember` and `migrateTeamMember` still exported as v1 HTTP functions with unchanged URLs. `functionsV1` is the import alias other tasks reference.

- [ ] **Step 1: Change the import**

`functions/src/index.ts` line 1 currently reads:

```ts
import * as functions from "firebase-functions";
```

Replace with:

```ts
// v1 API explicitly: firebase-functions 7 makes the bare import v2. These two
// stay on v1 so their public URLs do not change — src/app/api/cloud-functions
// builds them as https://{region}-{project}.cloudfunctions.net/{name}, which is
// a v1 URL shape.
import * as functionsV1 from "firebase-functions/v1";
```

- [ ] **Step 2: Update the two HTTP declarations and the request type**

Replace every remaining `functions.` on the HTTP paths with `functionsV1.`:

```ts
async function verifyAuth(req: functionsV1.https.Request): Promise<admin.auth.DecodedIdToken> {
```

```ts
export const createTeamMember = functionsV1.https.onRequest(async (req, res) => {
```

```ts
export const migrateTeamMember = functionsV1.https.onRequest(async (req, res) => {
```

Do **not** touch `sendPushNotification` yet — Task 3 handles it.

- [ ] **Step 3: Build and confirm only the trigger still fails**

```bash
cd functions && npm run build
```

Expected: FAIL, but now only on `functions.firestore` in `sendPushNotification`. If any HTTP-function error remains, a `functions.` reference was missed.

- [ ] **Step 4: Commit**

```bash
git add functions/src/index.ts
git commit -m "refactor(functions): import the v1 API explicitly for HTTP functions

Keeps createTeamMember and migrateTeamMember on v1 so their URLs are
unchanged and the /api/cloud-functions proxy keeps working."
```

---

### Task 3: Migrate the Firestore trigger to v2

**Files:**
- Modify: `functions/src/index.ts:278-355` (`sendPushNotification`)

**Interfaces:**
- Consumes: Task 2's `functionsV1` import
- Produces: `sendPushNotification` as a v2 `onDocumentCreated` handler, accepting a future `database` option (spec §5). Same trigger path, same behaviour.

- [ ] **Step 1: Add the v2 import**

Below the `functionsV1` import in `functions/src/index.ts`:

```ts
// v2 so this can later target a named Firestore database — v1 triggers only
// ever fire on (default), which would silently kill push for every tenant on a
// per-clinic database. See the multi-database tenancy design, §5.
import { onDocumentCreated } from "firebase-functions/v2/firestore";
```

- [ ] **Step 2: Convert the handler**

Replace the declaration:

```ts
export const sendPushNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
```

with:

```ts
export const sendPushNotification = onDocumentCreated(
  { document: "notifications/{notificationId}", region: "us-central1" },
  async (event) => {
    // v2 hands the snapshot on event.data, and it is optional — a deletion race
    // can fire the trigger with nothing attached.
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No snapshot on event; nothing to send");
      return;
    }
    const notification = snapshot.data();
```

Then through the rest of the body:
- replace every `return null;` with `return;` (a v2 handler returns `void`)
- replace any `context.params.notificationId` with `event.params.notificationId`
- close the function with `  },\n);` instead of `  });`

- [ ] **Step 3: Build**

```bash
cd functions && npm run build
```

Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add functions/src/index.ts
git commit -m "refactor(functions): sendPushNotification to the v2 API

v1 Firestore triggers only fire on (default). Under the multi-database
tenancy model every clinic gets its own database, so a v1 trigger would
silently stop delivering push for all of them. v2 accepts a database
option."
```

---

### Task 4: Deploy to demo and smoke test

**Files:** none — deployment and verification only.

**Interfaces:**
- Consumes: Tasks 1–3
- Produces: confidence that all three functions work on Node 22 before any live tenant is touched.

- [ ] **Step 1: Delete the v1 trigger, then deploy**

**A function cannot be upgraded in place from 1st to 2nd Gen.** Deploying over it
fails with `Upgrading from 1st Gen to 2nd Gen is not yet supported`. It must be
deleted first:

```bash
firebase functions:delete sendPushNotification --project tempo-app-demo --force
firebase deploy --only functions --project tempo-app-demo
```

Between the delete and a successful create, **push delivery is down for that
tenant**. In-app notifications are unaffected (they are Firestore listeners), and
notifications created during the gap simply never trigger a push — they are not
retried. Keep the window short and run it outside therapy hours on a live tenant.

The create commonly fails on a project's **first ever v2 deploy** with
`Permission denied while using the Eventarc Service Agent`. That is service-agent
propagation; retry:

```bash
firebase deploy --only functions:sendPushNotification --project tempo-app-demo
```

Expected: three functions deploy. Note: `tempo-app-demo` has **never** had functions deployed (a create, not an update), and a first deploy on a project commonly fails once with `PERMISSION_DENIED ... gcf-artifacts ... artifactregistry`. If so, run the same command again — the service agent is provisioned during the first attempt.

- [ ] **Step 2: Confirm the runtime**

```bash
firebase functions:list --project tempo-app-demo
```

Expected: all three listed as `nodejs22`. `sendPushNotification` shows a v2 trigger.

- [ ] **Step 3: Smoke test the push trigger**

Create a notification document in demo and confirm the function runs:

```bash
node -e "
import('file:///C:/_WORK/_TEMPO/FINAL/_APP_v2/tempo-app-2/scripts/demo-seed/firestore.mjs').then(async m => {
  const db = new m.Db('tempo-app-demo');
  await db.commit([db.setWrite('notifications/smoke_' + Math.floor(Date.now()/1000), {
    recipientId: 'demo_admin_001',
    title: 'Smoke test',
    body: 'Upgrade verification',
    read: false,
    createdAt: new Date().toISOString(),
  })]);
  console.log('notification written');
});"
```

Then:

```bash
firebase functions:log --only sendPushNotification --project tempo-app-demo
```

Expected: a log line for the new document. `No FCM token found for user demo_admin_001` is a **pass** — it proves the trigger fired and ran to completion. Silence is a failure.

- [ ] **Step 4: Smoke test the HTTP function's auth**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://us-central1-tempo-app-demo.cloudfunctions.net/createTeamMember \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `401` or `403` — not `404`. A 404 means the URL shape changed, which is the specific regression Task 2 exists to prevent.

- [ ] **Step 5: Delete the smoke-test notification**

```bash
node -e "
import('file:///C:/_WORK/_TEMPO/FINAL/_APP_v2/tempo-app-2/scripts/demo-seed/firestore.mjs').then(async m => {
  const db = new m.Db('tempo-app-demo');
  const docs = (await db.listAll('notifications')).filter(d => d.__id.startsWith('smoke_'));
  if (docs.length) await db.commit(docs.map(d => db.deleteWrite('notifications/' + d.__id)));
  console.log('removed', docs.length, 'smoke notifications');
});"
```

- [ ] **Step 6: Commit nothing, record the result**

No code change. Note in the PR/handover that demo is verified on Node 22.

---

### Task 5: Deploy to the live tenants

**Files:** none — deployment only.

**Interfaces:**
- Consumes: Task 4's verified build
- Produces: all three tenants off the deprecated runtime.

- [ ] **Step 1: Deploy to Live Better Life**

```bash
firebase deploy --only functions --project tempo-app-2
```

- [ ] **Step 2: Confirm the runtime**

```bash
firebase functions:list --project tempo-app-2
```

Expected: three functions on `nodejs22`.

- [ ] **Step 3: Deploy to Diaconu Maria**

```bash
firebase deploy --only functions --project tempo-diaconumaria
firebase functions:list --project tempo-diaconumaria
```

- [ ] **Step 4: Verify push still works on a live tenant**

Add a team member through the app's Team page on one live tenant. This exercises `createTeamMember` end-to-end (Auth user + `team_members` doc + `team_public` mirror) and is the highest-value single check. Remove the test member afterwards.

- [ ] **Step 5: Update the runbook**

In `documentation/new-tenant-runbook.md`, change the Cloud Functions description from "Node.js 20" to "Node.js 22", and note that `sendPushNotification` is a v2 trigger.

```bash
git add -f documentation/new-tenant-runbook.md
git commit -m "docs(runbook): functions are Node 22, push trigger is v2"
```

---

## Self-Review

**Spec coverage.** §5 of the design requires: v2 Firestore trigger (Task 3), Node 22 before 30 Oct (Task 1), HTTP functions taking a database parameter later (deferred — they stay v1 and resolve the database server-side, which needs no API change now). Covered.

**Placeholders.** None — every step has the exact command or code.

**Type consistency.** The import alias is `functionsV1` in Tasks 2 and 3; `onDocumentCreated` is imported once in Task 3 and used once. `event.data` / `event.params` replace `snapshot` / `context.params` consistently.

**Known gap, deliberately out of scope.** A v2 trigger targets **one** database. Under multi-database, `sendPushNotification` needs either a wildcard database option (unverified) or one registration per clinic. That is a phase-3 problem and is recorded in the design's open questions — this plan only makes it *possible*.
