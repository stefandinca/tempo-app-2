# Multi-Tenant Provisioning — Implementation Plan

> **Status:** ON HOLD (drafted June 2026). Pick up when onboarding a 2nd real client.
> **Goal:** turn client onboarding from "create a Vercel project + set env vars + configure DNS + deploy" into "fill a form in a superadmin dashboard → live", **without** giving up per-clinic data isolation.

---

## 1. Where we are vs. where we're going

**Today (silo model):** each tenant = its own Firebase project **and** its own Vercel project + subdomain (`livebetterlife.tempoapp.ro`, `demo.tempoapp.ro`). Strong data isolation, but every code change redeploys to N Vercel projects, and onboarding is fully manual.

**Target (bridge model):** **one** Vercel deployment serving **all** subdomains via a wildcard domain, while each tenant keeps **its own Firebase project** (isolation preserved). A small **control plane** maps `subdomain → tenant config`; the app resolves the tenant at request time. Onboarding becomes a form.

```
                         ┌─────────────────────────────┐
   *.tempoapp.ro  ─────► │   ONE Vercel deployment      │
   (wildcard)            │   (Next.js 14 app)           │
                         │                              │
   clinicA.tempoapp.ro   │  middleware/layout reads     │
   clinicB.tempoapp.ro   │  Host → resolves tenant ────┐│
   demo.tempoapp.ro      └──────────────────────────────┘│
                                                          │
        ┌───────────────── Control plane ────────────────┘
        │  tempoapp-control (Firebase project, superadmin-only)
        │  tenants/{subdomain} = { publicFirebaseConfig, flags, status }
        │  tenant_secrets/{subdomain} = { encryptedServiceAccount }
        ▼
   Per-tenant Firebase projects (UNCHANGED, fully isolated):
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ clinicA-fb │  │ clinicB-fb │  │ tempo-demo │  ...
   └────────────┘  └────────────┘  └────────────┘
```

**Why not a single shared database (orgId partitioning)?** Trivial onboarding, but it gives up physical isolation of children's clinical data and requires rewriting every query + every security rule (the whole app assumes one clinic per DB). Rejected at this scale.

**Hard ceiling to know up front:** Google caps Firebase projects per org (~dozens by default; quota increase possible). Per-project isolation is right up to a few dozen clinics. Beyond that, revisit a shared-DB tier.

---

## 2. Key decisions (decide before starting)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Control-plane store | A dedicated **`tempoapp-control` Firebase project**. Single source of truth; the superadmin dashboard is just an app against it. Optionally mirror the *public* tenant configs to **Vercel Edge Config** for fast edge resolution in middleware. |
| D2 | How the client gets its Firebase config | **Server-injects it.** Root layout (Server Component) reads the `Host` header, looks up the tenant, and injects the public config so `firebase.ts` initializes **synchronously** on the client. Avoids an async-init refactor of every consumer. |
| D3 | Per-tenant service accounts (secret) | Stored **encrypted** in the control plane (`tenant_secrets`), decrypted server-side with a master key in a Vercel env var (`TENANT_MASTER_KEY`) or Google KMS. Never in Edge Config, never `NEXT_PUBLIC_`. |
| D4 | Tenant resolution key | The **subdomain** (label before `.tempoapp.ro`). Apex `tempoapp.ro` and `admin.tempoapp.ro` are special → "control mode" (the superadmin dashboard). |
| D5 | Demo | Becomes a normal tenant with an `isDemo` flag in the registry (replaces build-time `NEXT_PUBLIC_APP_ENV==='demo'`). |

---

## 3. Phase 1 — Single deployment + registry + runtime config + dashboard

> The big win. After this, the **frontend** side of onboarding is a form. Firebase project creation + rules deploy stay manual (a 10-min checklist, automated in Phase 3).

