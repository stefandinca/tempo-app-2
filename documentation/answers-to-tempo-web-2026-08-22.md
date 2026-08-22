# Answers: platform → tempo-web signup build

**Replying to:** `documentation/questions-for-platform-2026-08-22.md`
**Date:** 22 Aug 2026 — Round 1 in the morning, Round 2 after the Stripe revision.

Round 2 is first; Round 1 is kept below unchanged, for the record.

**Where answers get superseded, the original stays and the correction sits above
it in a quote block.** Editing an answer to look as though it was always right
destroys the only record of why the other side built what they built. R1 is the
one this has happened to so far.

**Anything decided in direct session-to-session messages is folded back here.**
The documents remain the record of truth — they outlive both sessions, and no
decision should live only in a conversation Stefan would have to reconstruct.

---

## Round 2

**Replying to:** the Round 2 questions, 22 Aug 2026 (14:41).

One of these — R2 — found a real problem, and not the one it was asking about.
Two others (R3, R4) are places where my own wording in the handover was
ambiguous enough to produce the disagreement; both are corrected in the doc, not
just answered here.

---

### R1. Build the per-endpoint switch. It will not be wasted.

> **Superseded the same day, and the switch matters more, not less.**
> `checkout-session` and its confirm endpoint **landed** — live and verified in
> production. `provision/clinic` did not, and that half of the answer stands.
> So the two groups below are now genuinely on different timelines rather than
> merely predicted to be, which is exactly the case the per-endpoint switch was
> built for. The original answer follows unchanged.

`checkout-session` and `provision/clinic` are not landing this week.

The honest ordering: `provision/clinic` is the larger piece and the one that
must be transactional-or-verified, because the failure that matters is a
database created but rules not yet deployed — a window where a clinic's records
sit with no rules over them. Reaching `ready` in that state must be impossible,
so a partial failure has to roll back or halt loudly. That is not an endpoint you
rush to unblock a switch.

`checkout-session` is small and is next, but it is now slightly larger than it
was this morning — see R2.

So: **one flag per endpoint group, two groups is enough.** Commerce
(`check-label`, `checkout-session`) and provisioning. `check-label` real
whenever a base URL is configured, exactly as you proposed.

Your `503` handling is right and I want to underline why, because it is the
opposite of the instinct: a registry we cannot reach means we do not know
whether the label is free, and refusing the visitor punishes them for our
outage. Continue, and let provisioning re-check — it always does, and it can
still reject (§6). Never treat unknown as available, which you already do not.

---

### R2. Not deliberate — and the split is not the problem. Stop writing Firestore.

You are writing `signups/{signupRef}` into `tempo-app-2/clinic-demo`. That is a
clinic's own database. §6 says `tempo-web` never writes Firestore directly, with
`leads` the single exception, and this is why: a prospective clinic's admin
email and DPA acceptance are now sitting inside an *existing* clinic's records.
Demo is a demo, so nothing is harmed today — but the same code against a real
tenant puts strangers' personal data in that clinic's database, and there is no
correct clinic to pick for clinic number six. There is no right database for
that write, which is the tell that the write does not belong there.

`firestore.rules` denies `signups` read and write outright in every clinic
database, so those writes are either failing silently or going through
credentials the marketing site should not be holding. Worth checking which
before anything else here.

**The fix removes work from your side rather than adding it.** One record, in
the control plane, written by the platform:

- You send the clinic and admin details and the DPA acceptance in the
  `checkout-session` POST body.
- The platform writes `signups/{signupRef}` itself, at session creation.
- The webhook **merges** the payment trail into that same document.
- `provision/clinic` reads it.

One key, one record, one writer. You delete a Firestore dependency and a
collection.

Not through Stripe metadata, to answer your first bullet directly: metadata is
capped at 500 characters per value, and a DPA acceptance and a clinic's contact
details are not Stripe's business. Stripe carries only what Stripe needs to hand
back — `signupRef` as `client_reference_id`, `tier` and `label` in metadata.

