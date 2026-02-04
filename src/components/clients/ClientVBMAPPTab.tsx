"use client";

import { useState } from "react";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { useClientVBMAPPEvaluations } from "@/hooks/useVBMAPP";
import VBMAPPList from "@/components/evaluations/vbmapp/VBMAPPList";
import VBMAPPWizard from "@/components/evaluations/vbmapp/VBMAPPWizard";
import VBMAPPSummary from "@/components/evaluations/vbmapp/VBMAPPSummary";

interface ClientVBMAPPTabProps {
  client: any;
}

type ModalState =
  | { type: "none" }
  | { type: "wizard"; evaluationId?: string; previousEvaluation?: VBMAPPEvaluation }
  | { type: "summary"; evaluationId: string; previousEvaluation?: VBMAPPEvaluation };

export default function ClientVBMAPPTab({ client }: ClientVBMAPPTabProps) {
  const [modalState, setModalState] = useState<ModalState>({ type: "none" });
  const { evaluations } = useClientVBMAPPEvaluations(client.id);

  // Find the most recent completed evaluation for comparison
  const getMostRecentCompleted = (): VBMAPPEvaluation | undefined => {
    return evaluations.find((e) => e.status === "completed");
  };

  const handleStartNew = () => {
    const previousEvaluation = getMostRecentCompleted();
    setModalState({
      type: "wizard",
      previousEvaluation: previousEvaluation || undefined
    });
  };

  const handleContinue = (evaluationId: string) => {
    setModalState({ type: "wizard", evaluationId });
  };

  const handleView = (evaluationId: string) => {
    // Find this evaluation and the one before it for comparison
    const evalIndex = evaluations.findIndex((e) => e.id === evaluationId);
    const previousEvaluation = evaluations
      .slice(evalIndex + 1)
      .find((e) => e.status === "completed");

    setModalState({
      type: "summary",
      evaluationId,
      previousEvaluation
    });
  };

  const handleReEvaluate = (evaluation: VBMAPPEvaluation) => {
    setModalState({
      type: "wizard",
      previousEvaluation: evaluation
    });
  };

  const handleCloseModal = () => {
    setModalState({ type: "none" });
  };

  const handleStartReEvaluationFromSummary = () => {
    if (modalState.type === "summary") {
      const currentEval = evaluations.find((e) => e.id === modalState.evaluationId);
      if (currentEval) {
        setModalState({
          type: "wizard",
          previousEvaluation: currentEval
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* VB-MAPP List */}
      <VBMAPPList
        clientId={client.id}
        clientName={client.name}
        onStartNew={handleStartNew}
        onContinue={handleContinue}
        onView={handleView}
        onReEvaluate={handleReEvaluate}
      />

      {/* VB-MAPP Wizard Modal */}
      <VBMAPPWizard
        isOpen={modalState.type === "wizard"}
        onClose={handleCloseModal}
        clientId={client.id}
        clientName={client.name}
        evaluationId={modalState.type === "wizard" ? modalState.evaluationId : undefined}
        previousEvaluation={modalState.type === "wizard" ? modalState.previousEvaluation : undefined}
      />

      {/* VB-MAPP Summary Modal */}
      {modalState.type === "summary" && (
        <VBMAPPSummary
          isOpen={true}
          onClose={handleCloseModal}
          clientId={client.id}
          clientData={client}
          evaluationId={modalState.evaluationId}
          previousEvaluation={modalState.previousEvaluation}
          onReEvaluate={handleStartReEvaluationFromSummary}
        />
      )}
    </div>
  );
}
