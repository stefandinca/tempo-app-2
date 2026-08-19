# Multi-Database Tenancy — Design

**Status:** Approved in principle (19 Aug 2026). Supersedes the per-project
approach in `documentation/multi-tenant-implementation-plan.md`.

**Problem:** TempoApp runs one Firebase project per clinic. With 3 tenants live
and 5–6 more interested, this hits Google's ~20-project-per-organisation cap,
and every rules change must be deployed N times.

**Decision:** One Firebase project. One **Firestore database per clinic**. One
Vercel deployment serving all subdomains.

---

## 1. Why multi-database, not `orgId` partitioning

The June plan rejected a shared database, correctly — but it was rejecting the
*field-based* version, where every document carries `orgId`, every query filters
on it, and every rule checks it.

That model fails open. One missing `.where()` leaks children's clinical records,
and the worst offender is already in the codebase: `src/lib/assistant/tools.ts`
runs `db.collection("clients").get()` with **Admin credentials**, which bypass
rules entirely. Under `orgId` partitioning that single line returns every
clinic's children.

Multi-database makes isolation **structural**. A query issued against clinic A's
database cannot return clinic B's data, whatever the code forgets.

### Proven property

The existing `firestore.rules` isolate tenants **with no modification**:

```js
exists(/databases/$(database)/documents/team_members/$(request.auth.uid))
```

`$(database)` binds to whichever database is being accessed. A user with no
`team_members` document *in that database* fails every staff check.

Verified 19 Aug 2026 on `tempo-app-demo` with a second database and one identity
made staff in clinic B only:

```
clinic B  clients : READABLE -> Clinic B Child
clinic A  clients : DENIED (PERMISSION_DENIED)
clinic A  team    : DENIED (PERMISSION_DENIED)
clinic A  settings: DENIED (PERMISSION_DENIED)
```

The same holds for parents: `isParent(clientId)` reads the client document from
`$(database)`, so a parent of clinic A matches nothing in clinic B.

---

## 2. Target architecture

```
                    ┌──────────────────────────────────────┐
  *.tempoapp.ro ──► │  ONE Vercel deployment (Next.js 14)  │
                    │  resolves tenant from the Host header│
                    └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────┐
                    │  ONE Firebase project                │
                    │                                       │
                    │  (default) ── control plane           │
                    │     tenants/{tenantId}                │
                    │     tenant_members/{uid}              │
                    │                                       │
                    │  clinic-livebetterlife ── clinic data │
                    │  clinic-diaconumaria   ── clinic data │
                    │  clinic-…              ── (≤100)      │
                    │                                       │
                    │  Auth (shared pool)                   │
                    │  Storage (see §4)                     │
                    │  Cloud Functions (v2, per-database)   │
                    └───────────────────────────────────────┘
```

**Tenant key:** the subdomain label (`diaconumaria`). Database id is
`clinic-<label>`. Apex and `admin.` are reserved for the control plane.

**Client-side resolution:** the root layout (Server Component) reads the `Host`
header, looks up the tenant, and injects the database id so
`getFirestore(app, databaseId)` initialises synchronously. Firebase JS SDK
10.14.1 supports this overload — confirmed in the installed types.

**Server-side resolution:** one service account for the whole project. API
routes resolve the tenant from the request and call
`getFirestore(adminApp, databaseId)`. **This dissolves the constraint that
blocked the old plan** — there are no per-tenant service accounts to encrypt,
store, or route.

**Per-tenant secrets that remain:** `ANTHROPIC_API_KEY` (each clinic now brings
its own — decided 19 Aug). Stored encrypted in the control plane, never
`NEXT_PUBLIC_`.

---

## 3. What each database holds

Unchanged from today — every collection currently in a tenant's project moves
wholesale into that tenant's database. Rules deploy identically to every
database.

The `(default)` database is **not** a clinic. It holds only:

| Collection | Purpose |
|---|---|
| `tenants/{tenantId}` | subdomain, database id, display name, status, flags (`isDemo`), encrypted Anthropic key |
| `tenant_members/{uid}` | `{ tenantId, role }` — which tenant a user belongs to |

`tenant_members` exists because two things cannot see into a named database:
Storage rules (§4) and the tenant resolver before a database is chosen. It is a
membership index, never a data store — it must never hold clinical data.

---

## 4. Storage — the one genuine gap **[OPEN]**

`storage.rules` currently makes five Firestore lookups, all hardcoded to
`/databases/(default)/documents/…`. Once clinic data lives in named databases,
those lookups see nothing.

Both of these **compile**, tested 19 Aug:

