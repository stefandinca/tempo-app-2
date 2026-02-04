"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  X,
  Download,
  RefreshCw,
  Calendar,
  User,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from "lucide-react";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { useVBMAPPEvaluation, VBMAPP_BARRIERS, VBMAPP_SKILL_AREAS } from "@/hooks/useVBMAPP";
import VBMAPPMilestoneGrid from "./VBMAPPMilestoneGrid";
import { generateVBMAPPPDF } from "@/lib/pdfGenerator";
import { calculateAge, formatAge, getVBMAPPDevelopmentalAge, getVBMAPPLevelMidpoint, calculateDevelopmentalDelay, calculatePreciseDevelopmentalAge } from "@/lib/ageUtils";
import { ClientInfo } from "@/types/client";
import { getBarrierRecommendation } from "@/lib/clinicalInterpretation";
import { getVBMAPPInterpretation } from "@/lib/clinicalInterpretation";
import { generateVBMAPPGoals, SuggestedGoal } from "@/lib/goalGenerator";
import SuggestedGoals from "../SuggestedGoals";

interface VBMAPPSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientData: ClientInfo;
  evaluationId: string;
  previousEvaluation?: VBMAPPEvaluation | null;
  onReEvaluate?: () => void;
}

export default function VBMAPPSummary({
  isOpen,
  onClose,
  clientId,
  clientData,
  evaluationId,
  previousEvaluation,
  onReEvaluate
}: VBMAPPSummaryProps) {
  const { evaluation, loading } = useVBMAPPEvaluation(clientId, evaluationId);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  const handleExportPDF = () => {
    if (evaluation) {
      generateVBMAPPPDF(evaluation, clientData, VBMAPP_BARRIERS);
    }
  };

  const overallComparison = previousEvaluation && evaluation
    ? evaluation.overallMilestonePercentage - previousEvaluation.overallMilestonePercentage
    : null;

  const getReadinessLabel = (level: string) => {
    switch (level) {
      case 'ready': return { label: 'Ready', color: 'text-success-600 bg-success-100 dark:bg-success-900/30' };
      case 'developing': return { label: 'Developing', color: 'text-warning-600 bg-warning-100 dark:bg-warning-900/30' };
      case 'emerging': return { label: 'Emerging', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
      default: return { label: 'Not Ready', color: 'text-error-600 bg-error-100 dark:bg-error-900/30' };
    }
  };

  // Age Calculations
  const age = clientData.birthDate ? calculateAge(clientData.birthDate) : null;
  const devAge = evaluation ? getVBMAPPDevelopmentalAge(evaluation.dominantLevel) : "";
  
  const delayStats = (age && evaluation) ? calculateDevelopmentalDelay(
    age.totalMonths,
    calculatePreciseDevelopmentalAge(evaluation.overallMilestoneScore)
  ) : null;

  // Clinical interpretation
  const interpretation = (delayStats && evaluation)
    ? getVBMAPPInterpretation(delayStats.delayPercentage, delayStats.severityLabel, evaluation.dominantLevel)
    : null;

  // Generate suggested goals from emerging skills (scored 0.5)
  const suggestedGoals: SuggestedGoal[] = evaluation
    ? generateVBMAPPGoals(evaluation, clientData.name || "Client", VBMAPP_SKILL_AREAS)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              VB-MAPP Evaluation Results
            </h2>
            <p className="text-sm text-neutral-500">{clientData.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800 transition-colors"
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
          ) : (
            <div className="p-6 space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Completed</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {formatDate(evaluation.completedAt || evaluation.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <User className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Evaluator</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {evaluation.evaluatorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <Target className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Dominant Level</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      Level {evaluation.dominantLevel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <ArrowRight className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Transition Readiness</p>
                    <span className={clsx(
                      "text-xs font-bold px-2 py-0.5 rounded",
                      getReadinessLabel(evaluation.transitionSummary.readinessLevel).color
                    )}>
                      {getReadinessLabel(evaluation.transitionSummary.readinessLevel).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Age Analysis (New Section) */}
              {age && delayStats && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Chronological Age</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">{formatAge(age)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Dev. Age Equivalent</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">{devAge}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Developmental Delay</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-neutral-900 dark:text-white">
                        {delayStats.delayMonths > 0 ? `${delayStats.delayMonths} months` : "None"}
                      </p>
                      {delayStats.delayMonths > 0 && (
                        <span className={clsx(
                          "text-xs px-2 py-0.5 rounded font-bold uppercase",
                          delayStats.severityLabel === 'profound' ? "bg-red-100 text-red-700" :
                          delayStats.severityLabel === 'severe' ? "bg-orange-100 text-orange-700" :
                          delayStats.severityLabel === 'moderate' ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {delayStats.severityLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                        Clinical Interpretation: {interpretation.title}
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
                      {suggestedGoals.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-current/10">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              <span className="font-bold text-amber-600">{suggestedGoals.length}</span> emerging skills identified for IEP goal development
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Overall Milestones Score */}
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                      Overall Milestones Score
                    </p>
                    <div className="flex items-baseline gap-3">
                      <span
                        className={clsx(
                          "text-5xl font-bold",
                          evaluation.overallMilestonePercentage >= 70
                            ? "text-success-600"
                            : evaluation.overallMilestonePercentage >= 40
                            ? "text-warning-600"
                            : "text-error-600"
                        )}
                      >
                        {evaluation.overallMilestonePercentage}%
                      </span>
                      <span className="text-neutral-500">
                        ({evaluation.overallMilestoneScore} / {evaluation.overallMilestoneMaxScore} points)
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
                            overallComparison > 0 ? "text-success-600" : overallComparison < 0 ? "text-error-600" : "text-neutral-500"
                          )}
                        >
                          {overallComparison > 0 ? "+" : ""}{overallComparison}% since last evaluation
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestone Grid */}
              <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                  Milestone Grid
                </h3>
                <VBMAPPMilestoneGrid evaluation={evaluation} previousEvaluation={previousEvaluation} />
              </div>

              {/* Suggested IEP Goals */}
              {suggestedGoals.length > 0 && (
                <SuggestedGoals
                  goals={suggestedGoals}
                  title="Suggested IEP Goals"
                  emptyMessage="No emerging skills identified for goal development."
                />
              )}

              {/* Level Breakdown */}
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                  Level Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(evaluation.levelSummaries).map(([key, level]) => (
                    <div
                      key={key}
                      className={clsx(
                        "p-4 rounded-xl border",
                        key === '1' ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" :
                        key === '2' ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" :
                        "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800"
                      )}
                    >
                      <p className={clsx(
                        "text-sm font-medium mb-2",
                        key === '1' ? "text-indigo-600 dark:text-indigo-400" :
                        key === '2' ? "text-purple-600 dark:text-purple-400" :
                        "text-pink-600 dark:text-pink-400"
                      )}>
                        {level.levelName}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className={clsx(
                          "text-3xl font-bold",
                          level.percentage >= 70 ? "text-success-600" :
                          level.percentage >= 40 ? "text-warning-600" :
                          "text-error-600"
                        )}>
                          {level.percentage}%
                        </span>
                        <span className="text-xs text-neutral-500">
                          {level.totalScore}/{level.maxPossibleScore}
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-white/50 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            "h-full transition-all",
                            level.percentage >= 70 ? "bg-success-500" :
                            level.percentage >= 40 ? "bg-warning-500" :
                            "bg-error-500"
                          )}
                          style={{ width: `${level.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barriers Summary */}
              <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'barriers' ? null : 'barriers')}
                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning-500" />
                    <div className="text-left">
                      <h3 className="font-bold text-neutral-900 dark:text-white">Barriers Assessment</h3>
                      <p className="text-sm text-neutral-500">
                        {evaluation.barrierSummary.severeBarriers.length} severe barriers identified
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      "text-lg font-bold",
                      evaluation.barrierSummary.averageSeverity <= 1 ? "text-success-600" :
                      evaluation.barrierSummary.averageSeverity <= 2 ? "text-warning-600" :
                      "text-error-600"
                    )}>
                      Avg: {evaluation.barrierSummary.averageSeverity}
                    </span>
                    {expandedSection === 'barriers' ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </button>

                {expandedSection === 'barriers' && (
                  <div className="p-4 pt-0 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="space-y-2 mt-4">
                      {VBMAPP_BARRIERS.filter((b) => evaluation.barrierScores[b.id]).map((barrier, idx) => {
                        const score = evaluation.barrierScores[barrier.id]?.score as number;
                        return (
                          <div
                            key={barrier.id}
                            className={clsx(
                              "p-3 rounded-lg flex items-center gap-3",
                              score >= 3 ? "bg-error-50 dark:bg-error-900/20" : "bg-neutral-50 dark:bg-neutral-800"
                            )}
                          >
                            <span className={clsx(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm",
                              score === 0 ? "bg-success-500" :
                              score <= 2 ? "bg-warning-500" :
                              "bg-error-500"
                            )}>
                              {score}
                            </span>
                            <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 font-medium">
                              {barrier.text.split('(')[0].trim()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Transition Summary */}
              <div className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-5 h-5 text-primary-500" />
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white">Transition Assessment</h3>
                      <p className="text-sm text-neutral-500">
                        {evaluation.transitionSummary.scoredItems}/{evaluation.transitionSummary.totalItems} items scored
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      "text-2xl font-bold",
                      evaluation.transitionSummary.percentage >= 80 ? "text-success-600" :
                      evaluation.transitionSummary.percentage >= 60 ? "text-warning-600" :
                      "text-error-600"
                    )}>
                      {evaluation.transitionSummary.percentage}%
                    </span>
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-sm font-bold",
                      getReadinessLabel(evaluation.transitionSummary.readinessLevel).color
                    )}>
                      {getReadinessLabel(evaluation.transitionSummary.readinessLevel).label}
                    </span>
                  </div>
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
            Close
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Clinical PDF
            </button>
            <button 
              onClick={() => generateVBMAPPPDF(evaluation!, clientData, VBMAPP_BARRIERS, true)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Parent Version
            </button>
            {onReEvaluate && (
              <button
                onClick={onReEvaluate}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Start Re-evaluation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}