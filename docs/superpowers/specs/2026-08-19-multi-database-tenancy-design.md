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

**Client-side resolution:** `src/lib/tenant.ts` derives the database id from the
hostname by convention (`diaconumaria.tempoapp.ro` -> `clinic-diaconumaria`),
with no lookup. Chosen over reading the `Host` header in the root layout because
`headers()` opts the whole app out of static rendering, and under a single
project the database id is the *only* value that varies per tenant — which the
hostname already encodes. It also keeps `getFirestore` synchronous, which matters
because 68 files import the `db` singleton. Firebase JS SDK 10.14.1 supports the
`getFirestore(app, databaseId)` overload — confirmed in the installed types.

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

## 4. Storage — **RESOLVED 19 Aug 2026**

`storage.rules` makes five Firestore lookups, all hardcoded to
`/databases/(default)/documents/…`. The question was whether they could point at
a per-clinic database instead.

**They cannot.** Runtime spike on `tempo-app-demo`, two users and a positive
control:

| Rule reads | User whose marker is there | Result |
|---|---|---|
| `/databases/(default)/…` | userA | **ALLOW** — mechanism works |
| `/databases/(default)/…` | userB (no marker) | DENY — control discriminates |
| `/databases/spike-storage/…` (static) | userB | **DENY** |
| `/databases/$(tenantId)/…` (interpolated) | userB | **DENY** |

Both named forms **compile and deploy** and then deny everything at runtime.
That is the dangerous part: nothing errors, so a rollout would look successful
and silently block every parent from every video and voice note.

> **Storage rules can only read the `(default)` database.** Do not design around
> anything else, and do not trust `firebase deploy` succeeding as evidence.

### Second finding, from the same spike

The control ALLOWED userA a read gated on `spike_probe/{uid}` — a collection with
**no Firestore rule at all**, therefore default-denied to that user. So
`firestore.get`/`exists` inside Storage rules is a **privileged read that bypasses
Firestore security rules**.

That is what makes the chosen option safe: the mirror can be locked to
`allow read, write: if false` in Firestore — invisible to every client — and
Storage rules can still consult it.

### Decision: one bucket per clinic

Revised 19 Aug after inspecting how media is actually stored and served.

**Each clinic gets its own Storage bucket**, alongside its own database. The
bucket *is* the tenant, so authorisation is one equality check and object paths
never change:

```
match /b/{bucket}/o {
  function memberBucket() {
    return firestore.get(/databases/(default)/documents/tenant_members/$(request.auth.uid)).data.bucket;
  }
  function isTenantStaff() {
    return request.auth != null &&
      firestore.exists(/databases/(default)/documents/tenant_members/$(request.auth.uid)) &&
      memberBucket() == bucket;
  }
  ...
}
```

`{bucket}` binds the real bucket name, so **one rules file serves every tenant** —
no per-tenant rules files, no path prefixes, no string parsing. The control-plane
mirrors carry the bucket:

| Collection | Contents |
|---|---|
| `tenant_members/{uid}` | `{ tenantId, role, bucket }` |
| `tenant_parents/{uid}` | `{ tenantId, bucket, clientIds: [...] }` |

**Verified at runtime**, 19 Aug, with a real second Firebase Storage bucket on
`tempo-app-demo` and two users whose mirrors named different buckets:

| | own bucket | other tenant's bucket |
|---|---|---|
| userA (mirror -> bucket A) | **ALLOW** | **DENY (403)** |
| userB (mirror -> bucket B) | **ALLOW** | **DENY (403)** |

One `storage.rules` file was deployed to both buckets in a single command, using
the multi-bucket `storage` array in `firebase.json`. The `{bucket}` wildcard binds
the real bucket name, so no per-tenant rules file is needed.

> **Sequencing:** these rules deny everything until `tenant_members` entries carry
> a `bucket` field. Deploy the mirrors first, then the rules — the reverse order
> locks staff out of every document, video and voice note.

### Why this beats the path-prefix approach

**Live Better Life needs no storage migration at all.** It keeps the project's
default bucket, so its 32 objects never move and their URLs never change. Demo and
Diaconu Maria have zero objects, so their new buckets start empty. The entire
storage migration is: create two buckets.

That matters more than it first appears, because of what media URLs contain.

### What `downloadUrl` actually is

Media documents store both a `storagePath` and a `downloadUrl` of the form:

```
https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<urlencoded-path>?alt=media&token=<uuid>
```

That token grants access **without authentication**, and the app renders the
stored URL directly — `<a href>` in the documents tab and parent portal,
`<video src>`, `<audio src>`. `getDownloadURL()` is only called at upload time.

Two consequences:

1. **Storage rules do not govern reads of existing media.** What actually protects
   a file is that a parent cannot read the Firestore document that holds its URL —
   the `sharedWithParent` flag, enforced by Firestore rules. Rules on the bucket
   govern uploads, deletes, and fresh `getDownloadURL()` calls. Treat a leaked
   media URL as public until the token is revoked.
2. **Moving an object invalidates its stored URL** — the path changes and the copy
   gets a new token unless `firebaseStorageDownloadTokens` metadata is carried
   across deliberately. Avoiding the move avoids the whole class of problem.

### Rejected

**Path prefixes in a shared bucket** (`tenants/{tenantId}/clients/…`) — would have
required moving all 32 live objects and rewriting each `downloadUrl` and
`storagePath` in Firestore, for weaker isolation than a bucket boundary.

**Signed URLs** — deny all client access and serve media through an API route.
Strictly stronger, and the only design that would close the tokenised-URL gap
above. Rejected for now because it changes how every video and voice note loads
and adds a round-trip per item; revisit if media access control ever needs to be
real rather than obscure.

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

- A v2 Firestore trigger targets **one** database. `sendPushNotification` under
  multi-database therefore needs either a wildcard `database` option (unverified)
  or one registration per clinic — 20 trigger deployments at the cap. Verify
  before phase 3; it may argue for moving push delivery to an HTTP function
  called from the app instead of a Firestore trigger.
- Does the demo tenant stay a separate database, or become a normal tenant with
  an `isDemo` flag? (The old plan chose the flag; nothing here changes that.)
- Where does the superadmin control-plane UI live — apex, or `admin.`?
- **Platform project: `tempo-app-2`** (decided 19 Aug). Live Better Life's Auth
  pool never moves, so its 8 staff keep their UIDs and its 329 anonymous parent
  sessions keep working — no family has to re-enter an access code. Its data
  moves within the project and its Storage objects only change path, not bucket.
  The cost is a project name that reads oddly for a platform, surfacing only in
  storage URLs and the auth domain. `tempo-platform` exists but has never had
  Firestore enabled; it stays unused.
