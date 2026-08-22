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

/**
 * BOTH MODES ARE LIVE AT ONCE, and that is deliberate.
 *
 * One Vercel project serves this app, so live and test traffic arrive at the
 * same URL. Stripe keeps them completely separate: a test-mode event is signed
 * with the TEST endpoint's secret and its objects are only readable with a test
 * key. Holding a single pair of variables would mean swapping them to test
 * anything and swapping them back afterwards — and the failure when somebody
 * forgets is silent, in production, on money.
 *
 * So there are two pairs, and the second is optional:
 *
 *   STRIPE_SECRET_KEY          / STRIPE_WEBHOOK_SECRET          (live)
 *   STRIPE_SECRET_KEY_TEST     / STRIPE_WEBHOOK_SECRET_TEST     (test, optional)
 *
 * Verification tries each configured secret; whichever validates tells us which
 * mode the event came from, and the matching key reads its objects. That order
 * matters — you cannot know the mode before verifying, because knowing it means
 * parsing a payload you have not yet decided to trust.
 */
const clients = new Map<string, Stripe>();

function client(key: string): Stripe {
  const hit = clients.get(key);
  if (hit) return hit;
  // No apiVersion pin: the account's default is used, which is what the
  // dashboard and the CLI also use. Pinning here and forgetting means the
  // webhook and the dashboard disagree about object shapes after an upgrade.
  const made = new Stripe(key);
  clients.set(key, made);
  return made;
}

/**
 * The API client for a given mode. Throws rather than returning null, because
 * every caller is in the middle of taking somebody's money and a silent no-op
 * is the worst outcome available.
 */
export function stripe(livemode = true): Stripe {
  // No falling back to the live key for a test event. A live key cannot see a
  // test subscription, so the fallback would turn a missing variable into
  // "No such subscription" — an error that sends whoever is debugging to look
  // for a deleted subscription that was never the problem. Say which variable
  // is missing instead.
  const name = livemode ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY_TEST";
  const key = process.env[name];
  if (!key) throw new Error(name + " is not set");
  return client(key);
}

/** Every signing secret configured, live first. */
export function webhookSecrets(): string[] {
  return [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET_TEST]
    .map((s) => (s || "").trim())
    .filter(Boolean);
}

/**
 * Verify against whichever configured secret validates.
 *
 * Trying both is not a weakening: each attempt is the same HMAC check against a
 * secret only Stripe knows, so a payload that verifies under either really did
 * come from Stripe. What it buys is being able to exercise the integration in
 * test mode without disarming live.
 */
export function verifyEvent(raw: string, signature: string): Stripe.Event {
  const secrets = webhookSecrets();
  if (!secrets.length) throw new Error("no webhook secret configured");

  let last: unknown;
  for (const secret of secrets) {
    try {
      return client(process.env.STRIPE_SECRET_KEY || "sk_unused").webhooks.constructEvent(
        raw,
        signature,
        secret,
      );
    } catch (e) {
      last = e;
    }
  }
  throw last;
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
