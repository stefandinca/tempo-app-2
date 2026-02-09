"use client";

import { useTranslation } from "react-i18next";
import { 
  User, 
  Calendar, 
  Printer, 
  ArrowLeft,
  CheckCircle2,
  Clock,
  Brain,
  MessageCircle,
  Users,
  PenTool,
  Activity
} from "lucide-react";
import { CarolinaEvaluation } from "@/types/carolina";
import { ClientInfo } from "@/types/client";
import { CAROLINA_PROTOCOL } from "@/data/carolina-protocol";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

interface CarolinaReportHTMLProps {
  evaluation: CarolinaEvaluation;
  client: ClientInfo;
  onBack: () => void;
  clinic?: any;
}

export default function CarolinaReportHTML({
  evaluation,
  client,
  onBack,
  clinic
}: CarolinaReportHTMLProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getDomainIcon = (id: string) => {
    switch(id) {
      case 'cognitiv': return Brain;
      case 'comunicare': return MessageCircle;
      case 'adaptare_sociala': return Users;
      case 'motricitate_fina': return PenTool;
      case 'motricitate_grosiera': return Activity;
      default: return Activity;
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
                Carolina Clinical Report
              </h1>
              <p className="text-xs text-neutral-500">{client.name} • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all font-bold"
          >
            <Printer className="w-4 h-4" />
            Print Report
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
                <p className="text-sm text-neutral-500 font-medium">Carolina Curriculum for Preschoolers</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Developmental Assessment</h2>
              <p className="text-neutral-500">Generated on: {new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString('ro-RO', { dateStyle: 'long' })}</p>
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
                <p className="text-neutral-500 font-medium">Evaluation Type</p>
                <p className="text-neutral-900 dark:text-white font-bold text-lg">Carolina Curriculum</p>
              </div>
              <div className="col-span-2">
                <p className="text-neutral-500 font-medium">{t('evaluations.summary')}</p>
                <p className="text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                  The Carolina Curriculum assessment evaluates the child&apos;s developmental progress across five key domains. This report details mastered skills, emerging capabilities, and areas for future intervention.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">Overall Progress</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl border bg-success-50 border-success-100">
                <div className="flex items-center gap-2 mb-2 text-success-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Mastered</span>
                </div>
                <p className="text-4xl font-black text-neutral-900">{evaluation.totalMastered}</p>
                <p className="text-xs text-neutral-500 mt-1">skills consistently demonstrated</p>
              </div>
              <div className="p-6 rounded-3xl border bg-warning-50 border-warning-100">
                <div className="flex items-center gap-2 mb-2 text-warning-700">
                  <Clock className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Emerging</span>
                </div>
                <p className="text-4xl font-black text-neutral-900">{evaluation.totalEmerging}</p>
                <p className="text-xs text-neutral-500 mt-1">skills in development</p>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Analysis */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">Domain Breakdown</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {CAROLINA_PROTOCOL.map(domain => {
              const stats = evaluation.domainProgress[domain.id] || { total: 0, mastered: 0, emerging: 0 };
              const percentage = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
              const Icon = getDomainIcon(domain.id);

              return (
                <div key={domain.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 break-inside-avoid">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-neutral-900 dark:text-white text-lg">{domain.title}</h4>
                        <span className="text-2xl font-black text-indigo-600">{percentage}%</span>
                      </div>
                      
                      <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex mb-3">
                        <div 
                          className="h-full bg-success-500" 
                          style={{ width: `${percentage}%` }} 
                        />
                        <div 
                          className="h-full bg-warning-400" 
                          style={{ width: `${stats.total > 0 ? (stats.emerging / stats.total) * 100 : 0}%` }}
                        />
                      </div>

                      <div className="flex gap-6 text-xs font-medium text-neutral-500">
                        <span className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-success-500" />
                          {stats.mastered} Mastered
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-warning-400" />
                          {stats.emerging} Emerging
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-neutral-200" />
                          {stats.total - stats.mastered - stats.emerging} Not Yet Evident
                        </span>
                      </div>
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
