"use client";

import { CARSEvaluation, CARS_ITEMS } from "@/types/cars";
import { useTranslation } from "react-i18next";
import { 
  Calendar, 
  User, 
  TrendingUp, 
  AlertCircle,
  Printer,
  FileText,
  Activity
} from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

interface CARSSummaryProps {
  evaluation: CARSEvaluation;
  onClose: () => void;
}

export default function CARSSummary({ evaluation, onClose }: CARSSummaryProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const handlePrint = () => {
    router.push(`/reports/evaluation/?type=cars&id=${evaluation.id}&clientId=${evaluation.clientId}`);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'none': return 'text-success-600 bg-success-50 border-success-100';
      case 'mild-moderate': return 'text-warning-600 bg-warning-50 border-warning-100';
      case 'severe': return 'text-error-600 bg-error-50 border-error-100';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-100';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'none': return t('cars.severity.none');
      case 'mild-moderate': return t('cars.severity.mild_moderate');
      case 'severe': return t('cars.severity.severe');
      default: return t('common.unknown');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <Activity className="w-24 h-24 text-primary-600" />
          </div>
          <div className="flex items-center gap-3 mb-4 text-primary-600">
            <Activity className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('cars.total_score')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-neutral-900 dark:text-white">
              {evaluation.totalScore}
            </span>
            <span className="text-sm text-neutral-500 font-medium">/ 60</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-4 uppercase font-bold tracking-widest">{t('evaluations.priority_subtitle')}</p>
        </div>

        <div className={clsx(
          "p-8 rounded-3xl border shadow-sm flex flex-col justify-center",
          getSeverityColor(evaluation.severity)
        )}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('cars.clinical_classification')}</span>
          </div>
          <h3 className="text-3xl font-black mb-2">{getSeverityLabel(evaluation.severity)}</h3>
          <p className="text-sm opacity-80 leading-relaxed">
            {evaluation.severity === 'none' && t('cars.descriptions.none')}
            {evaluation.severity === 'mild-moderate' && t('cars.descriptions.mild_moderate')}
            {evaluation.severity === 'severe' && t('cars.descriptions.severe')}
          </p>
        </div>
      </div>

      {/* Item Breakdown */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('cars.category_results')}</h3>
          <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-[10px] font-black uppercase text-neutral-500">15 {t('evaluations.items')}</span>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {CARS_ITEMS.map(item => {
            const score = evaluation.scores[item.id.toString()];
            return (
              <div key={item.id} className="px-8 py-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{item.id}. {t(`cars.items.${item.id}.title`)}</p>
                  {score?.note && (
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1 italic italic">&quot;{score.note}&quot;</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full transition-all duration-500",
                        score?.value >= 3 ? "bg-error-500" : score?.value >= 2 ? "bg-warning-500" : "bg-success-500"
                      )}
                      style={{ width: `${(score?.value / 4) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-black text-neutral-900 dark:text-white">{score?.value || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evaluation Metadata */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-6 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{t('portage.evaluator')}: <span className="font-bold text-neutral-700 dark:text-neutral-300">{evaluation.evaluatorName}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{t('portage.completed_on')}: <span className="font-bold text-neutral-700 dark:text-neutral-300">{formatDate(evaluation.completedAt)}</span></span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg"
          >
            <Printer className="w-4 h-4" />
            {t('portage.print_report')}
          </button>
        </div>
      </div>
    </div>
  );
}
