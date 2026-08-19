# New Tenant Runbook

How to stand up a new clinic on TempoApp today, under the **silo model** — one
Firebase project and one Vercel project per tenant.

> This is the manual process. The plan to replace most of it with a form lives in
> [`multi-tenant-implementation-plan.md`](./multi-tenant-implementation-plan.md).
> Read the [constraint](#the-constraint-that-decides-when-to-automate) below before
> deciding to build that.

Budget roughly **half a day** for the first one and 1–2 hours once familiar.

---

## 0. Before you start

Decide two names and keep them consistent everywhere:

| Thing | Example | Notes |
|---|---|---|
| Subdomain | `clinicx.tempoapp.ro` | The label becomes the tenant key if/when the bridge model lands |
| Firebase project id | `tempo-clinicx` | Cannot be renamed later. Lowercase, no underscores |

Existing tenants for reference: `tempo-app-2` (live — Live Better Life),
`tempo-app-demo` (demo).

> ⚠️ **Google caps Firebase projects per organisation** (~dozens by default).
> Per-project isolation is right up to a few dozen clinics; past that the model
> needs revisiting. Request a quota increase before you get close.

---

## 1. Create the Firebase project

1. Firebase console → **Add project** → name it, note the project id.
2. **Firestore Database** → Create → **production mode** → region `eur3` (or
   match the other tenants). Production mode matters: default-deny is what the
   rules in this repo assume.
3. **Authentication** → Get started → enable:
   - **Email/Password** — staff sign-in
   - **Anonymous** — the parent portal depends on this; without it parents cannot log in at all
4. **Storage** → Get started → same region.
5. **Cloud Messaging** → Web configuration → **Generate key pair**. Copy the
   Web Push certificate — this is `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

   > VAPID keys are **per project**. A key from another tenant will not work.
   > (`.env.demoonly` had no key of its own for a long time and silently
   > inherited the live project's, which is why demo push never worked.)

6. **Project settings → General → Your apps → Web app** → register one. Copy the
   config block; those six values are the `NEXT_PUBLIC_FIREBASE_*` variables.
7. **Project settings → Service accounts → Generate new private key**. This JSON,
   minified onto one line, becomes `FIREBASE_SERVICE_ACCOUNT`. It is a full-admin
   credential — treat it like a password, never commit it, never prefix it
   `NEXT_PUBLIC_`.

---

## 2. Deploy rules, indexes and functions

From the repo root, targeting the new project explicitly:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project tempo-clinicx
firebase deploy --only functions --project tempo-clinicx
```

This ships `firestore.rules`, `firestore.indexes.json`, `storage.rules` and the
three Cloud Functions (`createTeamMember`, `migrateTeamMember`,
`sendPushNotification`, all `us-central1`).

**Rules and indexes are per project and do not sync.** Every future change to
`firestore.rules` or `firestore.indexes.json` must be deployed to *every* tenant.
This is the single easiest thing to forget, and the failure mode is a tenant
silently missing a security fix.

### Storage CORS

```bash
gsutil cors set cors.json gs://tempo-clinicx.firebasestorage.app
```

> `cors.json` currently allows `"origin": ["*"]`. Consider narrowing it to the
> tenant's own subdomain — session videos and voice notes live in this bucket.

---

## 3. Bootstrap the database

A fresh project has no services, no programmes and no clinic identity, so the
app renders but is unusable. Preview first, then apply:

```bash
node scripts/bootstrap-tenant.mjs --project=tempo-clinicx --name="Clinic X" --dry-run
node scripts/bootstrap-tenant.mjs --project=tempo-clinicx --name="Clinic X" --yes
```

Writes `system_settings/config` (clinic identity, invoice series, VAT, account
limits), the 10-service Romanian catalogue with rates, and 16 starter ABA
programmes. It refuses to run against a project that already has clients or team
members, so it cannot overwrite a working clinic.

Authentication uses your `gcloud` Application Default Credentials, so make sure
the signed-in account has access to the new project.

---

## 4. Create the first admin

The bootstrap script cannot do this — it writes Firestore, and this needs an Auth
user whose UID becomes the document id.

1. Firebase console → Authentication → **Add user** (email + temporary password).
2. Copy the generated **UID**.
3. Firestore → create `team_members/{UID}`:

```json
{
  "name": "Admin Name",
  "email": "admin@clinic.ro",
  "role": "Admin",
  "language": "ro",
  "inviteStatus": "active",
  "isActive": true,
  "baseSalary": 0
}
```

The document id **must** equal the Auth UID — `AuthContext` looks the user up by
`team_members/{uid}`, and a mismatch shows as a signed-in user with no role, who
then bounces back to the login page. (`migrateTeamMember` exists to repair
exactly this when it happens.)

Once this admin can sign in, every further team member should be added through
the app's Team page, which calls `createTeamMember` and keeps Auth and Firestore
in step.

---

## 5. Deploy the app

Today each tenant is **its own Vercel project** pointing at the same repo.

1. Vercel → New Project → import this repository.
2. Environment variables (Production **and** Preview):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | from step 1.6 |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from step 1.6 |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `tempo-clinicx` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | from step 1.6 |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from step 1.6 |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | from step 1.6 |
   | `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | from step 1.5 |
   | `ANTHROPIC_API_KEY` | only if this tenant gets Mira |
   | `FIREBASE_SERVICE_ACCOUNT` | from step 1.7, minified to one line |
   | `NEXT_PUBLIC_APP_ENV` | omit — `demo` only for the demo tenant |

   `npm run build` reads these from the Vercel environment. Locally it refuses to
   run without an explicit tenant (`npm run build:demo` / `build:prod`) rather
   than defaulting to a project.

3. Add the domain `clinicx.tempoapp.ro` in Vercel, and the DNS record it asks for.
4. Firebase console → **Authentication → Settings → Authorized domains** → add
   `clinicx.tempoapp.ro`. Sign-in fails with an unhelpful error without this.

---

## 6. Verify before handing over

- [ ] Staff sign-in works, and the sidebar matches the admin role
- [ ] Settings → Billing config: CUI, address, IBAN, invoice series filled in
- [ ] Settings → Limits: max clients / team members set (0 = unlimited)
- [ ] Create a test client → an access code is generated → `client_codes/{CODE}` appears
- [ ] Parent portal: that code logs in and shows the child
- [ ] Create a calendar event, mark attendance, score a programme
- [ ] Billing page shows the session and computes a total
- [ ] If SmartBill is in scope: credentials saved and a test invoice syncs
- [ ] If Mira is in scope: `/api/assistant/health` is healthy and a question answers
- [ ] Push notifications register (needs HTTPS and the tenant's own VAPID key)
- [ ] Delete the test client and event

---

## The constraint that decides when to automate

The obvious next step is the bridge model — one deployment serving
`*.tempoapp.ro`, tenants resolved at request time. On Vercel that is cheap for
everything the **browser** does.

The catch is the **server** side. `src/lib/firebaseAdmin.ts` reads a single
`FIREBASE_SERVICE_ACCOUNT` from the environment, and the AI routes
(`/api/assistant/*`) and SmartBill sync depend on it. On one deployment serving
several tenants, those routes would authenticate against whichever project that
one credential belongs to — regardless of which clinic made the request.

So Phase 1 of the plan **cannot ship alone** unless the additional tenants launch
without Mira and without SmartBill. Phase 2 (per-request tenant → Admin app
routing) is what makes a shared deployment safe, and it is the part where a
routing mistake means one clinic reading another clinic's children's clinical
records. It needs an explicit isolation test before it goes anywhere near
production.

Until then, silo model: another Firebase project, another Vercel project, and
remember to deploy rules to both.

---

## Per-tenant vs shared

| Per tenant (repeat every time) | Shared (one place) |
|---|---|
| Firebase project, Firestore, Auth, Storage, FCM | Application source code |
| Security rules, indexes, Cloud Functions deploy | `firestore.rules`, `firestore.indexes.json` as files |
| VAPID key, service account | — |
| Vercel project, env vars, domain | The Git repository |
| `system_settings/config`, services, programmes | The bootstrap script's defaults |
| Client access codes, all clinical data | — |
| SmartBill credentials | The SmartBill integration code |

---

*Last updated: August 2026 — silo model, Vercel hosting.*
