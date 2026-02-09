"use client";

import { PortageEvaluation, PORTAGE_CATEGORIES } from "@/types/portage";
import { useTranslation } from "react-i18next";
import { 
  BarChart3, 
  Calendar, 
  User, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  ChevronRight,
  Download,
  Printer,
  ListFilter
} from "lucide-react";
import { clsx } from "clsx";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from "recharts";
import { useRouter } from "next/navigation";

interface PortageSummaryProps {
  evaluation: PortageEvaluation;
  onClose: () => void;
}

export default function PortageSummary({ evaluation, onClose }: PortageSummaryProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Prepare data for Radar Chart
  const targetPercentage = Math.min(100, Math.round((evaluation.chronologicalAgeAtEvaluation / 72) * 100));
  
  const radarData = PORTAGE_CATEGORIES.map(cat => ({
    subject: cat,
    score: evaluation.summaries[cat]?.percentage || 0,
    target: targetPercentage,
    fullMark: 100,
  }));

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const gap = evaluation.chronologicalAgeAtEvaluation - evaluation.overallDevelopmentalAgeMonths;

  const handlePrint = () => {
    router.push(`/reports/evaluation/?type=portage&id=${evaluation.id}&clientId=${evaluation.clientId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-primary-600">
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Chronological Age</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">
              {(evaluation.chronologicalAgeAtEvaluation / 12).toFixed(1)}
            </span>
            <span className="text-sm text-neutral-500 font-medium">years</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2">At the time of evaluation</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-success-600">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Developmental Age</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">
              {(evaluation.overallDevelopmentalAgeMonths / 12).toFixed(1)}
            </span>
            <span className="text-sm text-neutral-500 font-medium">years</span>
          </div>
          <div className={clsx(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-2",
            gap <= 6 ? "bg-success-100 text-success-700" : "bg-error-100 text-error-700"
          )}>
            {gap <= 0 ? "Above Average" : `${(gap / 12).toFixed(1)}y gap`}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-purple-600">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Overall Progress</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">
              {Math.round((evaluation.overallDevelopmentalAgeMonths / evaluation.chronologicalAgeAtEvaluation) * 100)}%
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2">Relative to age expectations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Radar Chart */}
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Developmental Profile</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-primary-500/50 border border-primary-500" />
                <span className="text-neutral-500">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-neutral-200 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600" />
                <span className="text-neutral-500">Expected</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e5e5" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                <Radar
                  name="Expected"
                  dataKey="target"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Actual"
                  dataKey="score"
                  stroke="#4A90E2"
                  fill="#4A90E2"
                  fillOpacity={0.5}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-primary-500" />
            Category Details
          </h3>
          {PORTAGE_CATEGORIES.map(cat => {
            const summary = evaluation.summaries[cat];
            return (
              <div key={cat} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{cat}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Developmental Age: <span className="font-bold text-primary-600">{(summary.developmentalAgeMonths / 12).toFixed(1)}y</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-neutral-900 dark:text-white">{summary.percentage}%</span>
                  <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 transition-all duration-500"
                      style={{ width: `${summary.percentage}%` }}
                    />
                  </div>
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
            <span>Evaluator: <span className="font-bold text-neutral-700 dark:text-neutral-300">{evaluation.evaluatorName}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Completed: <span className="font-bold text-neutral-700 dark:text-neutral-300">{formatDate(evaluation.completedAt)}</span></span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-neutral-600 hover:text-neutral-900 transition-all">
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
