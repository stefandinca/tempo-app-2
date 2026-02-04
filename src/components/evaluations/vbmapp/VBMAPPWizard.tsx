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
  Target,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  useVBMAPPEvaluation,
  useVBMAPPActions,
  VBMAPP_SKILL_AREAS,
  VBMAPP_BARRIERS,
  VBMAPP_TRANSITION,
  VBMAPP_LEVEL_1_AREAS,
  VBMAPP_LEVEL_2_AREAS,
  VBMAPP_LEVEL_3_AREAS,
  VBMAPP_TOTAL_MILESTONE_ITEMS
} from "@/hooks/useVBMAPP";
import { VBMAPPItemScore, MilestoneScore, BarrierScore, TransitionScore, VBMAPPEvaluation } from "@/types/vbmapp";
import VBMAPPMilestoneScoring from "./VBMAPPMilestoneScoring";
import VBMAPPBarrierScoring from "./VBMAPPBarrierScoring";

interface VBMAPPWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  evaluationId?: string;
  previousEvaluation?: VBMAPPEvaluation | null;
}

type WizardSection = 'level1' | 'level2' | 'level3' | 'barriers' | 'transition';

const SECTIONS: { id: WizardSection; label: string; description: string }[] = [
  { id: 'level1', label: 'Level 1', description: '0-18 months' },
  { id: 'level2', label: 'Level 2', description: '18-30 months' },
  { id: 'level3', label: 'Level 3', description: '30-48 months' },
  { id: 'barriers', label: 'Barriers', description: '24 items' },
  { id: 'transition', label: 'Transition', description: '18 items' }
];

