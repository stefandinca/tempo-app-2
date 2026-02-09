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
  Menu
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  useCarolinaEvaluation,
  useCarolinaActions,
} from "@/hooks/useCarolina";
import { CarolinaScore, CarolinaScoreValue } from "@/types/carolina";
import { CAROLINA_PROTOCOL } from "@/data/carolina-protocol";
import CarolinaScoring from "./CarolinaScoring";

interface CarolinaWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  evaluationId?: string;
}

export default function CarolinaWizard({
  isOpen,
  onClose,
  clientId,
  clientName,
  evaluationId,
}: CarolinaWizardProps) {
  const { user, userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { saving, createEvaluation, saveProgress, completeEvaluation } = useCarolinaActions();

  // Navigation State
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar

  // Data State
  const [localScores, setLocalScores] = useState<Record<string, CarolinaScore>>({});
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(evaluationId || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreatingRef = useRef(false);

  // Fetch existing evaluation if editing
  const { evaluation: existingEvaluation, loading: loadingEvaluation } = useCarolinaEvaluation(
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
          success("Carolina evaluation started");
        } catch (err) {
          console.error("Failed to create Carolina evaluation:", err);
          toastError("Failed to start evaluation");
          onClose();
        } finally {
          setIsInitializing(false);
        }
      }
    };

    initEvaluation();
  }, [isOpen, evaluationId, clientId, createEvaluation, user?.uid, userData?.name, success, toastError, onClose, activeEvaluationId]);

  // Load scores
  useEffect(() => {
    if (existingEvaluation) {
      setLocalScores(existingEvaluation.scores || {});
    }
  }, [existingEvaluation]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentDomainIndex(0);
      setCurrentSequenceIndex(0);
      setLocalScores({});
      setActiveEvaluationId(evaluationId || null);
      setHasUnsavedChanges(false);
      isCreatingRef.current = false;
    }
  }, [isOpen, evaluationId]);

  const currentDomain = CAROLINA_PROTOCOL[currentDomainIndex];
  const currentSequence = currentDomain?.sequences[currentSequenceIndex];

  const handleScoreChange = useCallback((itemId: string, value: CarolinaScoreValue, note?: string) => {
    setLocalScores(prev => ({
      ...prev,
      [itemId]: {
        value,
        note,
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
    const confirm = window.confirm("Are you sure you want to complete this evaluation? This will finalize the scores.");
    if (!confirm) return;

    try {
      await completeEvaluation(clientId, activeEvaluationId, localScores);
      success("Evaluation completed!");
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

  // Ceiling Rule Check: 3 consecutive 'A's in current sequence
  const checkCeilingRule = () => {
    if (!currentSequence) return false;
    let consecutiveAbsents = 0;
    
    // Sort items if age is available, otherwise index order
    const items = currentSequence.items; // Assuming index order implies difficulty
    
    for (const item of items) {
      const score = localScores[item.id]?.value;
      if (score === 'A') {
        consecutiveAbsents++;
        if (consecutiveAbsents >= 3) return true;
      } else if (score === 'M' || score === 'D') {
        consecutiveAbsents = 0;
      }
    }
    return false;
  };

  const hasCeilingReached = checkCeilingRule();

  const navigateSequence = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (currentSequenceIndex < currentDomain.sequences.length - 1) {
        setCurrentSequenceIndex(prev => prev + 1);
      } else if (currentDomainIndex < CAROLINA_PROTOCOL.length - 1) {
        setCurrentDomainIndex(prev => prev + 1);
        setCurrentSequenceIndex(0);
      }
    } else {
      if (currentSequenceIndex > 0) {
        setCurrentSequenceIndex(prev => prev - 1);
      } else if (currentDomainIndex > 0) {
        setCurrentDomainIndex(prev => prev - 1);
        // Go to last sequence of prev domain
        setCurrentSequenceIndex(CAROLINA_PROTOCOL[currentDomainIndex - 1].sequences.length - 1);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isOpen) return null;
  const isLoading = isInitializing || loadingEvaluation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 hover:bg-neutral-200 rounded-lg"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Carolina Curriculum</h2>
              <p className="text-sm text-neutral-500">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasCeilingReached && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-error-50 text-error-700 rounded-lg text-xs font-bold mr-2 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                Ceiling Reached (3 consecutive &apos;A&apos;s)
              </div>
            )}
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className={clsx(
            "w-64 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 overflow-y-auto shrink-0 transition-all absolute lg:static inset-y-0 left-0 z-10 lg:z-0 transform lg:transform-none bg-white lg:bg-transparent shadow-xl lg:shadow-none",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-4 space-y-6">
              {CAROLINA_PROTOCOL.map((domain, dIdx) => (
                <div key={domain.id}>
                  <h4 className="text-xs font-black uppercase text-neutral-400 mb-2 px-2">{domain.title}</h4>
                  <div className="space-y-1">
                    {domain.sequences.map((seq, sIdx) => {
                      const isActive = dIdx === currentDomainIndex && sIdx === currentSequenceIndex;
                      const scoredCount = seq.items.filter(i => localScores[i.id]).length;
                      const totalCount = seq.items.length;
                      const isComplete = scoredCount === totalCount;

                      return (
                        <button
                          key={seq.id}
                          onClick={() => {
                            setCurrentDomainIndex(dIdx);
                            setCurrentSequenceIndex(sIdx);
                            setIsSidebarOpen(false);
                          }}
                          className={clsx(
                            "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center",
                            isActive 
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300" 
                              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          )}
                        >
                          <span className="truncate">{seq.title}</span>
                          {isComplete && <Check className="w-3 h-3 text-success-500 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : currentSequence ? (
                <CarolinaScoring
                  sequence={currentSequence}
                  scores={localScores}
                  onScoreChange={handleScoreChange}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  Select a sequence to begin
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex justify-between items-center shrink-0">
              <button
                onClick={() => navigateSequence('prev')}
                disabled={currentDomainIndex === 0 && currentSequenceIndex === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !hasUnsavedChanges}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 hover:bg-neutral-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </button>

                {(currentDomainIndex === CAROLINA_PROTOCOL.length - 1 && 
                  currentSequenceIndex === CAROLINA_PROTOCOL[currentDomainIndex].sequences.length - 1) ? (
                  <button
                    onClick={handleComplete}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-success-600 text-white hover:bg-success-700 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Complete
                  </button>
                ) : (
                  <button
                    onClick={() => navigateSequence('next')}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
                  >
                    Next Sequence <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
