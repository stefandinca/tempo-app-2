"use client";

import { useMemo, useRef } from "react";
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  Calendar, 
  User, 
  Award, 
  Target, 
  Clock, 
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { ClientInfo } from "@/types/client";
import { 
  getABLLSInterpretation, 
  getVBMAPPInterpretation, 
  calculateDomainScores, 
  getPriorityAreas,
  getParentFriendlyName,
  getBarrierRecommendation
} from "@/lib/clinicalInterpretation";
import { calculateAge, formatAge, getVBMAPPDevelopmentalAge, calculateDevelopmentalDelay, calculatePreciseDevelopmentalAge } from "@/lib/ageUtils";
import { generateABLLSGoals, generateVBMAPPGoals } from "@/lib/goalGenerator";
import { ABLLS_CATEGORIES } from "@/hooks/useEvaluations";
import { VBMAPP_SKILL_AREAS, VBMAPP_BARRIERS } from "@/hooks/useVBMAPP";
import EvaluationRadarChart from "./EvaluationRadarChart";
import VBMAPPMilestoneGrid from "./vbmapp/VBMAPPMilestoneGrid";
import { clsx } from "clsx";

interface EvaluationReportHTMLProps {
  evaluation: Evaluation | VBMAPPEvaluation;
  client: ClientInfo;
  previousEvaluation?: Evaluation | VBMAPPEvaluation | null;
  onBack?: () => void;
  isParentVersion?: boolean;
}

