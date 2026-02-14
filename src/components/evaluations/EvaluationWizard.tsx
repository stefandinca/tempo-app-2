"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Loader2,
  AlertCircle,
  Lightbulb,
  Info
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  useEvaluation,
  useEvaluationActions,
  ABLLS_CATEGORIES,
  ABLLS_TOTAL_ITEMS
} from "@/hooks/useEvaluations";
import { ItemScore, Evaluation } from "@/types/evaluation";
import CategoryScoring from "./CategoryScoring";
import { MobileEvaluationContainer } from "./shared/MobileEvaluationContainer";
import { CategoryBottomSheet } from "./shared/CategoryBottomSheet";
import { calculateAge } from "@/lib/ageUtils";
import { useConfirm } from "@/context/ConfirmContext";
import { logActivity } from "@/lib/activityService";

interface EvaluationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientDob?: string;
  evaluationId?: string;
  previousEvaluation?: Evaluation | null;
}

export default function EvaluationWizard({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientDob,
  evaluationId,
  previousEvaluation
}: EvaluationWizardProps) {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { saving, createEvaluation, saveEvaluationProgress, completeEvaluation } = useEvaluationActions();

  const age = calculateAge(clientDob);

  // Local state
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [localScores, setLocalScores] = useState<Record<string, ItemScore>>({});
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(evaluationId || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreatingRef = useRef(false);

  const { evaluation: existingEvaluation, loading: loadingEvaluation } = useEvaluation(
    clientId,
    activeEvaluationId || ""
  );

  useEffect(() => {
    if (!isOpen) return;

    const initEvaluation = async () => {
      if (evaluationId) {
        setActiveEvaluationId(evaluationId);
      } else if (!activeEvaluationId && !isCreatingRef.current) {
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

          // Log activity for evaluation creation
          if (user && userData) {
            try {
              await logActivity({
                type: 'evaluation_created',
                userId: user.uid,
                userName: userData.name || user.email || 'Unknown',
                userPhotoURL: userData.photoURL || user.photoURL || undefined,
                targetId: newId,
                targetName: clientName || 'Unknown Client',
                metadata: {
                  clientId: clientId,
                  clientName: clientName,
                  evaluationType: 'ABLLS-R'
                }
              });
            } catch (activityError) {
              console.error('Failed to log activity:', activityError);
            }
          }
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
  }, [isOpen, evaluationId, clientId, createEvaluation, user?.uid, userData?.name, previousEvaluation?.id, success, toastError, onClose, activeEvaluationId]);

  useEffect(() => {
    if (existingEvaluation) {
      setLocalScores(existingEvaluation.scores || {});
    }
  }, [existingEvaluation]);

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

  const handleScoreChange = useCallback((itemId: string, score: number, note?: string, isNA?: boolean) => {
    setLocalScores((prev) => ({
      ...prev,
      [itemId]: {
        score,
        updatedAt: new Date().toISOString(),
        ...(isNA !== undefined && { isNA }),
        ...(note !== undefined && note !== "" && { note })
      }
    }));
    setHasUnsavedChanges(true);
  }, []);

  const scoredItemsCount = Object.keys(localScores).length;
  const progressPercentage = Math.round((scoredItemsCount / ABLLS_TOTAL_ITEMS) * 100);

  const getCategoryCompletion = (categoryIndex: number) => {
    const category = ABLLS_CATEGORIES[categoryIndex];
    const scored = category.items.filter((item) => localScores[item.id] !== undefined).length;
    return { scored, total: category.items.length };
  };

  const handleSaveProgress = async () => {
    if (!activeEvaluationId) return;
    try {
      await saveEvaluationProgress(clientId, activeEvaluationId, localScores);
      setHasUnsavedChanges(false);
      success("Progress saved");
    } catch (err) {
      toastError("Failed to save progress");
    }
  };

  const handleComplete = async () => {
    if (!activeEvaluationId) return;

    const doComplete = async () => {
      try {
        await completeEvaluation(clientId, activeEvaluationId, localScores);
        success("Evaluation completed!");

        // Log activity for evaluation completion
        if (user && userData) {
          try {
            await logActivity({
              type: 'evaluation_updated',
              userId: user.uid,
              userName: userData.name || user.email || 'Unknown',
              userPhotoURL: userData.photoURL || user.photoURL || undefined,
              targetId: activeEvaluationId!,
              targetName: clientName || 'Unknown Client',
              metadata: {
                clientId: clientId,
                clientName: clientName,
                evaluationType: 'ABLLS-R'
              }
            });
          } catch (activityError) {
            console.error('Failed to log activity:', activityError);
          }
        }

        onClose();
      } catch (err) {
        toastError("Failed to complete evaluation");
      }
    };

    if (scoredItemsCount < ABLLS_TOTAL_ITEMS) {
      customConfirm({
        title: "Complete Evaluation?",
        message: `You have scored ${scoredItemsCount} of ${ABLLS_TOTAL_ITEMS} items. Do you want to complete the evaluation anyway?`,
        confirmLabel: "Complete",
        variant: 'warning',
        onConfirm: doComplete
      });
    } else {
      doComplete();
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      customConfirm({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Do you want to save before closing?",
        confirmLabel: t('common.save'),
        cancelLabel: "Discard",
        variant: 'warning',
        onConfirm: async () => {
          await handleSaveProgress();
          onClose();
        },
        onCancel: () => {
          onClose();
        }
      });
      return;
    }
    onClose();
  };

  const goToCategory = (index: number) => {
    if (index >= 0 && index < ABLLS_CATEGORIES.length) {
      setCurrentCategoryIndex(index);
    }
  };

  if (!isOpen) return null;
  const isLoading = isInitializing || loadingEvaluation;

  const evaluationTitle = previousEvaluation ? "Re-evaluation" : "ABLLS Evaluation";

  return (
    <MobileEvaluationContainer
      title={evaluationTitle}
      onClose={handleClose}
      showProgress={true}
      progress={{
        current: scoredItemsCount,
        total: ABLLS_TOTAL_ITEMS
      }}
    >
      {/* Inner container for desktop modal styling */}
      <div className="flex flex-col h-full md:max-h-[90vh]">
        {/* Desktop header - hidden on mobile (MobileEvaluationContainer has its own mobile header) */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
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
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="hidden md:block px-6 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Overall Progress</span>
            <span className="text-sm font-bold text-primary-600">{scoredItemsCount} / {ABLLS_TOTAL_ITEMS} items ({progressPercentage}%)</span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        {/* Desktop category navigation - horizontal chips (hidden on mobile) */}
        <div className="hidden md:block px-6 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-wrap gap-2">
            {ABLLS_CATEGORIES.map((category, index) => {
              const { scored, total } = getCategoryCompletion(index);
              const isComplete = scored === total;
              const isActive = index === currentCategoryIndex;
              return (
                <button
                  key={category.id}
                  onClick={() => goToCategory(index)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    isActive ? "bg-primary-600 text-white" : isComplete ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400" : scored > 0 ? "bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                >
                  <span>{category.id}</span>
                  {isComplete && !isActive && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content area - extra padding bottom on mobile for category bottom sheet */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{currentCategory.id}. {currentCategory.title}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{getCategoryCompletion(currentCategoryIndex).scored} of {getCategoryCompletion(currentCategoryIndex).total} items scored</p>
                </div>
                {age && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl px-4 py-2 flex items-center gap-3">
                    <Info className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-bold">Protocol Adaptat:</span> Afișăm recomandări pentru vârsta de <span className="font-bold">{age.years} ani</span>.
                    </p>
                  </div>
                )}
              </div>

              {age && age.years < 5 && ["P", "Q", "R", "S"].includes(currentCategory.id) && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex gap-3 animate-in slide-in-from-top-2 duration-300">
                  <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-bold mb-1">Notă Clinică: Recomandare Vârstă</p>
                    <p>Abilitățile din categoria <strong>{currentCategory.title}</strong> sunt de obicei dezvoltate după vârsta de 5 ani. Pentru un copil de {age.years} ani, prioritizați ariile fundamentale (A-E) dacă există lacune.</p>
                  </div>
                </div>
              )}

              <CategoryScoring
                category={currentCategory}
                scores={localScores}
                previousScores={previousEvaluation?.scores}
                onScoreChange={handleScoreChange}
                clientAgeYears={age?.years}
              />
            </>
          )}
        </div>

        {/* Footer actions - adjusted for mobile to sit above bottom sheet */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-20 md:mb-0">
          {/* Mobile: Previous button hidden (use bottom sheet for navigation) */}
          <button
            onClick={() => goToCategory(currentCategoryIndex - 1)}
            disabled={currentCategoryIndex === 0}
            className={clsx("hidden md:flex px-4 py-2 rounded-lg text-sm font-medium transition-colors items-center gap-2", currentCategoryIndex === 0 ? "text-neutral-400 cursor-not-allowed" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800")}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {/* Action buttons - full width on mobile */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {hasUnsavedChanges && <span className="text-xs text-warning-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Unsaved changes</span>}
            <button
              onClick={handleSaveProgress}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
            </button>

            {currentCategoryIndex === ABLLS_CATEGORIES.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-success-600 hover:bg-success-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Complete Evaluation
              </button>
            ) : (
              <button
                onClick={() => goToCategory(currentCategoryIndex + 1)}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors flex items-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile category navigation - bottom sheet */}
        <CategoryBottomSheet
          categories={ABLLS_CATEGORIES.map((cat, index) => {
            const { scored, total } = getCategoryCompletion(index);
            return {
              id: cat.id,
              name: `${cat.id}. ${cat.title}`,
              progress: { scored, total }
            };
          })}
          currentCategory={currentCategory.id}
          onSelectCategory={(categoryId) => {
            const index = ABLLS_CATEGORIES.findIndex(c => c.id === categoryId);
            if (index !== -1) goToCategory(index);
          }}
        />
      </div>
    </MobileEvaluationContainer>
  );
}
