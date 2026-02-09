"use client";

import { useTranslation } from "react-i18next";
import { 
  User, 
  Calendar, 
  Clock, 
  Printer, 
  ChevronLeft,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building,
  TrendingUp,
  BarChart3,
  ListFilter
} from "lucide-react";
import { PortageEvaluation, PORTAGE_CATEGORIES } from "@/types/portage";
import { ClientInfo } from "@/types/client";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from "recharts";
import { clsx } from "clsx";
import portageDataRaw from "../../../evals/portage.json";
import { useEffect, useState } from "react";

const portageData = portageDataRaw as Record<string, any[]>;

interface PortageReportHTMLProps {
  evaluation: PortageEvaluation;
  client: ClientInfo;
  onBack: () => void;
  clinic?: any;
}

export default function PortageReportHTML({
  evaluation,
  client,
  onBack,
  clinic
}: PortageReportHTMLProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const radarData = PORTAGE_CATEGORIES.map(cat => ({
    subject: cat,
    score: evaluation.summaries[cat]?.percentage || 0,
    target: Math.min(100, Math.round((evaluation.chronologicalAgeAtEvaluation / 72) * 100)),
    fullMark: 100,
  }));

  const gap = evaluation.chronologicalAgeAtEvaluation - evaluation.overallDevelopmentalAgeMonths;

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
                {t('portage.report_title')}
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
        <div className="flex justify-between items-start border-b-2 border-orange-500 pb-10 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg shadow-orange-500/20">
                P
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white font-display tracking-tight leading-none">TempoApp</h1>
                <p className="text-sm text-neutral-500 font-medium">{t('reports.client.system_subtitle')}</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white font-display uppercase tracking-tight">{t('portage.report_title')}</h2>
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

        {/* Section: Client & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <User className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('clients.personal_info')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-neutral-500 font-medium">{t('clients.fields.full_name')}</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">{client.name}</p>
              </div>
              <div>
                <p className="text-neutral-500 font-medium">{t('portage.chronological_age')}</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">{(evaluation.chronologicalAgeAtEvaluation / 12).toFixed(1)} {t('portage.years')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-neutral-500 font-medium">{t('evaluations.summary')}</p>
                <p className="text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                  The Portage assessment for <strong>{client.name}</strong> shows an overall developmental age of <strong>{(evaluation.overallDevelopmentalAgeMonths / 12).toFixed(1)} {t('portage.years')}</strong>, 
                  representing a progress level of <strong>{Math.round((evaluation.overallDevelopmentalAgeMonths / evaluation.chronologicalAgeAtEvaluation) * 100)}%</strong> relative to chronological expectations.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('portage.gap')}</h3>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-3xl border border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">{t('portage.gap')}</span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  gap <= 6 ? "bg-success-100 text-success-700" : "bg-error-100 text-error-700"
                )}>
                  {gap <= 0 ? t('portage.above_average') : `${(gap / 12).toFixed(1)}y ${t('portage.delay')}`}
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-500 mb-1.5 uppercase">
                    <span>{t('portage.actual')}</span>
                    <span>{Math.round((evaluation.overallDevelopmentalAgeMonths / 72) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(evaluation.overallDevelopmentalAgeMonths / 72) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-500 mb-1.5 uppercase">
                    <span>{t('portage.expected')}</span>
                    <span>{Math.round((evaluation.chronologicalAgeAtEvaluation / 72) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-white dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-300 dark:bg-neutral-600 rounded-full" style={{ width: `${(evaluation.chronologicalAgeAtEvaluation / 72) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Radar Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12 page-break-before">
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
            <h4 className="text-center text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">{t('portage.developmental_profile')}</h4>
            <div className="h-[300px] w-full">
              {isClient && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e5e5" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                    <Radar
                      name={t('portage.expected')}
                      dataKey="target"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.1}
                    />
                    <Radar
                      name={t('portage.actual')}
                      dataKey="score"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm border-b border-neutral-100 pb-2">{t('reports.team.services_provided')}</h3>
            {PORTAGE_CATEGORIES.map(cat => {
              const summary = evaluation.summaries[cat];
              return (
                <div key={cat} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{cat}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-orange-600">{(summary.developmentalAgeMonths / 12).toFixed(1)}y</span>
                    <div className="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${summary.percentage}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Itemized Results */}
        <div className="space-y-8 page-break-before">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <ListFilter className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('reports.team.session_log')} ({t('evaluations.category_breakdown')})</h3>
          </div>

          <div className="space-y-10">
            {PORTAGE_CATEGORIES.map(cat => {
              const catItems = portageData[cat] || [];
              const achievedItems = catItems.filter(item => evaluation.scores[item.id]?.achieved);
              
              if (achievedItems.length === 0) return null;

              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-orange-500 rounded-full" />
                    <h4 className="font-black text-neutral-900 dark:text-white uppercase tracking-tight">{cat}</h4>
                    <span className="text-xs font-bold text-neutral-400">({achievedItems.length} {t('portage.items_achieved')})</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {achievedItems.map(item => {
                      const score = evaluation.scores[item.id];
                      return (
                        <div key={item.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{item.text}</p>
                              {score.note && (
                                <p className="text-xs text-neutral-500 mt-2 italic bg-white dark:bg-neutral-900 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                  &quot;{score.note}&quot;
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-[10px] font-bold text-neutral-400 whitespace-nowrap">
                              {t('portage.target_age')}: {item.age}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
              <p>{t('reports.team.member_signature')}</p>
            </div>
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>{t('reports.team.director_approval')}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl mx-auto italic">
            {t('reports.team.confidentiality_notice')}
          </p>
        </div>

      </div>
    </div>
  );
}
