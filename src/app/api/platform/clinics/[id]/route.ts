/**
 * One clinic, in detail.
 *
 * The clinic is named in the PATH, and validated before it reaches adminDb():
 * the host says who is asking, the path says who they are asking about, and an
 * unvalidated label is how a typo becomes a read of the wrong database.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { countOf } from "@/lib/platform/counts";
import type { ClinicDetail } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  const derived = clinicDatabaseId(params.id);
  if (!derived) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

  try {
    const registryDoc = await adminDb().collection("tenants").doc(params.id).get();
    if (!registryDoc.exists) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

    const t = registryDoc.data() as Record<string, any>;
    const databaseId = t.databaseId || derived;
    const db = adminDb(databaseId);

    const [clients, events, staffSnap, evalSnap, brandingSnap, configSnap, licenceSnap] =
      await Promise.all([
        countOf(db, "clients"),
        countOf(db, "events"),
        db.collection("team_members").limit(50).get(),
        db.collection("system_settings").doc("evaluation_access").get(),
        db.collection("system_settings").doc("branding").get(),
        db.collection("system_settings").doc("config").get(),
        db.collection("system_settings").doc("licence").get(),
      ]);

    const licence = licenceSnap.exists
      ? (licenceSnap.data() as { plan?: string; expiresAt?: string | null })
      : null;
    const config = configSnap.exists ? (configSnap.data() as Record<string, any>) : null;
    const entities = Array.isArray(config?.legalEntities) ? config!.legalEntities : [];

    const clinic: ClinicDetail = {
      tenantId: registryDoc.id,
      name: t.name || registryDoc.id,
      databaseId,
      bucket: t.bucket || "",
      status: t.status || "unknown",
      isDemo: !!t.isDemo,
      host: `${registryDoc.id}.tempoapp.ro`,
      counts: { clients, staff: staffSnap.size, events },
      licence: licence ? { plan: licence.plan || "unknown", expiresAt: licence.expiresAt ?? null } : null,
      disabledEvaluations: evalSnap.exists ? (evalSnap.data()?.disabled ?? []) : [],
      brandingLogoUrl: brandingSnap.exists ? (brandingSnap.data()?.logoUrl ?? null) : null,
      legalName: entities[0]?.name ?? null,
      staff: staffSnap.docs.map((d) => {
        const m = d.data() as Record<string, any>;
        return { uid: d.id, name: m.name || "", role: m.role || "", email: m.email || "" };
      }),
    };

    return NextResponse.json({ clinic });
  } catch (e: any) {
    console.error("[platform/clinics/:id] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
