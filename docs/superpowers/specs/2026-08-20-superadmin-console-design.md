# Superadmin Console — Design

> **Status**: approved, not yet built | **Date**: 20 August 2026 | **Host**:
> `superadmin.tempoapp.ro` | **Depends on**: the multi-database tenancy model
> (`2026-08-19-multi-database-tenancy-design.md`, live since 20 Aug 2026)

A platform-operator surface for the four clinics: what they have, what they
bought, what they owe, and what they are reporting. Everything it does is
possible today only by signing into each clinic's own subdomain as Superadmin
and doing it four times, or by running a script against Firestore.

---

## 1. Why this exists

Three things drove it, and each is already a live cost:

- **Per-clinic settings need a per-clinic login.** Evaluation access and
  branding are set from a clinic's own subdomain. Deciding what a clinic bought
  is a commercial act about a customer, not an act inside their app, and it is
  currently performed by borrowing their front door.
- **Two features are half-built.** `bug_reports` (3 stored) and
  `potential_clients` (30 leads captured by the demo entry form) are written,
  ruled and — in the first case — emailed, but **nothing in the product can read
  either**. The data has been accumulating with no reader.
- **Licences do not exist.** There is no record of what a clinic has paid for or
  until when, so there is nothing to enforce and nothing to check.

---

## 2. Where it lives

### `superadmin` becomes a reserved label

`RESERVED` in `src/lib/tenant.ts` currently holds `""`, `www`, `admin`, `app`,
`api`, `localhost`. `superadmin` is **not** among them, so
`superadmin.tempoapp.ro` resolves to `clinic-superadmin` — a database that does
not exist — and renders an empty app with no error.

Adding it makes the host resolve to `(default)`, the control plane. This is a
one-line change to a security boundary and gets a test case beside the existing
hostile-hostname assertions.

### One app, one deployment

The console is a route group in the existing Next app (`src/app/(platform)/`),
not a second project. One deployment already serves every host; the tenancy
cutover existed precisely to stop having a project per surface. A separate app
would need its own build, its own env, and its own copy of `lib/tenant.ts`.

The consequence to keep in mind: **the route group is reachable on every host**,
because all hosts serve the same bundle. `livebetterlife.tempoapp.ro/platform`
would render the console shell. That is not the security boundary — §3 is — but
the client should still refuse to render on a non-platform host, so the mistake
is visible rather than merely harmless.

---

## 3. Access control

Two independent checks, both server-side, on **every** request:

1. **Who.** Bearer ID token → `adminAuth().verifyIdToken()` →
   `team_members/{uid}` in `(default)` → role must be `Superadmin`.
2. **Where.** The request's `Host` must resolve to the platform (`tenantIdFromRequest(req) === ""`).

Neither alone is enough. Host-only would let any clinic's domain reach the
routes. Role-only would work, but the host check keeps a stolen session on a
clinic domain from reaching platform routes, and it costs one comparison.

`requireSuperadmin(req)` lives in `src/lib/platform/gate.ts`, modelled on
`src/lib/assistant/gate.ts` — same shape, same discipline: **the role comes from
the verified user, never from the request body.**

### The prerequisite this creates

`(default)` currently holds **six** `team_members` documents: Stefan
(`Superadmin`), plus two Admins and three Therapists left over from Live Better
Life's pre-migration records.

They cannot pass `isSuperadmin()` and so cannot use the console. But they can
already read whatever clinic data remains in `(default)`, and this design makes
that collection the authorization source for the platform's most privileged
surface. Leaving stale staff in it is then not untidiness but a standing grant.

**Purging `(default)` of clinic data is step one of implementation**, not
follow-up. It is already listed as outstanding in `docs/cutover-runbook.md`.
Back up first; keep `tenants`, `tenant_members`, `tenant_parents`, and Stefan's
own `team_members` document.

---

## 4. Reaching the clinics

`src/lib/firebase.ts` binds `db` from the hostname at module load, so a browser
on the platform host is bound to `(default)` and **cannot read a clinic database
at all**. This is correct and should not be worked around in the client.

Every cross-clinic operation is therefore an API route under `/api/platform/*`,
using the Admin SDK with `adminDb(databaseId)`:

| Route | Method | Purpose |
|---|---|---|
| `/api/platform/clinics` | GET | registry + per-clinic counts |
| `/api/platform/clinics/[id]` | GET | one clinic's detail, settings, licence |
| `/api/platform/clinics/[id]/evaluations` | PUT | set the disabled-protocol list |
| `/api/platform/clinics/[id]/licence` | PUT | set plan and expiry |
| `/api/platform/clinics/[id]/branding` | PUT | upload a logo to that clinic's bucket |
| `/api/platform/bug-reports` | GET/PATCH | list; change `status` |
| `/api/platform/leads` | GET | `potential_clients` |
| `/api/platform/ai-usage` | GET | per-clinic Mira spend |
| `/api/platform/health` | GET | per-clinic reachability |

