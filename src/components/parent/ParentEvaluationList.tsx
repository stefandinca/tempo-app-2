import { ChevronRight, Calendar, BarChart2 } from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { EvaluationRadarChartMini } from "@/components/evaluations/EvaluationRadarChart";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface ParentEvaluationListProps {
  evaluations: (Evaluation | VBMAPPEvaluation)[];
  onSelect: (evaluation: Evaluation | VBMAPPEvaluation) => void;
}

export default function ParentEvaluationList({ evaluations, onSelect }: ParentEvaluationListProps) {
  const { t } = useTranslation();

  if (evaluations.length === 0) {
    return (
      <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart2 className="w-8 h-8 text-neutral-300" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('evaluations.no_evaluations_list')}</h3>
        <p className="text-neutral-500 text-sm mt-1 max-w-xs mx-auto">
          {t('evaluations.no_evaluations_list_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation) => {
        const isABLLS = evaluation.type === 'ABLLS';
        const score = isABLLS 
          ? (evaluation as Evaluation).overallPercentage 
          : (evaluation as VBMAPPEvaluation).overallMilestonePercentage;
        
        return (
          <button
            key={evaluation.id}
            onClick={() => onSelect(evaluation)}
            className="w-full text-left bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              {/* Mini Chart - Only for ABLLS currently */}
              <div className="w-20 h-20 flex-shrink-0 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl overflow-hidden flex items-center justify-center">
                {isABLLS ? (
                  <EvaluationRadarChartMini evaluation={evaluation as Evaluation} className="w-full h-full" />
                ) : (
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-primary-600">{(evaluation as VBMAPPEvaluation).overallMilestoneScore}</span>
                    <span className="text-[10px] text-neutral-500 uppercase">{t('evaluations.points_label')}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx(
                    "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded",
                    isABLLS 
                      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                      : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                  )}>
                    {evaluation.type}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <h3 className="font-bold text-neutral-900 dark:text-white truncate">
                  {isABLLS ? t('evaluations.skills_assessment') : t('evaluations.milestones_assessment')}
                </h3>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <p className="text-sm text-neutral-500">
                    {t('evaluations.score_label')}: <span className="font-bold text-neutral-900 dark:text-white">{score}%</span>
                  </p>
                  
                  {isABLLS ? (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-success-500" />
                      <span className="text-xs text-neutral-500">
                        {Object.values((evaluation as Evaluation).categorySummaries).filter(c => c.percentage >= 80).length} {t('evaluations.mastered_label')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-warning-500" />
                      <span className="text-xs text-neutral-500">
                        {(evaluation as VBMAPPEvaluation).barrierSummary.severeBarriers.length} {t('evaluations.barriers_label')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <div className="text-neutral-300 group-hover:text-primary-500 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