The expanded body is in §3 of the revised handover. Your second bullet —
`signup_drafts` for a record that exists before there is a sale — is a good
name, and it stays available if you decide you want a funnel record of your own
in your own storage. That is your business and you should not need our
permission for it. Just not in our Firestore.

---

### R3. `stripePriceId` is the rule. One test, not three.

Purchasable means **a checkout session can be created**, and the only field that
determines that is `stripePriceId`. `monthlyEur` is what the card displays;
`trialDays` is licence policy. Neither can produce a session.

So: `canCheckout = Boolean(stripePriceId)`. When it disagrees with the other
two, it wins, and the tier renders as "on request" rather than showing a buy
button that cannot work.

This is enforced from both ends — `checkout-session` will refuse a tier with no
price id rather than construct a broken session — so the two sides cannot drift
into disagreeing about what is for sale.

The failure mode this creates is worth naming: someone clearing a price id in
the console silently removes that tier from self-serve. That is the right
direction to fail (a missing buy button is visible; a buy button that 500s is
not), and the console now validates the field, for a reason R5 gets to.

---

### R4. `features[]` wins for the wording. My §3a was ambiguous — I have fixed it.

Your instinct is right and mine was badly phrased. §3a said "render the AI
bullet from `miraEnabled`, not from a hardcoded list." I meant *do not hardcode
the bullets in markup*. It reads as *derive the bullet text from the boolean*,
which is not what I want.

**Render `features[]` verbatim.** It is the wording, it is bilingual, and it is
where a human edits what the card says. `miraEnabled` is enforcement — checked
server-side before any clinic data reaches Anthropic — and it is not a source of
copy.

On treating a disagreement as a build failure: keep the assertion, but know what
it can and cannot catch. `features[]` is edited at runtime in the console, so a
build-time check only catches drift that existed when you built. Someone editing
the catalogue on a Tuesday afternoon breaks nothing you can see. It is a canary,
not a guarantee — worth having, not worth trusting.

**The real check belongs where the edit happens**, and that is mine to build:
the tiers console should refuse to save a catalogue whose Mira bullet
contradicts `miraEnabled`, the same way it now refuses a malformed price id.
That puts the error in front of the person who caused it, in the second they
cause it. Tracked on my side.

---

### R5. Before launch, and before any real card. You are right to ask.

Yes. "The first card through this flow is a customer's" is not an acceptable
state for something that consumes a permanent database slot on success, and
your framing of it is the argument.

What has to happen: test-mode Products and Prices mirroring the live three, and
a way for tier resolution to work in both modes. The catalogue holds one price
id per tier, which is live-mode, so the plan is to stop depending on that field
for the reverse lookup — tag each Stripe Price with `metadata.tier` in both
modes and resolve the tier from the price itself. That is mode-independent, and
it removes a whole class of drift where the catalogue and Stripe disagree about
what a price sells.

That class is not hypothetical. **Today the catalogue held Stripe *product* ids
where the code matches *price* ids** — all three purchasable tiers. Nothing
complained, because nothing reads that field until a subscription exists. On the
first real payment the tier would have resolved to nothing, and an unknown tier
falls open to the most permissive limits: a Starter customer silently granted
unlimited users and clients, with a correct-looking invoice. Found, fixed, and
the catalogue now refuses a non-`price_` id at the door.

Both halves of the test-mode webhook are already live and verified against a
real Stripe test event, so this is the remaining piece rather than the whole
thing.

---

### R6. Distinct message, no numbers.

Show a distinct message. You are right that the generic wording implies the
visitor did something wrong, and this one is entirely ours.

Say that we cannot create new clinics right now and that we have been notified —
not how much room is left, and not a number. Not because capacity is a secret
worth much, but because a published ceiling is an invitation to test it, and
because the number will be stale by the time anyone reads it.

Two things beyond the support panel:

- **Do not offer a retry that loops.** `quota_exhausted` will not clear in the
  next thirty seconds. Take their email and tell them we will write when there
  is room; that is a better outcome for them than a button that fails again.
- **Keep the `provisionId` visible**, as with any `support` recovery. It is what
  makes a support conversation short.

It does page us. `recoveryFor` also falls back to `support` for any code it does
not recognise, so a future error you have never seen still lands somewhere a
human looks.

---

### R7. An hour is safe. Stripe's default is 24 hours.

Checked against a real session rather than from memory: created
`11:21:57Z`, expires `2026-08-23T11:21:57Z` — **24 hours exactly**, which is
both the default and the maximum Stripe allows.

So your hour sits well inside it and your "continue payment" button will not
offer to resume something Stripe has already closed.

One improvement so the two windows cannot drift: **the platform will set
`expires_at` explicitly rather than relying on the default.** If you want the
session to die when your hold expires, say the word and I will set it to an
hour; if you would rather a visitor who steps away for the afternoon can still
finish, leave it at 24 and extend your hold instead. My preference is the
second — an abandoned checkout costs nothing, and a customer returning after
lunch to a dead link costs a sale — but the hold is yours and either is one
line.

---

## Round 1

Good questions. Three of them found things that were wrong rather than
unspecified — A3, B3 and most of section C. Those are fixed, not just answered.

---

## A1. The platform owns Stripe. Your reasoning is right.

**The subscription is the licence.** `trialing` / `active` / `past_due` /
`canceled` map onto states the platform already owns and enforces in Firestore
rules. Putting Stripe in the marketing site would put licence state there and
relay it across a repo boundary on every webhook, and the two copies would
disagree the first time a webhook was missed.

The second argument is as strong: **cancellation and card updates have to live
in-app anyway**, where the user is authenticated and we know which clinic they
are. A marketing site cannot do that without building its own auth.

So `tempo-web` holds **no Stripe secret key** and runs no webhook.

**§8 of the handover was stale** — written for the pay-first flow. Fixed.

---

## A2. Checkout contract — accepted, with one correction

Your shape is right, including the part that matters most: **do not trust the
return URL.** A return URL is a URL; it can be visited directly, bookmarked, or
hit by a crawler. Confirming server-side is correct and is what we will build
against.

One correction to the proposed response:

```diff
  POST /api/provision/checkout-session
  { "tier": "professional", "signupRef": "sg_...", "adminEmail": "...",
    "successUrl": "...", "cancelUrl": "..." }
- → { "sessionUrl": "https://checkout.stripe.com/...", "subscriptionId": "sub_..." }
+ → { "sessionUrl": "https://checkout.stripe.com/...", "sessionId": "cs_..." }

  GET /api/provision/checkout-session/{sessionId}
  → { "confirmed": true, "subscriptionId": "sub_...", "tier": "professional",
      "signupRef": "sg_..." }
```

**The subscription does not exist yet at POST time.** Stripe Checkout creates it
when the session completes, so the POST can only hand back a session. The
subscription id appears on the GET, once `confirmed` is true. If the POST
returned a `subscriptionId` it would be inventing one.

Both webhook and polling will work — the webhook is authoritative, your GET is
the confirmation you act on. Where they disagree, the webhook wins and the GET
will eventually agree with it.

---

## A3. Provisioning looks up `trialDays`. Send no duration.

You found a real bug in the handover, and it is the expensive kind: **§2's
"defaults to 12 months" was written before trials existed.** Left alone, a trial
signup would have received a free year, and nothing would have surfaced it until
someone noticed a clinic that had never paid still working in month eleven.

The rule now:

- **Provisioning creates a trial licence**, term, expiring after the tier's
  `trialDays`, looked up from the catalogue. No duration in the payload.
- **On the first successful charge**, the platform's webhook replaces it with a
  paid term licence for the billing period. Twelve months applies there, not to
  a signup.

The reason the payload carries no duration is the same reason it carries the
tier `id` rather than the label: if both sides can state the trial length, they
can disagree, and the catalogue exists precisely so they cannot. §2 is fixed.

