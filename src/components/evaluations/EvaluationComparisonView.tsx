"use client";

import { ReactNode, useMemo } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus, Calendar, ArrowRight } from "lucide-react";
import {
  ComparableEvaluation,
  computeComparison,
  fmtValue,
  fmtDelta,
} from "@/lib/evaluationComparison";

interface Props {
  current: ComparableEvaluation;
  previous: ComparableEvaluation;
  /** Optional extra content (e.g. ABLLS radar chart) rendered below the stats. */
  extra?: ReactNode;
}

// Color for a percentage value (only used when the metric is a 0-100 bar).
const pctTone = (v: number) =>
  v >= 70 ? "bg-success-500" : v >= 40 ? "bg-warning-500" : "bg-error-500";

export default function EvaluationComparisonView({ current, previous, extra }: Props) {
  const { t } = useTranslation();
  const cmp = useMemo(() => computeComparison(current, previous), [current, previous]);

  const DeltaBadge = ({ change, improvement, unchanged }: { change: number; improvement: boolean; unchanged: boolean }) => (
    <span
      className={clsx(
        "text-xs font-medium px-1.5 py-0.5 rounded",
        unchanged
          ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
          : improvement
          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
          : "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
      )}
    >
      {fmtDelta(change, cmp.unit)}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Overall header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 text-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{t("evaluations.comparison.previous")}</p>
          <p className="text-3xl font-bold text-neutral-600 dark:text-neutral-400">{fmtValue(previous.overallValue, previous.unit)}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-neutral-500">
            <Calendar className="w-3 h-3" />
            {previous.dateLabel}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <ArrowRight className="w-6 h-6 text-neutral-300 dark:text-neutral-600 hidden md:block" />
          <div
            className={clsx(
              "mt-2 px-4 py-2 rounded-xl text-center",
              cmp.overallChange === 0
                ? "bg-neutral-100 dark:bg-neutral-800"
                : cmp.overallImprovement
                ? "bg-success-100 dark:bg-success-900/30"
                : "bg-error-100 dark:bg-error-900/30"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              {cmp.overallChange === 0 ? (
                <Minus className="w-5 h-5 text-neutral-500" />
              ) : cmp.overallImprovement ? (
                <TrendingUp className="w-5 h-5 text-success-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-error-600" />
              )}
              <span
                className={clsx(
                  "text-2xl font-bold",
                  cmp.overallChange === 0 ? "text-neutral-500" : cmp.overallImprovement ? "text-success-600" : "text-error-600"
                )}
              >
                {fmtDelta(cmp.overallChange, cmp.unit)}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">{t("evaluations.comparison.overall_change")}</p>
          </div>
        </div>

        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 text-center border border-primary-200 dark:border-primary-800">
          <p className="text-xs text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">{t("evaluations.comparison.current")}</p>
          <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">{fmtValue(current.overallValue, current.unit)}</p>
          {current.overallNote && <p className="text-xs text-neutral-500 mt-1 capitalize">{current.overallNote}</p>}
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-neutral-500">
            <Calendar className="w-3 h-3" />
            {current.dateLabel}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-success-50 dark:bg-success-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success-600">{cmp.improved}</p>
          <p className="text-xs text-success-600/70">{t("evaluations.comparison.improved")}</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-neutral-500">{cmp.unchanged}</p>
          <p className="text-xs text-neutral-500">{t("evaluations.comparison.unchanged")}</p>
        </div>
        <div className="bg-error-50 dark:bg-error-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-error-600">{cmp.declined}</p>
          <p className="text-xs text-error-600/70">{t("evaluations.comparison.declined")}</p>
        </div>
      </div>

      {extra && (
        <div className="bg-white dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">{t("evaluations.comparison.visual")}</h4>
          {extra}
        </div>
      )}

      {/* Category breakdown */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">{t("evaluations.comparison.category_breakdown")}</h4>
        <div className="space-y-2">
          {cmp.categories.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{cat.name}</p>
                {current.hasBar && (
                  <div className="mt-1 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className={clsx("h-full transition-all", pctTone(cat.current))} style={{ width: `${cat.current}%` }} />
                  </div>
                )}
              </div>
              <div className="text-right flex items-center gap-2 shrink-0">
                <span className="text-xs text-neutral-400">{fmtValue(cat.previous, cmp.unit)}</span>
                <ArrowRight className="w-3 h-3 text-neutral-300" />
                <span className="text-sm font-bold text-neutral-900 dark:text-white">{fmtValue(cat.current, cmp.unit)}</span>
                <DeltaBadge change={cat.change} improvement={cat.isImprovement} unchanged={cat.isUnchanged} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
