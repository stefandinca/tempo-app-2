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
import { countOf, tenantIdentity } from "@/lib/platform/counts";
import { DEFAULT_GRACE_DAYS, DEFAULT_TIER } from "@/lib/platform/licence";
import type { ClinicDetail } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  // Checked here, before any I/O, so a malformed label never reaches
  // .doc(params.id) either — a path segment with a slash in it names a
  // different document altogether.
  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  try {
    // Not guarded by .catch(): if the registry lookup itself fails, we do not
    // know what clinic we are looking at, and 500 is the correct response.
    const registryDoc = await adminDb().collection("tenants").doc(params.id).get();
    if (!registryDoc.exists) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

    // Database id and hostname from the same helper the list routes use, so
    // this page cannot disagree with the row that linked to it.
    const identity = tenantIdentity(registryDoc);
    if (!identity) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

    const t = registryDoc.data() as Record<string, any>;
    const db = adminDb(identity.databaseId);

    // Everything below reads the CLINIC's own database, which can be
    // unreachable even when the registry (control plane) is fine. countOf()
    // already degrades to 0 on failure; the raw .get() calls need the same
    // treatment here so one broken clinic renders as zeros/empty/null
    // instead of 500ing the whole page.
    const [staffCount, clients, events, staffSnap, evalSnap, brandingSnap, configSnap, licenceSnap] =
      await Promise.all([
        countOf(db, "team_members"),
        countOf(db, "clients"),
        countOf(db, "events"),
        db.collection("team_members").limit(50).get().catch(() => null),
        db.collection("system_settings").doc("evaluation_access").get().catch(() => null),
        db.collection("system_settings").doc("branding").get().catch(() => null),
        db.collection("system_settings").doc("config").get().catch(() => null),
        db.collection("system_settings").doc("licence").get().catch(() => null),
      ]);

    // The licence shown below comes from the REGISTRY (`t.licence`), not
    // `licenceSnap` above. The write route deliberately writes the registry
    // first, precisely so that a failed mirror write leaves the clinic
    // unrestricted and reports `mirrored: false` while the console still
    // shows the licence that was just set. If this route gated display on
    // `licenceSnap.exists` instead, that exact case — mirror write failed,
    // registry has a licence — would render as "no licence — unlimited",
    // hiding the one state the write order exists to keep visible. Do not
    // switch this back to the mirror. `licenceSnap` is still fetched above,
    // unused here, for Task 7's drift comparison against the registry.
    const registryLicence = (t?.licence ?? null) as {
      plan?: string;
      tier?: string;
      expiresAt?: string | null;
      graceDays?: number;
      notes?: string;
    } | null;
    const config = configSnap?.exists ? (configSnap.data() as Record<string, any>) : null;
    const entities = Array.isArray(config?.legalEntities) ? config!.legalEntities : [];

    const clinic: ClinicDetail = {
      tenantId: identity.tenantId,
      name: t.name || identity.tenantId,
      databaseId: identity.databaseId,
      bucket: t.bucket || "",
      status: t.status || "unknown",
      isDemo: !!t.isDemo,
      host: identity.host,
      counts: { clients, staff: staffCount, events },
      licence: registryLicence
        ? {
            plan: registryLicence.plan || "unknown",
            // Licences written before tiers existed carry none. Reporting the
            // default rather than an empty string means the editor opens on a
            // real choice instead of an unselected control, and it matches
            // what the API would store if saved untouched.
            tier: String(registryLicence.tier || DEFAULT_TIER),
            expiresAt: registryLicence.expiresAt ?? null,
            graceDays: Number(registryLicence.graceDays ?? DEFAULT_GRACE_DAYS),
            notes: String(registryLicence.notes || ""),
          }
        : null,
      disabledEvaluations: evalSnap?.exists ? (evalSnap.data()?.disabled ?? []) : [],
      brandingLogoUrl: brandingSnap?.exists ? (brandingSnap.data()?.logoUrl ?? null) : null,
      legalName: entities[0]?.name ?? null,
      staff: staffSnap
        ? staffSnap.docs.map((d) => {
            const m = d.data() as Record<string, any>;
            return { uid: d.id, name: m.name || "", role: m.role || "", email: m.email || "" };
          })
        : [],
    };

    return NextResponse.json({ clinic });
  } catch (e: any) {
    console.error("[platform/clinics/:id] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
