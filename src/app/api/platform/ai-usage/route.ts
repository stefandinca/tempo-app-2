/**
 * What Mira costs, per clinic.
 *
 * Each clinic pays for its own Anthropic key, so this is the number that says
 * whether a clinic's usage matches what they pay. Both ledgers are written
 * server-side only: ai_conversations rolls up a chat's cost, ai_usage_events
 * records one row per evaluation-insights generation.
 */
import { NextResponse, type NextRequest } from "next/server";
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
          const convs = await db.collection("ai_conversations").limit(1000).get();
          conversations = convs.size;
          convs.forEach((c) => { costUsd += Number(c.data().costUsd || 0); });

          const events = await db.collection("ai_usage_events").limit(1000).get();
          insightEvents = events.size;
          events.forEach((e) => { costUsd += Number(e.data().costUsd || 0); });
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
