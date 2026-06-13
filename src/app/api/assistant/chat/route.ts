import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireStaffWithConsent } from "@/lib/assistant/gate";
import { getAnthropic, MODEL } from "@/lib/assistant/anthropic";
import { chatSystemPrompt, type Lang } from "@/lib/assistant/prompts";
import { ASSISTANT_TOOLS, executeAssistantTool } from "@/lib/assistant/tools";
import { emptyUsage, addUsage, computeCostUsd } from "@/lib/assistant/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max model<->tool round-trips per user turn; history loaded for context.
const MAX_TURNS = 6;
const HISTORY_LIMIT = 16;

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
  const userText = typeof body?.message === "string" ? body.message.trim().slice(0, 8000) : "";
  if (!userText) return NextResponse.json({ error: "invalid_messages" }, { status: 400 });

  const db = adminDb();
  const { uid, name } = gate.ctx;

  // Resolve the conversation: load an existing one (verifying ownership) or create.
  let conversationId: string = typeof body?.conversationId === "string" ? body.conversationId : "";
  let convRef = conversationId ? db.collection("ai_conversations").doc(conversationId) : null;
  if (convRef) {
    const snap = await convRef.get();
    if (!snap.exists || (snap.data() as any)?.uid !== uid) {
      convRef = null; // missing or not the caller's — start fresh
      conversationId = "";
    }
  }
  if (!convRef) {
    convRef = db.collection("ai_conversations").doc();
    conversationId = convRef.id;
    await convRef.set({
      uid,
      userName: name || "",
      language,
      title: userText.slice(0, 80),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastMessageAt: FieldValue.serverTimestamp(),
      messageCount: 0,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  }

  // Load prior messages (before persisting the new one) for model context.
  const priorSnap = await convRef
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limitToLast(HISTORY_LIMIT)
    .get();
  const priorMessages: any[] = priorSnap.docs
    .map((d) => d.data() as any)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) }));

  // Persist the user message immediately so it survives even if the reply fails.
  await convRef.collection("messages").add({
    role: "user",
    content: userText,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Build the model input and cache the conversation prefix (2nd breakpoint).
  const messages: any[] = [...priorMessages, { role: "user", content: userText }];
  while (messages.length && messages[0].role !== "user") messages.shift();
  const tail = messages[messages.length - 1];
  tail.content = [{ type: "text", text: tail.content, cache_control: { type: "ephemeral" } }];

  const system = chatSystemPrompt(language);
  const client = getAnthropic();
  const encoder = new TextEncoder();
  const usage = emptyUsage();
  const toolsUsed: string[] = [];
  let assistantText = "";

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
          stream.on("text", (delta: string) => {
            assistantText += delta;
            controller.enqueue(encoder.encode(delta));
          });
          const final = await stream.finalMessage();
          addUsage(usage, final.usage);

          if (final.stop_reason === "tool_use") {
            const toolUses = final.content.filter((b: any) => b.type === "tool_use");
            messages.push({ role: "assistant", content: final.content });
            const toolResults: any[] = [];
            for (const tu of toolUses as any[]) {
              toolsUsed.push(tu.name);
              let res: any;
              try {
                res = await executeAssistantTool(tu.name, tu.input);
              } catch (e: any) {
                res = { error: "tool_failed", detail: String(e?.message || e).slice(0, 120) };
              }
              toolResults.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: JSON.stringify(res).slice(0, 20000),
              });
            }
            messages.push({ role: "user", content: toolResults });
            continue;
          }
          break;
        }

        // Persist the assistant reply with its token usage + cost, then roll up totals.
        const costUsd = computeCostUsd(MODEL, usage);
        await convRef!.collection("messages").add({
          role: "assistant",
          content: assistantText,
          model: MODEL,
          usage,
          costUsd,
          toolsUsed,
          createdAt: FieldValue.serverTimestamp(),
        });
        await convRef!.set(
          {
            updatedAt: FieldValue.serverTimestamp(),
            lastMessageAt: FieldValue.serverTimestamp(),
            messageCount: FieldValue.increment(2),
            costUsd: FieldValue.increment(costUsd),
            inputTokens: FieldValue.increment(usage.inputTokens),
            outputTokens: FieldValue.increment(usage.outputTokens),
            cacheReadTokens: FieldValue.increment(usage.cacheReadTokens),
            cacheWriteTokens: FieldValue.increment(usage.cacheWriteTokens),
          },
          { merge: true },
        );

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
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": conversationId,
    },
  });
}