### 3.1 Control-plane project & schema
Create `tempoapp-control` Firebase project. Collections (superadmin-only rules):
```
tenants/{subdomain}
  subdomain: string            // "clinica"
  displayName: string          // "Clinica ABC"
  firebaseConfig: {            // PUBLIC — safe to serve to the browser
    apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
  }
  isDemo: boolean
  status: "active" | "suspended" | "provisioning"
  createdAt, updatedAt
tenant_secrets/{subdomain}     // server-only; NEVER read by the client
  serviceAccountEnc: string    // AES-GCM(JSON) with TENANT_MASTER_KEY
  iv: string
superadmins/{uid}              // who can use the control dashboard
```
`firestore.rules` (control project): `tenants` read by app config endpoint (see 3.3) / superadmin; `tenant_secrets` write `if false` from client (server/Admin only), read denied to client; everything gated on `superadmins/{uid}`.

### 3.2 Wildcard domain on Vercel
- Consolidate to a **single** Vercel project. Add domains: `tempoapp.ro`, `*.tempoapp.ro`.
- DNS: wildcard `*` CNAME → Vercel; apex per Vercel's apex instructions. Vercel issues wildcard TLS (requires the domain validated on Vercel — confirm plan tier supports wildcard custom domains).
- Keep the old per-tenant Vercel projects running until cutover (§7).

### 3.3 Runtime tenant resolution (the core refactor)
**New:** `middleware.ts` (Edge) — reads `Host`, extracts subdomain, looks it up (Edge Config mirror or a cached fetch). If unknown/suspended → rewrite to a marketing/"not found" page. Sets a request header `x-tenant: <subdomain>` for downstream.

**New:** `src/lib/tenant/registry.ts` — `getTenant(subdomain)` (cached, reads control project / Edge Config), `getPublicConfig(subdomain)`.

**New:** `src/app/api/tenant-config/route.ts` — returns the **public** firebaseConfig + flags for a subdomain (used as a fallback / for the messaging SW, see gotchas).

**Edit `src/app/layout.tsx`** (root, Server Component): read `headers().get('host')` → resolve tenant → inject:
```tsx
<script dangerouslySetInnerHTML={{ __html:
  `window.__TENANT__=${JSON.stringify({ subdomain, firebaseConfig, isDemo })}` }} />
```
(or pass via a `<TenantProvider>` rendered from the layout).

**Edit `src/lib/firebase.ts`** — replace build-time `NEXT_PUBLIC_FIREBASE_*` with `window.__TENANT__.firebaseConfig`. It's present before any client component runs, so init stays synchronous. Export `IS_DEMO = window.__TENANT__.isDemo` (replaces the `NEXT_PUBLIC_APP_ENV` flag).

**Find & migrate `IS_DEMO` / `NEXT_PUBLIC_` Firebase reads:** `src/lib/firebase.ts`, anything importing `IS_DEMO` (assistant panel, AiInsights, login page demo flow). The demo creds (`NEXT_PUBLIC_DEMO_EMAIL/PASSWORD`) move into the tenant doc for the demo tenant.

### 3.4 Superadmin provisioning dashboard ("control mode")
When `host` is `tempoapp.ro` / `admin.tempoapp.ro`, the app runs against the **control** Firebase project and shows:
- Tenant list (status, lastActive).
- **Add tenant** form: subdomain, display name, paste the 6 public-config fields, upload service-account JSON, `isDemo`. On save → `POST /api/admin/tenants` (verifies caller is a superadmin via control-project ID token, encrypts the service account → `tenant_secrets`, writes `tenants/{subdomain}`, mirrors public config to Edge Config). `status: active` = live.
- Edit / suspend / rotate service account.

Auth for control mode = the control project's Auth (a separate superadmin login). Reuse the existing dashboard shell; gate by `superadmins/{uid}`.

### 3.5 Phase-1 onboarding checklist (per new client, still manual)
1. Create the client's Firebase project; enable Firestore/Auth/Storage; pick region.
2. Register a web app → copy the public config.
3. `firebase deploy --only firestore:rules,firestore:indexes,storage --project <tenant>`; seed (first superadmin user, `system_settings`).
4. Firebase Auth → **Authorized domains** → add `<sub>.tempoapp.ro` (needed for Google sign-in).
5. Generate a service-account key (Project settings → Service accounts).
6. Superadmin dashboard → **Add tenant** (paste public config + service account) → Active.
7. `<sub>.tempoapp.ro` is live (wildcard). No new Vercel project, no redeploy.