export default function EvaluationReportHTML({ 
  evaluation, 
  client, 
  previousEvaluation, 
  onBack,
  isParentVersion = false 
}: EvaluationReportHTMLProps) {
  const isABLLS = evaluation.type === 'ABLLS';
  const reportRef = useRef<HTMLDivElement>(null);

  // Data Processing
  const age = client.birthDate ? calculateAge(client.birthDate) : null;
  
  const abllsEval = isABLLS ? (evaluation as Evaluation) : null;
  const vbmappEval = !isABLLS ? (evaluation as VBMAPPEvaluation) : null;

  const interpretation = useMemo(() => {
    if (isABLLS && abllsEval) {
      return getABLLSInterpretation(abllsEval.overallPercentage);
    } else if (vbmappEval) {
      const devAgeMonths = calculatePreciseDevelopmentalAge(vbmappEval.overallMilestoneScore);
      const delay = age ? calculateDevelopmentalDelay(age.totalMonths, devAgeMonths) : { delayPercentage: 0, severityLabel: 'none' };
      return getVBMAPPInterpretation(delay.delayPercentage, delay.severityLabel, vbmappEval.dominantLevel);
    }
    return null;
  }, [isABLLS, abllsEval, vbmappEval, age]);

  const domainScores = useMemo(() => {
    if (isABLLS && abllsEval) return calculateDomainScores(abllsEval.categorySummaries);
    return null;
  }, [isABLLS, abllsEval]);

  const suggestedGoals = useMemo(() => {
    if (isABLLS && abllsEval) return generateABLLSGoals(abllsEval, client.name, ABLLS_CATEGORIES);
    if (vbmappEval) return generateVBMAPPGoals(vbmappEval, client.name, VBMAPP_SKILL_AREAS);
    return [];
  }, [isABLLS, abllsEval, vbmappEval, client.name]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 print:bg-white pb-20">
      {/* Control Bar - Hidden on Print */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="font-bold text-neutral-900 dark:text-white">
                {isABLLS ? "ABLLS-R" : "VB-MAPP"} Progress Report
              </h1>
              <p className="text-xs text-neutral-500">{client.name} • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-600/20"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Container */}
      <div 
        ref={reportRef}
        className="max-w-5xl mx-auto my-8 print:my-0 bg-white dark:bg-neutral-900 shadow-2xl print:shadow-none rounded-3xl print:rounded-none overflow-hidden"
      >
        {/* Report Header */}
        <header className="relative bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 p-8 md:p-12">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary-500" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-xl">T</div>
                <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Tempo<span className="text-primary-600">App</span></span>
              </div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                {isParentVersion ? "Developmental Progress Report" : "Clinical Evaluation Report"}
              </h2>
              <p className="text-neutral-500 mt-2 font-medium">Comprehensive assessment of skills and learning milestones.</p>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 min-w-[240px]">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">Client</span>
                  <span className="text-neutral-900 dark:text-white font-bold">{client.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">Date</span>
                  <span className="text-neutral-900 dark:text-white font-bold">{new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">Type</span>
                  <span className="text-primary-600 font-bold">{evaluation.type}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 md:p-12 space-y-12">
          {/* Executive Summary Row */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Score Card */}
            <div className="lg:col-span-1 bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-8 text-white shadow-xl shadow-primary-600/20 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <p className="text-primary-100 font-bold uppercase text-[10px] tracking-[0.2em] mb-2">Overall Mastery</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black">
                  {isABLLS ? abllsEval?.overallPercentage : vbmappEval?.overallMilestonePercentage}%
                </span>
                {previousEvaluation && (
                  <div className="flex items-center text-primary-200 font-bold text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12%
                  </div>
                )}
              </div>
              <p className="mt-4 text-primary-100 text-sm leading-relaxed">
                {isABLLS 
                  ? `${abllsEval?.overallScore} of ${abllsEval?.overallMaxScore} possible skill points achieved across all assessed categories.`
                  : `Currently functioning at Level ${vbmappEval?.dominantLevel} with ${vbmappEval?.overallMilestoneScore} milestone points.`
                }
              </p>
            </div>

            {/* Interpretation Card */}
            <div className="lg:col-span-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl p-8 border border-neutral-100 dark:border-neutral-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm flex items-center justify-center text-primary-600 flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                    {interpretation?.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed mb-4">
                    {interpretation?.description}
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800/30">
                    <CheckCircle2 className="w-4 h-4 text-primary-600" />
                    <p className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wide">
                      Recommendation: {interpretation?.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Analysis Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Skill Profile Analysis</h3>
              <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Chart Side */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-center">
                  {isABLLS ? (
                    <EvaluationRadarChart evaluation={abllsEval!} size="lg" />
                  ) : (
                    <VBMAPPMilestoneGrid evaluation={vbmappEval!} />
                  )}
                </div>
                <p className="text-center text-xs text-neutral-400 font-medium italic">
                  Visual representation of {isABLLS ? "skill mastery across categories" : "milestone completion grid"}.
                </p>
              </div>

              {/* Data Side */}
              <div className="space-y-8">
                {isABLLS ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Developmental Domains</h4>
                      {domainScores && Object.entries(domainScores).map(([domain, data]) => (
                        <div key={domain} className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{domain}</span>
                            <span className="text-sm font-black text-primary-600">{data.percentage}%</span>
                          </div>
                          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                              style={{ width: `${data.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Milestones by Stage</h4>
                      {Object.values(vbmappEval!.levelSummaries).map((level) => (
                        <div key={level.level} className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{level.levelName}</span>
                            <span className="text-sm font-black text-indigo-600">{level.percentage}%</span>
                          </div>
                          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                              style={{ width: `${level.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Highlights Card */}
                <div className="bg-primary-50 dark:bg-primary-900/10 rounded-3xl p-6 border border-primary-100 dark:border-primary-800/30">
                  <div className="flex items-center gap-3 mb-4">
                    <StarIcon className="w-5 h-5 text-primary-600" />
                    <h4 className="font-bold text-primary-900 dark:text-primary-100">Performance Highlights</h4>
                  </div>
                  <ul className="space-y-3">
                    {isABLLS ? (
                      Object.values(abllsEval!.categorySummaries)
                        .sort((a, b) => b.percentage - a.percentage)
                        .slice(0, 3)
                        .map(cat => (
                          <li key={cat.categoryKey} className="flex items-center gap-2 text-sm text-primary-800 dark:text-primary-200">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                            <strong>{cat.categoryKey}:</strong> {getParentFriendlyName(cat.categoryKey, cat.categoryName)} ({cat.percentage}%)
                          </li>
                        ))
                    ) : (
                      vbmappEval!.barrierSummary.severeBarriers.slice(0, 3).map(id => (
                        <li key={id} className="flex items-center gap-2 text-sm text-error-800 dark:text-error-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-error-500" />
                          <strong>Barrier:</strong> {VBMAPP_BARRIERS.find(b => b.id === id)?.text.split('(')[0]}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Skill Breakdown Table */}
          <section className="space-y-6">
             <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Detailed Category Analysis</h3>
              <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
            </div>
            
            <div className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">ID</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Skill Category</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Mastery</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {isABLLS ? (
                    Object.values(abllsEval!.categorySummaries).sort((a,b) => a.categoryKey.localeCompare(b.categoryKey)).map(cat => (
                      <tr key={cat.categoryKey} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-4 font-bold text-primary-600">{cat.categoryKey}</td>
                        <td className="p-4">
                          <p className="font-bold text-neutral-900 dark:text-white text-sm">{isParentVersion ? getParentFriendlyName(cat.categoryKey, cat.categoryName) : cat.categoryName}</p>
                          <p className="text-xs text-neutral-500">{cat.scoredItems} / {cat.totalItems} items scored</p>
                        </td>
                        <td className="p-4">
                           <div className="w-32 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${cat.percentage}%` }} />
                          </div>
                        </td>
                        <td className="p-4 text-right font-black text-neutral-900 dark:text-white text-sm">{cat.percentage}%</td>
                      </tr>
                    ))
                  ) : (
                    Object.values(vbmappEval!.levelSummaries).map(level => (
                      <tr key={level.level} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-4 font-bold text-indigo-600">L{level.level}</td>
                        <td className="p-4">
                          <p className="font-bold text-neutral-900 dark:text-white text-sm">{level.levelName}</p>
                          <p className="text-xs text-neutral-500">{level.scoredItems} / {level.totalItems} milestones achieved</p>
                        </td>
                         <td className="p-4">
                           <div className="w-32 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${level.percentage}%` }} />
                          </div>
                        </td>
                        <td className="p-4 text-right font-black text-neutral-900 dark:text-white text-sm">{level.percentage}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Goals for Next Period */}
          <section className="space-y-6 break-inside-avoid">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">Future Learning Targets</h3>
              <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedGoals.slice(0, 6).map((goal, idx) => (
                <div key={idx} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 font-black text-xs flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{goal.skillArea}</p>
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 leading-relaxed">{goal.goalText}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Signature Footer */}
          <footer className="mt-20 pt-12 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row justify-between gap-12">
            <div className="flex-1">
              <div className="h-px w-full bg-neutral-300 dark:bg-neutral-700 mb-4" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Evaluator Signature</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mt-2">{evaluation.evaluatorName}</p>
            </div>
            <div className="flex-1">
              <div className="h-px w-full bg-neutral-300 dark:bg-neutral-700 mb-4" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Date of Validation</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mt-2">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex-1">
              <div className="h-px w-full bg-neutral-300 dark:bg-neutral-700 mb-4" />
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Clinical Director</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mt-2">Certified Supervisor</p>
            </div>
          </footer>
        </div>
        
        {/* Footer Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600" />
      </div>
    </div>
  );
}

function StarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
