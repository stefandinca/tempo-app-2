# Handover: clinic signup on `tempo-web`

**For:** whoever builds the signup and payment flow in the `tempo-web` repo.
**Written:** 22 Aug 2026, against the platform as it actually runs today.
**Revised:** 22 Aug 2026 — twice. The Stripe revision, then the commerce
revision. Read the changelog below before re-reading the rest.

**Revision 3 in one line: `checkout-session` and its confirm endpoint are LIVE.
Stop mocking them.** They need a bearer token — see §3.

This describes the contract between the marketing site and the platform. It is
written so the signup flow can be built and finished **before** the platform's
provisioning endpoint exists — mock the calls described in §3 and everything
else here is already true.

### What changed in this revision

| | Then | Now |
|---|---|---|
| Stripe webhook | "the platform will run one" | **Live and verified.** Signature-checked, idempotent, handling five events (§8) |
| Payment confirmation | shape sketched | **The record is real** — `signups/{signupRef}`, written by the webhook, field-by-field in §8 |
| The confirm call | keyed by `sessionId` | **keyed by `signupRef`** — you already hold it, and it is the one id that survives a retry (§3) |
| `checkout-session` body | `tier`, `signupRef`, `adminEmail` | **Carries the whole signup** — §2's fields plus `label` and the DPA acceptance. The platform writes the record; you stop writing Firestore (§3) |
| Mira on the pricing page | "do not promise it" | **Settled** — shared key, and `miraEnabled` per tier says who gets it. Starter does not (§3a, §7) |
| Provisioning | "one step needs a Cloud Functions deploy" | **No longer true** — the per-clinic triggers are gone (§4) |
| `checkout-session` + confirm | "not landing this week" | **Live now.** Both verified in production against real Stripe (§3) |
| Calling them | unspecified | **`Authorization: Bearer <token>`, server-side only** (§3) |
| `provision/clinic` | mocked | **Built.** Five of seven steps verified against a real clinic; `hostname` and `admin` await a Vercel token (§4) |

Everything else stands.

---

## 1. What you are building

A visitor at `tempoapp.ro` should be able to: choose a plan, **enter a card**,
name their clinic, and end up signed in at `<label>.tempoapp.ro` with a working,
empty clinic and themselves as its Admin.

**Nothing is charged for 30 days.** The card is taken up front as the trial's
entry requirement — it is the most effective defence against subdomain
squatting, since every signup permanently consumes a database, a bucket, a
hostname and a label. So this is card-on-file-then-provision, not
pay-then-provision; an earlier draft described the latter and some of its
phrasing survived longer than it should have.

**Payment is real.** The whole commerce path now exists and runs in production:
you create a session, the visitor pays, Stripe's signed webhook tells the
platform, and you read the confirmation back. All three verified against real
Stripe — session creation, idempotent reuse, and the confirm endpoint, plus a
real signed test event through the webhook.

**Provisioning is built too**, and five of its seven steps are verified against
a real clinic that was created and inspected: database, rules, indexes, bucket,
seed, tenant registration and licence. `hostname` and `admin` wait on a Vercel
API token (§9) and have not run.

The one hop nobody has done yet is a human typing a card into the hosted page
and a clinic coming out the other end. That waits on those last two steps and on
test mode being finished (§9).

---

## 2. The six things you must collect

| Field | Constraint | Why it matters |
|---|---|---|
| `label` | `^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$` | Becomes the subdomain, the Firestore database, the Storage bucket and an env var name. **Permanent.** |
| `clinicName` | free text | Display name only. Changeable later. |
| `adminEmail` | a real mailbox | Becomes a platform-wide Firebase Auth account. |
| `adminName` | free text | Shown to the clinic's own staff and parents. |
| `plan` | `term` \| `lifetime` | Almost always `term`. **Send no duration** — provisioning applies the tier's `trialDays`. See §3a. |
| `tier` | one of the `id` values from the catalogue | What they chose. Send the `id`, never the display name — see §3a. |

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
3. **Not already taken.** Needs a platform call — see §3. "Taken" includes
   labels belonging to clinics that no longer exist: a label that ever held
   client records is retired permanently, because parents keep bookmarks and
   access codes travel by email, and reissuing one would point a parent at a
   different clinic's login page with their child's code in hand. Treat it as
   simply unavailable — **do not** add a helpful "this one was released" hint,
   because it never is.
