"use client";

import { useTranslation } from "react-i18next";
import { 
  User, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Printer, 
  ChevronLeft,
  Briefcase,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building
} from "lucide-react";
import { formatAge, calculateAge } from "@/lib/ageUtils";

interface ClientReportHTMLProps {
  client: any;
  events: any[];
  evaluations: any[];
  programs: any[];
  clinic: any;
  onBack: () => void;
}

export default function ClientReportHTML({
  client,
  events,
  evaluations,
  programs,
  clinic,
  onBack
}: ClientReportHTMLProps) {
  const { t } = useTranslation();
  
  const age = calculateAge(client.birthDate);
  const latestEval = evaluations.find(e => e.status === 'completed') || evaluations[0];

  // --- Aggregations ---
  
  const therapistStats = events.reduce((acc: any, evt) => {
    const name = evt.therapistName || "Unknown";
    if (!acc[name]) acc[name] = 0;
    acc[name]++;
    return acc;
  }, {});

  const attendanceHours = events.reduce((acc: any, evt) => {
    const duration = (evt.duration || 60) / 60;
    const status = evt.attendance || 'scheduled';
    if (!acc[status]) acc[status] = 0;
    acc[status] += duration;
    return acc;
  }, { present: 0, absent: 0, excused: 0 });

  const handlePrint = () => {
    window.print();
  };

  const clean = (txt: string) => txt || "—";

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-8 print:bg-white print:p-0">
      
      {/* Action Bar */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between print:hidden font-display">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-all shadow-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-600/20 transition-all font-bold"
        >
          <Printer className="w-4 h-4" />
          {t('billing_page.export')}
        </button>
      </div>

      {/* Main Report Page */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-neutral-900 shadow-2xl print:shadow-none print:w-full min-h-[29.7cm] border border-neutral-200 dark:border-neutral-800 p-12 lg:p-16">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-primary-500 pb-10 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg shadow-primary-500/20">
                T
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white font-display tracking-tight leading-none">TempoApp</h1>
                <p className="text-sm text-neutral-500 font-medium">{t('reports.client.system_subtitle')}</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white font-display uppercase tracking-tight">{t('reports.client.title')}</h2>
              <p className="text-neutral-500">{t('reports.client.generated_on')}: {new Date().toLocaleDateString('ro-RO', { dateStyle: 'long' })}</p>
            </div>
          </div>

          <div className="text-right space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="font-bold text-neutral-900 dark:text-white">{clinic?.name || "Clinic Name SRL"}</p>
            <p>{clinic?.address || "Clinic Address Placeholder"}</p>
            <p>CUI: {clinic?.cui || "RO12345678"}</p>
            <p>{clinic?.email || "contact@clinic.ro"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Section: Client Personal Data */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <User className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('clients.personal_info')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-neutral-500 font-medium">{t('clients.fields.full_name')}</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">{clean(client.name)}</p>
              </div>
              <div>
                <p className="text-neutral-500 font-medium">{t('clients.fields.birth_date')}</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">{formatAge(age)}</p>
              </div>
              <div>
                <p className="text-neutral-500 font-medium">{t('clients.fields.diagnosis')}</p>
                <p className="text-neutral-900 dark:text-white font-semibold">{clean(client.primaryDiagnosis)}</p>
              </div>
              <div>
                <p className="text-neutral-500 font-medium">{t('clients.fields.support_level')}</p>
                <p className="text-neutral-900 dark:text-white font-semibold">{client.diagnosisLevel ? `${t('common.level') || 'Level'} ${client.diagnosisLevel}` : "—"}</p>
              </div>
            </div>
          </div>

          {/* Section: Clinical Team */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <Briefcase className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('clients.assigned_team')}</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(therapistStats).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{name}</span>
                  <span className="px-3 py-1 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-primary-600">
                    {count as any} {t('reports.client.sessions_label')}
                  </span>
                </div>
              ))}
              {Object.keys(therapistStats).length === 0 && <p className="text-sm text-neutral-500 italic">{t('reports.client.no_activity')}</p>}
            </div>
          </div>
        </div>

        {/* Section: Attendance Summary */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <Clock className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('clients.upcoming_schedule')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-success-50 dark:bg-success-900/10 border border-success-100 dark:border-success-900/30 rounded-2xl text-center">
              <CheckCircle2 className="w-6 h-6 text-success-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-success-700 dark:text-success-400">{(attendanceHours.present as number).toFixed(1)}h</p>
              <p className="text-xs font-bold text-success-600 uppercase tracking-widest mt-1">{t('attendance.present')}</p>
            </div>
            <div className="p-4 bg-error-50 dark:bg-error-900/10 border border-error-100 dark:border-error-900/30 rounded-2xl text-center">
              <XCircle className="w-6 h-6 text-error-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-error-700 dark:text-error-400">{(attendanceHours.absent as number).toFixed(1)}h</p>
              <p className="text-xs font-bold text-success-600 uppercase tracking-widest mt-1">{t('attendance.absent')}</p>
            </div>
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-center">
              <HelpCircle className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">{(attendanceHours.excused as number).toFixed(1)}h</p>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{t('attendance.excused')}</p>
            </div>
          </div>
        </div>

        {/* Section: Program Progress */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <Target className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('clients.tabs.programs')}</h3>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-display">
                <tr>
                  <th className="px-6 py-4">{t('services.name')}</th>
                  <th className="px-6 py-4">{t('common.status')}</th>
                  <th className="px-6 py-4 text-right">{t('reports.client.progress_label')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {programs.map((prog) => (
                  <tr key={prog.id}>
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">{prog.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 text-xs font-bold rounded-lg uppercase">
                        {prog.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-24 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500" style={{ width: `${prog.progress || 0}%` }} />
                        </div>
                        <span className="font-bold tabular-nums">{prog.progress || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Latest Evaluation */}
        <div className="space-y-6 page-break-before">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('clients.tabs.evaluations')}</h3>
          </div>
          
          {latestEval ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-neutral-50 dark:bg-neutral-800/50 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="space-y-4 font-display">
                <div>
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">{latestEval.type}</p>
                  <h4 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('evaluations.overall_score')}</h4>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-bold text-primary-600">{latestEval.overallPercentage}%</span>
                  <span className="text-neutral-500 font-medium">({latestEval.overallScore} / {latestEval.overallMaxScore} points)</span>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center text-center">
                  <Target className="w-12 h-12 text-primary-200 mb-4" />
                  <p className="text-xs text-neutral-400 max-w-[200px] leading-relaxed italic">
                    {t('reports.client.evaluation_chart_desc')}
                  </p>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-center text-neutral-500 italic border border-dashed border-neutral-200">
              {t('evaluations.no_data') || 'No assessment data.'}
            </div>
          )}
        </div>

        {/* Report Footer */}
        <div className="mt-20 pt-10 border-t border-neutral-100 dark:border-neutral-800 text-center space-y-4">
          <div className="flex justify-center gap-12 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-10">
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>{t('evaluations.evaluator') || 'Evaluator'}</p>
            </div>
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>{t('reports.client.manager_signature')}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl mx-auto italic">
            {t('reports.client.gdpr_notice')}
          </p>
        </div>

      </div>
    </div>
  );
}