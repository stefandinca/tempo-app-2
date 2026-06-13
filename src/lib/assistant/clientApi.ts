"use client";

import { auth } from "@/lib/firebase";
import type { EvalKind } from "@/lib/evaluationComparison";
import type { EvaluationContext } from "./context";
import type { Lang } from "./prompts";
import type { InsightsResult } from "@/types/aiInsights";

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("not_signed_in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export class AssistantError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requestInsights(args: {
  kind: EvalKind;
  context: EvaluationContext;
  language: Lang;
}): Promise<{ insights: InsightsResult; model: string }> {
  const res = await fetch("/api/assistant/insights", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AssistantError(body.error || "request_failed", res.status);
  }
  const data = await res.json();
  return { insights: data.insights as InsightsResult, model: data.model as string };
}

/** Returns the raw streaming Response; caller reads res.body. */
export async function openChatStream(args: {
  messages: { role: "user" | "assistant"; content: string }[];
  language: Lang;
  evaluationContext?: EvaluationContext;
}): Promise<Response> {
  return fetch("/api/assistant/chat", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(args),
  });
}
