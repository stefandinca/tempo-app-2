"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronDown } from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import { ABLLS_CATEGORIES } from "@/hooks/useEvaluations";

interface EvaluationProgressChartProps {
  evaluations: Evaluation[];
  clientName?: string;
}

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  A: "#ef4444", // red
  B: "#f97316", // orange
  C: "#f59e0b", // amber
  D: "#eab308", // yellow
  E: "#84cc16", // lime
  F: "#22c55e", // green
  G: "#10b981", // emerald
  H: "#14b8a6", // teal
  I: "#06b6d4", // cyan
  J: "#0ea5e9", // sky
  K: "#3b82f6", // blue
  L: "#6366f1", // indigo
  M: "#8b5cf6", // violet
  N: "#a855f7", // purple
  O: "#d946ef", // fuchsia
  P: "#ec4899", // pink
  Q: "#f43f5e", // rose
  R: "#78716c", // stone
};

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  overall: number;
  evaluationId: string;
  [key: string]: string | number; // For category scores
}

export default function EvaluationProgressChart({
  evaluations,
  clientName
}: EvaluationProgressChartProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [chartType, setChartType] = useState<"line" | "area">("area");

  // Filter to completed evaluations and sort by date (oldest first)
  const completedEvaluations = useMemo(() => {
    return evaluations
      .filter((e) => e.status === "completed")
      .sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime());
  }, [evaluations]);

  // Transform data for the chart
  const chartData: ChartDataPoint[] = useMemo(() => {
    return completedEvaluations.map((evaluation) => {
      const date = new Date(evaluation.completedAt || evaluation.createdAt);
      const dataPoint: ChartDataPoint = {
        date: date.toISOString(),
        dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        overall: evaluation.overallPercentage,
        evaluationId: evaluation.id
      };

      // Add category scores
      Object.entries(evaluation.categorySummaries || {}).forEach(([key, summary]) => {
        dataPoint[key] = summary.percentage;
      });

      return dataPoint;
    });
  }, [completedEvaluations]);

  // Calculate progress stats
  const progressStats = useMemo(() => {
    if (completedEvaluations.length < 2) return null;

    const first = completedEvaluations[0];
    const last = completedEvaluations[completedEvaluations.length - 1];
    const overallChange = last.overallPercentage - first.overallPercentage;

    // Calculate category changes
    const categoryChanges: { key: string; name: string; change: number }[] = [];
    Object.keys(last.categorySummaries || {}).forEach((key) => {
      const firstScore = first.categorySummaries?.[key]?.percentage || 0;
      const lastScore = last.categorySummaries?.[key]?.percentage || 0;
      categoryChanges.push({
        key,
        name: last.categorySummaries[key].categoryName,
        change: lastScore - firstScore
      });
    });

    // Sort by change (most improved first)
    categoryChanges.sort((a, b) => b.change - a.change);

    return {
      overallChange,
      totalEvaluations: completedEvaluations.length,
      mostImproved: categoryChanges.slice(0, 3),
      needsAttention: categoryChanges.filter((c) => c.change < 0).slice(-3).reverse(),
      timespan: {
        start: new Date(first.completedAt || first.createdAt),
        end: new Date(last.completedAt || last.createdAt)
      }
    };
  }, [completedEvaluations]);

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-800 px-4 py-3 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700">
          <p className="font-medium text-neutral-900 dark:text-white text-sm mb-2">
            {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {entry.name === "overall" ? "Overall" : entry.name}
                  </span>
                </div>
                <span className="font-bold" style={{ color: entry.color }}>
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (completedEvaluations.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          No Progress Data Yet
        </h3>
        <p className="text-neutral-500 max-w-sm mx-auto">
          Complete at least one evaluation to start tracking progress over time.
        </p>
      </div>
    );
  }

  if (completedEvaluations.length === 1) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <Calendar className="w-8 h-8 text-primary-500" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          One Evaluation Completed
        </h3>
        <p className="text-neutral-500 max-w-sm mx-auto mb-4">
          Complete a re-evaluation to see progress trends and comparisons.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <span className="text-3xl font-bold text-primary-600">
            {completedEvaluations[0].overallPercentage}%
          </span>
          <span className="text-neutral-500 text-sm">baseline score</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary Cards */}
      {progressStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overall Progress */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-neutral-500 mb-2">Overall Progress</p>
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  "text-3xl font-bold",
                  progressStats.overallChange > 0
                    ? "text-success-600"
                    : progressStats.overallChange < 0
                    ? "text-error-600"
                    : "text-neutral-500"
                )}
              >
                {progressStats.overallChange > 0 ? "+" : ""}
                {progressStats.overallChange}%
              </span>
              {progressStats.overallChange > 0 ? (
                <TrendingUp className="w-6 h-6 text-success-500" />
              ) : progressStats.overallChange < 0 ? (
                <TrendingDown className="w-6 h-6 text-error-500" />
              ) : (
                <Minus className="w-6 h-6 text-neutral-400" />
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Over {progressStats.totalEvaluations} evaluations
            </p>
          </div>

          {/* Most Improved */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-neutral-500 mb-3">Most Improved</p>
            <div className="space-y-2">
              {progressStats.mostImproved.slice(0, 3).map((cat) => (
                <div key={cat.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.key] }}
                    >
                      {cat.key}
                    </span>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                      {cat.name}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      "text-sm font-bold",
                      cat.change > 0 ? "text-success-600" : cat.change < 0 ? "text-error-600" : "text-neutral-500"
                    )}
                  >
                    {cat.change > 0 ? "+" : ""}
                    {cat.change}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <p className="text-sm font-medium text-neutral-500 mb-3">Needs Attention</p>
            {progressStats.needsAttention.length > 0 ? (
              <div className="space-y-2">
                {progressStats.needsAttention.map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.key] }}
                      >
                        {cat.key}
                      </span>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-error-600">
                      {cat.change}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-success-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                All categories improving!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
        {/* Chart Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            Progress Over Time
          </h3>

          <div className="flex items-center gap-3">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setChartType("area")}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  chartType === "area"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
              >
                Area
              </button>
              <button
                onClick={() => setChartType("line")}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  chartType === "line"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
              >
                Line
              </button>
            </div>

            {/* Category Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCategorySelector(!showCategorySelector)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Categories ({selectedCategories.length || "All"})
                <ChevronDown className={clsx("w-4 h-4 transition-transform", showCategorySelector && "rotate-180")} />
              </button>

              {showCategorySelector && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-3 z-20 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      Select Categories
                    </span>
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ABLLS_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => toggleCategory(cat.key)}
                        className={clsx(
                          "flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                          selectedCategories.includes(cat.key)
                            ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-transparent"
                        )}
                      >
                        <span
                          className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[cat.key] }}
                        >
                          {cat.key}
                        </span>
                        <span className="text-neutral-700 dark:text-neutral-300 truncate text-xs">
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          {chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                {selectedCategories.map((key) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CATEGORY_COLORS[key]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CATEGORY_COLORS[key]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-neutral-700" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "#737373", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#737373", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Overall score line */}
              <Area
                type="monotone"
                dataKey="overall"
                name="Overall"
                stroke="#6366f1"
                fill="url(#overallGradient)"
                strokeWidth={3}
                dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />

              {/* Selected category lines */}
              {selectedCategories.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={CATEGORY_COLORS[key]}
                  fill={`url(#gradient-${key})`}
                  strokeWidth={2}
                  dot={{ fill: CATEGORY_COLORS[key], strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-neutral-700" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "#737373", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#737373", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Overall score line */}
              <Line
                type="monotone"
                dataKey="overall"
                name="Overall"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />

              {/* Selected category lines */}
              {selectedCategories.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={CATEGORY_COLORS[key]}
                  strokeWidth={2}
                  dot={{ fill: CATEGORY_COLORS[key], strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>

        {/* Time Range */}
        {progressStats && (
          <p className="text-xs text-center text-neutral-500 mt-4">
            Showing progress from {progressStats.timespan.start.toLocaleDateString()} to {progressStats.timespan.end.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
