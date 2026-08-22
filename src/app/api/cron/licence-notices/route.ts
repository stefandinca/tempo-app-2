/**
 * Daily: warn clinics whose trial or licence is about to end.
 *
 * The alternative to this endpoint is a customer discovering their card was
 * charged by seeing the charge. That is a chargeback and a bad review, and it
 * is entirely preventable by one email that the platform is uniquely able to
 * send — it holds both the licence and the subscription.
 *
 * Safe to run more than once a day. Each notice is recorded when it succeeds
 * and only then, so a re-run sends nothing new and a failed send is retried
 * tomorrow rather than counted as done.
 */
import { NextResponse, type NextRequest } from "next/server";
import { runNotices } from "@/lib/platform/notices";
import { beat, alertIfStale } from "@/lib/platform/heartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const presented = (req.headers.get("authorization") || "").replace(/^Bearer /, "").trim();
  if (!presented) return false;
  const cron = (process.env.CRON_SECRET || "").trim();
  const token = (process.env.PROVISION_API_TOKEN || "").trim();
  return (!!cron && presented === cron) || (!!token && presented === token);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET && !process.env.PROVISION_API_TOKEN) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  // Before the work, not after: a pass that sent nothing because nothing was
  // due still proves this job is alive. Stamping only on success would make the
  // healthy case — most days — indistinguishable from the job never running,
  // which is the exact failure this heartbeat exists to catch.
  await beat("licence-notices");

  // The reverse of the runner's check: this notices if the minute-by-minute job
  // has stopped. Slower to fire, but it is the only thing watching the watcher,
  // and provisioning stalling silently is what happened this morning.
  try {
    await alertIfStale();
  } catch (e) {
    console.error("[licence-notices] stale-schedule check failed:", (e as Error)?.message);
  }

  try {
    const results = await runNotices();
    const sent = results.filter((r) => r.sent).length;
    // Failures are returned rather than swallowed. A notice that did not go is
    // the whole problem this endpoint exists to prevent, so it must be visible
    // in the cron log rather than only in a Firestore field nobody opens.
    const failed = results.filter((r) => !r.sent);
    if (failed.length) console.error("[licence-notices] not sent:", JSON.stringify(failed));
    return NextResponse.json({ considered: results.length, sent, failed }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[licence-notices] pass failed:", (e as Error)?.message);
    return NextResponse.json(
      { error: "notices_failed", detail: String((e as Error)?.message).slice(0, 300) },
      { status: 500 },
    );
  }
}
