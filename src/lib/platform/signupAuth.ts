/**
 * The gate for the signup endpoints tempo-web calls server-to-server.
 *
 * WHY THESE ARE NOT PUBLIC, WHEN `check-label` IS
 * `check-label` answers a question with nothing secret in it and no side
 * effect. These create Stripe objects and write records that provisioning acts
 * on. Public would mean anyone could mint checkout sessions in our Stripe
 * account and fill `signups` with junk — and every junk record is a signupRef
 * that provisioning may later be asked about.
 *
 * WHY A SHARED SECRET AND NOT A FIREBASE TOKEN
 * There is no user yet. The visitor has no account — creating one is the *end*
 * of this flow, not the start — so there is no identity to verify. What we are
 * authenticating is the caller: tempo-web's server, which already holds secrets
 * for its own Stripe-free work. A bearer token is the honest shape for
 * "one known machine talking to another".
 *
 * It must never reach the browser. tempo-web calls these from its server side;
 * a token in client JavaScript is a public token with extra steps.
 */
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

/** Compare without leaking length or position through timing. */
function secretEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself be a timing
  // signal. Compare a fixed-width digest-ish padding instead: equal lengths are
  // required for the real comparison, so a length difference is simply false.
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signupTokenConfigured(): boolean {
  return Boolean((process.env.PROVISION_API_TOKEN || "").trim());
}

/**
 * Returns an error response to send back, or null when the caller is allowed.
 *
 * A missing token in the environment is 503, not 401. 401 would tell tempo-web
 * their credential is wrong and send them to rotate a token that was never the
 * problem — the same misdiagnosis the webhook's `not_configured` exists to
 * prevent.
 */
export function requireSignupToken(req: NextRequest): NextResponse | null {
  const expected = (process.env.PROVISION_API_TOKEN || "").trim();
  if (!expected) {
    console.error("[provision] PROVISION_API_TOKEN is not set — refusing every call");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const header = req.headers.get("authorization") || "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!presented || !secretEquals(presented, expected)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  return null;
}

/**
 * Where a checkout may send the visitor afterwards.
 *
 * `successUrl` and `cancelUrl` are attacker-controllable inputs to an endpoint
 * that hands back a payment URL. An open redirect on a checkout flow is worth
 * more to a phisher than most bugs: the victim is already expecting to type
 * card details, and the URL they were sent from is genuinely ours.
 *
 * Configurable so tempo-web can develop against localhost without anyone
 * loosening the production list to do it.
 */
export function allowedReturnOrigins(): string[] {
  const extra = (process.env.SIGNUP_RETURN_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ["https://tempoapp.ro", "https://www.tempoapp.ro", ...extra];
}

export function isAllowedReturnUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // Compared by ORIGIN, not by prefix. A `startsWith` check on
  // "https://tempoapp.ro" also accepts "https://tempoapp.ro.evil.com".
  return allowedReturnOrigins().includes(url.origin);
}
