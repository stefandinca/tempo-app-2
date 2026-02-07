"use client";

import { useMemo, useState } from "react";
import { BarChart2, TrendingUp, Award, BookOpen, ListChecks, FileText, Target, CheckCircle2, Circle, Clock } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useInterventionPlans, usePrograms as useAllPrograms } from "@/hooks/useCollections";
import ProgramProgressCard, { SessionScore, ProgramScores } from "@/components/parent/ProgramProgressCard";
import ParentEvaluationList from "@/components/parent/ParentEvaluationList";
import ParentEvaluationDetail from "@/components/parent/ParentEvaluationDetail";
import ProgressRing from "@/components/parent/ProgressRing";
import TrendSparkline from "@/components/parent/TrendSparkline";
import { clsx } from "clsx";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { useTranslation } from "react-i18next";

interface ProgramWithHistory {
  id: string;
  title: string;
  description?: string;
  sessionHistory: SessionScore[];
}

type Tab = "programs" | "evaluations" | "goals";

function calculateSuccessRate(scores: ProgramScores): number {
  const total = scores.minus + scores.zero + scores.prompted + scores.plus;
  if (total === 0) return 0;
  return Math.round((scores.plus / total) * 100);
}

function calculateTrend(history: SessionScore[]): "improving" | "stable" | "declining" | "insufficient" {
  if (history.length < 2) return "insufficient";
  const recent = history.slice(-3);
  const previous = history.slice(-6, -3);
  if (previous.length === 0) return "insufficient";
  const recentAvg = recent.reduce((sum, s) => sum + calculateSuccessRate(s.scores), 0) / recent.length;
  const previousAvg = previous.reduce((sum, s) => sum + calculateSuccessRate(s.scores), 0) / previous.length;
  const diff = recentAvg - previousAvg;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}

