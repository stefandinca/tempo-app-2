/**
 * Sales leads from the demo platform's entry form.
 *
 * `src/app/login/page.tsx` writes these with the browser's own db handle, so
 * they land in whatever database that host resolves to — in practice
 * `clinic-demo`, since the form is on the demo site. Like the bug reports, a
 * reader was never built.
 *
 * These carry contact details a person typed in expecting a sales call, so this
 * ROUTE is Superadmin-only and the console does not export them anywhere. Do
 * not read that as "only Superadmins can see this data": firestore.rules grants
 * `allow read, update, delete: if isAdmin()` on potential_clients, and rules are
 * per database, so every Admin of the demo clinic can already read the very
 * same documents straight from the browser. Narrowing that is a rules change
 * with its own blast radius, not a console change — until it happens, this
 * route is a convenience, not a confidentiality boundary, and any claim that
 * the leads are Superadmin-only is about the route and nothing more.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { countOf } from "@/lib/platform/counts";
import { toISO } from "@/lib/timestamps";
import type { Lead } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADS_DATABASE = "clinic-demo";
/** Deep enough to be the whole pipeline today. The response reports the true total. */
const PAGE = 500;

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const db = adminDb(LEADS_DATABASE);

    // ORDERED IN THE QUERY. `limit` with no `orderBy` is ordered by __name__,
    // and these are auto-ids, so the old `.limit(500)` returned a fixed
    // lexicographic slice rather than the newest leads — and once the
    // collection passed 500, a lead who filled in the form would simply never
    // appear, while the client-side sort made the page look complete.
    //
    // What makes orderBy safe here is that every document HAS `createdAt` —
    // an orderBy silently DROPS documents that lack the field, which would
    // hide a lead completely. login/page.tsx is the only writer and always
    // sets it.
    //
    // It does NOT follow that they all hold a Timestamp. `potential_clients`
    // is in migrate-tenant.mjs's TOP_LEVEL list, and that REST layer decodes
    // timestampValue to a string and re-encodes it as stringValue (see
    // scripts/demo-seed/firestore.mjs). Measured 21 Aug 2026: 27 of 30
    // documents carry an ISO string, only 3 a Timestamp.
    //
    // Firestore orders by TYPE before value, so `desc` returns every string
    // ahead of every Timestamp regardless of date. Two consequences, both
    // currently harmless and neither silent:
    //   - Display order is correct anyway: the JS sort below re-sorts on
    //     toISO()-normalised values, which is why it is kept rather than
    //     removed as redundant.
    //   - The TRUNCATION boundary is not chronological. Past PAGE rows the
    //     cut would fall by type first, so Timestamp-dated leads would be the
    //     ones lost. At 30 of 500 nothing is cut, and the `total` returned
    //     below drives a banner that says so when it ever is.
    //
    // Backfilling the strings to Timestamps would remove the second caveat.
    // bug_reports has no equivalent problem: it is not in TOP_LEVEL, and its
    // sole writer stores an ISO string, so that collection is genuinely
    // uniform.
    const [snap, total] = await Promise.all([
      db.collection("potential_clients").orderBy("createdAt", "desc").limit(PAGE).get(),
      countOf(db, "potential_clients"),
    ]);

    const leads: Lead[] = snap.docs.map((d) => {
      const l = d.data() as Record<string, any>;
      return {
        id: d.id,
        name: l.name || "",
        email: l.email || "",
        phone: l.phone || "",
        clinic: l.clinic || "",
        consent: !!l.consent,
        source: l.source || "",
        createdAt: toISO(l.createdAt),
      };
    });

    leads.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    // `total` so the console can say it is showing a slice rather than letting
    // a capped list read as the whole pipeline.
    return NextResponse.json({ leads, total });
  } catch (e: any) {
    console.error("[platform/leads] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