### 3.6 Phase-1 deliverables
- `tempoapp-control` project + rules.
- `middleware.ts`, `src/lib/tenant/registry.ts`, `src/app/api/tenant-config/route.ts`.
- Refactored `src/lib/firebase.ts` + root layout injection + `IS_DEMO` migration.
- `/api/admin/tenants` route + superadmin dashboard pages (control mode).
- Wildcard domain configured on one Vercel project.

**Size:** L (≈1–2 focused weeks). Riskiest bit: the `firebase.ts` init refactor — do a spike first to confirm nothing reads Firebase before injection.

---

## 4. Phase 2 — Per-tenant server-side (Admin) so AI & API routes work multi-tenant

> Gating piece for keeping the AI features (and any `firebase-admin` route) working in the single deployment.

**Edit `src/lib/firebaseAdmin.ts`** — go multi-app:
```ts
// cache of subdomain -> admin App
function adminApp(subdomain: string): App {
  const existing = getApps().find(a => a.name === subdomain);
  if (existing) return existing;
  const sa = decryptServiceAccount(subdomain); // reads tenant_secrets via control admin app, AES-GCM with TENANT_MASTER_KEY
  return initializeApp({ credential: cert(sa) }, subdomain);
}
export const adminAuth = (sub: string) => getAuth(adminApp(sub));
export const adminDb   = (sub: string) => getFirestore(adminApp(sub));
```
- A bootstrap **control admin app** (its own service account in `CONTROL_SERVICE_ACCOUNT` env) reads `tenant_secrets`; decrypt with `TENANT_MASTER_KEY`. Cache decrypted apps in module scope (survives within a warm serverless instance).

**Edit every API route** to resolve the tenant from the request and thread it through:
- `src/lib/assistant/gate.ts` — `requireStaffWithConsent(req)` reads `x-tenant` (set by middleware) or the Host; uses `adminAuth(sub)` / `adminDb(sub)`.
- `src/lib/assistant/tools.ts` — `executeAssistantTool(name, input, sub)` uses `adminDb(sub)`.
- `src/app/api/assistant/{chat,insights,health}/route.ts`, `smartbill/invoice`, `cloud-functions` — pass the tenant subdomain.
- `ai_conversations` / `ai_usage_events` etc. now live in each tenant's own DB (already isolated). The superadmin AI-usage view becomes per-tenant (or aggregate via the control plane if desired later).

**Verify the per-tenant ID token check:** a request to `clinicA.tempoapp.ro` must verify the token against **clinicA's** Firebase Auth and read **clinicA's** Firestore. ⚠️ **This is THE critical correctness/security property** — a routing bug that uses tenant B's admin app for tenant A's request is a cross-tenant breach. Heavy test coverage here.

**Size:** M–L (≈1 week). Mostly mechanical (thread `sub` everywhere) + the decryption/caching layer + tests.

---

## 5. Phase 3 — One-click provisioning automation

> Removes the manual checklist (§3.5). Optional polish.

A provisioning job (Cloud Function or a server route invoked by the dashboard "Provision" button) that:
1. **Creates the Firebase project** — Google Cloud Resource Manager `projects.create` + `firebase.projects.addFirebase`, attach billing account. (Slow, minutes; quota-limited.)
2. **Enables services** — Firestore (pick region), Auth providers, Storage bucket.
3. **Deploys rules/indexes/storage** — via the Firebase CLI in CI or the REST API; seed initial docs (first superadmin, `system_settings`).
4. **Adds authorized domain** `<sub>.tempoapp.ro` (Identity Toolkit Admin API).
5. **Creates a service account** + key; encrypts → `tenant_secrets`.
6. **Registers a web app** → pulls the public config → writes `tenants/{subdomain}`, `status: active`.

