"use client";

import { CheckCircle2, Circle, Clock, FileText, BarChart3, ChevronRight, BookOpen } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useTeamMembers, usePrograms } from "@/hooks/useCollections";
import { ProgramScores } from "../calendar/EventDetailPanel/ProgramScoreCounter";

interface LatestSessionSummaryProps {
  sessions: any[];
  onSelect: (session: any) => void;
}

function parseDate(val: any): Date {
  if (!val) return new Date(0);
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

export default function LatestSessionSummary({ sessions, onSelect }: LatestSessionSummaryProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: team } = useTeamMembers();
  const { data: programs } = usePrograms();

  if (!sessions || sessions.length === 0) return null;

  // All sessions are from the same day; show "view details" on the first one
  // (ParentEventDetailPanel handles a single event at a time).
  const firstSession = sessions[0];

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 dark:text-white">{t("parent_portal.dashboard.latest_summary")}</h3>
        <button
          onClick={() => onSelect(firstSession)}
          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
        >
          {t("parent_portal.dashboard.view_details")}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const therapist = (team || []).find(tm => tm.id === session.therapistId);
          const selectedPrograms = (programs || []).filter(p => session.programIds?.includes(p.id));
          const programScores = session.programScores || {};
          const sessDate = parseDate(session.startTime);

          const stats = Object.values(programScores as Record<string, ProgramScores>).reduce(
            (acc, score) => {
              acc.total += score.plus + score.minus + score.prompted + score.zero;
              acc.success += score.plus;
              return acc;
            },
            { total: 0, success: 0 }
          );
          const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : null;

          return (
            <div
              key={session.id}
              onClick={() => onSelect(session)}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden active:scale-[0.99] transition-all cursor-pointer"
            >
              {/* Top Header with Date/Time and Attendance */}
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center text-[10px] font-bold">
                    <span className="text-primary-600 leading-none">{sessDate.getDate()}</span>
                    <span className="text-neutral-400 uppercase leading-none mt-0.5">{sessDate.toLocaleDateString(currentLang, { month: 'short' })}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                      {session.type}
                      <span className="ml-2 text-[10px] font-semibold text-neutral-400 tabular-nums">
                        {sessDate.toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {therapist?.name}
                    </p>
                  </div>
                </div>

                <div className={clsx(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  session.attendance === 'present' ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400" :
                  session.attendance === 'absent' ? "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400" :
                  "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                )}>
                  {session.attendance === 'present' ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {t(`attendance.${session.attendance}`) || session.attendance}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Notes Preview */}
                {session.details && session.isPublic !== false && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 italic leading-relaxed">
                      &ldquo;{session.details}&rdquo;
                    </p>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="flex gap-4">
                  {successRate !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-success-50 dark:bg-success-900/20 flex items-center justify-center text-success-500">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">{t("parent_portal.progress.stats.success")}</p>
                        <p className="text-xs font-bold text-neutral-900 dark:text-white">{successRate}%</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center text-secondary-500">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">{t("parent_portal.progress.stats.programs")}</p>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">{selectedPrograms.length}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">{t("calendar.event.duration")}</p>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">{session.duration}m</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
