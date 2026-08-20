/**
 * Per-clinic reachability — the runbook's manual per-host curl, as one page.
 *
 * Checked server-side rather than by fetching each clinic's /api/assistant/health
 * over the network: the Admin SDK can read every database directly, and an
 * HTTP fan-out would report a CDN hiccup as a broken clinic.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { tenantIdentity } from "@/lib/platform/counts";
import { anthropicKeyFor } from "@/lib/assistant/anthropic";
import type { ClinicHealth } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const health = await Promise.all(
      registry.docs.map(async (doc): Promise<ClinicHealth> => {
        const t = doc.data() as { name?: string; databaseId?: string; bucket?: string };
        const identity = tenantIdentity(doc);

        // A registry id that is not a well-formed clinic label is itself a
        // broken clinic, and this is the screen that reports broken clinics —
        // so it becomes a row with the reason, rather than a clinic quietly
        // missing from the estate.
        if (!identity) {
          return {
            tenantId: doc.id,
            name: t.name || doc.id,
            databaseReachable: false,
            bucketConfigured: !!t.bucket,
            anthropicKeyPresent: !!anthropicKeyFor(doc.id),
            licencePresent: false,
            error: `registry id ${JSON.stringify(doc.id)} is not a valid clinic label`,
          };
        }

        let databaseReachable = false;
        let licencePresent = false;
        let error: string | null = null;

        try {
          const db = adminDb(identity.databaseId);
          await db.collection("team_members").limit(1).get();
          databaseReachable = true;
          licencePresent = (await db.collection("system_settings").doc("licence").get()).exists;
        } catch (e: any) {
          error = String(e?.message || e).slice(0, 160);
        }

        return {
          tenantId: identity.tenantId,
          name: t.name || identity.tenantId,
          databaseReachable,
          bucketConfigured: !!t.bucket,
          anthropicKeyPresent: !!anthropicKeyFor(identity.tenantId),
          licencePresent,
          error,
        };
      }),
    );

    health.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ health });
  } catch (e: any) {
    console.error("[platform/health] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
