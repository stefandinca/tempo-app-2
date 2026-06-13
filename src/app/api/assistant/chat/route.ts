import { NextRequest, NextResponse } from "next/server";
import { requireStaffWithConsent } from "@/lib/assistant/gate";
import { getAnthropic, MODEL } from "@/lib/assistant/anthropic";
import { chatSystemPrompt, type Lang } from "@/lib/assistant/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InMsg {
  role: "user" | "assistant";
  content: string;
}

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
  const raw: InMsg[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages = raw
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (messages.length === 0 || messages[0].role !== "user") {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  // Append the optional de-identified evaluation context to the (cacheable) system prompt.
  let system = chatSystemPrompt(language);
  if (body?.evaluationContext?.instrument) {
    system += `\n\nCurrent evaluation context (de-identified):\n${JSON.stringify(body.evaluationContext)}`;
  }

  try {
    const client = getAnthropic();
    const aiStream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const encoder = new TextEncoder();
    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          aiStream.on("text", (delta: string) => controller.enqueue(encoder.encode(delta)));
          await aiStream.finalMessage();
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        aiStream.abort();
      },
    });

    return new Response(out, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("[assistant/chat]", err?.message || err);
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