---

## A4. `signupRef`, generated by you. `paymentRef` is being renamed.

You are right that `paymentRef` is now a misnomer — nothing is charged for 30
days, so there is no payment id at provisioning time.

**Send `signupRef`**: a UUID you generate at the start of the signup, before
checkout. Not the subscription id, for one reason your A5 makes clear — the key
has to exist and stay stable across a *failed* provision and its retry, and a
subscription id only exists after checkout completes.

`signupRef` is also the same value you already pass to
`POST /api/provision/checkout-session`, so the whole signup is traceable end to
end under one id.

**Today, while payment is mocked:** generate and send it exactly as you will
later. Nothing about it changes when Stripe lands.

---

## A5. Yes — retry with a different label works. Only success is sticky.

The idempotency semantics, stated properly because the handover was vague:

| Previous outcome for this `signupRef` | Behaviour |
|---|---|
| Succeeded | Returns the same clinic. Inputs are ignored. |
| Failed | May be retried, **including with different inputs** — a new label. |
| In flight | Returns the in-flight `provisionId`. Poll it. |

So the recovery path you describe is the intended one: the label is rejected,
they pick another, you retry under the same `signupRef`, and no second card and
no second signup is involved.

Your ordering observation is the important half though — see A6.

---

## A6. Not built yet, and you are right that ordering makes it worse

None of `/api/provision/*` exists today; the whole provisioning API is Phase 2
of the roadmap. So `check-label` does not know about retired labels because
`check-label` does not exist.

But it will, and I am recording it as a **requirement rather than a nice-to-have
because of exactly the ordering you spotted**: a retired label that passes the
pre-check gets rejected after the card has been taken, which turns a five-second
correction into the A5 recovery path. `check-label` and provisioning must
consult the same source, and the tombstones are that source.

Worth knowing: **no tombstones exist yet either**, because no clinic has ever
been offboarded. The design is in
`docs/superpowers/specs/2026-08-22-tenant-offboarding-design.md` §5.

---

## A7. Yes — `trialEndsAt` will be on the status response

Agreed, and for your reason: computing `now + trialDays` in the browser can
disagree with the licence, and the licence is what the app enforces. Provisioning
takes minutes, so those two clocks are not the same clock.

```json
{
  "status": "ready",
  "url": "https://clinicx.tempoapp.ro",
  "trialEndsAt": "2026-09-21T00:00:00.000Z"
}
```

Present once the licence exists — so `null` while `status` is `provisioning`,
and populated by the time it reads `ready`. Do not show a date before then.

---

## A8. Agreed, and specified. You found a real hole.

You are right that `error` as prose is unusable, and right that the mock hid it.
That is the failure mode mocks have: they agree with whatever you wrote them to
agree with, so the contract only gets tested the day it is real — which here
would have been for customers who had already paid.

**Two fields, not one.** `errorCode` alone would have made you branch on a
string list that grows, and every new code we add would silently fall into
whichever branch you wrote last. So there is also `recovery`, which is the thing
your flow actually needs to know:

| `recovery` | Offer |
|---|---|
| `new_label` | The address picker, retry under the same `signupRef` |
| `retry` | A retry button, same inputs |
| `support` | Contact and the `provisionId` |

`errorCode` stays for logs, support and any wording you want to special-case:
`label_taken`, `label_invalid`, `quota_exhausted`, `payment_unconfirmed`,
`internal`. That list will grow; `recovery` will not.

**One change to what you have built.** Your interim workaround offers the
new-address path when the reason is unrecognisable. Please flip that to
`support` once these fields exist. Offering the picker for a failure the address
did not cause asks somebody who has already paid to change something that was
never wrong, three times, and then still fails — and it buries the real error
under a UI that looks like it is making progress. `support` says "we do not know
what happened", which is true and actionable.

Handover §3 now carries the full contract.

---

## B1. 100 databases per project. 5 used.

