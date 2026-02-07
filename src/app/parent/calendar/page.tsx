"use client";

import { Calendar, CheckCircle2, Clock, List, CalendarDays } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers } from "@/hooks/useCollections";
import ParentEventDetailPanel from "@/components/parent/ParentEventDetailPanel";
import WeekSelector from "@/components/parent/WeekSelector";
import { clsx } from "clsx";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

function parseDate(val: any): Date {
  if (!val) return new Date(0);
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type ViewMode = "day" | "list";

export default function ParentSchedulePage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, sessions, loading, error } = usePortalData();
  const { data: team } = useTeamMembers();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  // Build set of dates that have sessions
  const sessionDates = useMemo(() => {
    const dates = new Set<string>();
    (sessions || []).forEach((s) => {
      dates.add(toDateKey(parseDate(s.startTime)));
    });
    return dates;
  }, [sessions]);

  // Sessions for selected day
  const daySessions = useMemo(() => {
    return (sessions || [])
      .filter((s) => isSameDay(parseDate(s.startTime), selectedDate))
      .sort((a, b) => parseDate(a.startTime).getTime() - parseDate(b.startTime).getTime());
  }, [sessions, selectedDate]);

  // All sessions sorted for list view
  const allSessions = useMemo(() => {
    return [...(sessions || [])].sort((a, b) => parseDate(a.startTime).getTime() - parseDate(b.startTime).getTime());
  }, [sessions]);

  // Group sessions by date for list view
  const groupedSessions = useMemo(() => {
    return allSessions.reduce((acc: Record<string, any[]>, sess) => {
      const dateKey = parseDate(sess.startTime).toLocaleDateString(currentLang, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(sess);
      return acc;
    }, {});
  }, [allSessions, currentLang]);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || t("parent_portal.dashboard.load_error")} />;

  const getTherapist = (id: string) => (team || []).find((t) => t.id === id);

  const now = new Date();

  const getSessionStatus = (sess: any) => {
    if (sess.status === "completed") return "completed";
    const sessDate = parseDate(sess.startTime);
    if (sessDate > now) return "upcoming";
    return "past";
  };

  const statusBorderColor: Record<string, string> = {
    upcoming: "border-l-primary-500",
    completed: "border-l-success-500",
    past: "border-l-neutral-300 dark:border-l-neutral-600",
  };

  const renderSessionCard = (sess: any) => {
    const therapist = getTherapist(sess.therapistId);
    const sessDate = parseDate(sess.startTime);
    const status = getSessionStatus(sess);

    return (
      <div
        key={sess.id}
        onClick={() => {
          setSelectedEvent(sess);
          setIsDetailOpen(true);
        }}
        className={clsx(
          "bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm cursor-pointer active:scale-[0.99] transition-all border-l-4 overflow-hidden",
          statusBorderColor[status],
          status === "past" && "opacity-70"
        )}
      >
        <div className="flex items-center gap-3 p-3.5">
          {/* Time column */}
          <div className="text-center min-w-[50px]">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">
              {sessDate.toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[10px] text-neutral-400">{sess.duration} {t("parent_portal.calendar.min")}</p>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-neutral-200 dark:bg-neutral-700" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{sess.type}</h4>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                style={{ backgroundColor: therapist?.color || "#ccc" }}
              >
                {therapist?.initials || "??"}
              </div>
              <span className="text-xs text-neutral-500 truncate">{therapist?.name || t("parent_portal.dashboard.assigned_therapist")}</span>
            </div>
          </div>

          {/* Status badge */}
          {status === "completed" ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-success-600 bg-success-50 dark:bg-success-900/20 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              {t("parent_portal.calendar.completed")}
            </span>
          ) : status === "upcoming" ? (
            <span className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-full">
              {t("parent_portal.calendar.upcoming")}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-full">
              {t("parent_portal.calendar.past")}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-12">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t("parent_portal.calendar.title")}</h1>
          <p className="text-neutral-400 text-sm">{t("parent_portal.calendar.subtitle")}</p>
        </div>
        <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode("day")}
            className={clsx(
              "p-2 rounded-lg transition-all",
              viewMode === "day" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary-600" : "text-neutral-400"
            )}
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={clsx(
              "p-2 rounded-lg transition-all",
              viewMode === "list" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary-600" : "text-neutral-400"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "day" ? (
        <>
          {/* Week Selector */}
          <WeekSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            sessionDates={sessionDates}
            currentLang={currentLang}
          />

          {/* Day Sessions */}
          {daySessions.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">{t("parent_portal.calendar.no_sessions_day")}</h3>
              <p className="text-neutral-400 text-sm mt-1">{t("parent_portal.calendar.no_sessions_day_subtitle")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {daySessions.map(renderSessionCard)}
            </div>
          )}
        </>
      ) : (
        /* List View */
        sessions.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7 text-neutral-300" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">{t("parent_portal.calendar.no_sessions")}</h3>
            <p className="text-neutral-400 text-sm mt-1">{t("parent_portal.calendar.no_sessions_subtitle")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSessions).map(([date, dateSessions]: [string, any]) => (
              <div key={date} className="space-y-2">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">{date}</h3>
                <div className="space-y-2">
                  {dateSessions.map(renderSessionCard)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <ParentEventDetailPanel
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
