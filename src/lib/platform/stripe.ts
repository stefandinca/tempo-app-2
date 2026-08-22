/**
 * Server-only Stripe client.
 *
 * Never import from a client component. The secret key is full API access to
 * the account — it can issue refunds, read every customer, and cancel every
 * subscription.
 *
 * There is deliberately no publishable key anywhere in this codebase. Checkout
 * sessions are created server-side and the browser is redirected to Stripe's
 * hosted page, so no Stripe JS runs here and no card data ever reaches our
 * origin. That keeps the PCI surface out of both repos rather than merely
 * small.
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Throws rather than returning null when the key is missing, because every
 * caller is in the middle of taking somebody's money and a silent no-op is the
 * worst possible outcome there.
 */
export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  // No apiVersion pin: the account's default is used, which is what the
  // dashboard and the CLI also use. Pinning here and forgetting means the
  // webhook and the dashboard disagree about object shapes after an upgrade.
  cached = new Stripe(key);
  return cached;
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return secret;
}

/** Events the platform acts on. Anything else is recorded and ignored. */
export const HANDLED_EVENTS = [
  // Payment confirmed and the subscription exists. This is what provisioning
  // waits for — never the browser reaching a success URL, which can be visited
  // without paying.
  "checkout.session.completed",
  // Trial converting, a cancellation being scheduled, a plan changing.
  "customer.subscription.updated",
  // Gone. Licence ends with no grace: they chose this.
  "customer.subscription.deleted",
  // Renewal succeeded — extend the term.
  "invoice.payment_succeeded",
  // The card declined. THE case the 14-day grace exists for.
  "invoice.payment_failed",
] as const;

export type HandledEvent = (typeof HANDLED_EVENTS)[number];

export function isHandled(type: string): type is HandledEvent {
  return (HANDLED_EVENTS as readonly string[]).includes(type);
}
