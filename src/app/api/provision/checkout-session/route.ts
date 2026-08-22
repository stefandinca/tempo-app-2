/**
 * Create the Stripe Checkout session for a signup, and record the signup.
 *
 * ONE RECORD, ONE WRITER
 * This is where `signups/{signupRef}` is born. tempo-web sends the whole signup
 * — clinic, admin, tier, label, DPA acceptance — and the platform writes it.
 * The webhook later MERGES the payment trail into the same document, and
 * provisioning reads it.
 *
 * The alternative, which tempo-web had built and we removed, was for the
 * marketing site to write its own copy into a clinic's database. Two homes for
 * one piece of state generates races faster than anyone patches them, and a
 * prospective clinic has no database of its own to write to — the absence of a
 * correct destination was the tell that the write belonged here.
 *
 * NOTHING IS CHARGED YET
 * The card is taken up front as the trial's entry requirement, because every
 * signup permanently consumes a database, a bucket, a hostname and a label.
 * `trial_period_days` comes from the tier, so the catalogue is the only place
 * the trial length is stated.
 */
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/platform/stripe";
import { requireSignupToken, isAllowedReturnUrl } from "@/lib/platform/signupAuth";
import { labelProblem } from "@/lib/tenant";
import {
  isTier,
  defaultCatalogue,
  type Tier,
  type TierCatalogueEntry,
} from "@/lib/platform/licence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same shape tempo-web generates: opaque, theirs, stable across retries. */
const SIGNUP_REF = /^[A-Za-z0-9_-]{8,64}$/;

