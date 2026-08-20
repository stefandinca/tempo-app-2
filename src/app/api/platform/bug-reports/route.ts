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
import { toISO } from "@/lib/timestamps";
import type { BugReport } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Must match BUG_REPORT_DATABASE in src/app/api/report-bug/route.ts. */
const BUG_REPORT_DATABASE = "clinic-demo";
const STATUSES = new Set(["new", "triaged", "resolved", "wontfix"]);

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const snap = await adminDb(BUG_REPORT_DATABASE)
      .collection("bug_reports")
      .limit(200)
      .get();

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

    // Sorted here rather than in the query: createdAt is a string on some rows
    // and a Timestamp on others (see lib/timestamps), so orderBy would drop or
    // misorder them. 200 rows sort instantly.
    reports.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return NextResponse.json({ reports });
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
    console.error("[platform/bug-reports] patch failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
