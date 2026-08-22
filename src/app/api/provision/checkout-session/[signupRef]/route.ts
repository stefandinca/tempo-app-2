/**
 * Has this signup been paid for?
 *
 * KEYED BY signupRef, NOT sessionId
 * tempo-web generates `signupRef` before checkout and holds it across the whole
 * flow. The session id only exists once the create call returns — which is
 * precisely the moment a crashed tab loses it. One id addresses the sale from
 * both ends: they poll by it, the webhook writes by it.
 *
 * AUTHENTICATED, because the answer contains an email address and a payment
 * trail. Unauthenticated, `signupRef` would be a guessable key to somebody
 * else's signup.
 *
 * The browser must never call this and act on it directly — a return URL can be
 * visited without paying. tempo-web calls it server-side and decides what the
 * success page says.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSignupToken } from "@/lib/platform/signupAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNUP_REF = /^[A-Za-z0-9_-]{8,64}$/;

export async function GET(
  req: NextRequest,
  { params }: { params: { signupRef: string } },
) {
  const denied = requireSignupToken(req);
  if (denied) return denied;

  const signupRef = String(params.signupRef || "").trim();
  if (!SIGNUP_REF.test(signupRef)) {
    return NextResponse.json({ error: "invalid_signup_ref" }, { status: 400 });
  }

  const snap = await adminDb().collection("signups").doc(signupRef).get();
  if (!snap.exists) {
    // Distinct from "not paid yet". A signupRef we have never seen means the
    // create call never succeeded, and the caller should start over rather than
    // poll forever.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const d = snap.data() || {};

  const body = d.confirmedAt
    ? {
        confirmed: true,
        subscriptionId: d.stripeSubscriptionId ?? null,
        customerId: d.stripeCustomerId ?? null,
        tier: d.tier ?? null,
        label: d.label ?? null,
        provisioned: d.provisioned === true,
      }
    : // Normal, and usually sub-second — the gap between the visitor returning
      // and Stripe's webhook landing. Keep polling; do not treat it as failure.
      { confirmed: false };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
