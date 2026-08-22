/**
 * Is this subdomain available?
 *
 * Called from the marketing site as someone types their clinic name, so it is
 * public and unauthenticated — there is nothing secret in the answer, and
 * requiring a credential would mean the signup form holding one.
 *
 * WHY IT SHARES ITS RULES WITH tenant.ts RATHER THAN RESTATING THEM
 * `labelProblem()` is the same function `resolveDatabaseId()` uses at runtime.
 * A label this endpoint accepted and resolution then rejected would be a clinic
 * provisioned onto a hostname that silently resolves to the control plane — an
 * app with nothing in it, and no error anywhere to explain why.
 *
 * WHY "TAKEN" INCLUDES CLINICS THAT NO LONGER EXIST
 * A label that ever held client records is retired permanently. Parents keep
 * bookmarks, access codes travel by email and on paper, and staff have saved
 * logins — so reissuing a subdomain would point a parent at a different
 * clinic's login page with their child's access code in hand. The tenant
 * document becomes a tombstone rather than being deleted, and any existing
 * document means taken.
 *
 * The ORDER of the checks matters more than it looks. Provisioning runs after
 * the card is taken, so a label that passes here and fails there turns a
 * five-second correction into a refund conversation. This endpoint and
 * provisioning must reach the same verdict from the same inputs.
 *
 * See docs/superpowers/specs/2026-08-22-tenant-offboarding-design.md §5.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { labelProblem } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Reason = "taken" | "reserved" | "invalid";

function answer(available: boolean, reason?: Reason) {
  return NextResponse.json(
    available ? { available: true } : { available: false, reason },
    // Never cached. A label goes from free to taken the moment somebody else
    // provisions it, and a cached "available" is how two signups race for one
    // subdomain.
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  let body: { label?: unknown };
  try {
    body = await req.json();
  } catch {
    return answer(false, "invalid");
  }

  const label = typeof body?.label === "string" ? body.label.trim().toLowerCase() : "";

  // Shape first, and cheaply: this runs on every keystroke, and a malformed
  // label must never reach a document id.
  const problem = labelProblem(label);
  if (problem) return answer(false, problem);

  try {
    // Any existing document means taken — active clinic or tombstone alike.
    // Deliberately not `.where("status", "!=", "deleted")`: the whole point of
    // a tombstone is that it still occupies the name.
    const snap = await adminDb().collection("tenants").doc(label).get();
    if (snap.exists) return answer(false, "taken");
    return answer(true);
  } catch (e: unknown) {
    console.error("[provision/check-label] registry read failed:", (e as Error)?.message);
    // Fails CLOSED, unlike most of this codebase, and for the opposite reason.
    // Everywhere else an unknown state should let a clinic keep working; here
    // an optimistic "available" invites someone to pay for a subdomain that
    // may already belong to somebody. Saying "unavailable" costs a retry.
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
