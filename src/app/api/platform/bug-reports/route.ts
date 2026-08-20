/**
 * The bug-report inbox.
 *
 * Reports from every clinic land in ONE database — `clinic-demo`, pinned by
 * BUG_REPORT_DATABASE in api/report-bug — so they can be read together instead
 * of scattered per clinic where nobody would look. This is the reader that was
 * never built: the write path, the rules and the email have existed since the
 * feature shipped.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { countOf } from "@/lib/platform/counts";
import { toISO } from "@/lib/timestamps";
import type { BugReport } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Must match BUG_REPORT_DATABASE in src/app/api/report-bug/route.ts. */
const BUG_REPORT_DATABASE = "clinic-demo";
const STATUSES = new Set(["new", "triaged", "resolved", "wontfix"]);
/** One screenful and then some. The response reports the true total alongside. */
const PAGE = 200;

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const db = adminDb(BUG_REPORT_DATABASE);

    // ORDERED IN THE QUERY, which `limit` alone is not. Firestore orders an
    // unordered query by __name__, and these are auto-ids — random strings —
    // so `.limit(200)` on its own returned a FIXED lexicographic slice of the
    // collection, not the most recent 200. Every report filed once the
    // collection passed 200 documents would have been invisible for good, and
    // the client-side sort by date made the result look complete.
    //
    // The comment that used to sit here justified skipping orderBy on the
    // grounds that createdAt is a string on some rows and a Timestamp on
    // others. That is true of the database as a whole (see lib/timestamps) but
    // NOT of this collection: api/report-bug is its only writer and always
    // writes `new Date().toISOString()`, so every document holds a string and
    // orderBy is well defined over all of them. (It would also mean every
    // document HAS the field — an orderBy silently drops documents that lack
    // it — and the same single writer guarantees that.)
    //
    // The JS sort below is kept as a cheap stabiliser rather than removed:
    // toISO() has already normalised both shapes by then, so if a row is ever
    // written with a Timestamp — Firestore sorts those before strings, which
    // would put it at the wrong end of the page — the rendered order is still
    // right. 200 rows sort instantly.
    const [snap, total] = await Promise.all([
      db.collection("bug_reports").orderBy("createdAt", "desc").limit(PAGE).get(),
      countOf(db, "bug_reports"),
    ]);

    const reports: BugReport[] = snap.docs.map((d) => {
      const r = d.data() as Record<string, any>;
      return {
        id: d.id,
        tenantId: r.tenantId || "",
        host: r.host || "",
        page: r.page || "",
        title: r.title || "",
        description: r.description || "",
        status: r.status || "new",
        reportedBy: r.reportedBy || null,
        userAgent: r.userAgent || "",
        createdAt: toISO(r.createdAt),
      };
    });

    reports.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    // `total` so the console can say it is showing a slice. A truncated list
    // that does not admit it is truncated is the same failure as the missing
    // orderBy, one layer up.
    return NextResponse.json({ reports, total });
  } catch (e: any) {
    console.error("[platform/bug-reports] failed:", String(e?.message || e));
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
    await adminDb(BUG_REPORT_DATABASE).collection("bug_reports").doc(id).update({
      status,
      triagedBy: gate.caller.uid,
      triagedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // update() on a document that does not exist is a gRPC NOT_FOUND (code 5).
    // That is the caller naming a report that is not there — a stale console
    // tab, or a report deleted since the list was fetched — not a fault on
    // this side, and 500 would send the operator looking for an outage.
    if (e?.code === 5) {
      return NextResponse.json({ error: "unknown_report" }, { status: 404 });
    }
    console.error("[platform/bug-reports] patch failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