The target clinic is named in the **path**, never inferred from the host — the
host identifies the *operator*, the path identifies the *subject*. The database
id is derived as `clinic-<label>` after validating the label against the same
pattern `tenant.ts` uses; an unvalidated label reaching `adminDb()` is how a typo
becomes a read of the wrong database.

### Writes are logged twice

Any platform write logs an activity into **the target clinic's** `activities`
collection as well as the platform's own audit. A clinic's audit trail is a
compliance artefact; changes made from outside must appear in it, attributed,
rather than appearing to have happened by themselves.

---

## 5. Licence and enforcement

### Source of truth, and the mirror

`tenants/{tenantId}.licence` in the control plane:

```
licence: {
  plan: "lifetime" | "term",
  startedAt:        ISO string,
  expiresAt:        ISO string | null,   // null when plan is "lifetime"
  graceDays:        number,              // default 14
  graceEndsAtMillis: number | null,      // expiresAt + graceDays, precomputed
  notes:            string,
  updatedAt:        ISO string,
  updatedBy:        uid,
}
```

Firestore rules **cannot read another database** — `get(/databases/$(database)/…)`
always binds the current one. This is the same wall that forced
`tenant_members` into `(default)` for Storage. So enforcement needs the licence
inside each clinic, mirrored to `system_settings/licence` by the Admin SDK:

```
{ plan, expiresAt, graceEndsAtMillis, updatedAt }
```

Nothing in a browser may write it: `allow read: if isSignedIn(); allow write: if false;`.
Staff read it so the app can show an expiry banner.

**`graceEndsAtMillis` is stored as a number on purpose.** Rules then compare
`request.time.toMillis() < resource.data.graceEndsAtMillis` with no date parsing
and no timezone question. Storing an ISO string would force `timestamp.date()`
gymnastics in a place that is hard to test and easy to get subtly wrong.

### What expiry does

```
function licenceActive() {
  return !exists(/databases/$(database)/documents/system_settings/licence)
      || get(/databases/$(database)/documents/system_settings/licence)
           .data.get('graceEndsAtMillis', null) == null
      || request.time.toMillis() < get(/databases/$(database)/documents/system_settings/licence)
           .data.graceEndsAtMillis;
}
```

Applied to **staff writes only**, on the clinical and operational collections
(`clients`, `events`, evaluation subcollections, `invoices`, `payouts`,
`expenses`, `programs`, `services`, documents, videos, voice feedback):

| | within licence | expired + grace elapsed |
|---|---|---|
| Staff read | allow | **allow** |
| Staff create / update / delete | allow | **deny** |
| Parent portal (read + homework toggle) | allow | **allow** |
| Activity log writes | allow | allow — an audit trail must not gain gaps |

Two properties, both deliberate:

- **Reads are never withheld.** The clinic is the data controller and we are the
  processor; a billing lapse must not become an outage on a child's clinical
  record. It also keeps the failure recoverable — a wrong date embarrasses us
  rather than stopping therapy.
- **Parents are never affected.** A parent has no relationship with our invoice.

### Fail open

A clinic with **no** licence document keeps working. This matches the
`evaluation_access` opt-out precedent, and it is what makes the rollout safe:
rules deploy to all five databases at once, and the mirrors are written per
clinic afterwards. Fail-closed would mean every clinic is frozen in the window
between the two.

The cost is that a missing mirror silently means "unlimited". The console
surfaces `licence: none` prominently for exactly this reason.

### Rules budget

Firestore allows 10 document accesses per single-document request. A staff write
today costs `team_members/{uid}` (role) plus, on evaluation paths,
`system_settings/evaluation_access`. Repeated access to the same path within one
evaluation is cached, so `licenceActive()` adds **one** document. Comfortable,
but `test-rules.mjs` should keep asserting the deepest path.

### The starting dates

| Clinic | Plan | Expires |
|---|---|---|
| Live Better Life | `lifetime` | — |
| Demo | `lifetime` | — |
| Diaconu Maria | `term` | 20 Aug 2027 |
| Academia lui Alex | `term` | 20 Aug 2027 |

Grace: 14 days, so writes actually stop on 3 Sep 2027 for the two term clinics.

---

## 6. Screens

