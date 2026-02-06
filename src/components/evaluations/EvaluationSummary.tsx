"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  User,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  GitCompare,
  AlertCircle,
  Lightbulb,
  Clock,
  BarChart2
} from "lucide-react";
import { Evaluation, CategorySummary } from "@/types/evaluation";
import { useEvaluation, useClientEvaluations, ABLLS_CATEGORIES } from "@/hooks/useEvaluations";
import CategoryScoring from "./CategoryScoring";
import EvaluationRadarChart, { EvaluationRadarChartMini } from "./EvaluationRadarChart";
import EvaluationComparison from "./EvaluationComparison";
import { ClientInfo } from "@/types/client";
import { calculateAge, formatAge } from "@/lib/ageUtils";
import { getABLLSInterpretation, getPriorityAreas, calculateDomainScores } from "@/lib/clinicalInterpretation";
import { generateABLLSGoals, SuggestedGoal } from "@/lib/goalGenerator";
import SuggestedGoals from "./SuggestedGoals";
import { useTranslation } from "react-i18next";

interface EvaluationSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientData: ClientInfo;
  evaluationId: string;
  previousEvaluation?: Evaluation | null;
  onReEvaluate?: () => void;
}

export default function EvaluationSummary({
  isOpen,
  onClose,
  clientId,
  clientData,
  evaluationId,
  previousEvaluation,
  onReEvaluate
}: EvaluationSummaryProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('ro') ? 'ro-RO' : 'en-US';
  const { evaluation, loading } = useEvaluation(clientId, evaluationId);
  const { evaluations: allEvaluations } = useClientEvaluations(clientId);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"summary" | "comparison">("summary");

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(currentLang, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  // Sort categories by key (A, B, C, etc.)
  const sortedCategories = evaluation?.categorySummaries
    ? Object.entries(evaluation.categorySummaries).sort(([a], [b]) => a.localeCompare(b))
    : [];

  // Calculate comparison with previous evaluation
  const getComparison = (categoryKey: string): { diff: number; trend: 'up' | 'down' | 'same' } | null => {
    if (!previousEvaluation?.categorySummaries?.[categoryKey] || !evaluation?.categorySummaries?.[categoryKey]) {
      return null;
    }
    const prev = previousEvaluation.categorySummaries[categoryKey].percentage;
    const curr = evaluation.categorySummaries[categoryKey].percentage;
    const diff = curr - prev;
    return {
      diff,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
    };
  };

  const overallComparison = previousEvaluation && evaluation?.overallPercentage !== undefined
    ? evaluation.overallPercentage - previousEvaluation.overallPercentage
    : null;

  // Age calculations
  const age = clientData.birthDate ? calculateAge(clientData.birthDate) : null;

  // Clinical interpretation
  const interpretation = evaluation ? getABLLSInterpretation(evaluation.overallPercentage) : null;

  // Priority intervention areas
  const priorityAreas = evaluation?.categorySummaries
    ? getPriorityAreas(evaluation.categorySummaries)
    : [];

  // Calculate domain scores
  const domainScores = evaluation?.categorySummaries
    ? calculateDomainScores(evaluation.categorySummaries)
    : {};

  // Generate suggested goals from emerging skills
  const suggestedGoals: SuggestedGoal[] = evaluation
    ? generateABLLSGoals(evaluation, clientData.name || "Client", ABLLS_CATEGORIES)
    : [];

  const handleViewReport = () => {
    const url = `/reports/evaluation/?type=ablls&id=${evaluationId}&clientId=${clientId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {t('evaluations.title')}
              </h2>
              <p className="text-sm text-neutral-500">{clientData.name}</p>
            </div>

            {/* View Toggle - only show if previous evaluation exists */}
            {previousEvaluation && (
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveView("summary")}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeView === "summary"
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  {t('evaluations.summary')}
                </button>
                <button
                  onClick={() => setActiveView("comparison")}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeView === "comparison"
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}
                >
                  <GitCompare className="w-4 h-4" />
                  {t('evaluations.compare')}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading || !evaluation ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeView === "comparison" && previousEvaluation ? (
            <div className="p-6">
              <EvaluationComparison
                currentEvaluation={evaluation}
                previousEvaluation={previousEvaluation}
              />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">{t('evaluations.completed')}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {formatDate(evaluation.completedAt || evaluation.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <User className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">{t('evaluations.evaluator')}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {evaluation.evaluatorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <Target className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">{t('evaluations.version')}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {evaluation.version}
                    </p>
                  </div>
                </div>
                {age && (
                  <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <Clock className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="text-xs text-neutral-500">{t('evaluations.client_age')}</p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {formatAge(age)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall Score */}
              <div className="p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 rounded-2xl border border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                      {t('evaluations.overall_score')}
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span
                        className={clsx(
                          "text-5xl font-bold",
                          evaluation.overallPercentage >= 70
                            ? "text-success-600"
                            : evaluation.overallPercentage >= 40
                            ? "text-warning-600"
                            : "text-error-600"
                        )}
                      >
                        {evaluation.overallPercentage}%
                      </span>
                      <span className="text-neutral-500">
                        ({evaluation.overallScore} / {evaluation.overallMaxScore} {t('evaluations.points')})
                      </span>
                    </div>
                    {overallComparison !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        {overallComparison > 0 ? (
                          <TrendingUp className="w-4 h-4 text-success-600" />
                        ) : overallComparison < 0 ? (
                          <TrendingDown className="w-4 h-4 text-error-600" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-400" />
                        )}
                        <span
                          className={clsx(
                            "text-sm font-medium",
                            overallComparison > 0
                              ? "text-success-600"
                              : overallComparison < 0
                              ? "text-error-600"
                              : "text-neutral-500"
                          )}
                        >
                          {overallComparison > 0 ? "+" : ""}
                          {t('evaluations.since_last', { value: overallComparison })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mini radar preview */}
                  <div className="hidden md:block w-40 h-40 bg-white/50 dark:bg-neutral-800/50 rounded-xl overflow-hidden">
                    <EvaluationRadarChartMini evaluation={evaluation} />
                  </div>
                </div>
              </div>

              {/* Clinical Interpretation */}
              {interpretation && (
                <div className={clsx(
                  "p-4 rounded-xl border",
                  interpretation.level === 'excellent' ? "bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800" :
                  interpretation.level === 'good' ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" :
                  interpretation.level === 'moderate' ? "bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800" :
                  "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                )}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={clsx(
                      "w-5 h-5 mt-0.5 flex-shrink-0",
                      interpretation.level === 'excellent' ? "text-success-600" :
                      interpretation.level === 'good' ? "text-blue-600" :
                      interpretation.level === 'moderate' ? "text-warning-600" :
                      "text-orange-600"
                    )} />
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white">
                        {t('evaluations.clinical_interpretation')}: {interpretation.title}
                      </h4>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                        {interpretation.description}
                      </p>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mt-2">
                        {interpretation.recommendation}
                      </p>
                      {interpretation.interventionHours && (
                        <p className="text-xs text-neutral-500 mt-1 italic">
                          {interpretation.interventionHours}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Priority Intervention Areas */}
              {priorityAreas.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-white">
                        {t('evaluations.priority_areas')}
                      </h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {t('evaluations.priority_subtitle')}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {priorityAreas.map(area => (
                          <span
                            key={area.key}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-neutral-800 rounded-lg text-sm border border-amber-200 dark:border-amber-700"
                          >
                            <span className="font-bold text-amber-700 dark:text-amber-400">{area.key}</span>
                            <span className="text-neutral-600 dark:text-neutral-300">{area.name}</span>
                            <span className="text-xs text-neutral-500">({area.percentage}%)</span>
                          </span>
                        ))}
                      </div>
                      {suggestedGoals.length > 0 && (
                        <p className="text-xs text-neutral-500 mt-3">
                          {suggestedGoals.length} emerging skills identified for IEP goal development
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Radar Chart */}
              <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                  {t('evaluations.skills_overview')}
                </h3>
                <EvaluationRadarChart
                  evaluation={evaluation}
                  previousEvaluation={previousEvaluation}
                  size="lg"
                  showLegend={!!previousEvaluation}
                />
                {previousEvaluation && (
                  <p className="text-xs text-center text-neutral-500 mt-2">
                    {t('evaluations.comparing_with')} {new Date(previousEvaluation.completedAt || previousEvaluation.updatedAt).toLocaleDateString(currentLang)}
                  </p>
                )}
              </div>

              {/* Suggested IEP Goals */}
              {suggestedGoals.length > 0 && (
                <SuggestedGoals
                  goals={suggestedGoals}
                  title={t('evaluations.suggested_goals')}
                  emptyMessage={t('evaluations.no_emerging_skills')}
                />
              )}

              {/* Domain Breakdown */}
              <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                  {t('evaluations.domain_analysis')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(domainScores).map(([domain, data]) => (
                    <div key={domain} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                          {domain}
                        </h4>
                        <span className={clsx(
                          "text-sm font-bold",
                          data.percentage >= 80 ? "text-success-600" :
                          data.percentage >= 60 ? "text-blue-600" :
                          data.percentage >= 40 ? "text-warning-600" :
                          "text-error-600"
                        )}>
                          {data.percentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all",
                            data.percentage >= 80 ? "bg-success-500" :
                            data.percentage >= 60 ? "bg-blue-500" :
                            data.percentage >= 40 ? "bg-warning-500" :
                            "bg-error-500"
                          )}
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-2">
                        Categories: {data.categories.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                  {t('evaluations.category_breakdown')}
                </h3>
                <div className="space-y-2">
                  {sortedCategories.map(([key, summary]) => {
                    const comparison = getComparison(key);
                    const isExpanded = expandedCategory === key;
                    const category = ABLLS_CATEGORIES.find((c) => c.id === key);

                    return (
                      <div
                        key={key}
                        className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? null : key)}
                          className="w-full p-4 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {/* Category Key Badge */}
                          <div
                            className={clsx(
                              "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white",
                              summary.percentage >= 70
                                ? "bg-success-500"
                                : summary.percentage >= 40
                                ? "bg-warning-500"
                                : "bg-error-500"
                            )}
                          >
                            {key}
                          </div>

                          {/* Category Name & Progress */}
                          <div className="flex-1 text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-neutral-900 dark:text-white">
                                {summary.categoryName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={clsx(
                                    "text-sm font-bold",
                                    summary.percentage >= 70
                                      ? "text-success-600"
                                      : summary.percentage >= 40
                                      ? "text-warning-600"
                                      : "text-error-600"
                                  )}
                                >
                                  {summary.percentage}%
                                </span>
                                {comparison && (
                                  <span
                                    className={clsx(
                                      "text-xs font-medium px-1.5 py-0.5 rounded",
                                      comparison.trend === 'up'
                                        ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                        : comparison.trend === 'down'
                                        ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                                    )}
                                  >
                                    {comparison.diff > 0 ? "+" : ""}
                                    {comparison.diff}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div
                                className={clsx(
                                  "h-full transition-all",
                                  summary.percentage >= 70
                                    ? "bg-success-500"
                                    : summary.percentage >= 40
                                    ? "bg-warning-500"
                                    : "bg-error-500"
                                )}
                                style={{ width: `${summary.percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              {summary.scoredItems}/{summary.totalItems} {t('evaluations.items')} · {summary.totalScore}/{summary.maxPossibleScore} {t('evaluations.points')}
                            </p>
                          </div>

                          {/* Expand Icon */}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && category && (
                          <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-900/50">
                            <CategoryScoring
                              category={category}
                              scores={evaluation.scores}
                              previousScores={previousEvaluation?.scores}
                              onScoreChange={() => {}}
                              readOnly
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            {t('evaluations.close')}
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleViewReport}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all flex items-center gap-2 shadow-lg shadow-primary-600/20"
            >
              <BarChart2 className="w-4 h-4" />
              {t('evaluations.view_report')}
            </button>
            {onReEvaluate && (
              <button
                onClick={onReEvaluate}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('evaluations.start_reevaluation')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}