4. **Nothing that reads as another organisation.** `nhs`, `mayo`, a competitor's
   name. Worth a manual review queue rather than a blocklist.

Say plainly on that screen that it cannot be changed. Show the resulting URL as
they type.

---

## 3. The calls you need from the platform

**All of them are deployed** — `check-label`, `checkout-session` and its confirm
endpoint, `provision/clinic` and its status endpoint. The Stripe webhook is live
too; you never call it, but you depend on what it writes (§8).

**Deployed is not the same as verified, and the difference is stated per
endpoint rather than rounded up.** `check-label`, both checkout endpoints and the
webhook have been exercised by real requests. `provision/clinic` has built a real
clinic through five of its seven steps; `hostname` and `admin` have never run,
because `hostname` needs a Vercel API token that is not yet set (§9). Do not
switch the provisioning group to live until that is closed — a customer who got
five steps in would have a database, a licence, and no way to log in.

### Calling the live endpoints

`check-label` is public. The other two are **not**, and take a bearer token:

```
Authorization: Bearer <PROVISION_API_TOKEN>
```

**Server-side only.** A token in client JavaScript is a public token with extra
steps, and these create Stripe objects and write records provisioning acts on.
The token is a shared secret rather than a Firebase credential because there is
no user yet — creating one is the *end* of this flow. What is being
authenticated is your server, not a person.

| Response | Meaning |
|---|---|
| `401 unauthorised` | Wrong or missing token |
| `503 not_configured` | The platform has no token set. Ours to fix, not yours — never rotate on this |

### `POST /api/provision/check-label` — **LIVE, stop mocking it**

```
https://superadmin.tempoapp.ro/api/provision/check-label/
```

Public, unauthenticated. Call it as the user types.

```json
{ "label": "clinicx" }
```

```json
{ "available": true }
{ "available": false, "reason": "taken" | "reserved" | "invalid" }
```

Verified in production: `aicaa` → taken, `brandnewclinic` → available, `www` →
reserved.

Three things about its behaviour that are deliberate:

- **It shares its validation with the runtime.** The same `labelProblem()` that
  answers here is what `resolveDatabaseId()` gates on, so this endpoint and
  provisioning cannot disagree — which is the ordering problem you raised in A6,
  closed rather than promised.
- **It fails closed.** If the registry cannot be read it returns `503`, not
  `available: true`. Treat a 503 as "try again", never as free.
- **Never cache it.** A label goes from free to taken the moment somebody else
  provisions one, and the response is sent `no-store`.

Answering A6 directly: **retired labels are already handled.** Any existing
tenant document counts as taken, tombstones included, so a reissued subdomain
cannot slip through the pre-check and be rejected after the card is taken. No
tombstones exist yet, because no clinic has ever been offboarded.

### `POST /api/provision/clinic`

Called once checkout is **confirmed server-side** — never from the return URL
alone, which can be visited without paying. Idempotent on `signupRef`.

```json
{
  "label": "clinicx",
  "clinicName": "Clinic X",
  "adminEmail": "owner@clinicx.ro",
  "adminName": "Maria Ionescu",
  "plan": "term",
  "tier": "professional",
  "signupRef": "sg_<uuid you generate before checkout>",
  "dpa": { "version": "1.0", "acceptedAt": "2026-08-22T09:14:00.000Z" }
}
```