```js
firestore.exists(/databases/clinic-a/documents/team_members/$(request.auth.uid))
firestore.exists(/databases/$(tenantId)/documents/team_members/$(request.auth.uid))
```

but the rules compiler is permissive about path syntax and compilation is **not**
evidence of runtime support. This must be settled by a runtime spike before the
Storage design is fixed — it is the first task of the storage phase, and it
gates the choice:

**Option A — dynamic database in Storage rules** (if the spike passes)
Paths become `tenants/{tenantId}/clients/{clientId}/…`; rules interpolate
`$(tenantId)` into the database segment. No mirror, no sync. Cleanest.

**Option B — membership mirror in `(default)`** (if the spike fails)
Storage rules consult `tenant_members/{uid}` in `(default)` for staff, and a
`tenant_parents/{uid}` mirror for parents. Works with the syntax known to be
supported today. Cost: parent UIDs churn on every anonymous re-login, so the
mirror needs maintaining in `ParentAuthContext` alongside `parentUids`.

**Option C — signed URLs** (fallback, strongest)
Deny all client access in Storage rules; serve media through an API route that
verifies the caller and returns a short-lived signed URL. Strongest guarantee,
but changes how every video and voice note loads and adds a round-trip.

Decide after the spike. Do not build Storage isolation before then.

---

## 5. Cloud Functions

**v1 Firestore triggers only fire on `(default)`.** `sendPushNotification` is v1
(`functions.firestore.document(...)`), so under multi-database push would
silently stop for every clinic on a named database — the worst kind of failure,
because nothing errors.

v2 triggers accept a `database` option. This makes the v2 upgrade a **hard
prerequisite**, not hygiene — and it coincides with the Node 20 runtime being
decommissioned on **30 October 2026**.

`createTeamMember` and `migrateTeamMember` are HTTP functions; they take the
target database as a parameter and resolve it server-side against
`tenant_members`.

---

## 6. Accepted trade-offs

| | Per-project (today) | Multi-database (target) |
|---|---|---|
| Tenant ceiling | ~20 (org cap) | 100 databases per project |
| Isolation | Project boundary | Database boundary, enforced by existing rules |
| Rules deploys | N projects | N databases, one command each — scriptable in a loop |
| App deploys | N Vercel projects | **1** |
| Server-side tenancy | N service accounts to encrypt and route | **1**, select database per request |
| Blast radius | One clinic | **All clinics** — a project-level problem (billing, quota, deletion) hits everyone |
| Billing separation | Per clinic | **None** — one project, one bill |

The blast-radius and billing rows are the real price. They are accepted:
escaping the project cap is worth more than per-clinic containment at this
scale, and clinic billing is handled commercially rather than by GCP invoice.

---

## 7. Migration

Three clinics move from their own projects into databases of the platform
project. Per clinic: create the database, deploy rules, copy every collection
and subcollection, copy Storage objects, re-point the Vercel deployment,
verify, then decommission the old project.

Auth is the hard part: users live in the **old project's** Auth pool and must
exist in the new one with the **same UIDs**, because every `team_members`
document and `parentUids` entry is keyed by UID. Firebase supports
`auth:import`/`auth:export` preserving UIDs and password hashes. Anonymous
parent users need not migrate — parents re-authenticate with their access code
and `ParentAuthContext` re-registers the new UID, which is already the
designed behaviour.

Cutover per clinic is a short read-only window, scheduled outside therapy hours.

---

## 8. Sequencing

1. **Cloud Functions v2 + Node 22** — hard external deadline (30 Oct), and a
   prerequisite for per-database triggers. Independently shippable today.
2. **Storage spike + isolation design** — resolves §4 before anything depends on it.
3. **Control plane + tenant resolution** — `(default)` registry, Host-based
   resolution, client and server database selection.
4. **Migrate the three clinics**, then decommission the old projects.

Steps 1 and 2 are independent of each other and of 3.

---

## 9. Open questions

- Storage isolation option (§4) — blocked on the runtime spike.
- A v2 Firestore trigger targets **one** database. `sendPushNotification` under
  multi-database therefore needs either a wildcard `database` option (unverified)
  or one registration per clinic — 20 trigger deployments at the cap. Verify
  before phase 3; it may argue for moving push delivery to an HTTP function
  called from the app instead of a Firestore trigger.
- Does the demo tenant stay a separate database, or become a normal tenant with
  an `isDemo` flag? (The old plan chose the flag; nothing here changes that.)
- Where does the superadmin control-plane UI live — apex, or `admin.`?
- Do we keep `tempo-app-2` as the platform project, or create a clean one? Its
  name is a poor fit for a platform, and reusing it means the migration has a
  self-referential step for Live Better Life.
