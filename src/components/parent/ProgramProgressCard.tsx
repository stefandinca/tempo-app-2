"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import TrendSparkline from "./TrendSparkline";

export interface ProgramScores {
  minus: number;
  zero: number;
  prompted: number;
  plus: number;
}

export interface SessionScore {
  sessionId: string;
  date: Date;
  scores: ProgramScores;
  sessionType: string;
}

interface ProgramProgressCardProps {
  programId: string;
  programTitle: string;
  programDescription?: string;
  sessionHistory: SessionScore[];
}

const SCORE_CONFIG = [
  { key: "minus" as const, label: "\u2212", color: "error" },
  { key: "zero" as const, label: "0", color: "neutral" },
  { key: "prompted" as const, label: "P", color: "warning" },
  { key: "plus" as const, label: "+", color: "success" },
];

function calculateSuccessRate(scores: ProgramScores): number {
  const total = scores.minus + scores.zero + scores.prompted + scores.plus;
  if (total === 0) return 0;
  return Math.round((scores.plus / total) * 100);
}

function calculateTrend(history: SessionScore[]): "improving" | "stable" | "declining" | "insufficient" {
  if (history.length < 2) return "insufficient";

  const recent = history.slice(-3);
  const previous = history.slice(-6, -3);

  if (previous.length === 0) return "insufficient";

  const recentAvg = recent.reduce((sum, s) => sum + calculateSuccessRate(s.scores), 0) / recent.length;
  const previousAvg = previous.reduce((sum, s) => sum + calculateSuccessRate(s.scores), 0) / previous.length;

  const diff = recentAvg - previousAvg;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}

function aggregateScores(history: SessionScore[]): ProgramScores {
  return history.reduce(
    (acc, session) => ({
      minus: acc.minus + session.scores.minus,
      zero: acc.zero + session.scores.zero,
      prompted: acc.prompted + session.scores.prompted,
      plus: acc.plus + session.scores.plus,
    }),
    { minus: 0, zero: 0, prompted: 0, plus: 0 }
  );
}

