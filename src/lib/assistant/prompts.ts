import { APP_KNOWLEDGE } from "./knowledge";
import type { EvaluationContext } from "./context";
import type { InsightsResult } from "@/types/aiInsights";

export type { InsightsResult };
export type Lang = "en" | "ro";
const langName = (l: Lang) => (l === "ro" ? "Romanian" : "English");

export function chatSystemPrompt(lang: Lang): string {
  return `You are the TempoApp clinical assistant for a Romanian ABA / speech-therapy center working with children with autism, ADHD and related needs. You help STAFF (therapists, coordinators, admins) in two ways:
1. App guidance — answer "how do I…" questions about using TempoApp, grounded ONLY in the knowledge base below.
2. Clinical support — help interpret evaluation scores and session data, suggest where to focus therapy, and draft notes or goals.

Boundaries:
- You SUPPORT a BCBA/clinician; you do NOT replace clinical judgment and you do NOT make formal medical diagnoses.
- Be concrete and concise. If data is missing or you are unsure, say so plainly.
- Frame clinical suggestions as options for the clinician to consider, not directives.
- You receive only de-identified data (initials, age in months, scores). Never ask for or invent a child's full name or personal details.

Always respond in ${langName(lang)}.

${APP_KNOWLEDGE}`;
}

export function insightsSystemPrompt(lang: Lang): string {
  return `You are a BCBA-supporting clinical assistant for a Romanian ABA center. Given a de-identified evaluation result, produce concise, practical clinical insights and where to focus therapy. Support clinical judgment; do not make formal diagnoses. Base everything ONLY on the provided scores. Write all text in ${langName(lang)}. Call the record_insights tool exactly once.`;
}

export const INSIGHTS_TOOL = {
  name: "record_insights",
  description: "Record structured clinical insights for an evaluation.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "1-2 sentence plain overview of where the child stands." },
      strengths: { type: "array", items: { type: "string" }, description: "Relative strengths / mastered areas." },
      focusAreas: { type: "array", items: { type: "string" }, description: "Where to focus therapy next; most important first." },
      observations: { type: "array", items: { type: "string" }, description: "Per-category clinical observations." },
    },
    required: ["summary", "strengths", "focusAreas", "observations"],
  },
};

export function insightsUserMessage(ctx: EvaluationContext): string {
  return `Evaluation to analyze (de-identified):
${JSON.stringify(ctx, null, 2)}

Scoring note: for the CARS instrument a LOWER score means LESS severe (improvement). For Portage, values are developmental age in months. For the other instruments, values are percentages where higher is better.`;
}
