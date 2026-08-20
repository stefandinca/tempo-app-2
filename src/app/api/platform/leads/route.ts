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
    // orderBy is well defined here because login/page.tsx is the only writer
    // and always sets `createdAt: serverTimestamp()`: every document holds a
    // Timestamp, and every document HAS the field, which an orderBy requires
    // (it silently drops documents that lack it). The JS sort below is kept as
    // a stabiliser — toISO() has normalised the value by then, so a row ever
    // written with an ISO string instead still lands in the right place.
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
