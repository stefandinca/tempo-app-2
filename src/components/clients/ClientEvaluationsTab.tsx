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
import PortageList from "@/components/evaluations/PortageList";
import CARSList from "@/components/evaluations/CARSList";
import CarolinaList from "@/components/evaluations/CarolinaList";
import { useClientEvaluations } from "@/hooks/useEvaluations";
import { useClientVBMAPPEvaluations } from "@/hooks/useVBMAPP";
import { usePortageEvaluations } from "@/hooks/usePortage";
import { useCARSEvaluations } from "@/hooks/useCARS";
import { useCarolinaEvaluations } from "@/hooks/useCarolina";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { ChevronRight, ArrowLeft, Brain, Target, Compass, Search, ClipboardCheck } from "lucide-react";

interface ClientEvaluationsTabProps {
  client: any;
}

type EvalType = "none" | "ablls" | "vbmapp" | "portage" | "cars" | "carolina";

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
  const { t } = useTranslation();
  const [evalType, setEvalType] = useState<EvalType>("none");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Fetch data for all types to show status in the hub
  const { evaluations: ablllsEvaluations } = useClientEvaluations(client.id);
  const { evaluations: vbmappEvaluations } = useClientVBMAPPEvaluations(client.id);
  const { evaluations: portageEvaluations } = usePortageEvaluations(client.id);
  const { evaluations: carsEvaluations } = useCARSEvaluations(client.id);
  const { evaluations: carolinaEvaluations } = useCarolinaEvaluations(client.id);

  const [ablllsModal, setABLLSModal] = useState<ABLLSModalState>({ type: "none" });
  const [vbmappModal, setVBMAPPModal] = useState<VBMAPPModalState>({ type: "none" });

  const completedABLLSCount = ablllsEvaluations.filter((e) => e.status === "completed").length;

  const getStatusInfo = (evals: any[]) => {
    const completed = evals.filter(e => e.status === 'completed');
    const last = completed.length > 0 ? completed[0] : null;
    return {
      count: completed.length,
      lastDate: last ? new Date(last.completedAt || last.createdAt).toLocaleDateString(i18n.language || 'ro') : null,
      hasInProgress: evals.some(e => e.status === 'in_progress')
    };
  };

  const EVAL_TOOLS = [
    { id: 'ablls', name: 'ABLLS-R', desc: t('evaluations.desc_ablls'), icon: Target, color: 'text-primary-600 bg-primary-50', stats: getStatusInfo(ablllsEvaluations) },
    { id: 'vbmapp', name: 'VB-MAPP', desc: t('evaluations.desc_vbmapp'), icon: Brain, color: 'text-purple-600 bg-purple-50', stats: getStatusInfo(vbmappEvaluations) },
    { id: 'portage', name: 'Portage', desc: t('evaluations.desc_portage'), icon: Compass, color: 'text-orange-600 bg-orange-50', stats: getStatusInfo(portageEvaluations) },
    { id: 'cars', name: 'CARS', desc: t('evaluations.desc_cars'), icon: Search, color: 'text-indigo-600 bg-indigo-50', stats: getStatusInfo(carsEvaluations) },
    { id: 'carolina', name: 'Carolina', desc: t('evaluations.desc_carolina'), icon: ClipboardCheck, color: 'text-teal-600 bg-teal-50', stats: getStatusInfo(carolinaEvaluations) },
  ];

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

  if (evalType === "none") {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{t('evaluations.clinical_evaluations')}</h3>
          <p className="text-sm text-neutral-500 mt-1">{t('evaluations.select_tool')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EVAL_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setEvalType(tool.id as EvalType)}
              className="group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl text-left hover:shadow-xl hover:border-primary-500/50 transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", tool.color)}>
                  <tool.icon className="w-6 h-6" />
                </div>
                {tool.stats.hasInProgress && (
                  <span className="px-2 py-1 bg-warning-100 text-warning-700 text-[10px] font-bold uppercase rounded-md animate-pulse">
                    {t('evaluations.in_progress')}
                  </span>
                )}
              </div>
              
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">{tool.name}</h4>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">{tool.desc}</p>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {tool.stats.lastDate ? t('evaluations.last_date', { date: tool.stats.lastDate }) : t('evaluations.no_history')}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('evaluations.open')} <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evaluation Type Header & Back Button */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEvalType("none")}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-500"
            title={t('evaluations.back_to_all')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              {EVAL_TOOLS.find(t => t.id === evalType)?.name}
              <span className="text-xs font-normal text-neutral-400">| {client.name}</span>
            </h3>
          </div>
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
              {t('evaluations.evaluations')}
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
              {t('evaluations.progress')}
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

      {/* Portage Content */}
      {evalType === "portage" && (
        <PortageList
          clientId={client.id}
          clientName={client.name}
          clientDob={client.birthDate || client.dob}
        />
      )}
      {/* CARS Content */}
      {evalType === "cars" && (
        <CARSList
          clientId={client.id}
          clientName={client.name}
        />
      )}
      {/* Carolina Content */}
      {evalType === "carolina" && (
        <CarolinaList
          clientId={client.id}
          clientName={client.name}
        />
      )}
    </div>
  );
}
