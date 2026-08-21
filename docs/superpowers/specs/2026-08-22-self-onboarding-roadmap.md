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

### Phase 1 — Remove the trigger dependency  *(the unlock)*

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

### Phase 4 — Safety and posture

- Label validation, reserved names and a review queue for names that read as
  another organisation.
- Rate limiting and abuse handling on the public endpoints.
- **Click-through DPA.** Each clinic is the data controller for children's
  clinical records; we are the processor. Today that relationship is established
  per clinic, by a human. Self-serve replaces that with a checkbox, and that
  needs legal input. **Treat as a launch blocker.**
- Cancellation, retention and deletion. A cancelled clinic still has a database
  and a bucket of clinical records; how long they live is a legal question.
- Decide Mira: per-clinic Anthropic keys (today) or a shared key with per-tenant
  metering. The metering already exists, so the shared key removes a manual step
  from every onboarding.

---

## 5. What this is not

Not a commitment to ship self-serve. Phase 1 is worth doing on its own merits and
should not wait on a decision about phases 3 and 4. If self-serve never happens,
the platform still loses a per-clinic deploy and a silent failure mode.
