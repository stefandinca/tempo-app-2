# Handover: clinic signup on `tempo-web`

**For:** whoever builds the signup and payment flow in the `tempo-web` repo.
**Written:** 22 Aug 2026, against the platform as it actually runs today.

This describes the contract between the marketing site and the platform. It is
written so the signup flow can be built and finished **before** the platform's
provisioning endpoint exists — mock the one call described in §3 and everything
else here is already true.

---

## 1. What you are building

A visitor at `tempoapp.ro` should be able to: choose a plan, pay, name their
clinic, and end up signed in at `<label>.tempoapp.ro` with a working, empty
clinic and themselves as its Admin.

Payment is mocked for now. Everything else in this document is real.

---

## 2. The six things you must collect

| Field | Constraint | Why it matters |
|---|---|---|
| `label` | `^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$` | Becomes the subdomain, the Firestore database, the Storage bucket and an env var name. **Permanent.** |
| `clinicName` | free text | Display name only. Changeable later. |
| `adminEmail` | a real mailbox | Becomes a platform-wide Firebase Auth account. |
| `adminName` | free text | Shown to the clinic's own staff and parents. |
| `plan` | `term` \| `lifetime` | Drives the licence. `term` defaults to 12 months. |
| `tier` | `starter` \| `professional` \| `clinic` \| `enterprise` | What they chose. **Not sent as free text — see §3a.** |

### The label deserves its own screen

It is the single irreversible decision in the whole flow. `src/lib/tenant.ts`
derives the database, the bucket and the per-clinic API key from it, and there is
no rename path — changing it later means migrating a database and a bucket.

Validate all four of these client-side, and again server-side:

1. **The pattern above.** Two characters minimum, lowercase, hyphens inside only.
   A label the pattern rejects does not fail loudly — `resolveDatabaseId` falls
   back to the control plane and the clinic gets an app with nothing in it.
2. **Reserved names:** `www`, `admin`, `app`, `api`, `superadmin`. These resolve
   to the platform rather than to a clinic.
3. **Not already taken.** Needs a platform call — see §3.
4. **Nothing that reads as another organisation.** `nhs`, `mayo`, a competitor's
   name. Worth a manual review queue rather than a blocklist.

Say plainly on that screen that it cannot be changed. Show the resulting URL as
they type.

---

## 3. The one call you need from the platform

**This endpoint does not exist yet. Build against a mock.** The shape is fixed;
the implementation is the platform's side of this handover.

### `POST /api/provision/check-label`

Public, rate-limited. Called as the user types.

```json
{ "label": "clinicx" }
```

```json
{ "available": true }
{ "available": false, "reason": "taken" | "reserved" | "invalid" }
```

### `POST /api/provision/clinic`

Called **after** payment succeeds. Idempotent on `paymentRef` — if you retry,
you get the same clinic back rather than a second one.

```json
{
  "label": "clinicx",
  "clinicName": "Clinic X",
  "adminEmail": "owner@clinicx.ro",
  "adminName": "Maria Ionescu",
  "plan": "term",
  "tier": "professional",
  "paymentRef": "<your payment id — the idempotency key>"
}
```

```json
{ "status": "accepted", "provisionId": "prov_abc123" }
```

### `GET /api/provision/clinic/{provisionId}`

```json
{
  "status": "provisioning" | "ready" | "failed",
  "step": "database" | "rules" | "bucket" | "seed" | "register" | "hostname" | "admin",
  "url": "https://clinicx.tempoapp.ro",
  "error": null
}
```

## 3a. Read the pricing catalogue from Firestore — do not hardcode it

**The pricing cards should render from platform data, not from markup.** Names,
taglines, prices, bullets, button labels, the "Popular" badge, the trial length
and the enforced limits all live in one document, editable from the platform
console at `superadmin.tempoapp.ro/platform/tiers`.

```
GET https://firestore.googleapis.com/v1/projects/tempo-app-2/databases/(default)/documents/platform_tiers/catalogue
```

