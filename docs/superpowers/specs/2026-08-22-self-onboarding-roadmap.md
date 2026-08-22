# Self-onboarding roadmap

**Written:** 22 Aug 2026
**Question it answers:** how far is the platform from a clinic signing up at
`tempoapp.ro`, paying, and landing on `<label>.tempoapp.ro` with everything set up?

**Short answer:** technically closer than it looks — one architectural change
stands between us and automated provisioning. Commercially further — payments
and signup do not exist, and the GDPR posture changes the moment nobody reviews
a clinic before it goes live.

---

## 1. What already works, and is easy to underestimate

The app needs **no code change** to serve a new clinic:

- `src/lib/tenant.ts` derives the database, bucket and per-clinic key from the
  hostname, so routing is automatic.
- `scripts/deploy-rules.mjs` discovers databases dynamically — a new one is
  picked up without editing a list.
- `*.tempoapp.ro` already resolves to Vercel. Attaching a hostname is one API
  call and the registrar is not involved; TLS follows via HTTP-01. Verified
  while onboarding `aicaa`.

Most of the runbook is already scripted: database creation, bucket, seed, tenant
registration, licence, admin creation, branding and evaluation toggles. Wiring
those into one endpoint is glue, not architecture.

---

## 2. The blocker

**A Firestore trigger binds to exactly one database, named at deploy time.**
There is no wildcard, and v1 triggers only ever fire on `(default)`. So every
clinic needs its own registrations — two of them today:

```ts
export const sendPushNotification<Label>  = pushNotificationTrigger("clinic-<label>");
export const fcmTokenOwnership<Label>     = fcmTokenOwnershipTrigger("clinic-<label>");
```

Adding a clinic therefore means editing `functions/src/index.ts` and running
`firebase deploy --only functions`. **A signup flow cannot sit behind a source
edit and a deploy that takes minutes and can fail.** Nothing else in the
onboarding path has this property.

It is also already a live footgun: the runbook has to warn that skipping the
registration fails silently — in-app notifications keep working and only push is
missing, so it reads as users having declined notifications rather than as a
deployment gap.

### Options considered

| Option | Verdict |
|---|---|
| **Move push out of triggers into the API layer** — the path that creates a notification calls a server route that sends it | **Chosen.** Removes per-clinic functions entirely. Bounded, and useful even if self-serve never ships. |
| **Pre-provision a pool** of `clinic-001…050` with triggers pre-deployed | Rejected. Tenant resolution derives the database from the hostname; a pool forces a registry lookup, turning a pure synchronous security-critical function into an async one. |
| **Automate the deploy** per signup | Rejected. Technically possible, fragile exactly when it matters, and leaves provisioning coupled to CI. |

---

## 3. What does not exist at all

- **Subscription billing.** No Stripe, no checkout, no webhooks, no plan model.
  The licence system already does expiry and enforcement, and that half is live —
  but nothing maps a payment to a licence.
- **The signup flow.** `tempo-web` is a separate repo, currently a marketing site
  with a contact form. Handed over: `documentation/tempo-web-handover.md`.
- **Provisioning safety.** Label validation and reserved names exist in the
  runbook as prose, not as code. Collision handling, rate limiting and abuse
  review are absent.

---

## 4. Phases

Ordered so each is independently useful and nothing is wasted if the next is
deferred.

### Phase 1 — Remove the trigger dependency  *(the unlock)* — **DONE 22 Aug 2026**

`functions/src/index.ts` now has **zero per-clinic registrations**. Only
`createTeamMember` and `migrateTeamMember` remain deployed, and neither is
per-clinic. Adding a clinic no longer touches that file or requires a functions
deploy.

Push moved to `/api/notifications` (writes and sends in one request) and token
ownership to `/api/fcm-token` (registers and takes ownership in one request).
`firestore.rules` now denies client create/update on `fcm_tokens`, so
registration cannot regress to a direct write and reintroduce the token
collisions.

Verified in production at each step rather than at the end: a real message from
the deployed app delivered a push while the trigger logged that it was skipping
it; the triggers were deleted only after that; the route was then called again
with nothing deployed and still delivered. Ownership handover was tested against
the live route with two accounts and one token.

*Original plan below, kept for the reasoning.*

Move push sending, and FCM token ownership, out of per-clinic Firestore triggers
into the platform's API layer.

- Notifications are currently created client-side with `addDoc`. Either route
  creation through an API endpoint, or have the client call a send endpoint
  after creating the document.
- The token-ownership reconciliation moves to whatever registers a token.
- Delete the eight per-clinic registrations; keep the two HTTP functions, which
  are not per-clinic.

**Care required:** push is live for 14 devices at one clinic. Ship behind a
verification that a real notification still arrives before removing the triggers.

**Independently useful:** removes the silent-failure footgun from every future
onboarding, whether or not self-serve happens.

### Phase 2 — Provisioning endpoint

One authenticated endpoint chaining the existing scripts, plus the two public
endpoints `tempo-web` needs (`check-label`, status polling).

Must be **transactional or verified**. The failure that matters: a database
created but rules not yet deployed. That window is a clinic's records with no
rules over them — it must be impossible to reach `ready` in that state, and a
partial failure must roll back or halt loudly rather than leave a half-clinic.

