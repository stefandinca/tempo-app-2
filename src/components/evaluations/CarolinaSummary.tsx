"use client";

import { CarolinaEvaluation } from "@/types/carolina";
import { CAROLINA_PROTOCOL } from "@/data/carolina-protocol";
import { useTranslation } from "react-i18next";
import { 
  BarChart3, 
  Calendar, 
  User, 
  Printer, 
  CheckCircle2, 
  Clock,
  XCircle,
  Brain,
  MessageCircle,
  Users,
  PenTool,
  Activity
} from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

interface CarolinaSummaryProps {
  evaluation: CarolinaEvaluation;
  onClose: () => void;
}

export default function CarolinaSummary({ evaluation, onClose }: CarolinaSummaryProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const handlePrint = () => {
    router.push(`/reports/evaluation/?type=carolina&id=${evaluation.id}&clientId=${evaluation.clientId}`);
  };

  const getDomainIcon = (id: string) => {
    switch(id) {
      case 'cognitiv': return Brain;
      case 'comunicare': return MessageCircle;
      case 'adaptare_sociala': return Users;
      case 'motricitate_fina': return PenTool;
      case 'motricitate_grosiera': return Activity;
      default: return BarChart3;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-success-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('carolina.mastered_skills')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">
              {evaluation.totalMastered}
            </span>
            <span className="text-sm text-neutral-500 font-medium">{t('evaluations.items')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-warning-600">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('carolina.emerging_skills')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">
              {evaluation.totalEmerging}
            </span>
            <span className="text-sm text-neutral-500 font-medium">{t('evaluations.items')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('billing_page.status.synced')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">
              {evaluation.status === 'completed' ? '100%' : t('common.loading')}
            </span>
          </div>
        </div>
      </div>

      {/* Domain Breakdown */}
      <div className="grid grid-cols-1 gap-6">
        {CAROLINA_PROTOCOL.map(domain => {
          const stats = evaluation.domainProgress[domain.id] || { total: 0, mastered: 0, emerging: 0 };
          const percentage = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
          const Icon = getDomainIcon(domain.id);

          return (
            <div key={domain.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white">{domain.title}</h4>
                    <p className="text-xs text-neutral-500">{stats.mastered} / {stats.total} {t('carolina.mastered_skills')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-white">{percentage}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-success-500 transition-all duration-500" 
                  style={{ width: `${percentage}%` }} 
                  title={t('carolina.mastered_skills')}
                />
                <div 
                  className="h-full bg-warning-400 transition-all duration-500" 
                  style={{ width: `${stats.total > 0 ? (stats.emerging / stats.total) * 100 : 0}%` }}
                  title={t('carolina.emerging_skills')}
                />
              </div>
              
              <div className="flex gap-4 mt-2 text-[10px] font-medium text-neutral-400">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success-500" /> {t('carolina.mastered_skills')}</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning-400" /> {t('carolina.emerging_skills')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Metadata */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-6 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{t('evaluations.evaluator')}: <span className="font-bold text-neutral-700 dark:text-neutral-300">{evaluation.evaluatorName}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{t('calendar.event.date')}: <span className="font-bold text-neutral-700 dark:text-neutral-300">{formatDate(evaluation.completedAt || evaluation.createdAt)}</span></span>
          </div>
        </div>
        
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg"
        >
          <Printer className="w-4 h-4" />
          {t('portage.print_report')}
        </button>
      </div>
    </div>
  );
}
