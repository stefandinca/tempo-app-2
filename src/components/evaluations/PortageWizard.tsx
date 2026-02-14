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
  AlertCircle,
  Info
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  usePortageEvaluation,
  usePortageActions,
} from "@/hooks/usePortage";
import { PORTAGE_CATEGORIES, PortageScore } from "@/types/portage";
import PortageScoring from "./PortageScoring";
import { MobileEvaluationContainer } from "./shared/MobileEvaluationContainer";
import { CategoryBottomSheet } from "./shared/CategoryBottomSheet";
import { calculateAge } from "@/lib/ageUtils";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";

interface PortageWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientDob?: string;
  evaluationId?: string;
}

export default function PortageWizard({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientDob,
  evaluationId,
}: PortageWizardProps) {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { saving, createEvaluation, saveProgress, completeEvaluation } = usePortageActions();

  const age = calculateAge(clientDob);
  const totalMonths = age ? (age.years * 12 + age.months) : 0;

  // Local state
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [localScores, setLocalScores] = useState<Record<string, PortageScore>>({});
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(evaluationId || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreatingRef = useRef(false);

  // Fetch existing evaluation if editing
  const { evaluation: existingEvaluation, loading: loadingEvaluation } = usePortageEvaluation(
    clientId,
    activeEvaluationId || ""
  );

  // Initialize evaluation on open
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
            totalMonths
          );
          setActiveEvaluationId(newId);
          success("Portage evaluation started");
        } catch (err) {
          console.error("Failed to create Portage evaluation:", err);
          toastError("Failed to start evaluation");
          onClose();
        } finally {
          setIsInitializing(false);
        }
      }
    };

    initEvaluation();
  }, [isOpen, evaluationId, clientId, totalMonths, createEvaluation, user?.uid, userData?.name, success, toastError, onClose, activeEvaluationId]);

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

  const currentCategory = PORTAGE_CATEGORIES[currentCategoryIndex];

  const handleScoreChange = useCallback((itemId: string, achieved: boolean, note?: string) => {
    setLocalScores(prev => ({
      ...prev,
      [itemId]: {
        achieved,
        note,
        updatedAt: new Date().toISOString()
      }
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleBulkScoreChange = useCallback((itemIds: string[], achieved: boolean) => {
    const updatedAt = new Date().toISOString();
    setLocalScores(prev => {
      const newScores = { ...prev };
      itemIds.forEach(id => {
        newScores[id] = {
          achieved,
          note: prev[id]?.note, // Keep existing notes
          updatedAt
        };
      });
      return newScores;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveDraft = async () => {
    if (!activeEvaluationId) return;
    try {
      await saveProgress(clientId, activeEvaluationId, localScores, totalMonths);
      setHasUnsavedChanges(false);
      success("Progress saved");
    } catch (err) {
      toastError("Failed to save progress");
    }
  };

  const handleComplete = async () => {
    if (!activeEvaluationId) return;
    try {
      await completeEvaluation(clientId, activeEvaluationId, localScores, totalMonths);
      success("Evaluation completed!");
      onClose();
    } catch (err) {
      toastError("Failed to complete evaluation");
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
          await handleSaveDraft();
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

  if (!isOpen) return null;

  const isLoading = isInitializing || loadingEvaluation;

  return (
    <MobileEvaluationContainer
      title={t('portage.wizard_title')}
      onClose={handleClose}
    >
      <div className="flex flex-col h-full md:max-h-[90vh]">
        {/* Desktop header - hidden on mobile */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {t('portage.wizard_title')}
            </h2>
            <p className="text-sm text-neutral-500">{clientName} ({age?.years} {t('portage.years')})</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Desktop Category Navigation - hidden on mobile */}
        <div className="hidden md:block px-6 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-wrap gap-2">
            {PORTAGE_CATEGORIES.map((cat, index) => (
              <button
                key={cat}
                onClick={() => setCurrentCategoryIndex(index)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  index === currentCategoryIndex
                    ? "bg-primary-600 text-white shadow-lg"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content - extra padding bottom on mobile */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <PortageScoring
              category={currentCategory}
              scores={localScores}
              onScoreChange={handleScoreChange}
              onBulkScoreChange={handleBulkScoreChange}
              chronologicalAgeMonths={totalMonths}
            />
          )}
        </div>

        {/* Footer - adjusted for mobile */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between mb-20 md:mb-0">
          {/* Previous button - hidden on mobile */}
          <button
            onClick={() => setCurrentCategoryIndex(prev => prev - 1)}
            disabled={currentCategoryIndex === 0}
            className="hidden md:flex px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> {t('common.back')}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('portage.save_draft')}
            </button>

            {currentCategoryIndex === PORTAGE_CATEGORIES.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-success-600 hover:bg-success-700 text-white flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> {t('portage.complete')}
              </button>
            ) : (
              <button
                onClick={() => setCurrentCategoryIndex(prev => prev + 1)}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2"
              >
                {t('common.next')} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile category navigation - bottom sheet */}
        <CategoryBottomSheet
          categories={PORTAGE_CATEGORIES.map((cat) => ({
            id: cat,
            name: cat,
            progress: {
              scored: Object.keys(localScores).filter(k => k.startsWith(cat.substring(0, 3))).length,
              total: 0 // Simplified - actual total varies by age bracket
            }
          }))}
          currentCategory={currentCategory}
          onSelectCategory={(categoryId) => {
            const index = PORTAGE_CATEGORIES.findIndex(c => c === categoryId);
            if (index !== -1) setCurrentCategoryIndex(index);
          }}
        />
      </div>
    </MobileEvaluationContainer>
  );
}