**Yes, this repeats most of the `checkout-session` body, and that is deliberate.**
The two are not the same statement. `checkout-session` records what was *sold*,
frozen at the moment money was committed. This one is the instruction to *build*,
and it is authoritative at build time — which is exactly what makes the recovery
path below work: a label rejected by provisioning can be replaced on the retry
without touching the sale, the subscription, or the record of what they bought.
If provisioning simply re-read the signup record, a bad label would be permanent.

### Nothing rolls back, and a retry never restarts

Worth stating plainly, because the instinct on seeing a half-built clinic is to
clean it up, and that instinct is wrong here.

**A failed provision leaves what it built.** Every step checks whether its work
is already done and returns quietly if so, so a retry walks the completed steps
in milliseconds and does real work only where it stopped. Measured: a first
attempt is around three minutes, dominated by database creation; a retry that
resumes at the last step is seconds.

**The slot is never consumed twice.** A new attempt compares the existing tenant
record's `signupRef` against the one you send. Same signup, same clinic, no
second database. A different signup asking for a taken label gets `label_taken`.

**Why not roll back, given a database is a permanently consumed slot out of
100.** Deleting a database to tidy up a failed provision would mean the
provisioning service holds delete-a-database power permanently, exercised only
in an error path — by definition the least-tested code there is. Its role
deliberately excludes `databases.delete`. A half-built clinic is inert: without
the `admin` step nobody can log in. So the cost of leaving it is one slot until
a retry claims it, and the cost of the alternative is a delete primitive living
in an error handler. That is "halt loudly" rather than "roll back", and the
loudness is the recorded status and step, not a cleanup.

**What that means for your screens.** On `recovery: 'support'` after a partial
build, say the clinic was created and is being finished — not that nothing
happened. The customer's next move otherwise is to sign up again, hit
`label_taken` on their *own* subdomain, and be baffled. And never offer
`new_label` after a partial build: relabelling once `register` has landed
orphans a fully-built clinic on the old subdomain, consuming a slot nothing
reclaims automatically.

**Idempotency: only success is sticky.**

| Previous outcome for this `signupRef` | Behaviour |
|---|---|
| Succeeded | Returns the same clinic. Inputs ignored. |
| Failed | May be retried, **including with a different label**. |
| In flight | Returns the in-flight `provisionId`. Poll it. |

That middle row is the recovery path when a label is rejected after the card has
been taken: they pick another and you retry under the same key. No second card,
no second signup.

`signupRef` is yours, generated at the start of signup — not the Stripe
subscription id, which does not exist until checkout completes and so cannot key
a retry of a failed provision. It was called `paymentRef` in an earlier draft,
which implied a completed charge; nothing is charged for 30 days.

`dpa` is the click-through acceptance, copied onto the tenant because the
controller relationship lives there. **Version and timestamp only** — an IP
address would be personal data needing its own lawful basis, collected to prove
compliance.

```json
{ "status": "accepted", "provisionId": "prov_abc123" }
```

`tier` is the catalogue `id` the visitor picked — `starter`, `professional`,
`clinic` or `enterprise` — not the label they saw. The platform validates it
against the catalogue and rejects anything else, so a renamed tier cannot break
provisioning and a hand-crafted request cannot invent a plan.

**When real payment lands, stop sending it.** The tier should be derived
server-side from the price the customer actually paid, because that is the only
version of "what they bought" that cannot disagree with the invoice. Sending it
from the browser is a stopgap for the mocked-payment phase, and it is worth
deleting the moment it stops being needed.

That derivation now exists — the webhook resolves the tier from the
subscription's Stripe price (§8) — so this field is on its way out. Keep sending
it while payment is mocked; expect a later revision to drop it from this body.

### `GET /api/provision/clinic/{provisionId}`

```json
{
  "status": "provisioning" | "ready" | "failed",
  "step": "database" | "rules" | "bucket" | "seed" | "register" | "hostname" | "admin",
  "url": "https://clinicx.tempoapp.ro",
  "trialEndsAt": "2026-09-21T00:00:00.000Z",
  "errorCode": null,
  "recovery": null,
  "error": null
}
```

