# Questions for the platform, from the tempo-web signup build

**From:** whoever is building clinic signup in `tempo-web`
**Against:** `docs/tempo-web-handover.md` as of 22 Aug 2026, and the design in
`docs/superpowers/specs/2026-08-22-clinic-signup-design.md`

The handover is good and most of it needs nothing. These are the places where
building against it means guessing, plus a few corrections that need no reply.

Nothing here blocks scaffolding — every platform call is mocked behind one
module. What they block is the mock being the *right shape*, so the swap to real
calls is a base URL rather than a rewrite.

---

## A. These decide the shape of the code

### A1. Who owns the Stripe account?

The largest one. It decides three things at once: whether `tempo-web` holds a
Stripe key, who creates the Checkout session, and whether `tier` is sent in the
provisioning payload or derived from the price paid.

**The tempo-web design assumes the platform owns it,** for one reason: the
subscription *is* the licence. `trialing`, `active`, `past_due` and `canceled`
map one-to-one onto licence states the platform already owns and enforces.
Owning Stripe in the marketing site would put licence state there and relay it
across a repo boundary on every webhook. It also keeps `tempo-web` clear of
handover §5 and §6, and cancellation and card updates have to live in-app
anyway, where the user is authenticated.

But handover §8 still reads as though tempo-web runs the webhook — that section
was written for the pay-first flow, and may just be stale.

**Confirm or push back.** If the platform owns it, A2 follows. If tempo-web
owns it, say so and we will scope the key handling and PCI surface here instead.

### A2. If the platform owns Stripe: the Checkout session contract

Assuming A1 lands platform-side, we need one more endpoint. Proposed shape, tell
us what is wrong with it:

```
POST /api/provision/checkout-session
{ "tier": "professional", "signupRef": "sg_...", "adminEmail": "...",
  "successUrl": "...", "cancelUrl": "..." }
→ { "sessionUrl": "https://checkout.stripe.com/...", "subscriptionId": "sub_..." }

GET /api/provision/checkout-session/{id}
→ { "confirmed": true, "subscriptionId": "sub_...", "tier": "professional" }
```

The `GET` matters: **we will not trust the Stripe return URL.** A return URL is
just a URL and can be visited directly without paying, so the return handler
confirms server-side before it calls provisioning. If the platform's webhook is
the only confirmation path, say so and we will poll for the resulting state
instead.

### A3. Does provisioning apply `trialDays`, or must we send a duration?

Handover §2 says `plan: term` "defaults to 12 months". §3a says every paid tier
carries `trialDays: 30`. The provisioning payload has no duration field.

**If provisioning defaults to 12 months and nothing carries the trial length, a
trial signup silently gets a free year.**

Which is it: does provisioning look up `trialDays` from `tier`, or should we
send an explicit `termDays`? Either is fine; we need to know which.

### A4. What is the idempotency key when nothing has been charged?

`paymentRef` is specified as required and as the key. With a card on file and
nothing charged for 30 days, there is no payment id at provisioning time.

The Stripe subscription id looks like the natural key — stable, present from the
moment the trialing subscription exists, one per clinic. Is that right? And is
the field being renamed to something like `requestRef`, so it stops implying a
completed payment?

**What should we send today, while payment is mocked?**

### A5. Can a failed provision be retried with a *different* label?

Handover §3 says the call is idempotent on `paymentRef`: "if you retry, you get
the same clinic back rather than a second one." But a **failed** attempt produced
no clinic.

This matters because of the ordering. The card is taken at step 4 and
provisioning runs after it, so a label rejected at provisioning is a rejection
*after* the customer has handed over a card. Handover §4 rightly says not to
make them sign up again — that would burn a second label and a second card.

So the recovery is: let them pick a new label and retry under the same key.
**Does that work, or does the idempotency layer return the original failure?**
If it cannot, we need a different answer for that branch and would like your
suggestion.

### A6. Does `check-label` already know about retired labels?

Handover §2 now says "taken" includes labels of clinics that no longer exist,
permanently, for the bookmark and access-code reason.

**Is that live in `check-label` today, or still to build?** If it is not, a
retired label passes the check and gets rejected at provisioning — which is the
A5 branch, after the card. Ordering makes this worse than it looks.

### A7. Where does the trial end date come from?

The "you're all set" screen wants to show when the trial ends. The status
endpoint returns `status`, `step`, `url` and `error` — no date.

