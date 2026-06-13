// De-identified context builders. These run on the client to assemble exactly
// what gets sent to Claude — only clinical scores + age + diagnosis. NO names
// (initials only), NO birth dates (age in months), NO emails/phones/raw ids.
// Reuses the evaluation-comparison adapter so the normalized shape stays consistent.
import { EvalKind, toComparable } from "@/lib/evaluationComparison";
import { isAbllsSectionAgeExpected } from "@/lib/abllsAgeReference";

function initials(name?: string): string {
  if (!name) return "—";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3);
}

function ageInMonths(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  return Math.max(0, months);
}

export interface ChildContext {
  initials: string;
  ageMonths: number | null;
  diagnosis?: string;
  diagnosisLevel?: string;
}

export function buildChildContext(client: any): ChildContext {
  return {
    initials: initials(client?.name),
    ageMonths: ageInMonths(client?.birthDate),
    diagnosis: client?.diagnosis || client?.primaryDiagnosis || undefined,
    diagnosisLevel: client?.diagnosisLevel || undefined,
  };
}

export interface EvaluationContext {
  instrument: EvalKind;
  date: string;
  overall: { value: number; unit: string; direction: string; note?: string };
  // ageExpected (ABLLS-R only) is false when the section is typically NOT yet
  // age-expected for this child — a low value there is not necessarily a deficit.
  categories: { name: string; value: number; ageExpected?: boolean }[];
  child?: ChildContext;
}

export function buildEvaluationContext(kind: EvalKind, evaluation: any, client?: any): EvaluationContext {
  const c = toComparable(kind, evaluation);
  const child = client ? buildChildContext(client) : undefined;
  const ageMonths = child?.ageMonths ?? null;
  return {
    instrument: kind,
    date: c.dateLabel,
    overall: {
      value: c.overallValue,
      unit: c.unit.trim() || "score",
      direction: c.direction,
      note: c.overallNote,
    },
    categories: c.categories.map((cat) => ({
      name: cat.name,
      value: cat.value,
      ...(kind === "ablls" ? { ageExpected: isAbllsSectionAgeExpected(cat.key, ageMonths) } : {}),
    })),
    child,
  };
}