### Failing usefully — branch on `recovery`, not on prose

A `failed` response carries two machine-readable fields. **Branch on `recovery`**;
`errorCode` is for logs, support and anything you want to word specially.

| `recovery` | What it means | What to offer |
|---|---|---|
| `new_label` | The subdomain is the problem and only the subdomain | The address picker, then retry with the **same** `signupRef` |
| `retry` | Transient — a timeout, a rate limit, a Google hiccup | A retry button with the same inputs |
| `support` | We cannot fix this from a form | The support contact and the `provisionId` |

`errorCode` values today: `label_taken`, `label_invalid`, `quota_exhausted`,
`payment_unconfirmed`, `internal`. That list will grow.

```json
{
  "status": "failed",
  "step": "register",
  "errorCode": "label_taken",
  "recovery": "new_label",
  "error": "clinicx was claimed while you were signing up."
}
```

**Treat an unrecognised `recovery`, or a missing one, as `support`.** That is the
opposite of the workaround currently in place, and deliberately so: offering the
address picker for a failure the address did not cause asks a paying customer to
change something that was never wrong, three times, and then still fails.
`support` is honest about not knowing. New codes will keep arriving; a default
that guesses will keep mis-routing them.

Worth knowing about one of them: **`quota_exhausted` is our problem, not the
customer's.** There is a hard ceiling of 100 Firestore databases per project and
every clinic consumes one, so this means we have run out of room. It is
`support`, and it should page us rather than merely apologising.

`trialEndsAt` is `null` until the licence exists and populated by the time
`status` is `ready`. Show it from here rather than computing `now + trialDays`:
provisioning takes minutes, so the two clocks are not the same clock, and the
licence is the one the app enforces.

### `POST /api/provision/checkout-session` — **LIVE, stop mocking it**

```
https://superadmin.tempoapp.ro/api/provision/checkout-session/
```

**The platform owns Stripe** — `tempo-web` holds no Stripe key and runs no
webhook. The subscription *is* the licence, and splitting licence state across a
repo boundary would put two copies of it a missed webhook apart.

```json
{ "signupRef": "sg_...", "tier": "professional", "label": "sunrise",
  "clinicName": "Sunrise ABA", "adminEmail": "...", "adminName": "...",
  "plan": "term",
  "dpa": { "version": "1.0", "acceptedAt": "2026-08-22T14:05:00.000Z" },
  "successUrl": "...", "cancelUrl": "..." }
→ { "sessionUrl": "https://checkout.stripe.com/...", "sessionId": "cs_..." }
```

**This body carries the whole signup, not just the payment.** It is everything
from §2 plus the DPA acceptance. The platform writes it to `signups/{signupRef}`
when it creates the session, and the webhook later merges the payment trail into
that same document (§8). One key, one record, one writer.

That last part matters: **`tempo-web` never writes this record itself.** §6 says
the marketing site does not write Firestore, and a signup draft is not an
exception — a prospective clinic has no database of its own yet, and putting it
in some existing clinic's database means a real tenant holding a stranger's
email and DPA acceptance. The absence of a correct database to write it to is
the signal that the write belongs on this side of the boundary. Keeping a funnel
record in your *own* storage is entirely your call and needs no permission.

**`label` is required.** The platform puts `signupRef` on the session as
`client_reference_id`, and `tier` + `label` into its metadata — that is the only
channel by which they reach the webhook. A session created without a label
produces a confirmed payment that nobody can match to a subdomain.

Only those three go to Stripe. The clinic details and the DPA acceptance stay
here: Stripe metadata is capped at 500 characters per value, and neither is
Stripe's business.

**Retrying is safe, and returns the same session.** Call it twice with one
`signupRef` and the second response carries `"reused": true` with the original
`sessionId` — a visitor who reloads has not changed their mind, and a second
session is how one signup becomes two subscriptions. Once payment is confirmed
the endpoint refuses with `409 already_confirmed` rather than opening another.