**World-readable, deliberately and with no credentials** — it is pricing, it is
already on a public page, and nothing about a clinic, a person or a child is in
it. Verified anonymous: this document returns 200 while `tenants/…` returns 403.
Use the Firebase JS SDK if you prefer; same document, same rule. A JSON copy is
also served from `https://superadmin.tempoapp.ro/api/platform/tiers` if the REST
shape is inconvenient.

Each entry:

| Field | Meaning |
|---|---|
| `id` | `starter` \| `professional` \| `clinic` \| `enterprise` — the stable key. Never render it. |
| `label` | Display name, e.g. *Clinică* |
| `tagline` | The line under the name |
| `monthlyEur` | Price, or `null` meaning "on request" |
| `features[]` | The card bullets. **These sell; they enforce nothing.** |
| `ctaLabel` | Button text |
| `popular` | Draws the badge |
| `trialDays` | Free trial length. `0` on Enterprise |
| `maxUsers` / `maxActiveClients` | The enforced limits. `null` = unlimited |

Today that reads: starter 49 EUR (1 user, 30 clients), professional 99 (5, 100,
popular), clinic 179 (20, unlimited), enterprise on request. All three paid
tiers carry a 30-day trial.

**Why read it rather than copy it.** These same numbers cap the clinic. If the
page says 100 clients and the catalogue says 30, the clinic stops at 30 and the
customer is right to be annoyed. Reading removes the possibility.

**The `id` is the contract; everything else is editable.** Someone renaming
*Clinică* in the console must not break your page, so key on `id` and render
`label`.

### The trial

All tiers except Enterprise get **30 free days**. A trial is not a separate
mechanism: it is a normal term licence expiring in 30 days, so it ends exactly
the way a lapsed subscription ends — the clinic goes **read-only**, keeps every
record, and loses nothing. Nothing is deleted, ever, by an expiry.

One difference from a paid licence, and it is deliberate: a trial carries **no
grace period**. Paid licences get 14 days of grace so a failed card does not
take a clinic down over a weekend; a trial has no such gap to protect, and
applying the same grace would quietly make 30 days into 44.

### How limits actually bite

**Limits ARE enforced.** Setting a tier writes `maxActiveClients` and
`maxActiveTeamMembers` into the clinic's `system_settings/config`, which the app
has always enforced against: `AddClientModal` and `TeamMemberModal` refuse to go
over, and `ClientCard` / `ClientProfileHeader` refuse to reactivate an archived
client past the cap. So a Starter signup really does stop at 30 clients and one
seat.

Two things to know about how that behaves:

- **`0` means unlimited**, not "none allowed" — every enforcement site is
  written `if (max > 0)`. A tier's `null` is translated to `0` in one place,
  `configLimitsFor` in `src/lib/platform/licence.ts`.
- **It is enforced in the client, not in the rules.** A determined user with the
  console open could exceed a cap. That is a commercial limit, not a security
  boundary, and it is worth being clear which one it is — the licence *expiry*
  is enforced in Firestore rules and cannot be bypassed that way.

The seat count already excludes the platform Superadmin, so our own account
never consumes a clinic's seat.

**Two things the pricing page implies that the platform does not encode.**
The Professional bullet reads *"Portal Părinți Inclus"*, which implies Starter
has no parent portal, and the Starter bullet reads *"Toate evaluările incluse"*,
which implies evaluations everywhere. Only the user and client numbers were
encoded, because those are stated as numbers. **If the parent portal really is
meant to be a Professional feature, that needs saying explicitly** — it is a
whole surface of the product, and inferring it from a marketing bullet is how
a paying clinic loses something it thought it had.

---

## 4. Provisioning is NOT instant — design for it

This is the part most likely to be got wrong, so it is worth being blunt.

Creating a clinic means creating a Firestore database, deploying rules to it,
creating a Storage bucket, seeding, registering the tenant, attaching the
hostname and issuing a TLS certificate. **Minutes, not milliseconds**, and today
one step still needs a deploy of the platform's Cloud Functions.

