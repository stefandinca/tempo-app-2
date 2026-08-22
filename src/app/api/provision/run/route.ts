/**
 * The thing that actually builds clinics.
 *
 * Runs on a schedule and advances every in-flight provision by one step. This
 * is what makes "a customer who closes the tab still gets their clinic" true —
 * nothing about the work depends on a browser being open.
 *
 * ONE STEP PER PROVISION PER PASS, deliberately. It bounds how long a pass can
 * take, so a slow database cannot starve the other provisions in the queue, and
 * it means a pass that dies costs one step rather than a whole clinic.
 *
 * AUTHENTICATION: Vercel's cron secret, or the platform token. Left open, this
 * would be an unauthenticated way to make the platform do work.
 */
import { NextResponse, type NextRequest } from "next/server";
import { advance, pending } from "@/lib/platform/provision/runner";
import { signupTokenConfigured } from "@/lib/platform/signupAuth";

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

  if (!ids.length) return NextResponse.json({ advanced: 0, results: [] });

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

  return NextResponse.json({ advanced: results.length, results }, { headers: { "Cache-Control": "no-store" } });
}
