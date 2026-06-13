import { NextRequest, NextResponse } from "next/server";
import { requireStaffWithConsent } from "@/lib/assistant/gate";
import { getAnthropic, MODEL } from "@/lib/assistant/anthropic";
import { chatSystemPrompt, type Lang } from "@/lib/assistant/prompts";
import { ASSISTANT_TOOLS, executeAssistantTool } from "@/lib/assistant/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InMsg {
  role: "user" | "assistant";
  content: string;
}

// Max model<->tool round-trips per user turn (find_clients -> get_client_details
// -> answer needs ~2; keep headroom for follow-up lookups, bounded for safety).
const MAX_TURNS = 6;

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
  const raw: InMsg[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages: any[] = raw
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (messages.length === 0 || messages[0].role !== "user") {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  const system = chatSystemPrompt(language);
  const client = getAnthropic();
  const encoder = new TextEncoder();

  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const stream = client.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            tools: ASSISTANT_TOOLS,
            messages,
          });
          // Stream any natural-language text (incl. "let me look that up…") to the user.
          stream.on("text", (delta: string) => controller.enqueue(encoder.encode(delta)));
          const final = await stream.finalMessage();

          if (final.stop_reason === "tool_use") {
            const toolUses = final.content.filter((b: any) => b.type === "tool_use");
            messages.push({ role: "assistant", content: final.content });
            const toolResults: any[] = [];
            for (const tu of toolUses as any[]) {
              let res: any;
              try {
                res = await executeAssistantTool(tu.name, tu.input);
              } catch (e: any) {
                res = { error: "tool_failed", detail: String(e?.message || e).slice(0, 120) };
              }
              toolResults.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: JSON.stringify(res).slice(0, 60000),
              });
            }
            messages.push({ role: "user", content: toolResults });
            continue; // run another turn with the tool results in context
          }

          break; // end_turn — the final answer has already been streamed
        }
        controller.close();
      } catch (err: any) {
        console.error("[assistant/chat]", err?.message || err);
        controller.error(err);
      }
    },
    cancel() {
      /* client disconnected */
    },
  });

  return new Response(out, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
