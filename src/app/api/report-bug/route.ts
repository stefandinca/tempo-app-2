/**
 * Bug reports from any clinic, sent to us.
 *
 * Two destinations, deliberately in this order:
 *
 *   1. `bug_reports` in ONE database, so every clinic's reports land in a single
 *      inbox rather than scattered across per-clinic databases where nobody
 *      would ever look at them together.
 *   2. An email, so a report is noticed rather than merely stored.
 *
 * The write happens first and the email is best-effort. If Resend is down, or
 * `RESEND_API_KEY` is not set at all, the report is still saved and the caller
 * still sees success — losing a bug report because of a missing env var would
 * be a worse bug than the one being reported. The response says whether the
 * email actually went, so the gap is visible rather than silent.
 *
 * A server route because both halves need it: the clinic's browser is bound to
 * its own database and cannot write to the shared one, and the Resend key must
 * never reach a client bundle.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireStaffRole } from "@/lib/serverAuth";
import { tenantDatabaseFromRequest, tenantIdFromRequest } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The single inbox. Every clinic's reports go here, whichever clinic reported. */
const BUG_REPORT_DATABASE = "clinic-demo";
const BUG_REPORT_COLLECTION = "bug_reports";

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sendEmail(subject: string, lines: [string, string][], body: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "RESEND_API_KEY not set" };

  const to = process.env.BUG_REPORT_TO || "stefan.dinca07@gmail.com";
  const from = process.env.RESEND_FROM || "TempoApp <bugs@tempoapp.ro>";

  const table = lines
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${escapeHtml(k)}</td>` +
        `<td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`,
    )
    .join("");

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">` +
    `<table style="border-collapse:collapse;margin-bottom:16px">${table}</table>` +
    `<div style="white-space:pre-wrap;padding:12px;background:#f6f6f6;border-radius:8px">${escapeHtml(body)}</div>` +
    `</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("[report-bug] Resend rejected the message:", res.status, detail);
      return { sent: false, reason: `resend_${res.status}: ${detail.slice(0, 160)}` };
    }
    return { sent: true };
  } catch (e: any) {
    console.error("[report-bug] Resend request failed:", String(e?.message || e));
    return { sent: false, reason: "resend_unreachable" };
  }
}

export async function POST(req: NextRequest) {
  const database = tenantDatabaseFromRequest(req);
  const tenantId = tenantIdFromRequest(req) || "platform";

  // Any member of staff may report a bug — the person who hits the problem is
  // usually the therapist, not the administrator.
  const gate = await requireStaffRole(req, ["admin", "coordinator", "therapist"], database);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: { title?: string; description?: string; page?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const title = String(body.title || "").trim().slice(0, MAX_TITLE);
  const description = String(body.description || "").trim().slice(0, MAX_DESCRIPTION);
  if (!title || !description) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const report = {
    tenantId,
    host: req.headers.get("host") || "",
    title,
    description,
    page: String(body.page || "").slice(0, 300),
    reportedBy: { uid: gate.caller.uid, name: gate.caller.name, role: gate.caller.role },
    userAgent: (req.headers.get("user-agent") || "").slice(0, 400),
    status: "new",
    createdAt: new Date().toISOString(),
  };

  let id: string;
  try {
    const written = await adminDb(BUG_REPORT_DATABASE).collection(BUG_REPORT_COLLECTION).add(report);
    id = written.id;
  } catch (e: any) {
    // Only a failure to STORE is a failure: that is the copy we would act on.
    console.error("[report-bug] could not store the report:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const email = await sendEmail(
    `[TempoApp bug] ${tenantId}: ${title}`,
    [
      ["Clinic", tenantId],
      ["Reported by", `${report.reportedBy.name || report.reportedBy.uid} (${report.reportedBy.role})`],
      ["Page", report.page || "—"],
      ["Report id", id],
    ],
    description,
  );

  // The reason travels back so a silent email failure is diagnosable. It is a
  // status line from Resend, never a credential.
  return NextResponse.json({ ok: true, id, emailed: email.sent, ...(email.sent ? {} : { emailError: email.reason }) });
}
