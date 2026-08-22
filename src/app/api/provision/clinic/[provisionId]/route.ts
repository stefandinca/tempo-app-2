/**
 * How is that clinic coming along?
 *
 * Polled by tempo-web while its "setting up your clinic" screen is up. Read
 * only: it never advances the work. Provisioning is driven by a cron precisely
 * so that a customer who closes the tab still gets their clinic, and a status
 * endpoint that advanced steps would quietly undo that.
 *
 * WHAT IT PROMISES
 *   - `step` only ever moves FORWARD within one provisionId. tempo-web's
 *     progress display relies on it, treating an absent step as "no new
 *     information" so a transient read cannot walk the bar backwards.
 *   - `startedAt` is of THIS attempt, so "taking longer than usual" can be
 *     measured rather than guessed.
 *   - `step` is a key from a closed enum, never display text. tempo-web owns
 *     the Romanian; copy crossing a repo boundary means the first typo is
 *     fixable only by someone with deploy access to the wrong repo.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSignupToken } from "@/lib/platform/signupAuth";
import type { ProvisionRecord } from "@/lib/platform/provision/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { provisionId: string } },
) {
  const denied = requireSignupToken(req);
  if (denied) return denied;

  const provisionId = String(params.provisionId || "").trim();
  if (!provisionId || provisionId.length > 128) {
    return NextResponse.json({ error: "invalid_provision_id" }, { status: 400 });
  }

  const snap = await adminDb().collection("provisions").doc(provisionId).get();
  if (!snap.exists) {
    // A provisionId we have never issued. Polling will never resolve it, and
    // tempo-web treats 404 as "gone" rather than "not yet" for that reason.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const r = snap.data() as ProvisionRecord;

  return NextResponse.json(
    {
      status: r.status,
      step: r.step,
      attempt: r.attempt ?? 1,
      startedAt: r.startedAt ?? r.createdAt ?? null,
      // Present only when there is something to go to. Null while provisioning
      // means "not yet", never "no clinic".
      url: r.status === "ready" ? r.url ?? null : null,
      trialEndsAt: r.status === "ready" ? r.trialEndsAt ?? null : null,
      // Only on failure, and `recovery` is the field to branch on — the three
      // values are a closed set, while errorCode is an open list that will grow.
      errorCode: r.status === "failed" ? r.errorCode ?? "internal" : null,
      recovery: r.status === "failed" ? r.recovery ?? "support" : null,
      error: null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
