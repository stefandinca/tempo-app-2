/**
 * Every clinic, with enough detail to render the console's front page.
 *
 * The registry lives in the control plane; the counts live in each clinic's own
 * database, so this fans out one read per clinic. `count()` aggregation is used
 * rather than fetching documents — Live Better Life has 88 clients and tens of
 * thousands of events, and the console only needs the number.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { countOf } from "@/lib/platform/counts";
import type { ClinicSummary } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const clinics = await Promise.all(
      registry.docs.map(async (doc): Promise<ClinicSummary> => {
        const t = doc.data() as {
          tenantId?: string;
          name?: string;
          databaseId?: string;
          bucket?: string;
          status?: string;
          isDemo?: boolean;
        };
        const databaseId = t.databaseId || `clinic-${doc.id}`;
        const db = adminDb(databaseId);

        const [clients, staff, events, licenceSnap] = await Promise.all([
          countOf(db, "clients"),
          countOf(db, "team_members"),
          countOf(db, "events"),
          db.collection("system_settings").doc("licence").get().catch(() => null),
        ]);

        const licence = licenceSnap?.exists
          ? (licenceSnap.data() as { plan?: string; expiresAt?: string | null })
          : null;

        return {
          tenantId: doc.id,
          name: t.name || doc.id,
          databaseId,
          bucket: t.bucket || "",
          status: t.status || "unknown",
          isDemo: !!t.isDemo,
          host: `${doc.id}.tempoapp.ro`,
          counts: { clients, staff, events },
          licence: licence
            ? { plan: licence.plan || "unknown", expiresAt: licence.expiresAt ?? null }
            : null,
        };
      }),
    );

    clinics.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ clinics });
  } catch (e: any) {
    console.error("[platform/clinics] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
