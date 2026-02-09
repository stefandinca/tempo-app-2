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
  useCARSEvaluation,
  useCARSActions,
} from "@/hooks/useCARS";
import { CARS_ITEMS, CARSScore } from "@/types/cars";
import CARSScoring from "./CARSScoring";
import { useTranslation } from "react-i18next";

interface CARSWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  evaluationId?: string;
}

export default function CARSWizard({
  isOpen,
  onClose,
  clientId,
  clientName,
  evaluationId,
}: CARSWizardProps) {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { saving, createEvaluation, saveProgress, completeEvaluation } = useCARSActions();

  // Local state
  const [localScores, setLocalScores] = useState<Record<string, CARSScore>>({});
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(evaluationId || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreatingRef = useRef(false);

  // Fetch existing evaluation if editing
  const { evaluation: existingEvaluation, loading: loadingEvaluation } = useCARSEvaluation(
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
            userData?.name || "Unknown"
          );
          setActiveEvaluationId(newId);
          success("CARS evaluation started");
        } catch (err) {
          console.error("Failed to create CARS evaluation:", err);
          toastError("Failed to start evaluation");
          onClose();
        } finally {
          setIsInitializing(false);
        }
      }
    };

    initEvaluation();
  }, [isOpen, evaluationId, clientId, createEvaluation, user?.uid, userData?.name, success, toastError, onClose, activeEvaluationId]);

  // Load existing scores when evaluation loads
  useEffect(() => {
    if (existingEvaluation) {
      setLocalScores(existingEvaluation.scores || {});
    }
  }, [existingEvaluation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocalScores({});
      setActiveEvaluationId(evaluationId || null);
      setHasUnsavedChanges(false);
      isCreatingRef.current = false;
    }
  }, [isOpen, evaluationId]);

  const handleScoreChange = useCallback((itemId: number, value: number, note?: string) => {
    setLocalScores(prev => ({
      ...prev,
      [itemId.toString()]: {
        value,
        note: note || "",
        updatedAt: new Date().toISOString()
      }
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveDraft = async () => {
    if (!activeEvaluationId) return;
    try {
      await saveProgress(clientId, activeEvaluationId, localScores);
      setHasUnsavedChanges(false);
      success("Progress saved");
    } catch (err) {
      toastError("Failed to save progress");
    }
  };

  const handleComplete = async () => {
    if (!activeEvaluationId) return;
    
    const scoredCount = Object.keys(localScores).length;
    if (scoredCount < CARS_ITEMS.length) {
      const confirm = window.confirm(`You have only scored ${scoredCount} of ${CARS_ITEMS.length} items. Complete anyway?`);
      if (!confirm) return;
    }

    try {
      await completeEvaluation(clientId, activeEvaluationId, localScores);
      success("CARS evaluation completed!");
      onClose();
    } catch (err) {
      toastError("Failed to complete evaluation");
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm("You have unsaved changes. Do you want to save before closing?");
      if (confirm) {
        handleSaveDraft().then(() => onClose());
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const isLoading = isInitializing || loadingEvaluation;
  const scoredItemsCount = Object.keys(localScores).length;
  const progressPercentage = Math.round((scoredItemsCount / CARS_ITEMS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {t('cars.wizard_title')}
            </h2>
            <p className="text-sm text-neutral-500">{clientName}</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('portage.overall_progress')}</span>
            <span className="text-sm font-bold text-primary-600">{scoredItemsCount} / {CARS_ITEMS.length} {t('evaluations.items')} ({progressPercentage}%)</span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-500 transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <CARSScoring
              scores={localScores}
              onScoreChange={handleScoreChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
          <div className="text-xs text-neutral-500 italic">
            {t('portage.overall_progress')}: {scoredItemsCount} / {CARS_ITEMS.length}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('portage.save_draft')}
            </button>

            <button
              onClick={handleComplete}
              disabled={saving}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-success-600 hover:bg-success-700 text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> {t('portage.complete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
