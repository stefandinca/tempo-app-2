import { useMemo } from "react";
import { ArrowLeft, Download, TrendingUp, Award, Calendar, AlertTriangle, ArrowRight, Lightbulb, Target, Clock, Star } from "lucide-react";
import { Evaluation, CategorySummary } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import EvaluationRadarChart from "@/components/evaluations/EvaluationRadarChart";
import { clsx } from "clsx";
import { generateEvaluationPDF, generateVBMAPPPDF } from "@/lib/pdfGenerator";
import { ClientInfo } from "@/types/client";
import { 
  getParentFriendlyName, 
  getBarrierRecommendation, 
  getABLLSInterpretation, 
  getVBMAPPInterpretation,
  getPriorityAreas,
  calculateDomainScores
} from "@/lib/clinicalInterpretation";
import { VBMAPP_BARRIERS, VBMAPP_SKILL_AREAS } from "@/hooks/useVBMAPP";
import { ABLLS_CATEGORIES } from "@/hooks/useEvaluations";
import { calculateAge, formatAge, getVBMAPPDevelopmentalAge, calculateDevelopmentalDelay, calculatePreciseDevelopmentalAge } from "@/lib/ageUtils";
import { generateABLLSGoals, generateVBMAPPGoals, SuggestedGoal } from "@/lib/goalGenerator";

interface ParentEvaluationDetailProps {
  evaluation: Evaluation | VBMAPPEvaluation;
  previousEvaluation?: Evaluation | VBMAPPEvaluation | null;
  allEvaluations?: (Evaluation | VBMAPPEvaluation)[];
  clientData: ClientInfo;
  onBack: () => void;
}

