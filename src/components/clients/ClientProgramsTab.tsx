"use client";

import { useMemo } from "react";
import { useClientEvents } from "@/hooks/useCollections";
import { usePrograms, useTeamMembers } from "@/hooks/useCollections";
import { BookOpen, Calendar, Clock, FileText, Loader2, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProgramScores } from "../calendar/EventDetailPanel/ProgramScoreCounter";

interface ClientProgramsTabProps {
  client: any;
}

export default function ClientProgramsTab({ client }: ClientProgramsTabProps) {
  const { t, i18n } = useTranslation();
  const { data: events, loading: eventsLoading } = useClientEvents(client.id);
  const { data: programs, loading: programsLoading } = usePrograms();
  const { data: teamMembers } = useTeamMembers();

  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";

  // Filter to sessions that have scores, program notes, or session notes
  const sessionsWithData = useMemo(() => {
    if (!events) return [];
    return events.filter((ev: any) => {
      const hasScores = ev.programScores && Object.keys(ev.programScores).length > 0;
      const hasProgramNotes = ev.programNotes && Object.keys(ev.programNotes).length > 0;
      const hasSessionNotes = ev.details && ev.details.trim().length > 0;
      return hasScores || hasProgramNotes || hasSessionNotes;
    });
  }, [events]);

  const loading = eventsLoading || programsLoading;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
      </div>
    );
  }

  const getProgramTitle = (programId: string) => {
    const program = (programs || []).find(p => p.id === programId);
    return program?.title || programId;
  };

  const getTherapistName = (therapistId: string) => {
    const member = (teamMembers || []).find(m => m.id === therapistId);
    return member?.name || "";
  };

  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  const getScoreSummary = (scores: ProgramScores) => {
    const total = scores.minus + scores.zero + scores.prompted + scores.plus;
    if (total === 0) return null;
    const successRate = total > 0 ? Math.round((scores.plus / total) * 100) : 0;
    return { total, successRate };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
        {t('clients.notes.title')}
      </h3>

      {sessionsWithData.length > 0 ? (
        <div className="space-y-4">
          {sessionsWithData.map((ev: any) => {
            const sessDate = parseDate(ev.startTime);
            const therapistName = getTherapistName(ev.therapistId);
            const eventProgramScores: Record<string, ProgramScores> = ev.programScores || {};
            const eventProgramNotes: Record<string, string> = ev.programNotes || {};
            const programIds: string[] = ev.programIds || [];

            return (
              <div
                key={ev.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm"
              >
                {/* Session Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">
                        {sessDate.toLocaleDateString(currentLang, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Clock className="w-3 h-3" />
                        {sessDate.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' })}
                        {therapistName && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            <User className="w-3 h-3" />
                            {therapistName}
                          </>
                        )}
                        {ev.type && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            {ev.type}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {ev.attendance && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                      ev.attendance === 'present' ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400' :
                      ev.attendance === 'absent' ? 'bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-400' :
                      'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                    }`}>
                      {t(`attendance.${ev.attendance}`)}
                    </span>
                  )}
                </div>

                {/* Program Scores */}
                {programIds.length > 0 && Object.keys(eventProgramScores).length > 0 && (
                  <div className="space-y-2 mb-3">
                    {programIds.map(programId => {
                      const scores = eventProgramScores[programId];
                      const note = eventProgramNotes[programId];
                      if (!scores && !note) return null;
                      const summary = scores ? getScoreSummary(scores) : null;

                      return (
                        <div
                          key={programId}
                          className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                                {getProgramTitle(programId)}
                              </span>
                            </div>
                            {summary && (
                              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                                {summary.successRate}% {t('clients.notes.success')}
                              </span>
                            )}
                          </div>
                          {scores && (
                            <div className="flex items-center gap-3 text-xs mt-1">
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-error-100 dark:bg-error-900/30 text-error-600 flex items-center justify-center font-bold text-[10px]">−</span>
                                {scores.minus}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-bold text-[10px]">0</span>
                                {scores.zero}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-warning-100 dark:bg-warning-900/30 text-warning-600 flex items-center justify-center font-bold text-[10px]">P</span>
                                {scores.prompted}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-success-100 dark:bg-success-900/30 text-success-600 flex items-center justify-center font-bold text-[10px]">+</span>
                                {scores.plus}
                              </span>
                              {summary && (
                                <span className="text-neutral-400 ml-auto">
                                  {summary.total} {t('clients.notes.trials')}
                                </span>
                              )}
                            </div>
                          )}
                          {note && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 italic border-t border-neutral-200 dark:border-neutral-700 pt-2">
                              {note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Session Notes */}
                {ev.details && ev.details.trim() && (
                  <div className="bg-primary-50/50 dark:bg-primary-900/10 rounded-xl p-3 border border-primary-100/50 dark:border-primary-900/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {t('clients.notes.session_notes')}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
                      &ldquo;{ev.details}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t('clients.notes.no_sessions')}
          </h3>
          <p className="text-neutral-500 mt-1 max-w-sm mx-auto">
            {t('clients.notes.no_sessions_subtitle')}
          </p>
        </div>
      )}
    </div>
  );
}