Read from the Service Usage API rather than the Cloud Quotas one, which avoids
enabling anything:

```
firestore.googleapis.com/databases  limits//project
  defaultLimit:   100
  effectiveLimit: 100
```

So **95 clinics before the ceiling**, and every signup — including squats and
abandoned trials — consumes one permanently until it is offboarded.

That is a launch-plan number, as you said. It also raises the priority of the
retention schedule: at 95 signups the ceiling is not theoretical, and the
reclamation path has to exist before then rather than being written under
pressure. It is raisable by quota request, but 100 is what is true today.

---

## B2. Confirmed yours, confirmed unbuilt

All three are platform-side, and **none of them exists**. No scheduled job, no
templates, no sending infrastructure for lifecycle mail at all. You are right
that nothing in `tempo-web` would surface their absence — which is why naming
them here was the useful thing to do.

Recorded on the roadmap as part of Phase 3, and agreed that **trial-ending is
the single biggest conversion lever**: it is the one email whose absence costs
money rather than goodwill.

---

## B3. You were right and I was wrong. Fixed.

The catalogue said **"Toate evaluările incluse"**. The live site says
**"Programe terapeutice nelimitate"**. I transcribed from
`tempo-web/dist/index.html`, which is stale; the live page is authoritative and
I did not check it against the source I actually cited.

**Corrected in the code default and republished to
`platform_tiers/catalogue`.** Re-render and it will agree with the site.

Your reasoning for flagging rather than silently changing it is the right
instinct and worth stating back: ABLLS-R, VB-MAPP, Portage and CARS are licensed
instruments. "All evaluations included" reads as a claim about licensing the
product does not hold, which is presumably why tempoapp.ro removed that wording.
A tier edit in the console could reintroduce it, so **your build-time copy check
scanning catalogue strings is a good idea, and yes — a tier edit in the console
can now fail a tempo-web build.** That coupling is worth having; it is cheaper
than the alternative.

---

## B4. Yes — send it, and it goes on the tenant

Add to the provisioning payload:

```json
"dpa": { "version": "1.0", "acceptedAt": "2026-08-22T09:14:00.000Z" }
```

Copied onto `tenants/{label}` at provisioning, because the controller
relationship lives on the tenant and a marketing-site record is not where anyone
will look for it in two years.

**Agreed on no IP address**, and your reasoning is better than "we don't need
it": a version and a timestamp are evidence of acceptance; an IP is personal
data that would itself need a lawful basis and a retention period. Collecting it
to prove GDPR compliance would create a GDPR obligation.

---

## C. Corrections — all six applied

1. **§5 narrowed.** You are right and it has been raised twice, which means the
   sentence was wrong rather than the code. It now names Auth accounts and
   clinic databases specifically, and acknowledges the demo-scoped service
   account `api/lead.js` already uses. As written it invited someone to "fix"
   working code.
2. **§1, §4 and §8 rewritten** for card-on-file-then-provision. §4's "they have
   paid" line is gone.
3. **§9 pruned** of the two questions §3a already answers.
4. **§3a's "nothing is deleted, ever" qualified** — expiry never deletes;
   retention does, on its own schedule.
5. **§3's heading fixed.** It describes several endpoints, not one.
6. **Closing line restored.** Deleting it was accidental, and you are right
   about what it is for: it is the sentence that makes the document safe to
   correct against reality.

Also applied from your verification notes: **§3a now shows the JSON mirror URL
with a trailing slash**, since it 308s without one.

---

## What I would still push back on

Nothing in the questions. The one thing I would add:

**A2's `successUrl` and `cancelUrl` should be validated server-side against an
allowlist of tempoapp.ro paths.** They are attacker-controllable inputs to an
endpoint that hands back a payment URL, and an open redirect on a checkout flow
is worth more to a phisher than most bugs. Not your bug — mine to enforce — but
worth knowing the platform will reject a URL it does not recognise, so do not
send a dynamic one.
