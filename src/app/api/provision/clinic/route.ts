/**
 * Start provisioning a clinic.
 *
 * Called by tempo-web once checkout is confirmed SERVER-SIDE — never from the
 * return URL alone, which can be visited without paying. This endpoint enforces
 * that itself rather than trusting the caller: the signup record must carry a
 * `confirmedAt` written by the Stripe webhook, or there is no sale.
 *
 * IT RETURNS IMMEDIATELY. Creating a clinic takes minutes and a serverless
 * request does not get minutes, so this records the work and a cron advances it
 * one step at a time (see runner.ts). tempo-web polls the status endpoint.
 *
 * IDEMPOTENCY: ONLY SUCCESS IS STICKY
 * A succeeded provision returns the same clinic and ignores the inputs. A failed
 * one may be retried — including with a DIFFERENT label, which is the recovery
 * path when provisioning rejects a subdomain after the card has been taken. An
 * in-flight one hands back the attempt already running.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSignupToken } from "@/lib/platform/signupAuth";
import { labelProblem } from "@/lib/tenant";
import { isTier } from "@/lib/platform/licence";
import { STEPS } from "@/lib/platform/provision/steps";
import { advance, type ProvisionRecord } from "@/lib/platform/provision/runner";
import { recoveryFor } from "@/lib/platform/provisioning";
import { alertPlatform } from "@/lib/platform/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SIGNUP_REF = /^[A-Za-z0-9_-]{8,64}$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function bad(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * An unhandled throw in a route handler becomes a 500 with an EMPTY body, which
 * tells whoever is looking exactly nothing — it reads as "the platform is down"
 * when the truth was a missing Firestore index. That cost two debugging rounds
 * on this endpoint alone, so nothing here is allowed to escape unnamed.
 */
export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (e) {
    console.error("[provision/clinic] unhandled:", (e as Error)?.message, (e as Error)?.stack);
    return NextResponse.json(
      { error: "internal", detail: String((e as Error)?.message).slice(0, 300) },
      { status: 500 },
    );
  }
}

