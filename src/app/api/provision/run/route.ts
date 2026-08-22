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
  const results: { provisionId: string; result: string }[] = [];
  for (const provisionId of ids) {
    try {
      results.push({ provisionId, result: await advance(provisionId) });
    } catch (e) {
      // advance() records provisioning failures itself; reaching here means the
      // runner itself broke, which must not stop the other provisions.
      console.error(`[provision/run] ${provisionId}:`, (e as Error)?.message);
      results.push({ provisionId, result: "runner_error" });
    }
  }

  return NextResponse.json({ advanced: results.length, results }, { headers: { "Cache-Control": "no-store" } });
}
