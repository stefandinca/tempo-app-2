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
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { useClientVBMAPPEvaluations, useVBMAPPActions } from "@/hooks/useVBMAPP";
import { useToast } from "@/context/ToastContext";
import VBMAPPMilestoneGrid from "./VBMAPPMilestoneGrid";

interface VBMAPPListProps {
  clientId: string;
  clientName: string;
  onStartNew: () => void;
  onContinue: (evaluationId: string) => void;
  onView: (evaluationId: string) => void;
  onReEvaluate: (evaluation: VBMAPPEvaluation) => void;
}

export default function VBMAPPList({
  clientId,
  clientName,
  onStartNew,
  onContinue,
  onView,
  onReEvaluate
}: VBMAPPListProps) {
  const { evaluations, loading, error } = useClientVBMAPPEvaluations(clientId);
  const { deleteEvaluation, saving } = useVBMAPPActions();
  const { success, error: toastError } = useToast();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (evaluationId: string) => {
    if (!confirm("Delete this VB-MAPP evaluation? This cannot be undone.")) {
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
      {/* Start New Button */}
      <button
        onClick={onStartNew}
        className="w-full py-4 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl text-purple-600 dark:text-purple-400 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all font-medium flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Start New VB-MAPP Evaluation
      </button>

      {/* In Progress */}
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      VB-MAPP Evaluation
                    </p>
                    <p className="text-sm text-neutral-500">
                      Started {formatDate(evaluation.createdAt)} · {evaluation.overallMilestonePercentage}% scored
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
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${evaluation.overallMilestonePercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      VB-MAPP Evaluation
                    </p>
                    <p className="text-sm text-neutral-500">
                      Completed {formatDate(evaluation.completedAt || evaluation.updatedAt)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      By {evaluation.evaluatorName} · Level {evaluation.dominantLevel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Score */}
                  <div className="text-right">
                    <p
                      className={clsx(
                        "text-2xl font-bold",
                        evaluation.overallMilestonePercentage >= 70
                          ? "text-success-600"
                          : evaluation.overallMilestonePercentage >= 40
                          ? "text-warning-600"
                          : "text-error-600"
                      )}
                    >
                      {evaluation.overallMilestonePercentage}%
                    </p>
                    <p className="text-xs text-neutral-400">
                      {evaluation.overallMilestoneScore}/{evaluation.overallMilestoneMaxScore}
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

              {/* Mini grid preview */}
              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <VBMAPPMilestoneGrid evaluation={evaluation} compact />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {evaluations.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            No VB-MAPP Evaluations Yet
          </h3>
          <p className="text-neutral-500 max-w-sm mx-auto mb-6">
            Start a VB-MAPP evaluation to assess {clientName}&apos;s verbal behavior milestones and track progress.
          </p>
          <button
            onClick={onStartNew}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            Start First Evaluation
          </button>
        </div>
      )}
    </div>
  );
}
