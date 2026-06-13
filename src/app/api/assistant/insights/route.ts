import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireStaffWithConsent } from "@/lib/assistant/gate";
import { getAnthropic, MODEL } from "@/lib/assistant/anthropic";
import { emptyUsage, addUsage, computeCostUsd } from "@/lib/assistant/pricing";
import {
  insightsSystemPrompt,
  insightsUserMessage,
  INSIGHTS_TOOL,
  type InsightsResult,
  type Lang,
} from "@/lib/assistant/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Demo / unconfigured deployments have no API key — surface a friendly
  // "feature only in the full release" signal instead of erroring.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  const gate = await requireStaffWithConsent(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const language: Lang = body?.language === "ro" ? "ro" : "en";
  const context = body?.context;
  if (!context || !context.instrument) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  try {
    const client = getAnthropic();
    // Forced single-tool call → guaranteed structured output, no beta headers.
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: insightsSystemPrompt(language),
      tools: [INSIGHTS_TOOL],
      tool_choice: { type: "tool", name: INSIGHTS_TOOL.name },
      messages: [{ role: "user", content: insightsUserMessage(context) }],
    });

    const toolUse = resp.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "no_insights" }, { status: 502 });
    }
    const insights = toolUse.input as InsightsResult;

    // Record token usage + cost so evaluation-insights spend shows in the
    // superadmin AI usage view (best-effort; never fail the request on logging).
    try {
      const usage = emptyUsage();
      addUsage(usage, resp.usage);
      await adminDb()
        .collection("ai_usage_events")
        .add({
          uid: gate.ctx.uid,
          userName: gate.ctx.name || "",
          kind: "insights",
          model: MODEL,
          instrument: context.instrument || null,
          evalKind: typeof body?.kind === "string" ? body.kind : null,
          clientId: typeof body?.clientId === "string" ? body.clientId : null,
          usage,
          costUsd: computeCostUsd(MODEL, usage),
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch (e: any) {
      console.error("[assistant/insights] usage log failed:", e?.message || e);
    }

    return NextResponse.json({ insights, model: MODEL });
  } catch (err: any) {
    console.error("[assistant/insights]", err?.message || err);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
