import { useMemo } from "react";
import { ArrowLeft, Download, TrendingUp, Award, Calendar } from "lucide-react";
import { Evaluation, CategorySummary } from "@/types/evaluation";
import EvaluationRadarChart from "@/components/evaluations/EvaluationRadarChart";
import { clsx } from "clsx";
import { generateEvaluationPDF } from "@/lib/pdfGenerator";
import { ClientInfo } from "@/types/client";

interface ParentEvaluationDetailProps {
  evaluation: Evaluation;
  previousEvaluation?: Evaluation | null;
  allEvaluations?: Evaluation[];
  clientData: ClientInfo;
  onBack: () => void;
}

export default function ParentEvaluationDetail({ evaluation, previousEvaluation, allEvaluations, clientData, onBack }: ParentEvaluationDetailProps) {
  // Sort categories by key (A, B, C...)
  const sortedCategories = useMemo(() => {
    return Object.values(evaluation.categorySummaries).sort((a, b) => 
      a.categoryKey.localeCompare(b.categoryKey)
    );
  }, [evaluation]);

  // Find strongest areas (highest percentage)
  const strongestAreas = useMemo(() => {
    return [...sortedCategories]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
  }, [sortedCategories]);

  // Find improved areas (if previous evaluation exists)
  const improvedAreas = useMemo(() => {
    if (!previousEvaluation) return [];
    
    return sortedCategories
      .map(cat => {
        const prevCat = previousEvaluation.categorySummaries[cat.categoryKey];
        const diff = prevCat ? cat.percentage - prevCat.percentage : 0;
        return { ...cat, diff };
      })
      .filter(cat => cat.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
  }, [sortedCategories, previousEvaluation]);

  const handleDownload = () => {
    generateEvaluationPDF(evaluation, clientData, previousEvaluation, allEvaluations);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Evaluation Details</h2>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Calendar className="w-3 h-3" />
            <span>{new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
        <button 
          onClick={handleDownload}
          className="ml-auto p-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          title="Download PDF Report"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Overall Score Card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-6 text-white shadow-lg shadow-primary-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Overall Progress</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold">{evaluation.overallPercentage}%</h3>
              {previousEvaluation && (
                <span className="text-primary-200 text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {evaluation.overallPercentage > previousEvaluation.overallPercentage ? "+" : ""}
                  {evaluation.overallPercentage - previousEvaluation.overallPercentage}%
                </span>
              )}
            </div>
            <p className="text-primary-200 text-sm mt-1">
              {evaluation.overallScore} / {evaluation.overallMaxScore} total points
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Award className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 px-2">Skill Profile</h3>
        <EvaluationRadarChart 
          evaluation={evaluation} 
          previousEvaluation={previousEvaluation}
          size="sm" 
          showLegend={false} 
        />
      </div>

      {/* Highlights - Show Improvements if available, otherwise Strongest Areas */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white px-1">
          {improvedAreas.length > 0 ? "Top Improvements" : "Strongest Areas"}
        </h3>
        <div className="grid gap-3">
          {(improvedAreas.length > 0 ? improvedAreas : strongestAreas).map((area) => (
            <div key={area.categoryKey} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center gap-4">
              <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                improvedAreas.length > 0 
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                  : "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
              )}>
                {area.categoryKey}
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900 dark:text-white">{area.categoryName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full rounded-full",
                        improvedAreas.length > 0 ? "bg-primary-500" : "bg-success-500"
                      )}
                      style={{ width: `${area.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    {improvedAreas.length > 0 ? `+${(area as any).diff}%` : `${area.percentage}%`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Categories Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white px-1">Detailed Breakdown</h3>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          {sortedCategories.map((category, index) => (
            <div 
              key={category.categoryKey}
              className={clsx(
                "p-4 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors",
                index !== 0 && "border-t border-neutral-100 dark:border-neutral-800"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-500 text-sm">
                {category.categoryKey}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-medium text-neutral-900 dark:text-white text-sm truncate pr-2">
                    {category.categoryName}
                  </p>
                  <span className={clsx(
                    "text-xs font-bold",
                    category.percentage >= 80 ? "text-success-600" :
                    category.percentage >= 50 ? "text-warning-600" :
                    "text-neutral-500"
                  )}>
                    {category.percentage}%
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={clsx(
                      "h-full rounded-full transition-all",
                      category.percentage >= 80 ? "bg-success-500" :
                      category.percentage >= 50 ? "bg-warning-500" :
                      "bg-neutral-400"
                    )}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
