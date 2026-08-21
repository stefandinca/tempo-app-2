/**
 * The tier catalogue: what each plan is called, costs, promises and limits.
 *
 * Stored once, in the control plane, at `platform_tiers/catalogue`. Two very
 * different readers share it:
 *
 *   - the marketing site at tempoapp.ro, which renders the pricing cards from
 *     it directly and anonymously;
 *   - this platform, which caps a clinic's seats and clients from the same
 *     numbers when a tier is set on its licence.
 *
 * Sharing one record is the point. The pricing card says "Până la 30 clienți
 * activi" and the clinic stops at 30 because both read this entry — keeping the
 * sales copy and the enforced limit in separate places is how a site ends up
 * promising something the app refuses.
 *
 * GET is deliberately unauthenticated. Pricing is public, and the marketing
 * site has no credentials. It is served from here as well as from Firestore so
 * a caller that would rather have JSON over HTTP than a Firebase SDK can have
 * it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { buildCatalogue, defaultCatalogue } from "@/lib/platform/licence";
import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC = () => adminDb().collection("platform_tiers").doc("catalogue");

export async function GET() {
  try {
    const snap = await DOC().get();
    const stored = snap.exists ? snap.data()?.tiers : null;
    // Falls back to the built-in defaults rather than erroring or returning an
    // empty list: an unpublished catalogue must still render a pricing page.
    const tiers = Array.isArray(stored) && stored.length ? stored : defaultCatalogue();
    return NextResponse.json(
      { tiers, published: snap.exists },
      // Pricing changes rarely and is read by every visitor to the marketing
      // site. A short cache keeps that off Firestore without making an edit
      // take visibly long to appear.
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (e: unknown) {
    console.error("[platform/tiers] read failed:", (e as Error)?.message);
    // Still answer with something renderable. A pricing page that 500s is worse
    // than one showing the built-in defaults.
    return NextResponse.json({ tiers: defaultCatalogue(), published: false });
  }
}

export async function PUT(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  let body: { tiers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const built = buildCatalogue(body.tiers);
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  try {
    await DOC().set({
      tiers: built,
      updatedAt: new Date().toISOString(),
      updatedBy: gate.caller.uid,
    });

    // Logged into the control plane's own activity trail rather than a
    // clinic's: this changes what every clinic is sold, not what one clinic has.
    await logPlatformActivity("(default)", {
      type: "tiers_updated",
      targetName: "pricing catalogue",
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: {
        tiers: built.map((t) => `${t.id}:${t.monthlyEur ?? "quote"}`).join(", "),
      },
    }).catch(() => {});

    return NextResponse.json({ tiers: built });
  } catch (e: unknown) {
    console.error("[platform/tiers] write failed:", (e as Error)?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