export default function VBMAPPWizard({
  isOpen,
  onClose,
  clientId,
  clientName,
  evaluationId,
  previousEvaluation
}: VBMAPPWizardProps) {
  const { user, userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { saving, createEvaluation, saveProgress, completeEvaluation } = useVBMAPPActions();

  // State
  const [currentSection, setCurrentSection] = useState<WizardSection>('level1');
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [milestoneScores, setMilestoneScores] = useState<Record<string, VBMAPPItemScore>>({});
  const [barrierScores, setBarrierScores] = useState<Record<string, VBMAPPItemScore>>({});
  const [transitionScores, setTransitionScores] = useState<Record<string, VBMAPPItemScore>>({});
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(evaluationId || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreatingRef = useRef(false);

  // Fetch existing evaluation if editing
  const { evaluation: existingEvaluation, loading: loadingEvaluation } = useVBMAPPEvaluation(
    clientId,
    activeEvaluationId || ""
  );

  // Get areas for current level
  const getCurrentLevelAreas = () => {
    switch (currentSection) {
      case 'level1': return VBMAPP_LEVEL_1_AREAS;
      case 'level2': return VBMAPP_LEVEL_2_AREAS;
      case 'level3': return VBMAPP_LEVEL_3_AREAS;
      default: return [];
    }
  };

  const currentLevelAreas = getCurrentLevelAreas();
  const currentArea = currentLevelAreas[currentAreaIndex];

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
            previousEvaluation?.id
          );
          setActiveEvaluationId(newId);
          success("VB-MAPP evaluation started");
        } catch (err) {
          console.error("Failed to create VB-MAPP evaluation:", err);
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
      setMilestoneScores(existingEvaluation.milestoneScores || {});
      setBarrierScores(existingEvaluation.barrierScores || {});
      setTransitionScores(existingEvaluation.transitionScores || {});
    }
  }, [existingEvaluation]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSection('level1');
      setCurrentAreaIndex(0);
      setMilestoneScores({});
      setBarrierScores({});
      setTransitionScores({});
      setActiveEvaluationId(evaluationId || null);
      setHasUnsavedChanges(false);
      isCreatingRef.current = false;
    }
  }, [isOpen, evaluationId]);

  // Handle milestone score change
  const handleMilestoneScoreChange = useCallback(
    (itemId: string, score: MilestoneScore, note?: string) => {
      setMilestoneScores((prev) => ({
        ...prev,
        [itemId]: {
          score,
          updatedAt: new Date().toISOString(),
          ...(note !== undefined && note !== "" && { note })
        }
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Handle barrier score change
  const handleBarrierScoreChange = useCallback(
    (itemId: string, score: BarrierScore, note?: string) => {
      setBarrierScores((prev) => ({
        ...prev,
        [itemId]: {
          score,
          updatedAt: new Date().toISOString(),
          ...(note !== undefined && note !== "" && { note })
        }
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Handle transition score change
  const handleTransitionScoreChange = useCallback(
    (itemId: string, score: TransitionScore, note?: string) => {
      setTransitionScores((prev) => ({
        ...prev,
        [itemId]: {
          score,
          updatedAt: new Date().toISOString(),
          ...(note !== undefined && note !== "" && { note })
        }
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Calculate progress
  const milestoneScoredCount = Object.keys(milestoneScores).length;
  const barriersScoredCount = Object.keys(barrierScores).length;
  const transitionScoredCount = Object.keys(transitionScores).length;
  const totalProgress = Math.round(
    ((milestoneScoredCount + barriersScoredCount + transitionScoredCount) /
      (VBMAPP_TOTAL_MILESTONE_ITEMS + VBMAPP_BARRIERS.length + VBMAPP_TRANSITION.length)) *
      100
  );

  // Save progress
  const handleSaveProgress = async () => {
    if (!activeEvaluationId) return;

    try {
      await saveProgress(clientId, activeEvaluationId, milestoneScores, barrierScores, transitionScores);
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

    const totalItems = VBMAPP_TOTAL_MILESTONE_ITEMS + VBMAPP_BARRIERS.length + VBMAPP_TRANSITION.length;
    const totalScored = milestoneScoredCount + barriersScoredCount + transitionScoredCount;

    if (totalScored < totalItems) {
      const confirm = window.confirm(
        `You have scored ${totalScored} of ${totalItems} items. Complete anyway?`
      );
      if (!confirm) return;
    }

    try {
      await completeEvaluation(clientId, activeEvaluationId, milestoneScores, barrierScores, transitionScores);
      success("VB-MAPP evaluation completed!");
      onClose();
    } catch (err) {
      console.error("Failed to complete evaluation:", err);
      toastError("Failed to complete evaluation");
    }
  };

  // Handle close
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm("Save changes before closing?");
      if (confirm) {
        handleSaveProgress().then(() => onClose());
        return;
      }
    }
    onClose();
  };

  // Navigation
  const goToNextArea = () => {
    if (currentSection === 'level1' || currentSection === 'level2' || currentSection === 'level3') {
      if (currentAreaIndex < currentLevelAreas.length - 1) {
        setCurrentAreaIndex(currentAreaIndex + 1);
      } else {
        // Move to next section
        const sectionIndex = SECTIONS.findIndex((s) => s.id === currentSection);
        if (sectionIndex < SECTIONS.length - 1) {
          setCurrentSection(SECTIONS[sectionIndex + 1].id);
          setCurrentAreaIndex(0);
        }
      }
    } else {
      // Move to next section
      const sectionIndex = SECTIONS.findIndex((s) => s.id === currentSection);
      if (sectionIndex < SECTIONS.length - 1) {
        setCurrentSection(SECTIONS[sectionIndex + 1].id);
        setCurrentAreaIndex(0);
      }
    }
  };

  const goToPrevArea = () => {
    if (currentSection === 'level1' || currentSection === 'level2' || currentSection === 'level3') {
      if (currentAreaIndex > 0) {
        setCurrentAreaIndex(currentAreaIndex - 1);
      } else {
        // Move to previous section
        const sectionIndex = SECTIONS.findIndex((s) => s.id === currentSection);
        if (sectionIndex > 0) {
          const prevSection = SECTIONS[sectionIndex - 1].id;
          setCurrentSection(prevSection);
          const prevAreas = prevSection === 'level1' ? VBMAPP_LEVEL_1_AREAS :
                           prevSection === 'level2' ? VBMAPP_LEVEL_2_AREAS :
                           prevSection === 'level3' ? VBMAPP_LEVEL_3_AREAS : [];
          setCurrentAreaIndex(prevAreas.length - 1);
        }
      }
    } else {
      const sectionIndex = SECTIONS.findIndex((s) => s.id === currentSection);
      if (sectionIndex > 0) {
        const prevSection = SECTIONS[sectionIndex - 1].id;
        setCurrentSection(prevSection);
        const prevAreas = prevSection === 'level1' ? VBMAPP_LEVEL_1_AREAS :
                         prevSection === 'level2' ? VBMAPP_LEVEL_2_AREAS :
                         prevSection === 'level3' ? VBMAPP_LEVEL_3_AREAS : [];
        setCurrentAreaIndex(Math.max(0, prevAreas.length - 1));
      }
    }
  };

  const isFirstStep = currentSection === 'level1' && currentAreaIndex === 0;
  const isLastStep = currentSection === 'transition';

  if (!isOpen) return null;

  const isLoading = isInitializing || loadingEvaluation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              VB-MAPP Evaluation
            </h2>
            <p className="text-sm text-neutral-500">
              {clientName}
              {previousEvaluation && (
                <span className="ml-2 text-primary-600">(Re-evaluation)</span>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-neutral-800 transition-colors"
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
              {totalProgress}%
            </span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Section Navigation */}
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {SECTIONS.map((section) => {
              const isActive = section.id === currentSection;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setCurrentSection(section.id);
                    setCurrentAreaIndex(0);
                  }}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-start",
                    isActive
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                >
                  <span>{section.label}</span>
                  <span className={clsx("text-[10px]", isActive ? "text-white/70" : "text-neutral-400")}>
                    {section.description}
                  </span>
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
              {/* Milestones for Levels 1-3 */}
              {(currentSection === 'level1' || currentSection === 'level2' || currentSection === 'level3') && currentArea && (
                <>
                  {/* Area selector pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {currentLevelAreas.map((area, idx) => {
                      const areaScored = area.items.filter((i) => milestoneScores[i.id]).length;
                      const isComplete = areaScored === area.items.length;
                      const isAreaActive = idx === currentAreaIndex;

                      return (
                        <button
                          key={area.id}
                          onClick={() => setCurrentAreaIndex(idx)}
                          className={clsx(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            isAreaActive
                              ? "bg-primary-600 text-white"
                              : isComplete
                              ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                              : areaScored > 0
                              ? "bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          )}
                        >
                          {area.code}
                          {isComplete && !isAreaActive && <Check className="w-3 h-3 ml-1 inline" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Area header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {currentArea.code}: {currentArea.name}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {currentArea.items.filter((i) => milestoneScores[i.id]).length} of {currentArea.items.length} items scored
                    </p>
                  </div>

                  {/* Scoring legend */}
                  <div className="mb-6 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-error-500 text-white flex items-center justify-center font-bold">0</span>
                      <span className="text-neutral-600 dark:text-neutral-400">Not present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-warning-500 text-white flex items-center justify-center font-bold">½</span>
                      <span className="text-neutral-600 dark:text-neutral-400">Emerging</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-success-500 text-white flex items-center justify-center font-bold">1</span>
                      <span className="text-neutral-600 dark:text-neutral-400">Mastered</span>
                    </div>
                  </div>

                  <VBMAPPMilestoneScoring
                    area={currentArea}
                    scores={milestoneScores}
                    previousScores={previousEvaluation?.milestoneScores}
                    onScoreChange={handleMilestoneScoreChange}
                  />
                </>
              )}

              {/* Barriers */}
              {currentSection === 'barriers' && (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-warning-500" />
                      Barriers Assessment
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {barriersScoredCount} of {VBMAPP_BARRIERS.length} barriers assessed
                    </p>
                  </div>

                  <VBMAPPBarrierScoring
                    barriers={VBMAPP_BARRIERS}
                    scores={barrierScores}
                    onScoreChange={handleBarrierScoreChange}
                  />
                </>
              )}

              {/* Transition */}
              {currentSection === 'transition' && (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <ArrowRight className="w-6 h-6 text-primary-500" />
                      Transition Assessment
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {transitionScoredCount} of {VBMAPP_TRANSITION.length} items assessed
                    </p>
                  </div>

                  {/* Transition scoring - using same pattern as barriers but with 1-5 scale */}
                  <div className="space-y-6">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        Rate readiness from 1 (not ready) to 5 (fully ready):
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <div key={score} className="flex items-center gap-2">
                            <span className={clsx(
                              "w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center",
                              score <= 2 ? "bg-error-500" : score <= 3 ? "bg-warning-500" : "bg-success-500"
                            )}>
                              {score}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {score === 1 ? "Not ready" : score === 5 ? "Fully ready" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {VBMAPP_TRANSITION.map((item, index) => {
                        const currentScore = transitionScores[item.id];

                        return (
                          <div
                            key={item.id}
                            className={clsx(
                              "rounded-xl border p-4 transition-all",
                              currentScore
                                ? "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                                : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800"
                            )}
                          >
                            <div className="flex items-start gap-4">
                              <span className="text-sm font-bold text-neutral-400">T{index + 1}</span>
                              <p className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">{item.text}</p>
                              <div className="flex items-center gap-1">
                                {([1, 2, 3, 4, 5] as TransitionScore[]).map((score) => (
                                  <button
                                    key={score}
                                    onClick={() => handleTransitionScoreChange(item.id, score)}
                                    className={clsx(
                                      "w-8 h-8 rounded-lg font-bold text-xs transition-all",
                                      currentScore?.score === score
                                        ? score <= 2
                                          ? "bg-error-500 text-white ring-2 ring-offset-2"
                                          : score <= 3
                                          ? "bg-warning-500 text-white ring-2 ring-offset-2"
                                          : "bg-success-500 text-white ring-2 ring-offset-2"
                                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200"
                                    )}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
          <button
            onClick={goToPrevArea}
            disabled={isFirstStep}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              isFirstStep
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>

            {isLastStep ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Complete Evaluation
              </button>
            ) : (
              <button
                onClick={goToNextArea}
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
