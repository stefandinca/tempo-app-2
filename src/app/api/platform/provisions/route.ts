/**
 * Every self-onboarding signup, and what happened to it.
 *
 * WHY THIS EXISTS
 * A customer paid, saw "your clinic was created but the setup did not finish —
 * we have been notified", and there was no screen anywhere in this platform
 * that could say what had failed. The evidence was a `provisions` document no
 * browser may read and a line in a serverless function's log. The person who
 * needed it was the operator, and the operator had the console open.
 *
 * THREE COLLECTIONS, BECAUSE A SIGNUP CAN DIE IN THREE PLACES
 *   signups           the sale. `confirmedAt` is written by the Stripe webhook
 *                     and is the ONLY evidence of payment this platform trusts.
 *   provision_blocks  a create call we refused — almost always a sale whose
 *                     webhook never landed. Nothing else records this: no
 *                     provision document is ever written for it.
 *   provisions        an attempt that started. Carries the step it reached and,
 *                     on failure, the error text.
 *
 * Reading only `provisions` would show an empty screen for exactly the failure
 * that is hardest to diagnose, which is how this was discovered in the first
 * place.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * No secrets, and no rebuilding from here. The one write it offers is `resume`,
 * which flips a failed attempt back to `provisioning` so the cron re-enters the
 * step that failed — the recovery the step machine was built for.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { toISO } from "@/lib/timestamps";
import { advance, type ProvisionRecord } from "@/lib/platform/provision/runner";
import type { ProvisionRow, SignupRow } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Deep enough to be the whole history today — this platform has had tens of
 * signups, not thousands — and bounded so a runaway never turns the console
 * into a timeout.
 *
 * NOT ordered in the query, and that is a deliberate trade rather than an
 * oversight. `orderBy` silently DROPS documents missing the ordered field, and
 * both collections have some: a `signups` document created by the webhook alone
 * (a checkout whose draft never landed) carries no `createdAt`, and it is
 * precisely the broken signup this screen exists to show. So the read is capped
 * and sorted in memory, which means that once a collection passes this cap the
 * cap — not the sort — decides what is missing. The response says how many
 * documents there really are, and the screen says so too, so a slice can never
 * quietly read as the whole history.
 */
const PAGE = 500;
/** What the screen shows. Everything older is history, not an operations queue. */
const SHOW = 40;