| Screen | Reads | Writes |
|---|---|---|
| **Clinics** | `tenants` + per-clinic counts (clients, staff, events) | — |
| **Clinic detail** | settings, licence, evaluation access, branding | evaluation toggles, licence, logo |
| **Bug reports** | `bug_reports` — has `tenantId`, `host`, `page`, `title`, `description`, `reportedBy`, `status` | `status` only |
| **Leads** | `potential_clients` — `name`, `phone`, `email`, `clinic`, `consent`, `source`, `createdAt` | — |
| **AI cost** | `ai_conversations` + `ai_usage_events` per clinic, summed | — |
| **Health** | per-clinic database reachability, Mira key, bucket, licence state | — |

Both inboxes live in **`clinic-demo`**, not `(default)`: `report-bug/route.ts`
pins `BUG_REPORT_DATABASE = "clinic-demo"`, and the demo login page writes leads
into whatever database its host resolves to. That is worth knowing before
looking for them; moving them is out of scope here.

**Timestamps**: every one of these collections carries the mixed
`Timestamp`-or-ISO-string shape described in §4.2 of the technical
documentation. All reads go through `src/lib/timestamps.ts`. Note that the
existing `/ai-usage` page does not, and renders `—` for migrated rows; worth
fixing while building its cross-clinic sibling.

---

## 7. Testing

| Suite | Asserts |
|---|---|
| `test-tenant.mjs` (extend) | `superadmin.tempoapp.ro` → `(default)`, and does **not** become `clinic-superadmin` |
| `test-licence.mjs` (new) | the enforcement matrix, against the Rules test API — deploys nothing |
| `test-rules.mjs` (extend) | `system_settings/licence` unwritable from a browser; `platform` routes' collections unchanged |

`test-licence.mjs` follows `test-rules.mjs`: the Firebase Rules **test API** with
mocked `get`/`exists` results, so licence states are simulated rather than
created. Cases: within licence, expired but inside grace, grace elapsed, absent
document, and — the one that matters most — **parent read after expiry**.

Gate checks (`requireSuperadmin`) get a route-level test for: no token, valid
token but not Superadmin, Superadmin on a *clinic* host, and Superadmin on the
platform host.

---

## 8. Sequencing

**Phase 0 — prerequisite.** Back up and purge `(default)` of clinic data (§3).

**Phase 1 — spine, read-only.** `superadmin` reserved; route group; gate;
clinic list and detail; bug reports; leads; AI cost; health. Useful on its own,
and cannot deny anything to a running clinic.

**Phase 2 — writes.** Evaluation toggles, branding, licence editing, with
double-sided audit logging. Still nothing enforced.

**Phase 3 — enforcement.** `licenceActive()` in rules, mirrors written, the four
licences set, `test-licence.mjs` green. The only phase that can stop a clinic
working, and the only one needing a careful deploy order: **rules first** (they
fail open), **mirrors second**.

---

## 9. Accepted trade-offs

- **Fail-open licences.** A missing mirror means unlimited, not frozen.
  Surfaced in the console instead of enforced.
- **The console is reachable, unrendered, on clinic hosts.** The bundle is
  shared. Authorization is server-side; the client-side host check is
  signposting, not a boundary.
- **Reads survive expiry.** A clinic that never pays keeps read access to its
  own records indefinitely. Deliberate: the alternative holds clinical data
  hostage.
- **Bug reports and leads stay in `clinic-demo`.** Relocating them is a
  migration with no user-visible benefit today.

## 10. Rejected

- **A separate Vercel project for the console.** Reintroduces exactly the
  per-surface project sprawl the tenancy cutover removed.
- **A dedicated `platform_admins` collection.** Cleaner in isolation, and it
  would have avoided the `(default)` purge being a prerequisite — but it adds a
  second, parallel notion of "who is staff" to a codebase that already has one
  that works. Chosen against knowingly; the purge is the price.
- **Client-side cross-clinic reads.** Would mean a second Firestore instance per
  clinic in the browser, with rules evaluated against a Superadmin who is a
  member of every clinic. The Admin SDK behind a gate is narrower and auditable.
- **Blocking sign-in on expiry.** Simple, but it takes the audit trail and the
  clinic's own records away at the moment a dispute is most likely.

## 11. Open questions

- **Renewal is manual.** Nothing emails a warning before expiry. A scheduled
  reminder is worth having, but it is not in this scope.
- **Whether Superadmin should be hidden from the console's own clinic views.**
  `isPlatformStaff()` hides Stefan from clinic-facing lists; inside the console
  that filtering is probably wrong, since the operator is the audience.
- **`clinic-demo` has all five evaluation protocols disabled.** Deliberate or
  drift? Odd for a sales demo, and the console makes it a one-click answer.