export default function ProgramProgressCard({
  programId,
  programTitle,
  programDescription,
  sessionHistory,
}: ProgramProgressCardProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedHistory = [...sessionHistory].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latestSession = sortedHistory[0];
  const latestScores = latestSession?.scores || { minus: 0, zero: 0, prompted: 0, plus: 0 };

  const totalScores = aggregateScores(sessionHistory);
  const totalTrials = totalScores.minus + totalScores.zero + totalScores.prompted + totalScores.plus;
  const overallSuccessRate = calculateSuccessRate(totalScores);

  const trend = calculateTrend(sessionHistory);

  // Sparkline data: success rate per session (chronological order)
  const sparklineData = [...sessionHistory]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-6)
    .map((s) => calculateSuccessRate(s.scores));

  const getButtonColors = (color: string, value: number) => {
    const colors: Record<string, { bg: string; activeBg: string; text: string }> = {
      error: {
        bg: "bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800",
        activeBg: "bg-error-500 border-error-600",
        text: "text-error-600 dark:text-error-400",
      },
      neutral: {
        bg: "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700",
        activeBg: "bg-neutral-500 border-neutral-600",
        text: "text-neutral-600 dark:text-neutral-400",
      },
      warning: {
        bg: "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800",
        activeBg: "bg-warning-500 border-warning-600",
        text: "text-warning-600 dark:text-warning-400",
      },
      success: {
        bg: "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800",
        activeBg: "bg-success-500 border-success-600",
        text: "text-success-600 dark:text-success-400",
      },
    };
    return colors[color] || colors.neutral;
  };

  const getTrendInfo = () => {
    switch (trend) {
      case "improving":
        return { icon: TrendingUp, label: t("parent_portal.progress.improving"), color: "text-success-600", bg: "bg-success-50 dark:bg-success-900/20" };
      case "declining":
        return { icon: TrendingDown, label: t("parent_portal.progress.needs_attention"), color: "text-warning-600", bg: "bg-warning-50 dark:bg-warning-900/20" };
      case "stable":
        return { icon: Minus, label: t("parent_portal.progress.stable"), color: "text-primary-600", bg: "bg-primary-50 dark:bg-primary-900/20" };
      default:
        return null;
    }
  };

  const trendInfo = getTrendInfo();
  const sparklineColor = trend === "improving" ? "#22c55e" : trend === "declining" ? "#f59e0b" : "#6366f1";

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-neutral-900 dark:text-white">{programTitle}</h3>
            {programDescription && (
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{programDescription}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {sparklineData.length >= 2 && (
              <TrendSparkline data={sparklineData} color={sparklineColor} width={48} height={20} />
            )}
            {trendInfo && (
              <div className={clsx("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold", trendInfo.bg, trendInfo.color)}>
                <trendInfo.icon className="w-3.5 h-3.5" />
                {trendInfo.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latest Scores Display */}
      <div className="p-4">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          {t("parent_portal.progress.score_labels.correct")}
        </p>

        {/* Score Buttons (Read-only) */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {SCORE_CONFIG.map(({ key, label, color }) => {
            const value = latestScores[key];
            const colors = getButtonColors(color, value);

            return (
              <div
                key={key}
                className={clsx(
                  "h-14 rounded-xl border-2 flex flex-col items-center justify-center select-none",
                  value > 0 ? colors.activeBg + " text-white" : colors.bg + " " + colors.text
                )}
              >
                <span className="text-lg font-bold leading-none">{label}</span>
                <span className="text-xs font-medium mt-0.5 opacity-80">{value}</span>
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-neutral-500">
              {t("parent_portal.progress.sessions_label")}: <span className="font-bold text-neutral-700 dark:text-neutral-300">{sessionHistory.length}</span>
            </span>
            <span className="text-neutral-500">
              {t("parent_portal.progress.total_trials")}: <span className="font-bold text-neutral-700 dark:text-neutral-300">{totalTrials}</span>
            </span>
          </div>
          <span className="text-neutral-500">
            {t("parent_portal.progress.overall_label")}: <span className={clsx(
              "font-bold",
              overallSuccessRate >= 80 ? "text-success-600" :
              overallSuccessRate >= 50 ? "text-warning-600" :
              totalTrials > 0 ? "text-error-600" : "text-neutral-400"
            )}>{overallSuccessRate}%</span>
          </span>
        </div>

        {/* Progress Bar */}
        {totalTrials > 0 && (
          <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full transition-all duration-300 rounded-full",
                overallSuccessRate >= 80 ? "bg-success-500" :
                overallSuccessRate >= 50 ? "bg-warning-500" : "bg-error-500"
              )}
              style={{ width: `${overallSuccessRate}%` }}
            />
          </div>
        )}
      </div>

      {/* Expandable History Section */}
      {sessionHistory.length > 1 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t("parent_portal.progress.session_history")} ({sessionHistory.length})
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {sortedHistory.map((session, idx) => {
                const successRate = calculateSuccessRate(session.scores);
                const sessionTotal = session.scores.minus + session.scores.zero + session.scores.prompted + session.scores.plus;

                return (
                  <div
                    key={session.sessionId}
                    className={clsx(
                      "flex items-center justify-between py-2 px-3 rounded-lg border",
                      idx === 0
                        ? "bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30"
                        : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {session.date.toLocaleDateString(currentLang, {
                            month: "short",
                            day: "numeric",
                            year: session.date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
                          })}
                        </p>
                        <p className="text-[10px] text-neutral-500">{session.sessionType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Mini score indicators */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-error-500">{"\u2212"}{session.scores.minus}</span>
                        <span className="text-[10px] font-bold text-neutral-400">0:{session.scores.zero}</span>
                        <span className="text-[10px] font-bold text-warning-500">P{session.scores.prompted}</span>
                        <span className="text-[10px] font-bold text-success-500">+{session.scores.plus}</span>
                      </div>

                      {/* Success rate badge */}
                      <div className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        successRate >= 80 ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400" :
                        successRate >= 50 ? "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400" :
                        sessionTotal > 0 ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400" :
                        "bg-neutral-100 text-neutral-500"
                      )}>
                        {successRate}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
