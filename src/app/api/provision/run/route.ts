/**
 * The thing that actually builds clinics.
 *
 * Runs on a schedule and advances in-flight provisions. This is what makes "a
 * customer who closes the tab still gets their clinic" true — nothing about the
 * work depends on a browser being open.
 *
 * CALLED BY GOOGLE CLOUD SCHEDULER, not by Vercel's cron. Vercel's never fired:
 * the plan triggers cron jobs roughly daily whatever the expression says, so
 * provisioning silently only advanced while somebody was polling this endpoint
 * by hand. A scheduled job that does not run looks exactly like one with
 * nothing to do. The vercel.json entry stays as a harmless second trigger.
 *
 * PROGRESS-BOUNDED, NOT STEP-BOUNDED. An earlier version did one step per pass,
 * which meant one step per MINUTE once a real scheduler was calling it — six of
 * the seven steps take seconds, so a clinic spent six minutes waiting for ticks.
 * A pass now continues while `advance` reports real progress, inside a time
 * budget, so a slow database still cannot starve the queue and a pass that dies
 * still costs one step rather than a clinic.
 *
 * AUTHENTICATION: the cron secret, or the platform token. Left open, this would
 * be an unauthenticated way to make the platform do work.
 */
import { NextResponse, type NextRequest } from "next/server";
import { advance, pending } from "@/lib/platform/provision/runner";
import { signupTokenConfigured } from "@/lib/platform/signupAuth";
import { checkStranded } from "@/lib/platform/stranded";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Most steps a single provision may take in one pass.
 *
 * Seven is the whole sequence, so this can never loop forever even if a step
 * started reporting progress it had not made — a bug that would otherwise turn
 * a runaway into a billing surprise rather than an error.
 */
const STEP_CAP = 8;

/**
 * Vercel signs cron invocations with CRON_SECRET when it is set. The platform
 * token is accepted too so a human can kick the queue during an incident
 * without waiting for the next minute.
 */
function authorised(req: NextRequest): boolean {
  const header = (req.headers.get("authorization") || "").replace(/^Bearer /, "").trim();
  if (!header) return false;
  const cron = (process.env.CRON_SECRET || "").trim();
  const token = (process.env.PROVISION_API_TOKEN || "").trim();
  return (!!cron && header === cron) || (!!token && header === token);
}

export async function GET(req: NextRequest) {
  if (!signupTokenConfigured() && !process.env.CRON_SECRET) {
    // Nothing to check against. Refusing is the only safe answer — an open
    // endpoint here is an open endpoint that provisions clinics.
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  let ids: string[];
  try {
    ids = await pending();
  } catch (e) {
    // An unhandled throw here becomes an empty 500 with nothing in the body,
    // which is how a missing Firestore index cost a debugging session: every
    // pass failed identically and silently, and the queue simply never drained.
    console.error("[provision/run] could not list pending:", (e as Error)?.message);
    return NextResponse.json(
      { error: "queue_unreadable", detail: String((e as Error)?.message).slice(0, 300) },
      { status: 500 },
    );
  }

  if (!ids.length) {
    // NOT an early exit. A stranded signup never entered the queue, so an empty
    // queue is the most likely state in which one exists.
    return NextResponse.json({ advanced: 0, results: [], stranded: await strandedCheck() });
  }

  // Sequential, not parallel. These steps talk to Google's control plane, which
  // rate-limits, and a burst of database creations is the one thing most likely
  // to produce the quota error we least want to hit.
  //
  // KEEP GOING WHILE A PROVISION IS MOVING, within a time budget.
  //
  // One step per pass meant one step per MINUTE, because that is how often the
  // scheduler calls. Six of the seven steps take a second or two, so a clinic
  // took six and a half minutes of which about six was waiting for the next
  // tick — long enough that the marketing site's "this is taking longer than
  // usual" panel fired on every healthy signup.
  //
  // The budget is what keeps this safe: `advance` is re-entered only while it
  // reports real progress (`done:`), so a step that is merely waiting on Google
  // (`waiting:`) yields immediately rather than spinning, and a terminal
  // provision stops. Nothing here can run longer than the function is allowed.
  const DEADLINE = Date.now() + 45_000;
  const results: { provisionId: string; result: string }[] = [];

  for (const provisionId of ids) {
    try {
      let result = await advance(provisionId);
      let steps = 1;
      while (result.startsWith("done:") && Date.now() < DEADLINE && steps < STEP_CAP) {
        result = await advance(provisionId);
        steps += 1;
      }
      results.push({ provisionId, result: steps > 1 ? `${result} (+${steps - 1})` : result });
    } catch (e) {
      // advance() records provisioning failures itself; reaching here means the
      // runner itself broke, which must not stop the other provisions.
      console.error(`[provision/run] ${provisionId}:`, (e as Error)?.message);
      results.push({ provisionId, result: "runner_error" });
    }
    if (Date.now() >= DEADLINE) break;
  }

  return NextResponse.json(
    { advanced: results.length, results, stranded: await strandedCheck() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Look for paid signups with no clinic. Never fatal.
 *
 * A clinic being built matters more than an alert about one that is not, so a
 * failure here is logged and swallowed rather than allowed to fail the pass
 * that is doing the actual work.
 */
async function strandedCheck(): Promise<{ found: number; alerted: boolean }> {
  try {
    return await checkStranded();
  } catch (e) {
    console.error("[provision/run] stranded check failed:", (e as Error)?.message);
    return { found: 0, alerted: false };
  }
}
