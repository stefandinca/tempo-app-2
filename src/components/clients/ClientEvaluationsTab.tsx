"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { FileText, TrendingUp } from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import EvaluationList from "@/components/evaluations/EvaluationList";
import EvaluationWizard from "@/components/evaluations/EvaluationWizard";
import EvaluationSummary from "@/components/evaluations/EvaluationSummary";
import EvaluationProgressChart from "@/components/evaluations/EvaluationProgressChart";
import VBMAPPList from "@/components/evaluations/vbmapp/VBMAPPList";
import VBMAPPWizard from "@/components/evaluations/vbmapp/VBMAPPWizard";
import VBMAPPSummary from "@/components/evaluations/vbmapp/VBMAPPSummary";
import { useClientEvaluations } from "@/hooks/useEvaluations";
import { useClientVBMAPPEvaluations } from "@/hooks/useVBMAPP";

interface ClientEvaluationsTabProps {
  client: any;
}

type EvalType = "ablls" | "vbmapp";

type ABLLSModalState =
  | { type: "none" }
  | { type: "wizard"; evaluationId?: string; previousEvaluation?: Evaluation }
  | { type: "summary"; evaluationId: string; previousEvaluation?: Evaluation };

type VBMAPPModalState =
  | { type: "none" }
  | { type: "wizard"; evaluationId?: string; previousEvaluation?: VBMAPPEvaluation }
  | { type: "summary"; evaluationId: string; previousEvaluation?: VBMAPPEvaluation };

type ViewMode = "list" | "progress";

