"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  MoreVertical,
  Trash2,
  RefreshCw,
  Eye,
  Loader2
} from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import { useClientEvaluations, useEvaluationActions } from "@/hooks/useEvaluations";
import { useToast } from "@/context/ToastContext";
import { EvaluationRadarChartMini } from "./EvaluationRadarChart";

interface EvaluationListProps {
  clientId: string;
  clientName: string;
  onStartNew: () => void;
  onContinue: (evaluationId: string) => void;
  onView: (evaluationId: string) => void;
  onReEvaluate: (evaluation: Evaluation) => void;
}

export default function EvaluationList({
  clientId,
  clientName,
  onStartNew,
  onContinue,
  onView,
  onReEvaluate
}: EvaluationListProps) {
  const { evaluations, loading, error } = useClientEvaluations(clientId);
  const { deleteEvaluation, saving } = useEvaluationActions();
  const { success, error: toastError } = useToast();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (evaluationId: string) => {
    if (!confirm("Are you sure you want to delete this evaluation? This cannot be undone.")) {
      return;
    }

    setDeletingId(evaluationId);
    try {
      await deleteEvaluation(clientId, evaluationId);
      success("Evaluation deleted");
    } catch (err) {
      console.error("Failed to delete evaluation:", err);
      toastError("Failed to delete evaluation");
    } finally {
      setDeletingId(null);
      setMenuOpen(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const inProgressEvaluations = evaluations.filter((e) => e.status === "in_progress");
  const completedEvaluations = evaluations.filter((e) => e.status === "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Start New Evaluation Button */}
      <button
        onClick={onStartNew}
        className="w-full py-4 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-2xl text-primary-600 dark:text-primary-400 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all font-medium flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Start New ABLLS Evaluation
      </button>

      {/* In Progress Evaluations */}
      {inProgressEvaluations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" />
            In Progress ({inProgressEvaluations.length})
          </h4>
          {inProgressEvaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {evaluation.type} Evaluation
                    </p>
                    <p className="text-sm text-neutral-500">
                      Started {formatDate(evaluation.createdAt)} · {evaluation.overallPercentage}% scored
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      By {evaluation.evaluatorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onContinue(evaluation.id)}
                    className="px-4 py-2 bg-warning-600 hover:bg-warning-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === evaluation.id ? null : evaluation.id)}
                      className="p-2 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-900/30 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-neutral-500" />
                    </button>
                    {menuOpen === evaluation.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                        <button
                          onClick={() => handleDelete(evaluation.id)}
                          disabled={deletingId === evaluation.id}
                          className="w-full px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center gap-2 disabled:opacity-50"
                        >
                          {deletingId === evaluation.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-warning-200 dark:bg-warning-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning-500 transition-all"
                  style={{ width: `${evaluation.overallPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Evaluations */}
      {completedEvaluations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed ({completedEvaluations.length})
          </h4>
          {completedEvaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {evaluation.type} Evaluation
                    </p>
                    <p className="text-sm text-neutral-500">
                      Completed {formatDate(evaluation.completedAt || evaluation.updatedAt)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      By {evaluation.evaluatorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Score Badge */}
                  <div className="text-right">
                    <p
                      className={clsx(
                        "text-2xl font-bold",
                        evaluation.overallPercentage >= 70
                          ? "text-success-600"
                          : evaluation.overallPercentage >= 40
                          ? "text-warning-600"
                          : "text-error-600"
                      )}
                    >
                      {evaluation.overallPercentage}%
                    </p>
                    <p className="text-xs text-neutral-400">
                      {evaluation.overallScore}/{evaluation.overallMaxScore}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onView(evaluation.id)}
                      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-5 h-5 text-neutral-500" />
                    </button>
                    <button
                      onClick={() => onReEvaluate(evaluation)}
                      className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                      title="Start re-evaluation"
                    >
                      <RefreshCw className="w-5 h-5 text-primary-600" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === evaluation.id ? null : evaluation.id)}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-neutral-500" />
                      </button>
                      {menuOpen === evaluation.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                          <button
                            onClick={() => handleDelete(evaluation.id)}
                            disabled={deletingId === evaluation.id}
                            className="w-full px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center gap-2 disabled:opacity-50"
                          >
                            {deletingId === evaluation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Radar chart preview and category bars */}
              <div className="mt-4 flex items-center gap-4">
                {/* Mini radar chart */}
                <div className="w-24 h-24 flex-shrink-0">
                  <EvaluationRadarChartMini evaluation={evaluation} />
                </div>

                {/* Category preview bars */}
                <div className="flex-1 grid grid-cols-9 gap-1">
                  {Object.entries(evaluation.categorySummaries || {})
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(0, 9)
                    .map(([key, summary]) => (
                      <div key={key} className="text-center">
                        <div
                          className="h-8 rounded bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
                          title={`${summary.categoryName}: ${summary.percentage}%`}
                        >
                          <div
                            className={clsx(
                              "h-full transition-all",
                              summary.percentage >= 70
                                ? "bg-success-500"
                                : summary.percentage >= 40
                                ? "bg-warning-500"
                                : "bg-error-500"
                            )}
                            style={{ height: `${summary.percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-400 mt-1">{key}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {evaluations.length === 0 && (
        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            No Evaluations Yet
          </h3>
          <p className="text-neutral-500 max-w-sm mx-auto mb-6">
            Start an ABLLS evaluation to assess {clientName}&apos;s skills and track progress over time.
          </p>
          <button
            onClick={onStartNew}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Start First Evaluation
          </button>
        </div>
      )}
    </div>
  );
}