const desc = (a: string | null, b: string | null) => String(b || "").localeCompare(String(a || ""));

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const db = adminDb();

    const [provisionSnap, signupSnap, blockSnap] = await Promise.all([
      db.collection("provisions").limit(PAGE).get(),
      db.collection("signups").limit(PAGE).get(),
      db.collection("provision_blocks").limit(PAGE).get(),
    ]);

    // Sorted here rather than with `orderBy`, for the reason the runner
    // documents: `orderBy` silently DROPS documents that lack the field, and a
    // provision written before `createdAt` existed would vanish from the one
    // screen whose job is to show provisions nobody is watching.
    const provisions: ProvisionRow[] = provisionSnap.docs
      .map((d) => {
        const r = d.data() as ProvisionRecord;
        return {
          provisionId: d.id,
          signupRef: r.signupRef || "",
          label: r.label || "",
          clinicName: r.clinicName || "",
          adminEmail: r.adminEmail || "",
          tier: r.tier || "",
          status: r.status || "provisioning",
          step: r.step || "",
          attempt: r.attempt ?? 1,
          errorCode: r.errorCode ?? null,
          recovery: r.recovery ?? null,
          // The whole message, not a summary. This is the field somebody opens
          // the screen for; truncating it here would send them back to the logs.
          error: r.error ?? null,
          url: r.url ?? null,
          // `inviteSent` is written by the admin step and is not on the record
          // type — a clinic can be `ready` with a customer who never got a
          // password link, which looks identical to success from every other
          // field on this row.
          inviteSent: (d.data() as { inviteSent?: boolean }).inviteSent ?? null,
          inviteError: (d.data() as { inviteError?: string | null }).inviteError ?? null,
          startedAt: toISO(r.startedAt) ?? null,
          updatedAt: toISO(r.updatedAt) ?? null,
        };
      })
      .sort((a, b) => desc(a.startedAt, b.startedAt))
      .slice(0, SHOW);

    const blocks = new Map(
      blockSnap.docs.map((d) => {
        const b = d.data() as { reason?: string; attempts?: number; lastSeenAt?: string };
        return [d.id, { reason: b.reason || "unknown", attempts: b.attempts ?? 1, lastSeenAt: toISO(b.lastSeenAt) }];
      }),
    );

    const started = new Set(provisionSnap.docs.map((d) => String((d.data() as ProvisionRecord).signupRef || "")));

    const signups: SignupRow[] = signupSnap.docs
      .map((d) => {
        const s = d.data() as {
          tier?: string;
          label?: string;
          clinicName?: string;
          adminEmail?: string;
          livemode?: boolean;
          confirmedAt?: unknown;
          provisioned?: boolean;
          createdAt?: unknown;
        };
        const block = blocks.get(d.id);
        return {
          signupRef: d.id,
          clinicName: s.clinicName || "",
          label: s.label || "",
          adminEmail: s.adminEmail || "",
          tier: s.tier || "",
          livemode: s.livemode !== false,
          confirmedAt: toISO(s.confirmedAt as never),
          provisioned: s.provisioned === true,
          // A sale with no attempt behind it. THIS is the row that was
          // invisible: paid, refused, and recorded nowhere the console looked.
          provisionStarted: started.has(d.id),
          blockedReason: block?.reason ?? null,
          blockedAttempts: block?.attempts ?? null,
          blockedAt: block?.lastSeenAt ?? null,
          createdAt: toISO(s.createdAt as never),
        };
      })
      .sort((a, b) => desc(a.createdAt, b.createdAt))
      .slice(0, SHOW);

    return NextResponse.json(
      { provisions, signups, total: { provisions: provisionSnap.size, signups: signupSnap.size } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[platform/provisions] failed:", (e as Error)?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/**
 * Resume a failed attempt.
 *
 * Nothing is rebuilt and nothing is rolled back: every step checks whether its
 * own work is already done, so flipping the record back to `provisioning` makes
 * the next cron pass re-enter the step that failed and walk the rest. That is
 * the entire recovery path once the cause — a missing credential, a quota, a
 * Vercel token — has been fixed.
 *
 * Only from `failed`. A `ready` provision must not be re-entered (it would
 * re-run the invite and mail the customer a second password link), and one
 * still `provisioning` is already being worked.
 */
export async function POST(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  let body: { provisionId?: unknown };
  try {
    body = (await req.json()) as { provisionId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const provisionId = typeof body.provisionId === "string" ? body.provisionId.trim() : "";
  if (!provisionId || provisionId.length > 128) {
    return NextResponse.json({ error: "invalid_provision_id" }, { status: 400 });
  }

  try {
    const ref = adminDb().collection("provisions").doc(provisionId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const rec = snap.data() as ProvisionRecord;
    if (rec.status !== "failed") {
      return NextResponse.json({ error: "not_failed", status: rec.status }, { status: 409 });
    }

    await ref.set(
      {
        status: "provisioning",
        errorCode: null,
        recovery: null,
        error: null,
        // A failed attempt can leave a lock behind if the pass died between
        // taking it and recording the failure. Resuming past a stale lock is
        // the point of resuming.
        lockedUntil: null,
        resumedAt: new Date().toISOString(),
        resumedBy: gate.caller.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // Kicked, not awaited — one step can take minutes and this response must
    // not. The cron carries it from here, exactly as it does for a new signup.
    advance(provisionId).catch((e) => console.error("[platform/provisions] resume:", e?.message));

    return NextResponse.json({ ok: true, provisionId, step: rec.step });
  } catch (e) {
    console.error("[platform/provisions] resume failed:", (e as Error)?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
