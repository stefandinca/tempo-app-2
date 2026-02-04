"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { Evaluation, CategorySummary } from "@/types/evaluation";

interface EvaluationRadarChartProps {
  evaluation: Evaluation;
  previousEvaluation?: Evaluation | null;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
}

interface ChartDataPoint {
  category: string;
  fullName: string;
  current: number;
  previous?: number;
}

export default function EvaluationRadarChart({
  evaluation,
  previousEvaluation,
  size = "md",
  showLegend = true
}: EvaluationRadarChartProps) {
  // Transform data for the chart
  const chartData: ChartDataPoint[] = Object.entries(evaluation.categorySummaries || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, summary]) => ({
      category: key,
      fullName: summary.categoryName,
      current: summary.percentage,
      ...(previousEvaluation?.categorySummaries?.[key] && {
        previous: previousEvaluation.categorySummaries[key].percentage
      })
    }));

  const heights = {
    sm: 200,
    md: 300,
    lg: 400
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-white dark:bg-neutral-800 px-3 py-2 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
          <p className="font-medium text-neutral-900 dark:text-white text-sm">
            {data.category}. {data.fullName}
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-sm text-primary-600">
              Current: <span className="font-bold">{data.current}%</span>
            </p>
            {data.previous !== undefined && (
              <p className="text-sm text-neutral-500">
                Previous: <span className="font-medium">{data.previous}%</span>
              </p>
            )}
            {data.previous !== undefined && (
              <p className={`text-xs font-medium ${
                data.current > data.previous
                  ? "text-success-600"
                  : data.current < data.previous
                  ? "text-error-600"
                  : "text-neutral-500"
              }`}>
                {data.current > data.previous ? "+" : ""}
                {data.current - data.previous}% change
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={heights[size]}>
      <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid
          stroke="#e5e5e5"
          className="dark:stroke-neutral-700"
        />
        <PolarAngleAxis
          dataKey="category"
          tick={{
            fill: "#737373",
            fontSize: size === "sm" ? 10 : 12,
            fontWeight: 500
          }}
          className="dark:fill-neutral-400"
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "#a3a3a3", fontSize: 10 }}
          tickCount={5}
          className="dark:fill-neutral-500"
        />

        {/* Previous evaluation (if exists) - shown behind current */}
        {previousEvaluation && (
          <Radar
            name="Previous"
            dataKey="previous"
            stroke="#a3a3a3"
            fill="#a3a3a3"
            fillOpacity={0.2}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        {/* Current evaluation */}
        <Radar
          name="Current"
          dataKey="current"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.3}
          strokeWidth={2}
        />

        <Tooltip content={<CustomTooltip />} />

        {showLegend && previousEvaluation && (
          <Legend
            wrapperStyle={{
              paddingTop: 20,
              fontSize: 12
            }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// Mini version for cards/previews
export function EvaluationRadarChartMini({
  evaluation,
  className = ""
}: {
  evaluation: Evaluation;
  className?: string;
}) {
  const chartData = Object.entries(evaluation.categorySummaries || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, summary]) => ({
      category: key,
      value: summary.percentage
    }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={120}>
        <RadarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <PolarGrid stroke="#e5e5e5" className="dark:stroke-neutral-700" />
          <Radar
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.4}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
