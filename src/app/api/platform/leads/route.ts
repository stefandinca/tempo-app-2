/**
 * Two lead funnels, one screen.
 *
 *   `leads`             the MARKETING site's contact form — a different
 *                        repository (tempo-web) — carrying a status a
 *                        Superadmin advances as the lead is worked.
 *   `potential_clients` the DEMO platform's entry form, `src/app/login/page.tsx`
 *                        in this repo, writing with the browser's own db
 *                        handle. Like the bug reports, a reader was never
 *                        built for this one either.
 *
 * Both are people who typed their contact details in expecting a sales call,
 * and both land in the same `clinic-demo` database. They were two inboxes
 * before this route; a lead in whichever one nobody opened simply never got
 * called. Merging them here — tagged with `source` rather than split across
 * two screens — is what makes "waiting to be contacted" one list again.
 *
 * `leads` has NO rule in firestore.rules, so it is denied to every browser by
 * default; it is written from outside this repo entirely and read here only
 * because the Admin SDK bypasses rules. Do not add a rule for it — nothing in
 * this repo is meant to write it directly, and a rule would only widen who
 * can.
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
const STATUSES = new Set(["new", "contacted", "qualified", "closed"]);
/** Deep enough to be the whole pipeline today. The response reports the true total. */
const PAGE = 500;

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const db = adminDb(LEADS_DATABASE);

    // ORDERED IN THE QUERY on BOTH collections. `limit` with no `orderBy` is
    // ordered by __name__, and these are auto-ids, so the old `.limit(500)` on
    // potential_clients returned a fixed lexicographic slice rather than the
    // newest leads — and once the collection passed 500, a lead who filled in
    // the form would simply never appear, while the client-side sort made the
    // page look complete.
    //
    // What makes orderBy safe on EACH collection is that every document in it
    // HAS `createdAt` — an orderBy silently DROPS documents that lack the
    // field, which would hide a lead completely. `leads`' sole writer is the
    // marketing site's contact form; `potential_clients`' sole writer is
    // login/page.tsx; both always set it.
    //
    // It does NOT follow that either collection holds one consistent TYPE of
    // timestamp. `leads` does, measured 21 Aug 2026: 7 of 7 documents carry a
    // Timestamp, because it is written once, by one form, in one repository.
    // `potential_clients` does not: it is in migrate-tenant.mjs's TOP_LEVEL
    // list, and that REST layer decodes timestampValue to a string and
    // re-encodes it as stringValue (see scripts/demo-seed/firestore.mjs).
    // Measured the same day: 27 of 30 documents carry an ISO string, only 3 a
    // Timestamp.
    //
    // Firestore orders by TYPE before value, so `desc` on potential_clients
    // returns every string ahead of every Timestamp regardless of date — a
    // problem that does not exist for `leads`, which has only one type. The
    // merge below concatenates both result sets and then re-sorts the WHOLE
    // array in JS on toISO()-normalised values, which is why that step is
    // kept rather than removed as redundant: it is the only place display
    // order is actually correct, both within potential_clients and across the
    // two sources. At 30 of 500 nothing on either side is truncated, and the
    // `total` returned below drives a banner that says so when it ever is.
    const [marketing, demo, marketingTotal, demoTotal] = await Promise.all([
      db.collection("leads").orderBy("createdAt", "desc").limit(PAGE).get().catch(() => null),
      db.collection("potential_clients").orderBy("createdAt", "desc").limit(PAGE).get().catch(() => null),
      countOf(db, "leads"),
      countOf(db, "potential_clients"),
    ]);

    const marketingLeads: Lead[] = (marketing?.docs || []).map((d) => {
      const l = d.data() as Record<string, any>;
      return {
        id: d.id,
        source: "marketing",
        name: l.name || "",
        email: l.email || "",
        phone: l.phone || "",
        message: l.message || "",
        teamSize: l.teamSize || "",
        clinic: "",
        status: l.status || null,
        createdAt: toISO(l.createdAt),
      };
    });

    const demoLeads: Lead[] = (demo?.docs || []).map((d) => {
      const l = d.data() as Record<string, any>;
      return {
        id: d.id,
        source: "demo",
        name: l.name || "",
        email: l.email || "",
        phone: l.phone || "",
        message: "",
        teamSize: "",
        clinic: l.clinic || "",
        status: null,
        createdAt: toISO(l.createdAt),
      };
    });

    const leads = [...marketingLeads, ...demoLeads];
    leads.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    // `total` so the console can say it is showing a slice rather than letting
    // a capped list read as the whole pipeline.
    return NextResponse.json({ leads, total: marketingTotal + demoTotal });
  } catch (e: any) {
    console.error("[platform/leads] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const db = adminDb(LEADS_DATABASE);
    await db.collection("leads").doc(id).update({
      status,
      triagedBy: gate.caller.uid,
      triagedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // update() on a document that does not exist is a gRPC NOT_FOUND (code 5).
    // Only `leads` documents have a status — `potential_clients` has no such
    // field at all — so a request naming a demo row's id will ALSO land here,
    // since the two collections have disjoint ids and the demo id was never
    // in `leads`. The two cases read the same at the Firestore layer but are
    // different facts for the caller, so this asks one more question before
    // answering: does that id exist in potential_clients? If so, it is a real
    // record that simply cannot be triaged this way (400); otherwise it is
    // genuinely unknown (404) — a stale console tab, or a lead deleted since
    // the list was fetched.
    if (e?.code === 5) {
      const db = adminDb(LEADS_DATABASE);
      const demoDoc = await db.collection("potential_clients").doc(id).get().catch(() => null);
      if (demoDoc?.exists) {
        return NextResponse.json({ error: "not_triageable" }, { status: 400 });
      }
      return NextResponse.json({ error: "unknown_lead" }, { status: 404 });
    }
    console.error("[platform/leads] patch failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
