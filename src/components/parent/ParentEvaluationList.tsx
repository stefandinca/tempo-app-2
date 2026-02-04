import { ChevronRight, Calendar, BarChart2 } from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import { EvaluationRadarChartMini } from "@/components/evaluations/EvaluationRadarChart";

interface ParentEvaluationListProps {
  evaluations: Evaluation[];
  onSelect: (evaluation: Evaluation) => void;
}

export default function ParentEvaluationList({ evaluations, onSelect }: ParentEvaluationListProps) {
  if (evaluations.length === 0) {
    return (
      <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart2 className="w-8 h-8 text-neutral-300" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No evaluations yet</h3>
        <p className="text-neutral-500 text-sm mt-1 max-w-xs mx-auto">
          Completed evaluations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation) => (
        <button
          key={evaluation.id}
          onClick={() => onSelect(evaluation)}
          className="w-full text-left bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            {/* Mini Chart */}
            <div className="w-20 h-20 flex-shrink-0 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl overflow-hidden">
              <EvaluationRadarChartMini evaluation={evaluation} className="w-full h-full" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] font-bold uppercase tracking-wider rounded">
                  {evaluation.type}
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              <h3 className="font-bold text-neutral-900 dark:text-white truncate">
                Evaluation Report
              </h3>
              
              <p className="text-sm text-neutral-500 mt-1">
                Overall Score: <span className="font-bold text-primary-600">{evaluation.overallPercentage}%</span>
              </p>
            </div>

            {/* Chevron */}
            <div className="text-neutral-300 group-hover:text-primary-500 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