**`"mode": "test"` runs the whole thing on a test card.** Optional, defaults to
live. Only a token holder can ask for it, so it is not an abuse surface. It
needs `STRIPE_SECRET_KEY_TEST` on our side, which is still outstanding (§9) —
until then it returns `503 price_unavailable`, verified rather than assumed. No
record is written on that path, so a failed test-mode call leaves nothing behind
to clean up.

**What the session is created with**, so you do not have to guess: subscription
mode, `trial_period_days` from the tier's `trialDays`, `payment_method_collection:
always` (a card even though the trial charges nothing — the whole anti-squatting
argument rests on it), `locale: ro`, and Stripe's default 24-hour expiry.

| Error | Status | What it means |
|---|---|---|
| `invalid_signup_ref` | 400 | Not `[A-Za-z0-9_-]{8,64}` |
| `invalid_tier` | 400 | Not one of the four catalogue ids |
| `invalid_label` | 400 | Malformed or reserved — same rule as `check-label` |
| `invalid_email`, `invalid_clinic_name`, `invalid_admin_name`, `invalid_plan` | 400 | Missing or empty |
| `dpa_required` | 400 | `version` and `acceptedAt` are both required |
| `invalid_return_url` | 400 | Not an allowed origin — see below |
| `tier_not_purchasable` | 400 | The tier has no `stripePriceId`. Enterprise, or a half-configured tier |
| `already_confirmed` | 409 | This signup is paid. Do not open another session |
| `stripe_error` | 502 | Stripe refused. Retry is reasonable |
| `price_unavailable` | 503 | Configured price is missing at Stripe. Ours to fix |

**Return URLs are matched by origin**, not prefix: `https://tempoapp.ro` and
`https://www.tempoapp.ro`, extendable for local development via an environment
variable on our side — ask and it is one line. A prefix check would also accept
`https://tempoapp.ro.evil.com`, and an open redirect on a checkout flow is worth
more to a phisher than most bugs, because the victim is already expecting to
type card details on a page we sent them to.

```
GET /api/provision/checkout-session/{signupRef}
→ { "confirmed": true, "subscriptionId": "sub_...", "customerId": "cus_...",
    "tier": "professional", "label": "sunrise", "provisioned": false }
```

**Keyed by `signupRef`, not `sessionId`** — changed in this revision. You
generate `signupRef` before checkout and hold it across the whole flow,
including a retry after a session you never saw complete. The webhook writes its
record under that key too (§8), so one id addresses the sale from both ends. The
sessionId only exists once the POST returns, which is exactly the moment a
crashed tab loses it.

The POST returns a **session**, not a subscription: Stripe creates the
subscription when the session completes, so there is nothing to hand back yet.
The subscription id appears on the GET once `confirmed`.

Before `confirmed` is true, expect `{ "confirmed": false }` and keep polling —
same reasoning and same shape as provisioning status in §4. A completed payment
whose webhook has not landed yet is normal and usually sub-second, but it is
never instantaneous.

**`404 not_found` is a different answer from `confirmed: false`, and the
difference matters.** `confirmed: false` means we have a signup and are waiting
for Stripe — keep polling. `404` means we have never seen this `signupRef`, so
the create call never succeeded and polling will never resolve. Start over.

`successUrl` and `cancelUrl` are validated against an allowlist of tempoapp.ro
paths, so do not send a dynamic one. An open redirect on a checkout flow is
worth more to a phisher than most bugs.

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
also served from `https://superadmin.tempoapp.ro/api/platform/tiers/` — with the
trailing slash, it 308s without one — if the REST shape is inconvenient.

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
| `miraEnabled` | Whether the tier includes Mira, the AI assistant. **Enforced**, unlike `features[]` |
| `stripePriceId` | Platform internals. Never render it; empty means not purchasable |

