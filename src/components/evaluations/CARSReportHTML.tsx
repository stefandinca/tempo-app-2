"use client";

import { useTranslation } from "react-i18next";
import { 
  User, 
  Calendar, 
  Printer, 
  ArrowLeft,
  AlertCircle,
  Activity,
  CheckCircle2,
  Info
} from "lucide-react";
import { CARSEvaluation, CARS_ITEMS } from "@/types/cars";
import { ClientInfo } from "@/types/client";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

interface CARSReportHTMLProps {
  evaluation: CARSEvaluation;
  client: ClientInfo;
  onBack: () => void;
  clinic?: any;
}

export default function CARSReportHTML({
  evaluation,
  client,
  onBack,
  clinic
}: CARSReportHTMLProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'none': return t('cars.severity.none');
      case 'mild-moderate': return t('cars.severity.mild_moderate');
      case 'severe': return t('cars.severity.severe');
      default: return t('common.unknown');
    }
  };

  const getSeverityDescription = (severity: string) => {
    switch (severity) {
      case 'none': return t('cars.descriptions.none');
      case 'mild-moderate': return t('cars.descriptions.mild_moderate');
      case 'severe': return t('cars.descriptions.severe');
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 print:bg-white pb-20">
      
      {/* Action Bar */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-neutral-900 dark:text-white">
                {t('cars.report_title')}
              </h1>
              <p className="text-xs text-neutral-500">{client.name} • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-600/20 transition-all font-bold"
          >
            <Printer className="w-4 h-4" />
            {t('portage.print_report')}
          </button>
        </div>
      </div>

      {/* Main Report Page */}
      <div className="max-w-5xl mx-auto my-8 print:my-0 bg-white dark:bg-neutral-900 shadow-2xl print:shadow-none border border-neutral-200 dark:border-neutral-800 p-12 lg:p-16 rounded-3xl print:rounded-none">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-indigo-500 pb-10 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/20">
                C
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">TempoApp</h1>
                <p className="text-sm text-neutral-500 font-medium">{t('cars.subtitle')}</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{t('cars.report_title')}</h2>
              <p className="text-neutral-500">{t('reports.client.generated_on')}: {new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString('ro-RO', { dateStyle: 'long' })}</p>
            </div>
          </div>

          <div className="text-right space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="font-bold text-neutral-900 dark:text-white">{clinic?.name || "Clinic Name SRL"}</p>
            <p>{clinic?.address || "Clinic Address Placeholder"}</p>
            <p>CUI: {clinic?.cui || "RO12345678"}</p>
            <p>{clinic?.email || "contact@clinic.ro"}</p>
          </div>
        </div>

        {/* Section: Client & Executive Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">{t('clients.personal_info')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-neutral-500 font-medium">{t('clients.fields.full_name')}</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">{client.name}</p>
              </div>
              <div>
                <p className="text-neutral-500 font-medium">{t('evaluations.client_age')}</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">CARS (15 {t('evaluations.items')})</p>
              </div>
              <div className="col-span-2">
                <p className="text-neutral-500 font-medium">{t('evaluations.summary')}</p>
                <p className="text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                  {t('cars.descriptions.mild_moderate')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">{t('cars.clinical_classification')}</h3>
            </div>
            <div className={clsx(
              "p-6 rounded-3xl border",
              evaluation.severity === 'none' ? "bg-success-50 border-success-100" : 
              evaluation.severity === 'severe' ? "bg-error-50 border-error-100" : "bg-warning-50 border-warning-100"
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{t('cars.total_score')}</span>
                <span className="text-4xl font-black text-neutral-900">{evaluation.totalScore} <span className="text-sm font-normal opacity-50">/ 60</span></span>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-black text-neutral-900 leading-tight">
                  {getSeverityLabel(evaluation.severity)}
                </p>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {getSeverityDescription(evaluation.severity)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Analysis */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">{t('evaluations.category_breakdown')}</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {CARS_ITEMS.map(item => {
              const score = evaluation.scores[item.id.toString()];
              return (
                <div key={item.id} className="p-6 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800 break-inside-avoid">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-neutral-400">{item.id.toString().padStart(2, '0')}</span>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-md">{t(`cars.items.${item.id}.title`)}</h4>
                      </div>
                      
                      {score?.note && (
                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 italic">
                          <div className="flex gap-2">
                            <Info className="w-3 h-3 mt-0.5 shrink-0 text-indigo-500" />
                            <p>&quot;{score.note}&quot;</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        score?.value >= 3 ? "bg-error-50 text-error-700 border-error-100" : 
                        score?.value >= 2 ? "bg-warning-50 text-warning-700 border-warning-100" : 
                        "bg-success-50 text-success-700 border-success-100"
                      )}>
                        {t('common.status')}: {score?.value || 0}
                      </span>
                      <p className="text-[10px] text-neutral-400 font-medium">Max: 4.0</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-neutral-100 dark:border-neutral-800 text-center space-y-4">
          <div className="flex justify-center gap-12 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-10">
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>Evaluator Signature</p>
              <p className="text-xs font-bold text-neutral-900">{evaluation.evaluatorName}</p>
            </div>
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>Clinical Director Approval</p>
              <p className="text-xs font-bold text-neutral-900">Certified BCBA/Supervisor</p>
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed max-w-2xl mx-auto italic">
            This document contains confidential clinical findings. Unauthorized disclosure is strictly prohibited and protected by professional ethics and data privacy laws.
          </p>
        </div>

      </div>
    </div>
  );
}