Idempotent on the payment reference: webhooks retry, and a retry must not create
a second clinic.

### Phase 3 — Commerce

Stripe subscription, signup flow in `tempo-web`, webhook triggering provisioning.
The largest single chunk and the one furthest from existing code.

**Provisioning is triggered by the webhook, not by the browser reaching a success
page** — otherwise a user who closes the tab after paying gets no clinic.

**A card is taken up front, including for the trial** (§5.1). That decision
reaches further than the signup form: it means day 30 has three outcomes rather
than one, and the platform has to be told which. A card that charges converts
silently; a cancellation ends the licence with no grace, because they chose it;
a decline ends it **with** the 14 days, because that is the administrative gap
grace exists for. From the clinic's side the last two are identical — the
licence simply expired — so the webhook that learns the outcome must record it.
`LicenceEndReason` on the licence carries it, `graceDaysForEnd` derives the
grace from it, and the mirrored copy lets the clinic's own banner say which it
was. Unknown reasons err generous, like everything else here.

### Phase 4 — Safety and posture

- Label validation, reserved names and a review queue for names that read as
  another organisation.
- Rate limiting and abuse handling on the public endpoints.
- **Click-through DPA.** Each clinic is the data controller for children's
  clinical records; we are the processor. Today that relationship is established
  per clinic, by a human. Self-serve replaces that with a checkbox, and that
  needs legal input. **Treat as a launch blocker.**
- Cancellation, retention and deletion — specified below in §5.
- Decide Mira: per-clinic Anthropic keys (today) or a shared key with per-tenant
  metering. The metering already exists, so the shared key removes a manual step
  from every onboarding.

---

## 5. Squatting, abandoned trials, and retention

Self-serve makes signup free, and anything free gets taken. Three related
problems with three different answers.

### What a signup actually costs

Each one permanently consumes **a Firestore database, a Storage bucket, a Vercel
domain and a label**. All four are finite per project — confirm the current
database quota before launch, because it becomes the effective signup ceiling.
A squatter does not cost disk; it costs a slot, and the label costs it forever
(see §5.4).

### 5.1 Prevent squats at the door

Cheaper than any reclamation policy:

- **A card on file for the trial.** Stripe supports trial-with-card. This is the
  single most effective measure — squatters do not enter card details — and it
  is standard practice, not a hostile one.
- **Provision on a verified payment intent, not on form submit.** If the
  subdomain only exists once someone has proven they are real, most of this
  never happens.
- Email verification before any resource is created.
- Rate limits per IP, email and card.
- A blocklist plus manual review for names reading as another organisation.

### 5.2 The ladder after a trial ends

Day 30 read-only already works and needs no new mechanism — a trial is a term
licence, and the rules enforce it. What follows is the part that does not exist:

| When | What happens |
|---|---|
| Day 30 | Read-only. Banner in-app, first email. |
| Day 60 | Second and third notices. Export made available. |
| Day 90 | Deletion, per §5.3. |

Notices at 30/60/80; deletion at 90. Sooner on request, always.

### 5.3 Retention branches on whether real records exist

This is the decision that matters, and it is legal rather than operational.

**No client records** — a squat, or a trial nobody used. Delete everything at
**day 60**. Reclaim at **day 30** if nobody ever signed in: there is nothing to
protect and no controller relationship in practice.

**Real clinical records.** These cannot be unilaterally deleted. The clinic is
the data controller for children's clinical records and we are the processor;
on end of service the controller chooses **return or deletion**. So: notice,
a real export, and deletion at **day 90** unless they instruct otherwise.

"Deleted" means deleted from Firestore and Storage. **Backups are the real
horizon** — the DPA should name the retention window rather than implying
deletion is instant.

### 5.4 A label that held real data is never reused

Parents keep bookmarks. Access codes travel by email and on paper. Staff have
saved logins. Reassigning `clinicx.tempoapp.ro` sends all of that to **a
different clinic's login page** — a parent typing their child's access code into
an organisation that has never heard of them.

So `tenants/{label}` becomes a tombstone rather than being deleted, and
availability checks treat any existing document as taken. One tiny document per
departed clinic removes a whole class of accident.

A label that never held client records may be released after a 90-day
cooling-off.

### 5.5 What has to be built

In order, because each depends on the last:

1. **Make `tenants.status` load-bearing.** It is read in three places today and
   every one of them only *displays* it — a clinic marked "suspended" keeps
   working perfectly. Every stage above depends on it meaning something.
2. **Lifecycle dates on the tenant** — `readOnlyAt`, `notifiedAt`, `deleteAfter`
   — so the policy is data a scheduled job reads rather than a calendar
   reminder someone keeps.
3. **Export before delete.** "Return or deletion" cannot be honoured without the
   return half, and JSON per collection is not what a controller means by it.
4. **An offboarding script.** None exists; onboarding is scripted end to end and
   the reverse is a human deleting a database by hand at speed. Designed in
   `docs/superpowers/specs/2026-08-22-tenant-offboarding-design.md`, including
   the trap that Auth is shared — deleting a clinic must never delete a person
   who works at another one.

---

## 6. What this is not

Not a commitment to ship self-serve. Phase 1 is worth doing on its own merits and
should not wait on a decision about phases 3 and 4. If self-serve never happens,
the platform still loses a per-clinic deploy and a silent failure mode.