So the flow after payment is:

1. Take payment.
2. `POST /api/provision/clinic` → `provisionId`.
3. Show a "setting up your clinic" screen and poll the status endpoint.
4. On `ready`, send them to `https://<label>.tempoapp.ro` — and **also email the
   link**, because people close tabs.
5. On `failed`, do not ask them to sign up again. Show a support contact and the
   `provisionId`. They have paid; a second signup would take a second payment
   and burn the label.

Do not redirect optimistically before `ready`. The hostname does not serve a
certificate until it is attached, and the browser shows a TLS handshake failure,
which looks like the product is broken rather than still building.

---

## 5. Authentication — do not build your own

The platform runs **one Firebase Auth pool** shared by every clinic. One person,
one account, one password, possibly staff at several clinics.

- `tempo-web` must **not** create Firebase Auth accounts, and must not hold
  Firebase credentials for `tempo-app-2`.
- The provisioning endpoint creates the Admin account and triggers the invite.
- The user sets their password on the platform, not on the marketing site.

Your signup form collects an email; it does not create a login.

---

## 6. What tempo-web must never do

- **Write to Firestore directly.** Clinic data lives in a per-clinic database
  the marketing site has no business reaching. The contact form's `leads`
  collection is the only exception, and it already exists.
- **Choose the database or bucket name.** Send the label; the platform derives
  the rest. Two places deriving the same name is how they drift.
- **Assume the label is free** because `check-label` said so a minute ago.
  Provisioning re-checks and can still reject; handle it.
- **Store card details.** When real payment lands, that is the processor's job.

---

## 7. What the clinic gets on `ready`

An empty clinic with: settings, a starter service catalogue and starter
programmes; one Admin (them); a licence; no clients, no staff, no data.

**Not** included, and worth saying on the "you're all set" screen:

- **Their logo.** Uploaded by us from the platform console, or by them once
  branding is self-serve.
- **Mira, the AI assistant.** Needs a per-clinic Anthropic key today. Either it
  is off at launch, or the platform moves to a shared key with per-tenant
  metering (the metering already exists). That is an open platform decision —
  do not promise Mira on the signup page until it is settled.
- **Push notifications.** Work per browser once someone grants permission.

---

## 8. Payment, when it stops being mocked

Mock now, but leave the seam in the right place: **provisioning is triggered by
a confirmed payment, server-side, not by the browser reaching a success page.**
A user who closes the tab after paying must still get their clinic.

With Stripe that means the webhook triggers provisioning and the success page
only polls status. If you wire the browser to trigger it, you will be debugging
missing clinics for paying customers.

`paymentRef` is the idempotency key. Webhooks retry; a retry must not create a
second clinic or a second charge.

---

## 9. Open questions — platform side, not yours

Listed so you know they are tracked and not forgotten:

- Trial before payment, or payment first? The licence system supports both — a
  `term` licence with a short expiry is a trial.
- Who signs the data processing agreement, and when? Each clinic is the data
  controller for children's clinical records and the platform is the processor.
  Self-serve means a click-through DPA at signup rather than one signed per
  clinic. **This is a launch blocker, not a nice-to-have** — get legal input
  before the flow goes live.
- What happens at the end of a term licence: read-only (what the rules do today),
  a grace period (14 days today), then what?
- Refunds and deletion. A clinic that cancels has a database and a bucket of
  clinical records. Retention is a legal question, not a technical one.

---

## 10. Where the truth lives

- Onboarding steps, in order, with the failure modes: `documentation/new-tenant-runbook.md`
- Label to database/bucket derivation: `src/lib/tenant.ts`
- Tenancy design: `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`
- The roadmap this handover belongs to: `docs/superpowers/specs/2026-08-22-self-onboarding-roadmap.md`

If anything here disagrees with the code, the code is right and this document is
stale — say so and it gets fixed.