export default function ClientEvaluationsTab({ client }: ClientEvaluationsTabProps) {
  const [evalType, setEvalType] = useState<EvalType>("ablls");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // ABLLS state
  const [ablllsModal, setABLLSModal] = useState<ABLLSModalState>({ type: "none" });
  const { evaluations: ablllsEvaluations } = useClientEvaluations(client.id);

  // VB-MAPP state
  const [vbmappModal, setVBMAPPModal] = useState<VBMAPPModalState>({ type: "none" });
  const { evaluations: vbmappEvaluations } = useClientVBMAPPEvaluations(client.id);

  const completedABLLSCount = ablllsEvaluations.filter((e) => e.status === "completed").length;
  const completedVBMAPPCount = vbmappEvaluations.filter((e) => e.status === "completed").length;

  // ABLLS handlers
  const getMostRecentCompletedABLLS = (): Evaluation | undefined => {
    return ablllsEvaluations.find((e) => e.status === "completed");
  };

  const handleStartNewABLLS = () => {
    const previousEvaluation = getMostRecentCompletedABLLS();
    setABLLSModal({
      type: "wizard",
      previousEvaluation: previousEvaluation || undefined
    });
  };

  const handleContinueABLLS = (evaluationId: string) => {
    setABLLSModal({ type: "wizard", evaluationId });
  };

  const handleViewABLLS = (evaluationId: string) => {
    const evalIndex = ablllsEvaluations.findIndex((e) => e.id === evaluationId);
    const previousEvaluation = ablllsEvaluations
      .slice(evalIndex + 1)
      .find((e) => e.status === "completed");

    setABLLSModal({
      type: "summary",
      evaluationId,
      previousEvaluation
    });
  };

  const handleReEvaluateABLLS = (evaluation: Evaluation) => {
    setABLLSModal({
      type: "wizard",
      previousEvaluation: evaluation
    });
  };

  const handleStartReEvaluationFromABLLSSummary = () => {
    if (ablllsModal.type === "summary") {
      const currentEval = ablllsEvaluations.find((e) => e.id === ablllsModal.evaluationId);
      if (currentEval) {
        setABLLSModal({
          type: "wizard",
          previousEvaluation: currentEval
        });
      }
    }
  };

  // VB-MAPP handlers
  const getMostRecentCompletedVBMAPP = (): VBMAPPEvaluation | undefined => {
    return vbmappEvaluations.find((e) => e.status === "completed");
  };

  const handleStartNewVBMAPP = () => {
    const previousEvaluation = getMostRecentCompletedVBMAPP();
    setVBMAPPModal({
      type: "wizard",
      previousEvaluation: previousEvaluation || undefined
    });
  };

  const handleContinueVBMAPP = (evaluationId: string) => {
    setVBMAPPModal({ type: "wizard", evaluationId });
  };

  const handleViewVBMAPP = (evaluationId: string) => {
    const evalIndex = vbmappEvaluations.findIndex((e) => e.id === evaluationId);
    const previousEvaluation = vbmappEvaluations
      .slice(evalIndex + 1)
      .find((e) => e.status === "completed");

    setVBMAPPModal({
      type: "summary",
      evaluationId,
      previousEvaluation
    });
  };

  const handleReEvaluateVBMAPP = (evaluation: VBMAPPEvaluation) => {
    setVBMAPPModal({
      type: "wizard",
      previousEvaluation: evaluation
    });
  };

  const handleStartReEvaluationFromVBMAPPSummary = () => {
    if (vbmappModal.type === "summary") {
      const currentEval = vbmappEvaluations.find((e) => e.id === vbmappModal.evaluationId);
      if (currentEval) {
        setVBMAPPModal({
          type: "wizard",
          previousEvaluation: currentEval
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Evaluation Type Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Type selector */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setEvalType("ablls")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              evalType === "ablls"
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            ABLLS-R
            {evalType === "ablls" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
          <button
            onClick={() => setEvalType("vbmapp")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              evalType === "vbmapp"
                ? "text-purple-600 dark:text-purple-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            VB-MAPP
            {evalType === "vbmapp" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* View Mode Toggle - only show for ABLLS which has progress charts */}
        {evalType === "ablls" && (
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              <FileText className="w-4 h-4" />
              Evaluations
            </button>
            <button
              onClick={() => setViewMode("progress")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                viewMode === "progress"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Progress
              {completedABLLSCount >= 2 && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full">
                  {completedABLLSCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ABLLS Content */}
      {evalType === "ablls" && (
        <>
          {viewMode === "list" ? (
            <EvaluationList
              clientId={client.id}
              clientName={client.name}
              onStartNew={handleStartNewABLLS}
              onContinue={handleContinueABLLS}
              onView={handleViewABLLS}
              onReEvaluate={handleReEvaluateABLLS}
            />
          ) : (
            <EvaluationProgressChart
              evaluations={ablllsEvaluations}
              clientName={client.name}
            />
          )}

          {/* ABLLS Wizard Modal */}
          <EvaluationWizard
            isOpen={ablllsModal.type === "wizard"}
            onClose={() => setABLLSModal({ type: "none" })}
            clientId={client.id}
            clientName={client.name}
            clientDob={client.dob}
            evaluationId={ablllsModal.type === "wizard" ? ablllsModal.evaluationId : undefined}
            previousEvaluation={ablllsModal.type === "wizard" ? ablllsModal.previousEvaluation : undefined}
          />

          {/* ABLLS Summary Modal */}
          {ablllsModal.type === "summary" && (
            <EvaluationSummary
              isOpen={true}
              onClose={() => setABLLSModal({ type: "none" })}
              clientId={client.id}
              clientData={client}
              evaluationId={ablllsModal.evaluationId}
              previousEvaluation={ablllsModal.previousEvaluation}
              onReEvaluate={handleStartReEvaluationFromABLLSSummary}
            />
          )}
        </>
      )}

      {/* VB-MAPP Content */}
      {evalType === "vbmapp" && (
        <>
          <VBMAPPList
            clientId={client.id}
            clientName={client.name}
            onStartNew={handleStartNewVBMAPP}
            onContinue={handleContinueVBMAPP}
            onView={handleViewVBMAPP}
            onReEvaluate={handleReEvaluateVBMAPP}
          />

          {/* VB-MAPP Wizard Modal */}
          <VBMAPPWizard
            isOpen={vbmappModal.type === "wizard"}
            onClose={() => setVBMAPPModal({ type: "none" })}
            clientId={client.id}
            clientName={client.name}
            evaluationId={vbmappModal.type === "wizard" ? vbmappModal.evaluationId : undefined}
            previousEvaluation={vbmappModal.type === "wizard" ? vbmappModal.previousEvaluation : undefined}
          />

          {/* VB-MAPP Summary Modal */}
          {vbmappModal.type === "summary" && (
            <VBMAPPSummary
              isOpen={true}
              onClose={() => setVBMAPPModal({ type: "none" })}
              clientId={client.id}
              clientData={client}
              evaluationId={vbmappModal.evaluationId}
              previousEvaluation={vbmappModal.previousEvaluation}
              onReEvaluate={handleStartReEvaluationFromVBMAPPSummary}
            />
          )}
        </>
      )}
    </div>
  );
}
