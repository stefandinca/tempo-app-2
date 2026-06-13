import { NextRequest, NextResponse } from "next/server";
import { requireStaffWithConsent } from "@/lib/assistant/gate";
import { getAnthropic, MODEL } from "@/lib/assistant/anthropic";
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
    return NextResponse.json({ insights, model: MODEL });
  } catch (err: any) {
    console.error("[assistant/insights]", err?.message || err);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