export default function ParentProgressPage() {
  const { t } = useTranslation();
  const { data: client, sessions, programs, evaluations, loading, error } = usePortalData();
  const { data: interventionPlans, activePlan } = useInterventionPlans(client?.id || "");
  const { data: allPrograms } = useAllPrograms();
  const [activeTab, setActiveTab] = useState<Tab>("programs");
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | VBMAPPEvaluation | null>(null);

  const previousEvaluation = useMemo(() => {
    if (!selectedEvaluation || !selectedEvaluation.previousEvaluationId || !evaluations) return null;
    return evaluations.find((e: any) => e.id === selectedEvaluation.previousEvaluationId) || null;
  }, [selectedEvaluation, evaluations]);

  const parseDate = (val: any): Date => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  // Process sessions to extract program scores
  const programsWithHistory = useMemo(() => {
    if (!sessions || !programs) return [];
    const programMap = new Map<string, ProgramWithHistory>();

    sessions.forEach((session) => {
      const sessionProgramIds = session.programIds || [];
      const sessionProgramScores = session.programScores || {};
      const sessionDate = parseDate(session.startTime);

      sessionProgramIds.forEach((programId: string) => {
        const scores = sessionProgramScores[programId];
        if (!scores) return;
        const hasScores = scores.minus > 0 || scores.zero > 0 || scores.prompted > 0 || scores.plus > 0;
        if (!hasScores) return;

        const program = programs.find((p: any) => p.id === programId);
        if (!program) return;

        if (!programMap.has(programId)) {
          programMap.set(programId, {
            id: programId,
            title: program.title || "Unnamed Program",
            description: program.description,
            sessionHistory: [],
          });
        }

        programMap.get(programId)!.sessionHistory.push({
          sessionId: session.id,
          date: sessionDate,
          scores: scores as ProgramScores,
          sessionType: session.type || "Therapy Session",
        });
      });
    });

    return Array.from(programMap.values())
      .map((program) => ({
        ...program,
        sessionHistory: program.sessionHistory.sort((a, b) => a.date.getTime() - b.date.getTime()),
      }))
      .filter((p) => p.sessionHistory.length > 0);
  }, [sessions, programs]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (programsWithHistory.length === 0) {
      return { totalPrograms: 0, totalSessions: 0, totalTrials: 0, avgSuccessRate: 0 };
    }
    let totalTrials = 0;
    let totalCorrect = 0;
    const uniqueSessions = new Set<string>();

    programsWithHistory.forEach((program) => {
      program.sessionHistory.forEach((session) => {
        uniqueSessions.add(session.sessionId);
        const t = session.scores.minus + session.scores.zero + session.scores.prompted + session.scores.plus;
        totalTrials += t;
        totalCorrect += session.scores.plus;
      });
    });

    return {
      totalPrograms: programsWithHistory.length,
      totalSessions: uniqueSessions.size,
      totalTrials,
      avgSuccessRate: totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0,
    };
  }, [programsWithHistory]);

  // Group programs by trend for organized display
  const groupedPrograms = useMemo(() => {
    const improving: typeof programsWithHistory = [];
    const stable: typeof programsWithHistory = [];
    const needsAttention: typeof programsWithHistory = [];

    programsWithHistory.forEach((p) => {
      const trend = calculateTrend(p.sessionHistory);
      if (trend === "improving") improving.push(p);
      else if (trend === "declining") needsAttention.push(p);
      else stable.push(p);
    });

    return { improving, stable, needsAttention };
  }, [programsWithHistory]);

  // Goals from active intervention plan
  const goals = useMemo(() => {
    if (!activePlan || !allPrograms) return [];
    return (activePlan.programIds || []).map((pid: string) => {
      const prog = allPrograms.find((p: any) => p.id === pid);
      const pwh = programsWithHistory.find((p) => p.id === pid);
      let status: "not_started" | "in_progress" | "achieved" = "not_started";
      if (pwh && pwh.sessionHistory.length > 0) {
        const lastRate = calculateSuccessRate(pwh.sessionHistory[pwh.sessionHistory.length - 1].scores);
        status = lastRate >= 80 ? "achieved" : "in_progress";
      }
      return {
        id: pid,
        title: prog?.title || pid,
        description: prog?.description,
        status,
      };
    });
  }, [activePlan, allPrograms, programsWithHistory]);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || t("parent_portal.dashboard.load_error")} />;

  if (selectedEvaluation) {
    return (
      <div className="p-4 pb-24">
        <ParentEvaluationDetail
          evaluation={selectedEvaluation}
          previousEvaluation={previousEvaluation}
          allEvaluations={evaluations}
          clientData={client}
          onBack={() => setSelectedEvaluation(null)}
        />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "programs", label: t("parent_portal.progress.tabs.programs"), icon: ListChecks },
    { key: "evaluations", label: t("parent_portal.progress.tabs.evaluations"), icon: FileText },
    { key: "goals", label: t("parent_portal.progress.tabs.goals"), icon: Target },
  ];

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-24">
      <header>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t("parent_portal.progress.title")}</h1>
        <p className="text-neutral-400 text-sm">{t("parent_portal.progress.subtitle", { name: client.name })}</p>
      </header>

      {/* Overview Hero */}
      {summaryStats.avgSuccessRate > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 flex items-center gap-5">
          <ProgressRing value={summaryStats.avgSuccessRate} size={80} strokeWidth={6} color={summaryStats.avgSuccessRate >= 80 ? "#22c55e" : summaryStats.avgSuccessRate >= 50 ? "#f59e0b" : "#ef4444"}>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">{summaryStats.avgSuccessRate}%</span>
          </ProgressRing>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t("parent_portal.progress.stats.success")}</p>
            <p className="text-xs text-neutral-400 mt-1">
              {summaryStats.totalPrograms} {t("parent_portal.progress.stats.programs")} · {summaryStats.totalSessions} {t("parent_portal.progress.stats.sessions")} · {summaryStats.totalTrials} {t("parent_portal.progress.stats.trials")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === tab.key
                ? "bg-white dark:bg-neutral-800 text-primary-600 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Programs Tab */}
      {activeTab === "programs" && (
        <>
          {programsWithHistory.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart2 className="w-7 h-7 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">{t("parent_portal.progress.no_data")}</h3>
              <p className="text-neutral-400 text-sm mt-1 max-w-xs mx-auto">{t("parent_portal.progress.no_data_subtitle")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped by trend */}
              {groupedPrograms.improving.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-success-600 uppercase tracking-widest px-1 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t("parent_portal.progress.improving")}
                  </h2>
                  <div className="space-y-3">
                    {groupedPrograms.improving.map((p) => (
                      <ProgramProgressCard key={p.id} programId={p.id} programTitle={p.title} programDescription={p.description} sessionHistory={p.sessionHistory} />
                    ))}
                  </div>
                </section>
              )}
              {groupedPrograms.stable.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1 mb-3">
                    {t("parent_portal.progress.stable")}
                  </h2>
                  <div className="space-y-3">
                    {groupedPrograms.stable.map((p) => (
                      <ProgramProgressCard key={p.id} programId={p.id} programTitle={p.title} programDescription={p.description} sessionHistory={p.sessionHistory} />
                    ))}
                  </div>
                </section>
              )}
              {groupedPrograms.needsAttention.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-warning-600 uppercase tracking-widest px-1 mb-3">
                    {t("parent_portal.progress.needs_attention")}
                  </h2>
                  <div className="space-y-3">
                    {groupedPrograms.needsAttention.map((p) => (
                      <ProgramProgressCard key={p.id} programId={p.id} programTitle={p.title} programDescription={p.description} sessionHistory={p.sessionHistory} />
                    ))}
                  </div>
                </section>
              )}

              {/* Score Legend */}
              <section className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">{t("parent_portal.progress.understanding_scores")}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-error-500 flex items-center justify-center text-white font-bold text-[10px]">−</div>
                    <span className="text-neutral-600 dark:text-neutral-400">{t("parent_portal.progress.score_labels.incorrect")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-neutral-500 flex items-center justify-center text-white font-bold text-[10px]">0</div>
                    <span className="text-neutral-600 dark:text-neutral-400">{t("parent_portal.progress.score_labels.no_response")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-warning-500 flex items-center justify-center text-white font-bold text-[10px]">P</div>
                    <span className="text-neutral-600 dark:text-neutral-400">{t("parent_portal.progress.score_labels.prompted")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-success-500 flex items-center justify-center text-white font-bold text-[10px]">+</div>
                    <span className="text-neutral-600 dark:text-neutral-400">{t("parent_portal.progress.score_labels.correct")}</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* Evaluations Tab */}
      {activeTab === "evaluations" && (
        <ParentEvaluationList evaluations={evaluations || []} onSelect={setSelectedEvaluation} />
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <>
          {!activePlan ? (
            <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-7 h-7 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">{t("parent_portal.progress.goals.no_plan")}</h3>
              <p className="text-neutral-400 text-sm mt-1 max-w-xs mx-auto">{t("parent_portal.progress.goals.no_plan_subtitle")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400 px-1">{t("parent_portal.progress.goals.from_plan", { name: activePlan.name })}</p>
              {goals.map((goal) => {
                const statusConfig = {
                  not_started: { icon: Circle, color: "text-neutral-400", bg: "bg-neutral-50 dark:bg-neutral-800", label: t("parent_portal.progress.goals.not_started") },
                  in_progress: { icon: Clock, color: "text-primary-500", bg: "bg-primary-50 dark:bg-primary-900/20", label: t("parent_portal.progress.goals.in_progress") },
                  achieved: { icon: CheckCircle2, color: "text-success-500", bg: "bg-success-50 dark:bg-success-900/20", label: t("parent_portal.progress.goals.achieved") },
                };
                const config = statusConfig[goal.status];
                return (
                  <div key={goal.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", config.bg)}>
                        <config.icon className={clsx("w-5 h-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{goal.description}</p>
                        )}
                      </div>
                      <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-full", config.bg, config.color)}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
