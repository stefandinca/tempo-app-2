"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { clsx } from "clsx";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  useEvaluation,
  useEvaluationActions,
  ABLLS_CATEGORIES,
  ABLLS_TOTAL_ITEMS
} from "@/hooks/useEvaluations";
import { ItemScore, ScoreValue, Evaluation } from "@/types/evaluation";
import CategoryScoring from "./CategoryScoring";

interface EvaluationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  evaluationId?: string; // If editing existing
  previousEvaluation?: Evaluation | null; // For re-evaluation comparison
}

export default function EvaluationWizard({
  isOpen,
  onClose,
  clientId,
  clientName,
  evaluationId,
  previousEvaluation
}: EvaluationWizardProps) {
  const { user, userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { saving, createEvaluation, saveEvaluationProgress, completeEvaluation } =
    useEvaluationActions();

  // Local state
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [localScores, setLocalScores] = useState<Record<string, ItemScore>>({});
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(
    evaluationId || null
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Ref to prevent duplicate evaluation creation
  const isCreatingRef = useRef(false);

  // Fetch existing evaluation if editing
  const { evaluation: existingEvaluation, loading: loadingEvaluation } = useEvaluation(
    clientId,
    activeEvaluationId || ""
  );

  // Initialize evaluation on open
  useEffect(() => {
    if (!isOpen) return;

    const initEvaluation = async () => {
      if (evaluationId) {
        // Editing existing - will load via hook
        setActiveEvaluationId(evaluationId);
      } else if (!activeEvaluationId && !isCreatingRef.current) {
        // Create new evaluation - use ref to prevent duplicate creation
        isCreatingRef.current = true;
        setIsInitializing(true);
        try {
          const newId = await createEvaluation(
            clientId,
            user?.uid || "",
            userData?.name || "Unknown",
            previousEvaluation?.id
          );
          setActiveEvaluationId(newId);
          success("Evaluation started");
        } catch (err) {
          console.error("Failed to create evaluation:", err);
          toastError("Failed to start evaluation");
          onClose();
        } finally {
          setIsInitializing(false);
        }
      }
    };

    initEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, evaluationId, clientId]);

  // Load existing scores when evaluation loads
  useEffect(() => {
    if (existingEvaluation) {
      setLocalScores(existingEvaluation.scores || {});
    }
  }, [existingEvaluation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentCategoryIndex(0);
      setLocalScores({});
      setActiveEvaluationId(evaluationId || null);
      setHasUnsavedChanges(false);
      isCreatingRef.current = false;
    }
  }, [isOpen, evaluationId]);

  const currentCategory = ABLLS_CATEGORIES[currentCategoryIndex];

  // Handle score change
  const handleScoreChange = useCallback(
    (itemId: string, score: ScoreValue, note?: string, isNA?: boolean) => {
      setLocalScores((prev) => ({
        ...prev,
        [itemId]: {
          score,
          updatedAt: new Date().toISOString(),
          ...(isNA !== undefined && { isNA }),
          // Only include note if it has a value (Firestore doesn't accept undefined)
          ...(note !== undefined && note !== "" && { note })
        }
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Calculate progress
  const scoredItemsCount = Object.keys(localScores).length;
  const progressPercentage = Math.round((scoredItemsCount / ABLLS_TOTAL_ITEMS) * 100);

  // Calculate category completion
  const getCategoryCompletion = (categoryIndex: number) => {
    const category = ABLLS_CATEGORIES[categoryIndex];
    const scored = category.items.filter((item) => localScores[item.id] !== undefined).length;
    return { scored, total: category.items.length };
  };

  // Save progress
  const handleSaveProgress = async () => {
    if (!activeEvaluationId) return;

    try {
      await saveEvaluationProgress(clientId, activeEvaluationId, localScores);
      setHasUnsavedChanges(false);
      success("Progress saved");
    } catch (err) {
      console.error("Failed to save progress:", err);
      toastError("Failed to save progress");
    }
  };

  // Complete evaluation
  const handleComplete = async () => {
    if (!activeEvaluationId) return;

    // Check if all items are scored
    if (scoredItemsCount < ABLLS_TOTAL_ITEMS) {
      const confirm = window.confirm(
        `You have scored ${scoredItemsCount} of ${ABLLS_TOTAL_ITEMS} items. ` +
          `Do you want to complete the evaluation anyway?`
      );
      if (!confirm) return;
    }

    try {
      await completeEvaluation(clientId, activeEvaluationId, localScores);
      success("Evaluation completed!");
      onClose();
    } catch (err) {
      console.error("Failed to complete evaluation:", err);
      toastError("Failed to complete evaluation");
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        "You have unsaved changes. Do you want to save before closing?"
      );
      if (confirm) {
        handleSaveProgress().then(() => onClose());
        return;
      }
    }
    onClose();
  };

  // Navigate categories
  const goToCategory = (index: number) => {
    if (index >= 0 && index < ABLLS_CATEGORIES.length) {
      setCurrentCategoryIndex(index);
    }
  };

  if (!isOpen) return null;

  const isLoading = isInitializing || loadingEvaluation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {previousEvaluation ? "Re-evaluation" : "ABLLS Evaluation"}
            </h2>
            <p className="text-sm text-neutral-500">
              {clientName}
              {previousEvaluation && (
                <span className="ml-2 text-primary-600">
                  (comparing with {new Date(previousEvaluation.completedAt || previousEvaluation.createdAt).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-primary-600">
              {scoredItemsCount} / {ABLLS_TOTAL_ITEMS} items ({progressPercentage}%)
            </span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {ABLLS_CATEGORIES.map((category, index) => {
              const { scored, total } = getCategoryCompletion(index);
              const isComplete = scored === total;
              const isActive = index === currentCategoryIndex;

              return (
                <button
                  key={category.key}
                  onClick={() => goToCategory(index)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    isActive
                      ? "bg-primary-600 text-white"
                      : isComplete
                      ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                      : scored > 0
                      ? "bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                >
                  <span>{category.key}</span>
                  {isComplete && !isActive && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <>
              {/* Category Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {currentCategory.key}. {currentCategory.name}
                </h3>
                <p className="text-sm text-neutral-500 mt-1">
                  {getCategoryCompletion(currentCategoryIndex).scored} of{" "}
                  {getCategoryCompletion(currentCategoryIndex).total} items scored
                </p>
              </div>

              {/* Scoring Legend */}
              <div className="mb-6 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-error-500 text-white flex items-center justify-center font-bold">0</span>
                  <span className="text-neutral-600 dark:text-neutral-400">Not observed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-warning-500 text-white flex items-center justify-center font-bold">1</span>
                  <span className="text-neutral-600 dark:text-neutral-400">Emerging (with prompts)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-success-500 text-white flex items-center justify-center font-bold">2</span>
                  <span className="text-neutral-600 dark:text-neutral-400">Mastered (independent)</span>
                </div>
              </div>

              {/* Category Scoring */}
              <CategoryScoring
                category={currentCategory}
                scores={localScores}
                previousScores={previousEvaluation?.scores}
                onScoreChange={handleScoreChange}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToCategory(currentCategoryIndex - 1)}
              disabled={currentCategoryIndex === 0}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                currentCategoryIndex === 0
                  ? "text-neutral-400 cursor-not-allowed"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-xs text-warning-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </span>
            )}

            <button
              onClick={handleSaveProgress}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Draft
            </button>

            {currentCategoryIndex === ABLLS_CATEGORIES.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-success-600 hover:bg-success-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Complete Evaluation
              </button>
            ) : (
              <button
                onClick={() => goToCategory(currentCategoryIndex + 1)}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