export default function ParentEvaluationDetail({ evaluation, previousEvaluation, allEvaluations, clientData, onBack }: ParentEvaluationDetailProps) {
  const isABLLS = evaluation.type === 'ABLLS';

  // ABLLS-specific logic
  const abllsEval = isABLLS ? (evaluation as Evaluation) : null;
  const prevABLLS = isABLLS && previousEvaluation ? (previousEvaluation as Evaluation) : null;

  const sortedCategories = useMemo(() => {
    if (!abllsEval) return [];
    return Object.values(abllsEval.categorySummaries).sort((a, b) => 
      a.categoryKey.localeCompare(b.categoryKey)
    );
  }, [abllsEval]);

  const strongestAreas = useMemo(() => {
    if (!abllsEval) return [];
    return [...sortedCategories]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
  }, [sortedCategories, abllsEval]);

  const improvedAreas = useMemo(() => {
    if (!abllsEval || !prevABLLS) return [];
    
    return sortedCategories
      .map(cat => {
        const prevCat = prevABLLS.categorySummaries[cat.categoryKey];
        const diff = prevCat ? cat.percentage - prevCat.percentage : 0;
        return { ...cat, diff };
      })
      .filter(cat => cat.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);
  }, [sortedCategories, prevABLLS, abllsEval]);

  const priorityAreas = useMemo(() => {
    if (!abllsEval) return [];
    return getPriorityAreas(abllsEval.categorySummaries);
  }, [abllsEval]);

  const domainScores = useMemo(() => {
    if (!abllsEval) return {};
    return calculateDomainScores(abllsEval.categorySummaries);
  }, [abllsEval]);

  // VB-MAPP specific logic
  const vbmappEval = !isABLLS ? (evaluation as VBMAPPEvaluation) : null;
  const prevVBMAPP = !isABLLS && previousEvaluation ? (previousEvaluation as VBMAPPEvaluation) : null;

  const age = clientData.birthDate ? calculateAge(clientData.birthDate) : null;
  
  const delayStats = useMemo(() => {
    if (!age || !vbmappEval) return null;
    return calculateDevelopmentalDelay(
      age.totalMonths,
      calculatePreciseDevelopmentalAge(vbmappEval.overallMilestoneScore)
    );
  }, [age, vbmappEval]);

  const devAge = useMemo(() => {
    if (!vbmappEval) return "";
    return getVBMAPPDevelopmentalAge(vbmappEval.dominantLevel);
  }, [vbmappEval]);

  // Clinical interpretation
  const interpretation = useMemo(() => {
    if (isABLLS && abllsEval) {
      return getABLLSInterpretation(abllsEval.overallPercentage);
    } else if (vbmappEval && delayStats) {
      return getVBMAPPInterpretation(delayStats.delayPercentage, delayStats.severityLabel, vbmappEval.dominantLevel);
    }
    return null;
  }, [isABLLS, abllsEval, vbmappEval, delayStats]);

  // Suggested Goals
  const suggestedGoals = useMemo(() => {
    if (isABLLS && abllsEval) {
      return generateABLLSGoals(abllsEval, clientData.name || "Child", ABLLS_CATEGORIES);
    } else if (vbmappEval) {
      return generateVBMAPPGoals(vbmappEval, clientData.name || "Child", VBMAPP_SKILL_AREAS);
    }
    return [];
  }, [isABLLS, abllsEval, vbmappEval, clientData.name]);

  const handleDownload = () => {
    if (isABLLS) {
      generateEvaluationPDF(evaluation as Evaluation, clientData, previousEvaluation as Evaluation, allEvaluations as Evaluation[], true);
    } else {
      generateVBMAPPPDF(evaluation as VBMAPPEvaluation, clientData, VBMAPP_BARRIERS, true);
    }
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
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {isABLLS ? "ABLLS Report" : "VB-MAPP Report"}
          </h2>
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
      <div className={clsx(
        "rounded-3xl p-6 text-white shadow-lg",
        isABLLS 
          ? "bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/20"
          : "bg-gradient-to-br from-indigo-500 to-purple-700 shadow-indigo-500/20"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="opacity-80 text-sm font-medium mb-1">Overall Progress</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-bold">
                {isABLLS ? abllsEval?.overallPercentage : vbmappEval?.overallMilestonePercentage}%
              </h3>
              {previousEvaluation && (
                <span className="opacity-90 text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {isABLLS ? (
                    <>
                      {abllsEval!.overallPercentage > (previousEvaluation as Evaluation).overallPercentage ? "+" : ""}
                      {abllsEval!.overallPercentage - (previousEvaluation as Evaluation).overallPercentage}%
                    </>
                  ) : (
                    <>
                      {vbmappEval!.overallMilestonePercentage > (previousEvaluation as VBMAPPEvaluation).overallMilestonePercentage ? "+" : ""}
                      {vbmappEval!.overallMilestonePercentage - (previousEvaluation as VBMAPPEvaluation).overallMilestonePercentage}%
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="opacity-80 text-sm mt-1">
              {isABLLS 
                ? `${abllsEval?.overallScore} / ${abllsEval?.overallMaxScore} points`
                : `Level ${vbmappEval?.dominantLevel} | ${vbmappEval?.overallMilestoneScore} points`
              }
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Award className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Clinical Summary / Interpretation */}
      {interpretation && (
        <section className={clsx(
          "p-5 rounded-3xl border shadow-sm",
          interpretation.level === 'excellent' ? "bg-success-50 border-success-100 dark:bg-success-900/10 dark:border-success-900/30" :
          interpretation.level === 'good' ? "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30" :
          interpretation.level === 'moderate' ? "bg-warning-50 border-warning-100 dark:bg-warning-900/10 dark:border-warning-900/30" :
          "bg-error-50 border-error-100 dark:bg-error-900/10 dark:border-error-900/30"
        )}>
          <div className="flex items-start gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
              interpretation.level === 'excellent' ? "bg-success-100 text-success-600" :
              interpretation.level === 'good' ? "bg-blue-100 text-blue-600" :
              interpretation.level === 'moderate' ? "bg-warning-100 text-warning-600" :
              "bg-error-100 text-error-600"
            )}>
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-lg">
                {interpretation.title}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1 leading-relaxed">
                {interpretation.description}
              </p>
              <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-white/50 dark:border-white/5">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Therapeutic Focus</p>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {interpretation.recommendation}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VBMAPP Age Analysis */}
      {!isABLLS && age && delayStats && (
        <section className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 px-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-500" />
            Developmental Analysis
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Chronological Age</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{formatAge(age)}</p>
            </div>
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-800/30">
              <p className="text-xs text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider mb-1">Estimated Dev. Age</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{devAge}</p>
            </div>
          </div>
          {delayStats.delayMonths > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-warning-50 dark:bg-warning-900/10 rounded-xl border border-warning-100 dark:border-warning-900/30">
              <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />
              <p className="text-sm text-warning-800 dark:text-warning-300">
                Current assessment shows a developmental gap of <strong>{delayStats.delayMonths} months</strong> compared to same-age peers.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ABLLS Specific Views */}
      {isABLLS && abllsEval && (
        <>
          {/* Radar Chart */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4 px-2">Skill Profile</h3>
            <EvaluationRadarChart 
              evaluation={abllsEval} 
              previousEvaluation={prevABLLS}
              size="sm" 
              showLegend={false} 
            />
          </div>

          {/* Domain Breakdown */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white px-1">Learning Domains</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(domainScores).map(([domain, data]) => (
                <div key={domain} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                      {domain}
                    </h4>
                    <span className={clsx(
                      "text-xs font-bold",
                      data.percentage >= 80 ? "text-success-600" :
                      data.percentage >= 50 ? "text-primary-600" :
                      "text-neutral-500"
                    )}>
                      {data.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all",
                        data.percentage >= 80 ? "bg-success-500" :
                        data.percentage >= 50 ? "bg-primary-500" :
                        "bg-neutral-400"
                      )}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Priority Areas */}
          {priorityAreas.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white px-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-warning-500" />
                Priority Skill Building
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30 p-4">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-4 leading-relaxed">
                  Therapists have identified these areas as the most impactful for immediate focus:
                </p>
                <div className="flex flex-wrap gap-2">
                  {priorityAreas.map((area) => (
                    <div 
                      key={area.key}
                      className="px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800 flex items-center gap-2"
                    >
                      <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center font-bold text-amber-700 dark:text-amber-400 text-[10px]">
                        {area.key}
                      </span>
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                        {getParentFriendlyName(area.key, area.name)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          
          {/* Highlights */}
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
                    <p className="font-bold text-neutral-900 dark:text-white">
                      {getParentFriendlyName(area.categoryKey, area.categoryName)}
                    </p>
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
        </>
      )}

      {/* VB-MAPP Specific Views */}
      {!isABLLS && vbmappEval && (
        <>
          {/* Level Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white px-1">Learning Stages</h3>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(vbmappEval.levelSummaries).map(([key, level]) => (
                <div key={key} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {level.levelName.replace("Nivel", "Stage")}
                    </span>
                    <span className={clsx(
                      "text-xs font-bold px-2 py-0.5 rounded",
                      level.percentage >= 80 ? "bg-success-100 text-success-700" :
                      level.percentage >= 50 ? "bg-warning-100 text-warning-700" :
                      "bg-neutral-100 text-neutral-500"
                    )}>
                      {level.percentage}% Mastered
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all",
                        level.percentage >= 80 ? "bg-success-500" :
                        level.percentage >= 50 ? "bg-warning-500" :
                        "bg-neutral-400"
                      )}
                      style={{ width: `${level.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Barriers */}
          {vbmappEval.barrierSummary.severeBarriers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white px-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning-500" />
                Areas Needing Support
              </h3>
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                {vbmappEval.barrierSummary.severeBarriers.map((id, index) => {
                  const barrier = BARRIERS_LIST.find(b => b.id === id);
                  return (
                    <div 
                      key={id}
                      className={clsx(
                        "p-4",
                        index !== 0 && "border-t border-neutral-100 dark:border-neutral-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center font-bold text-warning-700 dark:text-warning-400 text-sm flex-shrink-0">
                          !
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white text-sm">
                            {barrier ? barrier.text.split('(')[0] : id}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1 italic leading-relaxed">
                            {getBarrierRecommendation(id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transition */}
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
              <ArrowRight className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Integration Readiness</p>
              <p className="font-bold text-neutral-900 dark:text-white text-xl">
                {vbmappEval.transitionSummary.readinessLevel.replace('_', ' ').toUpperCase()}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Ready for {vbmappEval.transitionSummary.readinessLevel === 'ready' ? 'mainstream settings' : 'targeted integration'}</p>
            </div>
          </div>
        </>
      )}

      {/* Suggested Goals / Working On */}
      {suggestedGoals.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary-500" />
              Focus Goals for Next Period
            </h3>
            <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full uppercase">
              {suggestedGoals.length} Identified
            </span>
          </div>
          
          <div className="grid gap-3">
            {suggestedGoals.slice(0, 5).map((goal, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                      {goal.area}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                      {goal.goal}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {suggestedGoals.length > 5 && (
            <p className="text-center text-xs text-neutral-500 italic py-2">
              + {suggestedGoals.length - 5} more goals identified in the clinical report
            </p>
          )}
        </section>
      )}

      {/* Footer Info */}
      <section className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">About this report</h4>
        <p className="text-xs text-neutral-500 leading-relaxed">
          This progress report is generated based on the clinical assessment conducted by {evaluation.evaluatorName}. 
          It provides a parent-friendly overview of skill development and learning milestones. 
          For a full clinical analysis, please download the PDF version using the button at the top.
        </p>
      </section>
    </div>
  );
}
