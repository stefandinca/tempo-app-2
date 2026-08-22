/**
 * Stripe webhook. The only thing the platform believes about money.
 *
 * A return URL is a URL — it can be visited without paying, bookmarked, or hit
 * by a crawler. This endpoint is where payment becomes fact, because every
 * request is signed and verified against a secret only Stripe and this server
 * know.
 *
 * THREE PROPERTIES, IN ORDER OF HOW BADLY THEY FAIL:
 *
 *   1. Verify before believing. The raw body is verified against the
 *      Stripe-Signature header. An unverified payload is refused with 400 and
 *      never parsed for meaning.
 *   2. Answer fast. Stripe retries anything slow, and a retry storm on a
 *      handler that is merely slow looks exactly like an outage.
 *   3. Survive duplicates. Stripe delivers at-least-once, by design. Every
 *      event id is recorded before it is handled, and a second delivery of the
 *      same id does nothing.
 *
 * WHAT IT DOES NOT DO YET
 * Provisioning does not exist, so `checkout.session.completed` records a
 * confirmed signup rather than creating a clinic. That record is what
 * /api/provision/clinic will consume, and what the checkout-confirm endpoint
 * tempo-web polls will read. Nothing is lost in the meantime — the whole point
 * of persisting first is that the handler can be written later.
 */
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import { stripe, webhookSecret, isHandled } from "@/lib/platform/stripe";
import {
  buildLicence,
  licenceMirror,
  configLimitsFor,
  graceDaysForEnd,
  tierForPriceId,
  defaultCatalogue,
  DEFAULT_GRACE_DAYS,
  type LicenceEndReason,
  type Tier,
  type TierCatalogueEntry,
} from "@/lib/platform/licence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTOR = "stripe:webhook";

export async function POST(req: NextRequest) {
  // The RAW body, before any parsing. req.json() would verify against a
  // re-serialised payload whose key order and whitespace differ from what
  // Stripe signed, and every signature would fail — the single most common way
  // this endpoint is got wrong.
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch (e: unknown) {
    // 400, not 500. A bad signature is a request we are right to refuse, and
    // telling Stripe it was our fault would make it retry a payload that will
    // never verify.
    console.error("[stripe/webhook] signature verification failed:", (e as Error)?.message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const db = adminDb();
  const seen = db.collection("stripe_events").doc(event.id);

  try {
    // Claimed with `create`, which fails if the id already exists. A read then
    // a write would let two concurrent deliveries of the same event both see
    // "not processed" and both act — which for a payment means charging or
    // provisioning twice.
    await seen.create({
      type: event.type,
      receivedAt: new Date(),
      livemode: event.livemode,
      handled: isHandled(event.type),
    });
  } catch {
    // Already recorded: a duplicate delivery, or a retry of one we finished.
    // 200 so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!isHandled(event.type)) {
    // Recorded above, so it is visible if we ever need it, but nothing acts on
    // it. Subscribing to fewer events in the dashboard is the real fix.
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    await handle(event);
    await seen.set({ processedAt: new Date(), ok: true }, { merge: true });
  } catch (e: unknown) {
    // The event is recorded and marked failed rather than left to be retried
    // forever. Returning 200 stops Stripe hammering an endpoint that will fail
    // the same way each time; the failure is visible in stripe_events, which is
    // where someone can replay it once the cause is fixed.
    console.error(`[stripe/webhook] ${event.type} failed:`, (e as Error)?.message);
    await seen
      .set({ processedAt: new Date(), ok: false, error: String((e as Error)?.message) }, { merge: true })
      .catch(() => {});
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

async function handle(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      return onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    case "customer.subscription.updated":
      return onSubscriptionUpdated(event.data.object as Stripe.Subscription);
    case "customer.subscription.deleted":
      return onSubscriptionDeleted(event.data.object as Stripe.Subscription);
    case "invoice.payment_succeeded":
      return onPaymentSucceeded(event.data.object as Stripe.Invoice);
    case "invoice.payment_failed":
      return onPaymentFailed(event.data.object as Stripe.Invoice);
  }
}

/**
 * Payment confirmed. Records the signup as paid.
 *
 * Keyed by `signupRef` — the id tempo-web generates before checkout — because
 * that is the one value that exists at every stage, including a retry of a
 * provision that failed before any subscription existed.
 */
async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const signupRef = session.client_reference_id || session.metadata?.signupRef || "";
  if (!signupRef) {
    // Nothing to key on. Recorded by the caller; not actionable.
    console.warn("[stripe/webhook] checkout completed with no signupRef:", session.id);
    return;
  }

  await adminDb()
    .collection("signups")
    .doc(signupRef)
    .set(
      {
        signupRef,
        stripeSessionId: session.id,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        adminEmail: session.customer_details?.email ?? null,
        tier: session.metadata?.tier ?? null,
        label: session.metadata?.label ?? null,
        confirmedAt: new Date(),
        // Provisioning has not run. The endpoint that will consume this is the
        // one that flips it.
        provisioned: false,
      },
      { merge: true },
    );
}

/**
 * A subscription changed: a trial converted, a plan changed, or a cancellation
 * was scheduled. Rewrites the licence to match.
 */
async function onSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const tenant = await tenantForSubscription(sub.id);
  if (!tenant) return;

  // `cancel_at_period_end` is a scheduled cancellation, not a cancellation:
  // they keep everything until the period ends. Recording the reason now means
  // the read-only banner can say "your subscription ends on X" rather than
  // discovering it on the day.
  const endReason: LicenceEndReason | null = sub.cancel_at_period_end ? "cancelled" : null;
  const periodEnd = currentPeriodEnd(sub);
  if (!periodEnd) return;

  await writeLicence(tenant, {
    tier: await tierForSubscription(sub),
    expiresAt: periodEnd,
    endReason,
  });
}

/** Gone. Read-only at the period end, with no grace — they chose this. */
async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const tenant = await tenantForSubscription(sub.id);
  if (!tenant) return;

  await writeLicence(tenant, {
    tier: await tierForSubscription(sub),
    // `ended_at` is when Stripe actually stopped it; falling back to the period
    // end covers an immediate cancellation mid-period.
    expiresAt: sub.ended_at
      ? new Date(sub.ended_at * 1000).toISOString()
      : currentPeriodEnd(sub) || new Date().toISOString(),
    endReason: "cancelled",
  });
}