Dashboard shows a provisioning progress/status. Failure handling + idempotency matter (project creation is not easily reversible).

**Size:** L, and the gnarliest (billing, quotas, async project creation, partial-failure recovery). Worth it only once you onboard frequently. **Semi-automated (Phases 1–2 + the §3.5 checklist) is the sweet spot for the first several clients.**

---

## 6. Cross-cutting concerns

**Security (highest priority):**
- Per-request tenant→admin-app routing must be airtight (see §4). Add an integration test that asserts a token from tenant A is **rejected** on tenant B's host.
- `tenant_secrets` never reaches the client; decrypt only server-side; rotate `TENANT_MASTER_KEY` plan documented.
- Each subdomain is a separate browser origin → separate Firebase Auth session per clinic (good isolation; a user signed into clinic A is not signed into clinic B).
- Re-apply the deferred review fixes (SmartBill token verification, etc.) **in the per-tenant shape** — don't carry the single-tenant insecurity forward. See [[code-review-followups]].

**Gotchas:**
- **Messaging service worker** (`public/firebase-messaging-sw.js` via `next-pwa`): a SW can't read `window.__TENANT__`. It needs the tenant's messaging config via a query string on registration (`?tenant=<sub>`) or by fetching `/api/tenant-config`. Plan a per-tenant SW config path.
- **PWA/SW cache is per-origin** — fine, but each subdomain caches independently.
- **Edge Config vs control-project drift** — if you mirror public configs to Edge Config for speed, define cache invalidation on tenant edits.
- **Cold-start cost** of decrypting service accounts — cache admin apps in module scope.
- **Vercel wildcard domains/TLS** — confirm the plan tier and apex/nameserver setup.
- **`firestore.rules` / `firestore.indexes.json`** are shared source but deployed per-tenant project; keep a single source of truth + a deploy-to-all script.

**Testing:**
- Local: run with `?tenant=` override or `/etc/hosts` entries `clinica.localhost`.
- E2E: provision a throwaway test tenant; assert isolation (A can't read B), auth, AI routes, billing.
- The cross-tenant isolation test is mandatory before any real cutover.

---

## 7. Cutover of the existing tenant(s)

`livebetterlife` + `demo` are each on their own Vercel + Firebase today. **No Firebase data migration** — they keep their Firebase projects.
1. Stand up `tempoapp-control` + the single Vercel deployment (Phase 1) on a staging domain first.
2. Register `livebetterlife` and `demo` as tenants (their existing configs + service accounts).
3. Validate both on staging.
4. Move the domains `livebetterlife.tempoapp.ro` + `demo.tempoapp.ro` onto the single Vercel project (brief DNS cutover).
5. Retire the old per-tenant Vercel projects.

---

## 8. Effort & sequencing summary

| Phase | Outcome | Size | Can ship independently? |
|---|---|---|---|
| 1 | Single deployment, wildcard, registry, runtime config, superadmin "add tenant" form (frontend onboarding = a form) | **L** | Yes — biggest win |
| 2 | AI/API/admin routes work per-tenant from the single deployment | **M–L** | Needed for AI features in the new model |
| 3 | One-click Firebase project provisioning | **L** | Optional; do when onboarding gets frequent |

**Recommended order:** spike the `firebase.ts` runtime-init refactor → Phase 1 → Phase 2 → (later) Phase 3. With one client today, Phase 1+2 are enough; Phase 3 pays off around the 4th–5th onboarding.

---

## 9. Open questions to confirm before starting
- Vercel plan tier — does it cover wildcard custom domains + wildcard TLS?
- Control-plane store: dedicated Firebase project (recommended) vs Edge Config vs both?
- Secret management: Vercel env master key vs Google KMS for `tenant_secrets`?
- Apex `tempoapp.ro` — marketing site, the superadmin dashboard, or both (e.g. dashboard at `admin.tempoapp.ro`)?
- Do we want per-tenant **aggregate** superadmin views (cross-tenant AI cost, client counts) in the control plane, or keep everything strictly per-tenant?
