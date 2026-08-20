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
        const t = doc.data() as {
          name?: string;
          databaseId?: string;
          bucket?: string;
          licence?: { graceEndsAtMillis?: number | null };
        };
        const identity = tenantIdentity(doc);

        // The deadline the REGISTRY holds, versus the one the clinic's own
        // database holds. `undefined` means "no licence at all" and is kept
        // distinct from `null`, which is a lifetime licence that was recorded:
        // both are unrestricted at runtime, but only one of them means the
        // mirror write never landed, and that is what this column is for.
        const registryGrace: number | null | undefined = t.licence
          ? (t.licence.graceEndsAtMillis ?? null)
          : undefined;

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
            // There is no database to compare against, so this is unknown
            // rather than false — reported as drift so the row reads as
            // "look at this clinic", which is what the row is already saying.
            licenceInSync: false,
            error: `registry id ${JSON.stringify(doc.id)} is not a valid clinic label`,
          };
        }

        let databaseReachable = false;
        let licencePresent = false;
        let mirrorGrace: number | null | undefined;
        let error: string | null = null;

        try {
          const db = adminDb(identity.databaseId);
          await db.collection("team_members").limit(1).get();
          databaseReachable = true;
          const mirror = await db.collection("system_settings").doc("licence").get();
          licencePresent = mirror.exists;
          if (mirror.exists) mirrorGrace = mirror.data()?.graceEndsAtMillis ?? null;
        } catch (e: any) {
          error = String(e?.message || e).slice(0, 160);
        }

        // What the rules enforce is the MIRROR, so a mismatch means the clinic
        // is being held to a deadline nobody set in the console — in either
        // direction. Both absent is in sync: that is the unrestricted state
        // every clinic starts in, and it is not drift.
        //
        // An unreachable database cannot be compared, and reporting a clinic we
        // could not read as "in sync" would be the one wrong answer here.
        const licenceInSync = databaseReachable && registryGrace === mirrorGrace;

        return {
          tenantId: identity.tenantId,
          name: t.name || identity.tenantId,
          databaseReachable,
          bucketConfigured: !!t.bucket,
          anthropicKeyPresent: !!anthropicKeyFor(identity.tenantId),
          licencePresent,
          licenceInSync,
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