/** Renewal paid. Extend to the new period end, and clear any decline. */
async function onPaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subId = subscriptionIdOf(invoice);
  if (!subId) return;
  const tenant = await tenantForSubscription(subId);
  if (!tenant) return;

  const sub = await stripe().subscriptions.retrieve(subId);
  const periodEnd = currentPeriodEnd(sub);
  if (!periodEnd) return;

  await writeLicence(tenant, {
    tier: await tierForSubscription(sub),
    expiresAt: periodEnd,
    // Paid, so nothing is ending. Clears a previous payment_failed.
    endReason: null,
  });
}

/**
 * The card declined. THIS is what the 14-day grace exists for: a real customer
 * who still wants the service, whose card expired or whose bank blocked a
 * foreign charge. Not a cancellation, and it must not be treated as one.
 */
async function onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId = subscriptionIdOf(invoice);
  if (!subId) return;
  const tenant = await tenantForSubscription(subId);
  if (!tenant) return;

  const sub = await stripe().subscriptions.retrieve(subId);
  await writeLicence(tenant, {
    tier: await tierForSubscription(sub),
    // Expires now; the grace below is what actually keeps them working.
    expiresAt: currentPeriodEnd(sub) || new Date().toISOString(),
    endReason: "payment_failed",
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The Stripe API has moved `current_period_end` between the subscription and
 * its items across versions, and this account is not pinned to one. Read
 * whichever is present rather than assuming, because guessing wrong here writes
 * an expiry of 1970 and freezes a paying clinic.
 */
function currentPeriodEnd(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const secs = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return typeof secs === "number" && secs > 0 ? new Date(secs * 1000).toISOString() : null;
}

function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const i = invoice as unknown as { subscription?: string | { id?: string } };
  if (typeof i.subscription === "string") return i.subscription;
  return i.subscription?.id ?? null;
}

/** Which clinic a subscription belongs to, or null if none claims it. */
async function tenantForSubscription(subscriptionId: string): Promise<string | null> {
  const snap = await adminDb()
    .collection("tenants")
    .where("stripeSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();
  if (snap.empty) {
    // Normal before provisioning exists, and normal for a subscription whose
    // clinic was never created. Recorded by the caller either way.
    console.log("[stripe/webhook] no tenant for subscription", subscriptionId);
    return null;
  }
  return snap.docs[0].id;
}

/**
 * What they are paying for, from the PRICE on the subscription rather than from
 * anything a browser said — the only version of that answer which cannot
 * disagree with the invoice.
 */
async function tierForSubscription(sub: Stripe.Subscription): Promise<Tier | null> {
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return null;

  const snap = await adminDb().collection("platform_tiers").doc("catalogue").get();
  const stored = snap.exists ? (snap.data()?.tiers as TierCatalogueEntry[] | undefined) : undefined;
  const catalogue = Array.isArray(stored) && stored.length ? stored : defaultCatalogue();
  return tierForPriceId(catalogue, priceId);
}

/**
 * Write the licence to the registry AND the clinic's mirror, plus the tier's
 * limits — the same three writes, in the same order, as the console's licence
 * route. Registry first, so a failed mirror leaves the clinic working.
 */
async function writeLicence(
  tenantId: string,
  input: { tier: Tier | null; expiresAt: string; endReason: LicenceEndReason | null },
): Promise<void> {
  const registryRef = adminDb().collection("tenants").doc(tenantId);
  const snap = await registryRef.get();
  if (!snap.exists) return;

  const t = snap.data() as { databaseId?: string; licence?: { tier?: string } };
  // A price we do not recognise must not silently downgrade a clinic, so the
  // tier already on the licence wins over a guess.
  const tier = (input.tier ?? t.licence?.tier ?? "professional") as Tier;

  const built = buildLicence(
    {
      plan: "term",
      tier,
      expiresAt: input.expiresAt,
      graceDays: input.endReason ? graceDaysForEnd(input.endReason) : DEFAULT_GRACE_DAYS,
      endReason: input.endReason,
      notes: `stripe: ${input.endReason ?? "active"}`,
    },
    ACTOR,
  );
  if ("error" in built) {
    throw new Error(`licence rejected: ${built.error}`);
  }

  await registryRef.set({ licence: built }, { merge: true });

  const databaseId = t.databaseId || `clinic-${tenantId}`;
  const clinic = adminDb(databaseId);
  await clinic.collection("system_settings").doc("licence").set(licenceMirror(built), { merge: true });
  await clinic.collection("system_settings").doc("config").set(configLimitsFor(tier), { merge: true });
}