We can compute `now + trialDays`, but the authoritative date is the licence's,
and provisioning takes minutes. **Can the status response include `trialEndsAt`
once the licence exists?** Otherwise the screen shows a date that can disagree
with the app.

---

## B. These block launch, not the build

### B1. What is the Firestore database ceiling on `tempo-app-2`?

Every clinic permanently consumes a database, a bucket, a hostname and a label.
**That ceiling is the hard cap on self-serve signups** and should be a known
number before the flow goes live rather than discovered at it.

`tempo-app-2` holds 5 databases today. We could not read the quota — the Cloud
Quotas API is not enabled on the project:

```
gcloud services enable cloudquotas.googleapis.com --project tempo-app-2
```

If it is low, it changes the launch plan, not the code.

### B2. Confirm the lifecycle emails are yours and are planned

Nothing in tempo-web can send these, because the platform holds both the licence
and the subscription — and nothing in tempo-web's design will surface their
absence, which is why they are named here:

- trial ending, before day 30
- card declined, during the 14-day grace
- the retention notices at 30, 60 and 80 days

The first is the single biggest lever on trial conversion.

### B3. Is the Starter bullet in the catalogue intentional?

`platform_tiers/catalogue` gives Starter the bullet **"Toate evaluările
incluse"**. The live site says **"Programe terapeutice nelimitate"**. Every other
price, limit and bullet matches exactly — this is the only divergence.

The catalogue wins the moment tempo-web renders from it, so this ships silently
unless someone decides otherwise.

Flagging it rather than just changing it because tempoapp.ro removed claims
about assessment protocols the product holds no licence for, and a blanket "all
evaluations included" sits close to that line. `tempo-web`'s build-time copy
check will start scanning catalogue strings for exactly those terms, so this is
also a heads-up that **a tier edit in the console can fail a tempo-web build**.

### B4. Should the DPA consent record live on the tenant?

tempo-web records `{ version, acceptedAt }` against the signup when the
click-through DPA is accepted. But the controller relationship lives on the
tenant, not on a marketing-site record.

**Do you want it copied onto the tenant at provisioning?** If so, add it to the
payload. Deliberately no IP address — a version and a timestamp make it
evidence; an IP adds personal data that would then need justifying.

---

## C. Corrections — no reply needed, just fixes to the handover

1. **§5 says tempo-web "must not hold Firebase credentials for `tempo-app-2`".**
   `api/lead.js` does, and has since before this work: a service account
   IAM-conditioned to the `clinic-demo` database alone, used to write the
   contact form's `leads`. Read as intended — no Auth credentials, no reach into
   clinic databases — there is no conflict. But the sentence as written says
   otherwise, and someone will eventually "fix" the code to match it. Worth
   narrowing to name Auth and clinic databases. *(Raised twice now.)*

2. **§1, §4 and §8 still describe pay-then-provision.** The shape is now
   card-on-file-then-provision with nothing charged for 30 days. §4's "They have
   paid; a second signup would take a second payment" is the one most likely to
   mislead.

3. **§9 still lists "trial before payment, or payment first?" as open.** §3a
   answers it. Same for "what happens at the end of a term licence", which §3a
   and §8a now answer together.

4. **§3a's "Nothing is deleted, ever, by an expiry" reads as absolute** and sits
   a few paragraphs from §8a's deletion schedule. Both are true — expiry does not
   delete, retention does — but one clause saying so would stop them looking
   like a contradiction.

5. **§3's heading still says "The one call you need from the platform"** while
   describing three endpoints, a fourth source in §3a, and a fifth if A1 lands
   platform-side.

6. **The closing line was deleted in the latest revision:** *"If anything here
   disagrees with the code, the code is right and this document is stale — say
   so and it gets fixed."* That sentence is what makes the document safe to
   correct against reality. Looks accidental; worth restoring.

---

## What we verified rather than assumed

So you know which claims have been checked from this side:

- `platform_tiers/catalogue` returns **200 anonymously**; `documents/tenants` on
  the same database returns **403**. The world-readable boundary holds.
- The JSON mirror at `superadmin.tempoapp.ro/api/platform/tiers` **308s without
  a trailing slash**. Worth adding the slash in §3a.
- The catalogue matches the live site on all four prices, all limits, and 11 of
  12 bullets. The twelfth is B3.