Today that reads: starter 49 EUR (1 user, 30 clients, **no Mira**), professional
99 (5, 100, Mira, popular), clinic 179 (20, unlimited, Mira), enterprise on
request. All three paid tiers carry a 30-day trial.

**`miraEnabled` is the one capability flag that bites.** The bullets in
`features[]` sell but enforce nothing; this one is checked server-side before
any clinic data reaches Anthropic, so a Starter clinic clicking Mira gets a
refusal rather than a consent prompt.

**Which of the two is the source of the AI bullet's text?** `features[]`.
An earlier version of this paragraph said "render the AI bullet from
`miraEnabled`, not from a hardcoded list", which was meant as *do not hardcode
the bullets in markup* and read as *derive the text from the boolean*. To be
unambiguous:

- `features[]` is **copy** — bilingual, human-edited, rendered verbatim.
- `miraEnabled` is **enforcement** — a boolean the server checks. It is not a
  source of wording.

They can drift, because a person editing the console can change one and not the
other. A build-time assertion on your side is worth keeping as a canary, but be
clear about its reach: the catalogue is edited at runtime, so a check that runs
when you build catches only the drift that already existed. The real guard
belongs in the console, where the edit happens, and that is the platform's to
add.

`stripePriceId` is the single test for whether a tier is **purchasable**. Not
`monthlyEur`, not `trialDays` — neither of those can produce a checkout session.
When they disagree, the price id wins and the tier renders as "on request".

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
record, and loses nothing. **An expiry never deletes anything.** Deletion is a
separate schedule with its own notices — see §8a — and it never follows from a
licence lapsing on its own.

**A card is taken up front.** It is the single most effective defence against
subdomain squatting — every signup permanently consumes a database, a bucket, a
hostname and a label, and people who will not enter card details do not take
those. It is also ordinary practice, not a hostile one.

### The three ways a trial ends — they are not the same

Taking a card means day 30 has three outcomes, and the platform treats them
differently:

| Outcome | What happens | Grace |
|---|---|---|
| Card charges | Converts to a paid subscription. No interruption at all. | n/a |
| Cancelled before day 30 | Read-only on day 30. They chose this. | **None** |
| Card declines | Read-only, but this is the case grace exists for. | **14 days** |

Grace is not a property of the plan — it is an apology for an administrative
gap, and only the declined card is one. A customer who still wants the service
and whose bank blocked a foreign charge should not lose access over a weekend.
Someone who cancelled made a decision, and extending it would be ignoring them.

**This is why the platform needs to be told which happened.** From the clinic's
side a cancellation and a decline look identical — the licence simply expired.
The licence record carries an `endReason` (`trial_ended`, `cancelled`,
`payment_failed`) that decides the grace and lets the clinic's own banner say
*"your card was declined"* rather than *"your trial ended"*. Those need
different words and lead to different buttons.

**Whichever webhook learns the outcome must set it.** It cannot be inferred
afterwards from a record where the two look the same.

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
hostname and issuing a TLS certificate. **Minutes, not milliseconds.**

An earlier draft said one step still needed a deploy of the platform's Cloud
Functions. **That is no longer true** — the per-clinic Firestore triggers were
removed on 22 Aug and `functions/src/index.ts` now has zero per-clinic
registrations, which is what made self-serve provisioning possible at all. The
remaining minutes are Google's and Vercel's, not a human's.

So the flow after payment is:

1. Take payment.
2. `POST /api/provision/clinic` → `provisionId`.
3. Show a "setting up your clinic" screen and poll the status endpoint.
4. On `ready`, send them to `https://<label>.tempoapp.ro` — and **also email the
   link**, because people close tabs.
5. On `failed`, do not ask them to sign up again. Retry under the same
   `signupRef` — a failed provision is not sticky, and a rejected label can be
   replaced on the retry (see §3). A fresh signup would create a second
   subscription and burn a second label. If the retry also fails, show a support
   contact and the `provisionId`.