async function handlePost(req: NextRequest) {
  const denied = requireSignupToken(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return bad("invalid_body");
  }

  const signupRef = str(body.signupRef);
  if (!SIGNUP_REF.test(signupRef)) return bad("invalid_signup_ref");

  const label = str(body.label);
  if (labelProblem(label)) return bad("invalid_label");

  const tier = str(body.tier);
  if (!isTier(tier)) return bad("invalid_tier");

  const clinicName = str(body.clinicName);
  const adminEmail = str(body.adminEmail);
  const adminName = str(body.adminName);
  if (!clinicName || !adminEmail || !adminName) return bad("invalid_body");

  const dpa = (body.dpa || {}) as { version?: unknown; acceptedAt?: unknown };
  const dpaVersion = str(dpa.version);
  const dpaAcceptedAt = str(dpa.acceptedAt);
  if (!dpaVersion || !dpaAcceptedAt) return bad("dpa_required");

  const db = adminDb();

  // --- the sale must exist ---------------------------------------------------

  const signup = await db.collection("signups").doc(signupRef).get();
  if (!signup.exists || !signup.data()?.confirmedAt) {
    // RECORDED BEFORE IT IS REFUSED.
    //
    // This branch is the one failure in the whole flow that used to leave no
    // trace anywhere: no provision document is created, so the console has
    // nothing to show and the customer is told — truthfully, from tempo-web's
    // point of view — that support has been notified. Nobody had been. The only
    // evidence was a 402 in a function log.
    //
    // It is also the branch a broken Stripe webhook lands in, which makes it
    // the most likely thing an operator needs to see: the card was charged,
    // `checkout.session.completed` never arrived, and the sale exists only in
    // Stripe.
    await recordBlockedCreate(signupRef, signup.exists, { label, clinicName, adminEmail, tier });
    // Deliberately not 404: the caller asked us to build something for a signup
    // that has not been paid for, and saying "not found" invites them to retry
    // a create that will never succeed.
    return bad("payment_unconfirmed", 402, { recovery: recoveryFor("payment_unconfirmed") });
  }

  // --- is this label still free? ---------------------------------------------

  // Re-checked here even though check-label ran during signup. Minutes have
  // passed and somebody else may have taken it — and the alternative to failing
  // here is provisioning a second clinic onto another clinic's subdomain.
  const existing = await db.collection("tenants").doc(label).get();

  // --- idempotency -----------------------------------------------------------

  // Filtered in Firestore, sorted here. A `where` plus an `orderBy` on another
  // field needs a composite index the control plane does not have — and the
  // failure is an unhandled 500 with an empty body, which reads as "the
  // platform is broken" rather than "add an index". The same mistake cost the
  // cron pass earlier the same day.
  const prior = await db.collection("provisions").where("signupRef", "==", signupRef).limit(20).get();

  const records = prior.docs
    .map((d) => ({ id: d.id, ...(d.data() as ProvisionRecord) }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const ready = records.find((r) => r.status === "ready");
  if (ready) {
    return NextResponse.json(
      { status: "accepted", provisionId: ready.id, alreadyProvisioned: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const inFlight = records.find((r) => r.status === "provisioning");
  if (inFlight) {
    return NextResponse.json(
      { status: "accepted", provisionId: inFlight.id, inFlight: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // The label check only bites once we know we are starting a NEW attempt —
  // a tenant document written by this signup's own earlier attempt is ours.
  if (existing.exists && existing.data()?.signupRef !== signupRef) {
    return bad("label_taken", 409, { errorCode: "label_taken", recovery: recoveryFor("label_taken") });
  }

  // --- start -----------------------------------------------------------------

  const attempt = records.length + 1;
  const provisionId = `prov_${signupRef}_${attempt}`;
  const now = new Date().toISOString();

  const record: ProvisionRecord = {
    provisionId,
    signupRef,
    label,
    clinicName,
    adminEmail,
    adminName,
    tier,
    plan: str(body.plan) || "term",
    dpa: { version: dpaVersion, acceptedAt: dpaAcceptedAt },
    status: "provisioning",
    step: STEPS[0],
    stepIndex: 0,
    attempt,
    // Of THIS attempt, not of the signup. tempo-web times its "taking longer
    // than usual" panel off this, and timing it from the first attempt would
    // tell somebody their second try was slow the moment it started.
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    url: null,
    trialEndsAt: null,
    errorCode: null,
    recovery: null,
    error: null,
    lockedUntil: null,
  };

  await db.collection("provisions").doc(provisionId).set(record);

  // Kick the first step now rather than waiting up to a minute for the cron.
  // Deliberately not awaited for its result: the response must not depend on
  // how long creating a database takes, and the cron is the thing that
  // guarantees progress if this pass dies.
  advance(provisionId).catch((e) => console.error("[provision] first step:", e?.message));

  return NextResponse.json(
    { status: "accepted", provisionId },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Leave evidence that somebody paid and we refused to build.
 *
 * One document per signupRef, so tempo-web retrying the create — which it is
 * entitled to do — neither multiplies rows on the console nor sends a second
 * alert. `attempts` says how insistent the caller was; `firstSeenAt` says how
 * long this has been true.
 *
 * NEVER THROWS. The customer's 402 is the important part of this response, and
 * a failed write here must not turn a precise refusal into an empty 500.
 */
async function recordBlockedCreate(
  signupRef: string,
  signupExists: boolean,
  ctx: { label: string; clinicName: string; adminEmail: string; tier: string },
): Promise<void> {
  try {
    const ref = adminDb().collection("provision_blocks").doc(signupRef);
    const prior = await ref.get();
    const now = new Date().toISOString();

    await ref.set(
      {
        signupRef,
        reason: signupExists ? "payment_unconfirmed" : "signup_missing",
        ...ctx,
        attempts: Number(prior.data()?.attempts || 0) + 1,
        firstSeenAt: prior.data()?.firstSeenAt || now,
        lastSeenAt: now,
      },
      { merge: true },
    );

    // First time only. This endpoint is polled and retried; an alert per call
    // would be a mailbox nobody reads within an hour of the first real problem.
    if (prior.exists) return;

    const { sent, reason } = await alertPlatform(
      `Signup blocked: ${ctx.clinicName || signupRef}`,
      [
        signupExists
          ? "A paid signup asked us to create a clinic, but the signup has no confirmedAt — Stripe's checkout.session.completed never landed."
          : "A signup asked us to create a clinic, but there is no signup record at all.",
        `signupRef: ${signupRef}`,
        `clinic: ${ctx.clinicName || "—"} (${ctx.label || "—"}), tier ${ctx.tier || "—"}`,
        `admin: ${ctx.adminEmail || "—"}`,
        "The customer has been told their setup did not finish. Check the Stripe webhook: its configuration, its signing secret, and whether the endpoint exists for the mode the payment was made in.",
      ],
    );
    if (!sent) console.error(`[provision/clinic] ${signupRef} blocked; alert not sent: ${reason}`);
  } catch (e) {
    console.error(`[provision/clinic] could not record block for ${signupRef}:`, (e as Error)?.message);
  }
}
