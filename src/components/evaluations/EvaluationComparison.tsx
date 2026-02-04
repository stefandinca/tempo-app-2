"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User,
  ArrowRight
} from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import EvaluationRadarChart from "./EvaluationRadarChart";

interface EvaluationComparisonProps {
  currentEvaluation: Evaluation;
  previousEvaluation: Evaluation;
}

export default function EvaluationComparison({
  currentEvaluation,
  previousEvaluation
}: EvaluationComparisonProps) {
  const comparison = useMemo(() => {
    const overallChange = currentEvaluation.overallPercentage - previousEvaluation.overallPercentage;

    // Category changes
    const categoryChanges = Object.keys(currentEvaluation.categorySummaries || {})
      .map((key) => {
        const current = currentEvaluation.categorySummaries?.[key]?.percentage || 0;
        const previous = previousEvaluation.categorySummaries?.[key]?.percentage || 0;
        return {
          key,
          name: currentEvaluation.categorySummaries?.[key]?.categoryName || key,
          current,
          previous,
          change: current - previous
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));

    const improved = categoryChanges.filter((c) => c.change > 0).length;
    const declined = categoryChanges.filter((c) => c.change < 0).length;
    const unchanged = categoryChanges.filter((c) => c.change === 0).length;

    return {
      overallChange,
      categoryChanges,
      improved,
      declined,
      unchanged
    };
  }, [currentEvaluation, previousEvaluation]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Previous */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 text-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Previous</p>
          <p className="text-3xl font-bold text-neutral-600 dark:text-neutral-400">
            {previousEvaluation.overallPercentage}%
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-neutral-500">
            <Calendar className="w-3 h-3" />
            {formatDate(previousEvaluation.completedAt || previousEvaluation.updatedAt)}
          </div>
        </div>

        {/* Change */}
        <div className="flex flex-col items-center">
          <ArrowRight className="w-6 h-6 text-neutral-300 dark:text-neutral-600 hidden md:block" />
          <div
            className={clsx(
              "mt-2 px-4 py-2 rounded-xl text-center",
              comparison.overallChange > 0
                ? "bg-success-100 dark:bg-success-900/30"
                : comparison.overallChange < 0
                ? "bg-error-100 dark:bg-error-900/30"
                : "bg-neutral-100 dark:bg-neutral-800"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              {comparison.overallChange > 0 ? (
                <TrendingUp className="w-5 h-5 text-success-600" />
              ) : comparison.overallChange < 0 ? (
                <TrendingDown className="w-5 h-5 text-error-600" />
              ) : (
                <Minus className="w-5 h-5 text-neutral-500" />
              )}
              <span
                className={clsx(
                  "text-2xl font-bold",
                  comparison.overallChange > 0
                    ? "text-success-600"
                    : comparison.overallChange < 0
                    ? "text-error-600"
                    : "text-neutral-500"
                )}
              >
                {comparison.overallChange > 0 ? "+" : ""}
                {comparison.overallChange}%
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Overall Change</p>
          </div>
        </div>

        {/* Current */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 text-center border border-primary-200 dark:border-primary-800">
          <p className="text-xs text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2">Current</p>
          <p
            className={clsx(
              "text-3xl font-bold",
              currentEvaluation.overallPercentage >= 70
                ? "text-success-600"
                : currentEvaluation.overallPercentage >= 40
                ? "text-warning-600"
                : "text-error-600"
            )}
          >
            {currentEvaluation.overallPercentage}%
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-neutral-500">
            <Calendar className="w-3 h-3" />
            {formatDate(currentEvaluation.completedAt || currentEvaluation.updatedAt)}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-success-50 dark:bg-success-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success-600">{comparison.improved}</p>
          <p className="text-xs text-success-600/70">Categories Improved</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-neutral-500">{comparison.unchanged}</p>
          <p className="text-xs text-neutral-500">Unchanged</p>
        </div>
        <div className="bg-error-50 dark:bg-error-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-error-600">{comparison.declined}</p>
          <p className="text-xs text-error-600/70">Need Attention</p>
        </div>
      </div>

      {/* Radar Chart Comparison */}
      <div className="bg-white dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">Visual Comparison</h4>
        <EvaluationRadarChart
          evaluation={currentEvaluation}
          previousEvaluation={previousEvaluation}
          size="md"
          showLegend
        />
      </div>

      {/* Category by category breakdown */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">Category Breakdown</h4>
        <div className="space-y-2">
          {comparison.categoryChanges.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center gap-4 p-3 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700"
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm",
                  cat.current >= 70
                    ? "bg-success-500"
                    : cat.current >= 40
                    ? "bg-warning-500"
                    : "bg-error-500"
                )}
              >
                {cat.key}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {cat.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full transition-all",
                        cat.current >= 70
                          ? "bg-success-500"
                          : cat.current >= 40
                          ? "bg-warning-500"
                          : "bg-error-500"
                      )}
                      style={{ width: `${cat.current}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="text-right flex items-center gap-3">
                <span className="text-xs text-neutral-400">
                  {cat.previous}%
                </span>
                <ArrowRight className="w-3 h-3 text-neutral-300" />
                <span
                  className={clsx(
                    "text-sm font-bold",
                    cat.current >= 70
                      ? "text-success-600"
                      : cat.current >= 40
                      ? "text-warning-600"
                      : "text-error-600"
                  )}
                >
                  {cat.current}%
                </span>
                <span
                  className={clsx(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    cat.change > 0
                      ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                      : cat.change < 0
                      ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                  )}
                >
                  {cat.change > 0 ? "+" : ""}
                  {cat.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