Do not redirect optimistically before `ready`. The hostname does not serve a
certificate until it is attached, and the browser shows a TLS handshake failure,
which looks like the product is broken rather than still building.

---

## 5. Authentication — do not build your own

The platform runs **one Firebase Auth pool** shared by every clinic. One person,
one account, one password, possibly staff at several clinics.

- `tempo-web` must **not** create Firebase Auth accounts, and must not hold
  credentials that reach Firebase Auth or any clinic database.
  It does already hold a service account for `api/lead.js`, IAM-conditioned to
  the `clinic-demo` database alone so the contact form can write `leads`. That
  is fine and predates this work — an earlier draft said "no Firebase
  credentials" flatly, which read as though that code were a violation and
  invited someone to "fix" it. The rule is about Auth and clinic data, not about
  Firebase.
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
- **Mira, the AI assistant — settled since the first draft, which said not to
  promise it.** You may now promise it, to the tiers that have it. The platform
  uses one shared Anthropic key with per-tenant metering, and access is gated on
  the tier's `miraEnabled` (§3a): Starter no, everything above yes. The gate is
  server-side and runs before consent, so a Starter clinic is refused rather
  than sent to a consent toggle that would not help. The clinic still has to
  accept the AI consent notice once before anything is sent.
- **Push notifications.** Work per browser once someone grants permission.

---

## 8. Payment — all of it is live

Nothing here is mocked any more. This section describes what actually runs, so
build against it rather than a guess.

**Provisioning is triggered by a confirmed payment, server-side, not by the
browser reaching a success page.** A user who closes the tab after paying must
still get their clinic. Your success page confirms server-side and polls; it
never triggers provisioning from the browser, and it never trusts the return
URL, which can be visited without paying — that is the whole reason the webhook
exists.

**The platform runs that webhook, not you.** `tempo-web` holds no Stripe key and
receives no Stripe traffic. Splitting licence state across a repo boundary would
put two copies of it one missed webhook apart.

### What it records, and what you will read

On `checkout.session.completed` the webhook **merges** the payment trail into
`signups/{signupRef}` in the platform's control plane — the document
`checkout-session` already created from your signup body (§3). A merge, not a
create, so the clinic details captured before checkout survive it:

| Field | From | Note |
|---|---|---|
| `signupRef` | `client_reference_id` | The key. Missing = the sale is recorded but not actionable |
| `stripeSessionId` | the session | |
| `stripeSubscriptionId` | the session | `null` until Stripe creates it |
| `stripeCustomerId` | the session | |
| `adminEmail` | `customer_details.email` | Who becomes Admin |
| `tier` / `label` | session **metadata** | Which is why §3 now requires `label` |
| `confirmedAt` | server time | |
| `provisioned` | always `false` here | Flipped by `/api/provision/clinic`, which does not exist yet |

The document is **closed to anonymous reads** — Firestore rules deny `signups`
outright, unlike the pricing catalogue. You reach it only through the confirm
endpoint in §3. That is deliberate: it holds an email address and a payment
trail, and `signupRef` would otherwise be a guessable key to someone else's.

### Properties you can rely on

- **Verified before believed.** The raw body is checked against the
  `Stripe-Signature` header. An unverified payload is refused with 400 and never
  parsed for meaning. Confirmed live: a forged request gets 400.
- **Duplicates are survivable.** Stripe delivers at-least-once by design. Every
  event id is claimed in `stripe_events` with a create-if-absent write *before*
  it is handled, so a redelivery does nothing. `signupRef` is the idempotency
  key on your side for the same reason — a retry must never produce a second
  clinic or a second subscription.
