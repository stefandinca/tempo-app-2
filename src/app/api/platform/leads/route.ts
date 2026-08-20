/**
 * Sales leads from the demo platform's entry form.
 *
 * `src/app/login/page.tsx` writes these with the browser's own db handle, so
 * they land in whatever database that host resolves to — in practice
 * `clinic-demo`, since the form is on the demo site. Like the bug reports, a
 * reader was never built.
 *
 * These carry contact details a person typed in expecting a sales call, so the
 * route is Superadmin-only and the console does not export them anywhere.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { toISO } from "@/lib/timestamps";
import type { Lead } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADS_DATABASE = "clinic-demo";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const snap = await adminDb(LEADS_DATABASE).collection("potential_clients").limit(500).get();

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
    return NextResponse.json({ leads });
  } catch (e: any) {
    console.error("[platform/leads] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
