/**
 * What Mira costs, per clinic.
 *
 * Each clinic pays for its own Anthropic key, so this is the number that says
 * whether a clinic's usage matches what they pay. Both ledgers are written
 * server-side only: ai_conversations rolls up a chat's cost, ai_usage_events
 * records one row per evaluation-insights generation.
 */
import { NextResponse, type NextRequest } from "next/server";
import { AggregateField } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError } from "@/lib/platform/gate";
import type { ClinicSpend } from "@/lib/platform/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  try {
    const registry = await adminDb().collection("tenants").get();

    const spend = await Promise.all(
      registry.docs.map(async (doc): Promise<ClinicSpend> => {
        const t = doc.data() as { name?: string; databaseId?: string };
        const db = adminDb(t.databaseId || `clinic-${doc.id}`);
        let conversations = 0;
        let insightEvents = 0;
        let costUsd = 0;

        try {
          // Aggregated server-side rather than fetched-and-summed: a fetch capped at
          // a page size silently under-counts once a clinic passes that many rows,
          // and this number is what an invoice gets reconciled against.
          const convAgg = await db
            .collection("ai_conversations")
            .aggregate({ n: AggregateField.count(), cost: AggregateField.sum("costUsd") })
            .get();
          conversations = convAgg.data().n;
          costUsd += Number(convAgg.data().cost || 0);

          const eventAgg = await db
            .collection("ai_usage_events")
            .aggregate({ n: AggregateField.count(), cost: AggregateField.sum("costUsd") })
            .get();
          insightEvents = eventAgg.data().n;
          costUsd += Number(eventAgg.data().cost || 0);
        } catch {
          // An unreachable clinic contributes nothing rather than failing the page.
        }

        return {
          tenantId: doc.id,
          name: t.name || doc.id,
          conversations,
          insightEvents,
          costUsd: Math.round(costUsd * 10000) / 10000,
        };
      }),
    );

    spend.sort((a, b) => b.costUsd - a.costUsd);
    return NextResponse.json({ spend });
  } catch (e: any) {
    console.error("[platform/ai-usage] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
