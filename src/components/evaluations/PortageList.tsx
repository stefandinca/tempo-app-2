"use client";

import { useState } from "react";
import { usePortageEvaluations, usePortageActions } from "@/hooks/usePortage";
import { PortageEvaluation } from "@/types/portage";
import { 
  Plus, 
  Calendar, 
  User, 
  ChevronRight, 
  Trash2, 
  Loader2, 
  FileText,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import PortageWizard from "./PortageWizard";
import PortageSummary from "./PortageSummary";

interface PortageListProps {
  clientId: string;
  clientName: string;
  clientDob?: string;
}

export default function PortageList({ clientId, clientName, clientDob }: PortageListProps) {
  const { userRole } = useAuth();
  const { evaluations, loading } = usePortageEvaluations(clientId);
  const { deleteEvaluation } = usePortageActions();
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [viewingSummary, setViewingSummary] = useState<PortageEvaluation | null>(null);

  const handleCreateNew = () => {
    setSelectedEvalId(null);
    setIsWizardOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedEvalId(id);
    setIsWizardOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this evaluation?")) {
      await deleteEvaluation(clientId, id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (viewingSummary) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setViewingSummary(null)}
          className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to List
        </button>
        <PortageSummary evaluation={viewingSummary} onClose={() => setViewingSummary(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Portage Evaluations</h3>
          <p className="text-sm text-neutral-500">Developmental assessment from 0 to 6 years</p>
        </div>
        {(userRole === 'Admin' || userRole === 'Coordinator' || userRole === 'Therapist') && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20"
          >
            <Plus className="w-4 h-4" />
            New Evaluation
          </button>
        )}
      </div>

      {evaluations.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-300" />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">No evaluations yet</h4>
          <p className="text-neutral-500 max-w-xs mx-auto mb-6 text-sm">Start your first Portage evaluation to track developmental progress across key categories.</p>
          <button 
            onClick={handleCreateNew}
            className="text-primary-600 font-bold hover:underline text-sm"
          >
            Create first evaluation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluations.map((evaluation) => {
            const isCompleted = evaluation.status === 'completed';
            return (
              <div
                key={evaluation.id}
                onClick={() => isCompleted ? setViewingSummary(evaluation) : handleEdit(evaluation.id)}
                className={clsx(
                  "group p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl hover:shadow-xl hover:border-primary-500/50 transition-all cursor-pointer relative overflow-hidden",
                  !isCompleted && "border-l-4 border-l-warning-500"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isCompleted ? "bg-success-50 dark:bg-success-900/20 text-success-600" : "bg-warning-50 dark:bg-warning-900/20 text-warning-600"
                    )}>
                      {isCompleted ? <TrendingUp className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">
                        {new Date(evaluation.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                  
                  {userRole === 'Admin' && (
                    <button
                      onClick={(e) => handleDelete(e, evaluation.id)}
                      className="p-2 text-neutral-300 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Dev. Age</p>
                    <p className="text-sm font-bold text-primary-600">
                      {(evaluation.overallDevelopmentalAgeMonths / 12).toFixed(1)} years
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase">Progress</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      {Math.round((evaluation.overallDevelopmentalAgeMonths / evaluation.chronologicalAgeAtEvaluation) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-500 truncate max-w-[120px]">{evaluation.evaluatorName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary-600">
                    {isCompleted ? 'View Results' : 'Continue'}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PortageWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        clientId={clientId}
        clientName={clientName}
        clientDob={clientDob}
        evaluationId={selectedEvalId || undefined}
      />
    </div>
  );
}