interface Body {
  signupRef?: unknown;
  tier?: unknown;
  label?: unknown;
  clinicName?: unknown;
  adminEmail?: unknown;
  adminName?: unknown;
  plan?: unknown;
  dpa?: { version?: unknown; acceptedAt?: unknown };
  successUrl?: unknown;
  cancelUrl?: unknown;
  /** "test" exercises the whole flow on a test card. Only a holder of the
   *  bearer token can ask for it, so it is not an abuse surface. */
  mode?: unknown;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: NextRequest) {
  const denied = requireSignupToken(req);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_body");
  }

  const signupRef = str(body.signupRef);
  if (!SIGNUP_REF.test(signupRef)) return bad("invalid_signup_ref");

  const tier = str(body.tier);
  if (!isTier(tier)) return bad("invalid_tier");

  // The same function `resolveDatabaseId()` uses at runtime, so a label accepted
  // here cannot be rejected by the thing that has to resolve it later.
  const label = str(body.label);
  if (labelProblem(label)) return bad("invalid_label");

  const adminEmail = str(body.adminEmail);
  if (!adminEmail || !adminEmail.includes("@")) return bad("invalid_email");

  const clinicName = str(body.clinicName);
  if (!clinicName) return bad("invalid_clinic_name");

  const adminName = str(body.adminName);
  if (!adminName) return bad("invalid_admin_name");

  const plan = str(body.plan) || "term";
  if (plan !== "term" && plan !== "lifetime") return bad("invalid_plan");

  // Version and timestamp only. An IP address would be personal data needing
  // its own lawful basis, collected to prove compliance with the other.
  const dpaVersion = str(body.dpa?.version);
  const dpaAcceptedAt = str(body.dpa?.acceptedAt);
  if (!dpaVersion || !dpaAcceptedAt) return bad("dpa_required");

  const successUrl = str(body.successUrl);
  const cancelUrl = str(body.cancelUrl);
  if (!isAllowedReturnUrl(successUrl) || !isAllowedReturnUrl(cancelUrl)) {
    return bad("invalid_return_url");
  }

  const livemode = str(body.mode) !== "test";

  // --- what they are buying -------------------------------------------------

  const catalogue = await readCatalogue();
  const entry = catalogue.find((t) => t.id === tier);
  if (!entry) return bad("unknown_tier");

  // The single test for "is this for sale", per the contract in the handover:
  // not monthlyEur, not trialDays — neither of those can produce a session.
  if (!entry.stripePriceId) return bad("tier_not_purchasable");

  let priceId: string;
  try {
    priceId = await priceFor(tier, entry, livemode);
  } catch (e) {
    console.error("[provision/checkout-session] price lookup failed:", (e as Error)?.message);
    return bad("price_unavailable", 503);
  }

  // --- idempotency ----------------------------------------------------------

  const ref = adminDb().collection("signups").doc(signupRef);
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() || {};
    // Already paid. Creating a second session here is how one signup becomes
    // two subscriptions.
    if (data.confirmedAt) return bad("already_confirmed", 409);

    // An unfinished attempt. Hand back the same session rather than opening
    // another — a visitor who reloads the page has not changed their mind.
    const openUrl = await reopen(String(data.stripeSessionId || ""), livemode);
    if (openUrl) {
      return NextResponse.json(
        { sessionUrl: openUrl.url, sessionId: openUrl.id, reused: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  // --- create ---------------------------------------------------------------

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe(livemode).checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // The id that survives everything. Stripe echoes it back on the event,
      // and it is what the webhook keys the record by.
      client_reference_id: signupRef,
      metadata: { signupRef, tier, label },
      // Copied onto the subscription too, so a later subscription event can be
      // traced to its signup without a lookup table.
      subscription_data: {
        metadata: { signupRef, tier, label },
        ...(entry.trialDays > 0 ? { trial_period_days: entry.trialDays } : {}),
      },
      // Explicit, because the whole anti-squatting argument rests on it: a card
      // is collected even though the trial charges nothing.
      payment_method_collection: "always",
      customer_email: adminEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "ro",
    });
  } catch (e) {
    console.error("[provision/checkout-session] create failed:", (e as Error)?.message);
    return bad("stripe_error", 502);
  }

  // --- record ---------------------------------------------------------------

  // Written AFTER the session exists, so a Stripe failure leaves no orphan
  // record claiming a signupRef that never reached checkout.
  await ref.set(
    {
      signupRef,
      tier,
      label,
      clinicName,
      adminEmail,
      adminName,
      plan,
      dpa: { version: dpaVersion, acceptedAt: dpaAcceptedAt },
      stripeSessionId: session.id,
      livemode,
      createdAt: new Date(),
      // The webhook flips this by writing confirmedAt; provisioning flips
      // `provisioned`. Neither is true yet.
      provisioned: false,
    },
    { merge: true },
  );

  return NextResponse.json(
    { sessionUrl: session.url, sessionId: session.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ---------------------------------------------------------------------------

async function readCatalogue(): Promise<TierCatalogueEntry[]> {
  const snap = await adminDb().collection("platform_tiers").doc("catalogue").get();
  const stored = snap.exists ? (snap.data()?.tiers as TierCatalogueEntry[] | undefined) : undefined;
  return Array.isArray(stored) && stored.length ? stored : defaultCatalogue();
}

/**
 * The price to charge, for the mode the session is being created in.
 *
 * The two modes resolve differently, and the asymmetry is deliberate. Live uses
 * the catalogue's `stripePriceId`, because that is the field a human edits in
 * the console and the one the pricing page treats as "for sale". Test resolves
 * by `lookup_key`, because the catalogue is a world-readable marketing document
 * and test-mode ids have no business being published in it.
 *
 * Both are stamped with `metadata.tier` in Stripe, which is how the webhook
 * reads the tier back without consulting the catalogue at all.
 */
async function priceFor(
  tier: Tier,
  entry: TierCatalogueEntry,
  livemode: boolean,
): Promise<string> {
  if (livemode) return entry.stripePriceId;

  const key = `tempo_${tier}_monthly`;
  const found = await stripe(false).prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = found.data[0];
  if (!price) throw new Error(`no active test price with lookup_key ${key}`);
  return price.id;
}

/**
 * If a previous session for this signup is still open, return it.
 *
 * Anything else — expired, completed, missing, or a mode mismatch — returns
 * null and a fresh session is created. Never throws: a failure to reuse should
 * cost a new session, not the signup.
 */
async function reopen(
  sessionId: string,
  livemode: boolean,
): Promise<{ id: string; url: string } | null> {
  if (!sessionId) return null;
  try {
    const s = await stripe(livemode).checkout.sessions.retrieve(sessionId);
    if (s.status === "open" && s.url) return { id: s.id, url: s.url };
  } catch {
    /* fall through to creating a new one */
  }
  return null;
}