- **Five events are handled**, everything else is recorded and ignored:
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_succeeded`,
  `invoice.payment_failed`. The last is the one the 14-day grace exists for.
- **Test and live run at the same URL simultaneously.** One Vercel project
  serves both, so the endpoint verifies against whichever configured secret
  matches and uses the matching mode's key. Practically: platform-side testing
  cannot disarm live payments, and neither of us has to swap secrets.
- **What the subscription says wins.** The tier is resolved from the
  subscription's Stripe price, not from what the browser sent, because the price
  is the only version of "what did they buy?" that cannot disagree with the
  invoice. An unrecognised price resolves to *nothing* rather than a default —
  the platform refuses to guess a plan.

---

## 8a. What the site has to say, not just do

Two of these are legal text, not UI, and they are easy to leave until launch
week when they are the slowest thing to get right.

- **Retention, on the Privacy page.** An unused trial is deleted 60 days after
  it lapses, or 30 if nobody ever signed in. A clinic that entered real client
  records is never deleted unilaterally — they choose return or deletion, with
  notices at 30/60/80 days and deletion at 90 unless they say otherwise. And
  "deleted" means deleted from the live systems; backups roll off on their own
  schedule, which the text should name rather than imply is instant.
- **The subdomain is permanent, in the Terms.** Not just a hint on the form.
  It cannot be renamed, and a subdomain that ever held client records is
  retired for good rather than reissued — see §2.
- **The trial terms.** 30 days, card taken up front, what happens on each of
  the three endings above. If the page says "cancel any time" it should also
  say that cancelling means read-only at the period end, not deletion.

The site already links *Confidențialitate* and *Termeni și Condiții*; these
belong there rather than in a modal nobody reads.

---

## 9. Open questions — platform side, not yours

Listed so you know they are tracked and not forgotten:

- Who signs the data processing agreement, and when? Each clinic is the data
  controller for children's clinical records and the platform is the processor.
  Self-serve means a click-through DPA at signup rather than one signed per
  clinic. **This is a launch blocker, not a nice-to-have** — get legal input
  before the flow goes live. You send `dpa: { version, acceptedAt }`; what that
  version *says* is the open part.
- Refunds. Deletion and retention are answered in §8a; refunds are not, and they
  interact with a card taken 30 days before the first charge.
- **The database ceiling is 100 per project, 5 used.** Not a question — a number
  worth knowing, because it is the hard cap on self-serve signups and every
  squat consumes one until it is offboarded.
- **`VERCEL_API_TOKEN` is not set**, so provisioning stops at `hostname` — the
  step that attaches the clinic's subdomain to the Vercel project and triggers
  its TLS certificate. Everything before it works; nothing after it has run.
  This is the single thing standing between a paid signup and a working clinic.
- **Test mode is one env var short.** Test Products and Prices now exist,
  mirroring live and stamped with the tier, so `"mode": "test"` is wired all the
  way through — it just needs `STRIPE_SECRET_KEY_TEST` set on our side. Until
  then that flag returns 500. Nobody should plan a demo on a test card until
  this is done, and it will be done before launch: the first card through this
  flow should not be a real customer's, on something that consumes a permanent
  database slot on success.

Answered since the first draft and removed from this list: trial-before-payment
(§3a), what happens when a term licence ends (§3a and §8a together), and whether
Mira can be advertised (§3a and §7 — yes, per tier).

---

## 10. Where the truth lives

- Onboarding steps, in order, with the failure modes: `documentation/new-tenant-runbook.md`
- Label to database/bucket derivation: `src/lib/tenant.ts`
- The webhook, and why each property is there: `src/app/api/stripe/webhook/route.ts`
- Tiers, limits, trials, grace periods, price-to-tier: `src/lib/platform/licence.ts`
  (imports nothing, so `npm run test:licence` exercises it directly — 112 assertions)
- Tenancy design: `docs/superpowers/specs/2026-08-19-multi-database-tenancy-design.md`
- The roadmap this handover belongs to: `docs/superpowers/specs/2026-08-22-self-onboarding-roadmap.md`

If anything here disagrees with the code, the code is right and this document is
stale — say so and it gets fixed.
