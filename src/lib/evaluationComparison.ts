// Unified evaluation-comparison model.
//
// Each evaluation type stores its results differently (ABLLS/VB-MAPP/Carolina in
// percentages, Portage in developmental-age months, CARS in a raw severity score
// where LOWER is better). This module normalizes all five into a single
// `ComparableEvaluation` shape so one comparison view can render any type, and a
// direction flag tells the view whether an increase counts as improvement.

import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { PortageEvaluation } from "@/types/portage";
import { CARSEvaluation, CARS_ITEMS } from "@/types/cars";
import { CarolinaEvaluation } from "@/types/carolina";

export type EvalKind = "ablls" | "vbmapp" | "portage" | "cars" | "carolina";
export type ComparisonDirection = "higher_better" | "lower_better";

export interface ComparisonCategory {
  key: string;   // short badge label
  name: string;  // full category name
  value: number; // numeric metric for delta math
}

export interface ComparableEvaluation {
  id: string;
  kind: EvalKind;
  rawDate: string;          // ISO date used for sorting
  dateLabel: string;        // formatted for display
  evaluatorName?: string;
  overallValue: number;
  unit: string;             // "%", " luni", "" — appended to values for display
  direction: ComparisonDirection;
  overallNote?: string;     // e.g. CARS severity label
  hasBar: boolean;          // render a 0-100 progress bar (percentage metrics only)
  categories: ComparisonCategory[];
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
}

const round = (n: number) => Math.round(n);

// --- Per-type adapters ----------------------------------------------------

function fromABLLS(e: Evaluation): ComparableEvaluation {
  const categories = Object.entries(e.categorySummaries || {})
    .map(([key, s]) => ({ key, name: s?.categoryName || key, value: s?.percentage || 0 }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return {
    id: e.id, kind: "ablls", rawDate: e.completedAt || e.updatedAt, dateLabel: fmtDate(e.completedAt || e.updatedAt),
    evaluatorName: e.evaluatorName, overallValue: e.overallPercentage, unit: "%", direction: "higher_better",
    hasBar: true, categories,
  };
}

function fromVBMAPP(e: VBMAPPEvaluation): ComparableEvaluation {
  // Aggregate area scores across the three levels into one percentage per skill area.
  const agg: Record<string, { name: string; score: number; max: number }> = {};
  Object.values(e.levelSummaries || {}).forEach((level) => {
    Object.values(level.areaSummaries || {}).forEach((a) => {
      const cur = agg[a.areaCode] || { name: a.areaName.replace(/ - Nivel \d+$/, ""), score: 0, max: 0 };
      cur.score += a.totalScore;
      cur.max += a.maxPossibleScore;
      agg[a.areaCode] = cur;
    });
  });
  const categories = Object.entries(agg)
    .map(([key, v]) => ({ key, name: v.name, value: v.max > 0 ? round((v.score / v.max) * 100) : 0 }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return {
    id: e.id, kind: "vbmapp", rawDate: e.completedAt || e.updatedAt, dateLabel: fmtDate(e.completedAt || e.updatedAt),
    evaluatorName: e.evaluatorName, overallValue: e.overallMilestonePercentage, unit: "%", direction: "higher_better",
    hasBar: true, categories,
  };
}

function fromPortage(e: PortageEvaluation): ComparableEvaluation {
  const categories = Object.entries(e.summaries || {})
    .map(([key, s]) => ({ key, name: s.category, value: s.developmentalAgeMonths }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    id: e.id, kind: "portage", rawDate: e.completedAt || e.updatedAt, dateLabel: fmtDate(e.completedAt || e.updatedAt),
    evaluatorName: e.evaluatorName, overallValue: e.overallDevelopmentalAgeMonths, unit: " luni", direction: "higher_better",
    hasBar: false, categories,
  };
}

function fromCARS(e: CARSEvaluation): ComparableEvaluation {
  // CARS: lower total = less severe = improvement.
  const categories = CARS_ITEMS
    .map((item) => {
      const score = e.scores?.[String(item.id)]?.value;
      return score == null ? null : { key: String(item.id), name: item.title, value: score };
    })
    .filter((c): c is ComparisonCategory => c !== null);
  return {
    id: e.id, kind: "cars", rawDate: e.completedAt || e.updatedAt, dateLabel: fmtDate(e.completedAt || e.updatedAt),
    evaluatorName: e.evaluatorName, overallValue: e.totalScore, unit: "", direction: "lower_better",
    overallNote: e.severity, hasBar: false, categories,
  };
}

function fromCarolina(e: CarolinaEvaluation): ComparableEvaluation {
  const categories = Object.entries(e.domainProgress || {})
    .map(([key, d]) => ({ key, name: key, value: d.total > 0 ? round((d.mastered / d.total) * 100) : 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalItems = Object.values(e.domainProgress || {}).reduce((s, d) => s + d.total, 0);
  return {
    id: e.id, kind: "carolina", rawDate: e.completedAt || e.updatedAt, dateLabel: fmtDate(e.completedAt || e.updatedAt),
    evaluatorName: e.evaluatorName, overallValue: totalItems > 0 ? round((e.totalMastered / totalItems) * 100) : 0,
    unit: "%", direction: "higher_better", hasBar: true, categories,
  };
}

export function toComparable(kind: EvalKind, e: any): ComparableEvaluation {
  switch (kind) {
    case "ablls": return fromABLLS(e);
    case "vbmapp": return fromVBMAPP(e);
    case "portage": return fromPortage(e);
    case "cars": return fromCARS(e);
    case "carolina": return fromCarolina(e);
  }
}

// --- Comparison computation ----------------------------------------------

export interface CategoryDelta {
  key: string;
  name: string;
  current: number;
  previous: number;
  change: number;
  isImprovement: boolean;
  isUnchanged: boolean;
}

export interface ComparisonResult {
  unit: string;
  direction: ComparisonDirection;
  overallChange: number;
  overallImprovement: boolean;
  categories: CategoryDelta[];
  improved: number;
  declined: number;
  unchanged: number;
}

const isUp = (change: number, dir: ComparisonDirection) =>
  dir === "higher_better" ? change > 0 : change < 0;

export function computeComparison(current: ComparableEvaluation, previous: ComparableEvaluation): ComparisonResult {
  const prevByKey = new Map(previous.categories.map((c) => [c.key, c.value]));
  const categories: CategoryDelta[] = current.categories.map((c) => {
    const prev = prevByKey.get(c.key) ?? 0;
    const change = c.value - prev;
    return {
      key: c.key, name: c.name, current: c.value, previous: prev, change,
      isImprovement: change !== 0 && isUp(change, current.direction),
      isUnchanged: change === 0,
    };
  });
  const overallChange = current.overallValue - previous.overallValue;
  return {
    unit: current.unit,
    direction: current.direction,
    overallChange,
    overallImprovement: overallChange !== 0 && isUp(overallChange, current.direction),
    categories,
    improved: categories.filter((c) => c.isImprovement).length,
    declined: categories.filter((c) => !c.isImprovement && !c.isUnchanged).length,
    unchanged: categories.filter((c) => c.isUnchanged).length,
  };
}

export const fmtValue = (n: number, unit: string) => `${n}${unit}`;
export const fmtDelta = (n: number, unit: string) => `${n > 0 ? "+" : ""}${n}${unit}`;
