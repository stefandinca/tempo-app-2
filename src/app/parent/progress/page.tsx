"use client";

import { useMemo, useState } from "react";
import { BarChart2, TrendingUp, Award, BookOpen, ListChecks, FileText } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import ProgramProgressCard, { SessionScore, ProgramScores } from "@/components/parent/ProgramProgressCard";
import ParentEvaluationList from "@/components/parent/ParentEvaluationList";
import ParentEvaluationDetail from "@/components/parent/ParentEvaluationDetail";
import { clsx } from "clsx";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";

interface ProgramWithHistory {
  id: string;
  title: string;
  description?: string;
  sessionHistory: SessionScore[];
}

type Tab = 'programs' | 'evaluations';

export default function ParentProgressPage() {
  const { data: client, sessions, programs, evaluations, loading, error } = usePortalData();
  const [activeTab, setActiveTab] = useState<Tab>('programs');
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | VBMAPPEvaluation | null>(null);

  // Find previous evaluation if one is selected
  const previousEvaluation = useMemo(() => {
    if (!selectedEvaluation || !selectedEvaluation.previousEvaluationId || !evaluations) return null;
    return evaluations.find((e: any) => e.id === selectedEvaluation.previousEvaluationId) || null;
  }, [selectedEvaluation, evaluations]);

  // Process sessions to extract program scores and group by program
  const programsWithHistory = useMemo(() => {
    if (!sessions || !programs) return [];

    // Map to collect session scores for each program
    const programMap = new Map<string, ProgramWithHistory>();

    // Helper to parse date
    const parseDate = (val: any): Date => {
      if (!val) return new Date(0);
      if (val.seconds) return new Date(val.seconds * 1000);
      return new Date(val);
    };

    // Process each session
    sessions.forEach((session) => {
      const sessionProgramIds = session.programIds || [];
      const sessionProgramScores = session.programScores || {};
      const sessionDate = parseDate(session.startTime);

      // Only include sessions that have program scores recorded
      sessionProgramIds.forEach((programId: string) => {
        const scores = sessionProgramScores[programId];
        if (!scores) return; // Skip if no scores recorded for this program

        // Check if there are any actual scores (not all zeros)
        const hasScores = scores.minus > 0 || scores.zero > 0 || scores.prompted > 0 || scores.plus > 0;
        if (!hasScores) return;

        // Find program info
        const program = programs.find((p: any) => p.id === programId);
        if (!program) return;

        // Get or create program entry
        if (!programMap.has(programId)) {
          programMap.set(programId, {
            id: programId,
            title: program.title || "Unnamed Program",
            description: program.description,
            sessionHistory: [],
          });
        }

        // Add session to history
        programMap.get(programId)!.sessionHistory.push({
          sessionId: session.id,
          date: sessionDate,
          scores: scores as ProgramScores,
          sessionType: session.type || "Therapy Session",
        });
      });
    });

    // Convert to array and sort each program's history by date
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

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || "Could not load progress data."} />;

  // If viewing evaluation details, show detail view
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

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-24">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Progress Tracking</h1>
        <p className="text-neutral-500 text-sm">Monitor {client.name}&apos;s therapy progress</p>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
        <button
          onClick={() => setActiveTab('programs')}
          className={clsx(
            "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'programs'
              ? "bg-white dark:bg-neutral-800 text-primary-600 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          )}
        >
          <ListChecks className="w-4 h-4" />
          Programs
        </button>
        <button
          onClick={() => setActiveTab('evaluations')}
          className={clsx(
            "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === 'evaluations'
              ? "bg-white dark:bg-neutral-800 text-primary-600 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          )}
        >
          <FileText className="w-4 h-4" />
          Evaluations
        </button>
      </div>

      {activeTab === 'programs' ? (
        <>
          {/* Summary Stats */}
          {programsWithHistory.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{summaryStats.totalPrograms}</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Programs</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{summaryStats.totalSessions}</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Sessions</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{summaryStats.totalTrials}</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Trials</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    summaryStats.avgSuccessRate >= 80 ? "bg-success-100 dark:bg-success-900/30" :
                    summaryStats.avgSuccessRate >= 50 ? "bg-warning-100 dark:bg-warning-900/30" :
                    "bg-error-100 dark:bg-error-900/30"
                  )}>
                    <Award className={clsx(
                      "w-5 h-5",
                      summaryStats.avgSuccessRate >= 80 ? "text-success-600" :
                      summaryStats.avgSuccessRate >= 50 ? "text-warning-600" :
                      "text-error-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{summaryStats.avgSuccessRate}%</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Success</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart2 className="w-8 h-8 text-neutral-300" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No progress data yet</h3>
              <p className="text-neutral-500 text-sm mt-1 max-w-xs mx-auto">
                Program scores will appear here once therapists begin tracking progress during sessions.
              </p>
            </div>
          )}

          {/* Programs List */}
          {programsWithHistory.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1 mb-4">
                Program Progress
              </h2>
              <div className="space-y-4">
                {programsWithHistory.map((program) => (
                  <ProgramProgressCard
                    key={program.id}
                    programId={program.id}
                    programTitle={program.title}
                    programDescription={program.description}
                    sessionHistory={program.sessionHistory}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Legend / Help */}
          <section className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Understanding Scores</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-error-500 flex items-center justify-center text-white font-bold text-[10px]">−</div>
                <span className="text-neutral-600 dark:text-neutral-400">Incorrect response</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-neutral-500 flex items-center justify-center text-white font-bold text-[10px]">0</div>
                <span className="text-neutral-600 dark:text-neutral-400">No response</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-warning-500 flex items-center justify-center text-white font-bold text-[10px]">P</div>
                <span className="text-neutral-600 dark:text-neutral-400">Prompted/Assisted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-success-500 flex items-center justify-center text-white font-bold text-[10px]">+</div>
                <span className="text-neutral-600 dark:text-neutral-400">Correct/Independent</span>
              </div>
            </div>
          </section>
        </>
      ) : (
        <ParentEvaluationList 
          evaluations={evaluations || []} 
          onSelect={setSelectedEvaluation} 
        />
      )}
    </div>
  );
}
