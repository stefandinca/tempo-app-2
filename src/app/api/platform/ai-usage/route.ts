/**
 * What Mira costs, per clinic.
 *
 * Each clinic pays for its own Anthropic key, so this is the number that says
 * whether a clinic's usage matches what they pay. Both ledgers are written
 * server-side only: ai_conversations rolls up a chat's cost, ai_usage_events
 * records one row per evaluation-insights generation.
 */
import { NextResponse, type NextRequest } from "next/server";
import { AggregateField, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import { tenantIdentity } from "@/lib/platform/counts";
import type { ClinicSpend } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One ledger's row count and cost.
 *
 * Aggregated server-side rather than fetched-and-summed: a fetch capped at a
 * page size silently under-counts once a clinic passes that many rows, and
 * this number is what an invoice gets reconciled against.
 *
 * Returns null — never a zero — when the aggregate fails. The two ledgers used
 * to share one try/catch, so a clinic whose ai_conversations read succeeded and
 * whose ai_usage_events read threw returned the partial sum, and the console
 * rendered it as a finished `$x.xxxx`. A cost that is silently low is worse
 * than one that admits it does not know.
 */
async function ledger(
  db: Firestore,
  collection: string,
  tenantId: string,
): Promise<{ n: number; cost: number } | null> {
  try {
    const agg = await db
      .collection(collection)
      .aggregate({ n: AggregateField.count(), cost: AggregateField.sum("costUsd") })
      .get();
    return { n: agg.data().n, cost: Number(agg.data().cost || 0) };
  } catch (e: any) {
    console.error(`[platform/ai-usage] ${tenantId}/${collection} failed:`, String(e?.message || e));
    return null;
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const spend = (
      await Promise.all(
        registry.docs.map(async (doc): Promise<ClinicSpend | null> => {
          const identity = tenantIdentity(doc);
          if (!identity) {
            console.error("[platform/ai-usage] registry id is not a clinic label:", doc.id);
            return null;
          }
          const t = doc.data() as { name?: string };
          const db = adminDb(identity.databaseId);

          const [conv, events] = await Promise.all([
            ledger(db, "ai_conversations", identity.tenantId),
            ledger(db, "ai_usage_events", identity.tenantId),
          ]);
          const costUsd = (conv?.cost || 0) + (events?.cost || 0);

          return {
            tenantId: identity.tenantId,
            name: t.name || identity.tenantId,
            conversations: conv?.n || 0,
            insightEvents: events?.n || 0,
            costUsd: Math.round(costUsd * 10000) / 10000,
            // EITHER ledger failing makes the whole row untrustworthy: the
            // one that failed contributes a fabricated 0 to both its count
            // and the cost.
            partial: !conv || !events,
          };
        }),
      )
    ).filter((s): s is ClinicSpend => s !== null);

    spend.sort((a, b) => b.costUsd - a.costUsd);
    return NextResponse.json({ spend });
  } catch (e: any) {
    console.error("[platform/ai-usage] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
