"use client";

import {
  X,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Circle
} from "lucide-react";
import { clsx } from "clsx";
import { useTeamMembers, usePrograms } from "@/hooks/useCollections";
import { useTranslation } from "react-i18next";
import ProgramScoreCounter, { ProgramScores } from "../calendar/EventDetailPanel/ProgramScoreCounter";

interface ParentEventDetailPanelProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ParentEventDetailPanel({ event, isOpen, onClose }: ParentEventDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: team } = useTeamMembers();
  const { data: programs } = usePrograms();

  if (!event) return null;

  const therapist = (team || []).find(t => t.id === event.therapistId);
  const selectedPrograms = (programs || []).filter(p => event.programIds?.includes(p.id));

  const programScores = event.programScores || {};
  const programNotes: Record<string, string> = event.programNotes || {};
  const defaultScores: ProgramScores = { minus: 0, zero: 0, prompted: 0, plus: 0 };

  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  const sessDate = parseDate(event.startTime);

  const getAttendanceLabel = (attendance: string) => {
    const labels: Record<string, string> = {
      present: t("parent_portal.session_detail.present"),
      absent: t("parent_portal.session_detail.absent"),
      excused: t("parent_portal.session_detail.excused"),
    };
    return labels[attendance] || t("parent_portal.session_detail.scheduled");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 backdrop-blur-sm",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-l border-neutral-200 dark:border-neutral-800",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>

        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">{t("parent_portal.session_detail.title")}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] p-6 space-y-6 pb-20">

          {/* Header Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-neutral-900 dark:text-white">{event.type}</h4>
              <p className="text-sm text-neutral-500">{event.duration} {t("parent_portal.calendar.min")}</p>
            </div>
          </div>

          {/* Time & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{t("parent_portal.session_detail.date")}</p>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Calendar className="w-3.5 h-3.5" />
                {sessDate.toLocaleDateString(currentLang)}
              </div>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{t("parent_portal.session_detail.time")}</p>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Clock className="w-3.5 h-3.5" />
                {sessDate.toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Attendance Status */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t("parent_portal.session_detail.attendance")}</p>
            <div className={clsx(
              "flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm",
              event.attendance === 'present' ? "bg-success-50 border-success-100 text-success-700 dark:bg-success-900/20 dark:border-success-800 dark:text-success-400" :
              event.attendance === 'absent' ? "bg-error-50 border-error-100 text-error-700 dark:bg-error-900/20 dark:border-error-800 dark:text-error-400" :
              event.attendance === 'excused' ? "bg-warning-50 border-warning-100 text-warning-700 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-400" :
              "bg-neutral-50 border-neutral-100 text-neutral-500 dark:bg-neutral-800/50 dark:border-neutral-700 dark:text-neutral-400"
            )}>
              {event.attendance === 'present' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {getAttendanceLabel(event.attendance)}
            </div>
          </div>

          {/* Therapist */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t("parent_portal.session_detail.therapist")}</p>
            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: therapist?.color || '#ccc' }}
              >
                {therapist?.initials || '??'}
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{therapist?.name || t("parent_portal.dashboard.assigned_therapist")}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-bold">{therapist?.role}</p>
              </div>
            </div>
          </div>

          {/* Programs & Scores */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t("parent_portal.session_detail.programs")}</p>
            {selectedPrograms.length > 0 ? (
              <div className="space-y-3">
                {selectedPrograms.map(p => (
                  <div key={p.id}>
                    <ProgramScoreCounter
                      programId={p.id}
                      programTitle={p.title}
                      programDescription={p.description}
                      scores={programScores[p.id] || defaultScores}
                      onChange={() => {}}
                      disabled={true}
                    />
                    {programNotes[p.id] && (
                      <div className="mt-1.5 px-3 py-2 bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-900/30 rounded-lg">
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{t("parent_portal.session_detail.program_notes")}</p>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 italic">{programNotes[p.id]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800 text-center">
                <BookOpen className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-500 italic">{t("parent_portal.session_detail.no_programs")}</p>
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t("parent_portal.session_detail.notes")}</p>
            <div className="bg-primary-50/50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100/50 dark:border-primary-900/30">
              {event.isPublic !== false && event.details ? (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                  &ldquo;{event.details}&rdquo;
                </p>
              ) : (
                <div className="text-center py-2 flex flex-col items-center">
                  <FileText className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-400 italic">{t("parent_portal.session_detail.notes_processing")}</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold py-3 transition-colors shadow-lg"
          >
            {t("parent_portal.session_detail.close")}
          </button>
        </div>

      </div>
    </>
  );
}
