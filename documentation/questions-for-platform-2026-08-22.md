# Questions for the platform, from the tempo-web signup build

**Round 2**, against `docs/tempo-web-handover.md` as revised 22 Aug (the Stripe revision).

Round 1 is fully answered and the answers were good enough that three of them changed the
code rather than just unblocking it. The resolved list is at the bottom for the record.

This round is shorter. Most of what the revision introduced needs no discussion, only work
on our side, so that work is listed separately below and does not need a reply. The
questions are the places where the revision leaves two defensible readings.

---

## What we are changing on our side, no reply needed

Listed so you do not spend answers on things already decided.

- **`check-label` goes real.** Verified live from here: `aicaa` taken, `brandnewclinic`
  available, `www` reserved. We stop mocking it. We treat a `503` as "could not check", which
  leaves the visitor able to continue rather than blocking them, and never as available.
- **`label` added to the `checkout-session` POST.** We were not sending it. Without it the
  webhook records a sale nobody can match to a subdomain, which is the worst kind of missing
  field because everything looks fine until reconciliation.
- **Confirm re-keyed to `signupRef`.** We were confirming by `sessionId`, held only on our
  own document. Your reasoning is right: a crashed tab loses the session id at exactly the
  moment it matters, and `signupRef` survives.
- **`{ "confirmed": false }` becomes a poll, not a failure.** We currently treat an
  unconfirmed session as a dead end and redirect. It is normal and usually sub-second.
- **`recovery` replaces `errorCode` as the branch**, with an unrecognised or missing value
  falling to `support`. Already done, in the round-1 answer.
- **Mira comes off our withheld list** and the AI bullet renders per tier.
- **Two harness assertions** so these cannot regress quietly: that `label` is present in
  every checkout-session body we build, and that no tier renders an AI bullet its
  `miraEnabled` does not justify.

---

## Round 2 questions

### R1. How should we consume a live `check-label` while the rest of §3 is still mocked?

Right now one environment variable, `PLATFORM_API_BASE`, switches every platform call
between the mock and the real thing. With `check-label` live and the other four endpoints
not, that switch has no correct position: unset mocks a live endpoint, set points four calls
at 404s.

Our plan is to make `check-label` always real once a base URL is configured, and keep the
rest behind the mock until you say otherwise, with one flag per endpoint group. Before we
build that: **is the rest of §3 close enough that a per-endpoint switch is wasted effort?**
If `checkout-session` and `provision/clinic` land this week we would rather wait and flip
everything at once than carry a switch we delete immediately.

### R2. Are the two `signups` records deliberate?

Your webhook writes `signups/{signupRef}` in the platform's control plane. We already write
`signups/{signupRef}` in `tempo-app-2/clinic-demo`, same key, different database.

They are not duplicates in content: ours holds the label, clinic and admin details and the
DPA acceptance, all captured *before* checkout; yours holds the payment trail, captured
after. Together they are the whole story and neither is complete alone.

But two records with the same name and the same key in one project is the kind of thing that
reads as an accident later. **Is the split intentional, and should it stay?** Two things
would change our answer:

- If your record is meant to become the single one, we would stop writing ours and send the
  DPA and clinic details through `checkout-session` metadata instead, so it is all in one
  place from the first write.
- If ours is meant to stay, we would like a different collection name on our side to make
  the distinction obvious. `signup_drafts` reads accurately: ours exists before there is a
  sale and can be abandoned.

### R3. Should an empty `stripePriceId` remove a tier from self-serve?

§3a says empty means not purchasable. We currently decide what is self-serve from
`monthlyEur` and `trialDays`, which is what an earlier revision gave us.

Those can disagree: a tier with a price and a trial but no `stripePriceId` would render a
buy button that cannot produce a checkout session. **Should `stripePriceId` be part of the
self-serve test**, and is it authoritative when it disagrees with the other two? We would
rather have one rule than three that agree by luck.

### R4. `miraEnabled` or `features[]` — which wins for the AI bullet?

§3a says render the AI bullet from `miraEnabled`, not from a hardcoded list. Today the
catalogue's `features[]` and `miraEnabled` agree: Starter has neither, the others have both.

They can drift, and only one is enforced. **Do you want us to render the bullet from
`miraEnabled` and ignore `features[]` for that one line, or to keep rendering `features[]`
verbatim and treat a disagreement as a build failure?** We lean towards the second, because
it surfaces the drift to whoever caused it instead of silently papering over it, and because
`features[]` is where the wording lives. Either is easy; we want the same answer as you.

### R5. When do test-mode prices arrive?

§9 says the catalogue holds live-mode price ids, so a test-mode session cannot be created
from them, and a card-to-clinic run is therefore not yet possible.

That does not block the build, and we are not asking you to hurry. We are asking **whether
it lands before launch**, because if it does not, the first time a real card touches this
flow will be a real customer's, and we would rather that not be the case for something that
consumes a permanent database slot on success.

### R6. Does `quota_exhausted` need anything from our side?

You said it is `support` and should page you. We will show the support panel and the
`provisionId` like any other `support` recovery.

**Is there anything we should do beyond that?** A distinct message seems right, since "we
have run out of room" is our fault and not the customer's, and the usual wording implies
they did something wrong. But if a distinct message would leak capacity information you
would rather not publish, say so and we will keep it generic.

### R7. How long should we poll an unconfirmed checkout before giving up?

`{ "confirmed": false }` means keep polling, usually sub-second. But a visitor who opens
checkout and abandons it produces the same response forever.

We hold the session open for one hour before letting the same email start again, and offer a
"continue payment" button meanwhile. **Is an hour sensible against how long a Stripe
Checkout session actually stays valid?** If sessions expire sooner, our window is telling
people to resume something Stripe has already closed.

---

## Round 1, resolved

Recorded so it is not re-litigated.

**Answered and built:** Stripe ownership (platform, A1); the Checkout contract, since revised
again (A2); `trialDays` looked up rather than sent, which was a real bug worth catching (A3);
`signupRef` as the idempotency key (A4); retry-with-a-different-label after a failed provision
(A5); `check-label` consulting tombstones, now live (A6); `trialEndsAt` on the status response
(A7); and `errorCode` plus `recovery` on failures, where your two-field answer was better than
the one field we asked for (A8).

**Answered and noted:** the 100-database ceiling with 5 used (B1); lifecycle emails confirmed
yours and unbuilt (B2); the Starter bullet corrected in the catalogue (B3); the DPA record
going onto the tenant (B4).

**Corrections all applied** (C1 to C6), including §5's credentials line, which we had raised
three times and which now says what it meant.

**One correction still outstanding from round 1:** the round-1 answer said handover §3 carried
the failure contract before it did. This revision has landed it, so the gap is closed, but the
sequence is worth noting because we built against the answers document on the strength of that
sentence.
