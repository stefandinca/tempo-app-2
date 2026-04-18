"use client";

import {
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  MessageSquare,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers, useClientInvoices, useHomework } from "@/hooks/useCollections";
import ParentEventDetailPanel from "@/components/parent/ParentEventDetailPanel";
import LatestSessionSummary from "@/components/parent/LatestSessionSummary";
import { useNotifications } from "@/context/NotificationContext";
import { useParentAuth } from "@/context/ParentAuthContext";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

export default function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const { unreadMessageCount } = useNotifications();
  const { clientId } = useParentAuth();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, sessions, loading: portalLoading, error: portalError } = usePortalData();
  const { data: team } = useTeamMembers();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client?.id || "");
  const { data: homework } = useHomework(clientId || "");

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loading = portalLoading || invoicesLoading;
  const error = portalError;

  // Calculate Balance
  const displayBalance = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "issued" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const unpaidCount = useMemo(() => {
    return invoices.filter((inv) => inv.status === "issued" || inv.status === "overdue").length;
  }, [invoices]);

  const incompleteHomeworkCount = useMemo(() =>
    homework.filter(h => !h.completed).length,
  [homework]);

  // Latest session day — all sessions from the most recent day that had any
  // completed session. Clients typically have 1-2 sessions on the same day,
  // so parents need to see the full picture, not just the most recent one.
  const lastSessionDay = useMemo(() => {
    const past = (sessions || [])
      .filter((s) => s.status === "completed")
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    if (past.length === 0) return [];
    const anchor = new Date(past[0].startTime);
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const d = anchor.getDate();
    return past
      .filter((s) => {
        const sd = new Date(s.startTime);
        return sd.getFullYear() === y && sd.getMonth() === m && sd.getDate() === d;
      })
      // Chronological order within the day (morning first)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions]);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || t("parent_portal.dashboard.load_error")} />;

  // Helpers
  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  const now = new Date();

  // Next session
  const upcomingSessions = (sessions || [])
    .filter((s) => parseDate(s.startTime) >= now)
    .sort((a, b) => parseDate(a.startTime).getTime() - parseDate(b.startTime).getTime());
  const nextSession = upcomingSessions[0];

  const getTherapist = (id: string) => (team || []).find((t) => t.id === id);
  const nextTherapist = nextSession ? getTherapist(nextSession.therapistId) : null;

  // Countdown text
  const getCountdown = (session: any) => {
    const sessTime = parseDate(session.startTime);
    const diffMs = sessTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return t("parent_portal.dashboard.starting_soon");
    if (diffHours < 24) return t("parent_portal.dashboard.in_hours", { count: diffHours });
    if (diffDays === 1) return t("parent_portal.dashboard.tomorrow_at", { time: sessTime.toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" }) });
    return t("parent_portal.dashboard.in_days", { count: diffDays });
  };

  // Stats
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const sessionsThisMonth = (sessions || []).filter((s) => {
    const d = parseDate(s.startTime);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const completedThisMonth = sessionsThisMonth.filter((s) => s.status === "completed");
  const presentThisMonth = sessionsThisMonth.filter((s) => s.attendance === "present").length;
  const totalPastThisMonth = sessionsThisMonth.filter((s) => parseDate(s.startTime) < now).length;
  const attendanceRate = totalPastThisMonth > 0 ? Math.round((presentThisMonth / totalPastThisMonth) * 100) : 100;
  const remainingThisMonth = sessionsThisMonth.filter((s) => parseDate(s.startTime) >= now).length;

  // Action items for "Needs Attention" panel
  const actionItems = [];
  if (unpaidCount > 0) {
    actionItems.push({
      key: "billing",
      href: "/parent/billing/",
      icon: CreditCard,
      label: unpaidCount > 1
        ? t("parent_portal.dashboard.unpaid_invoices_plural", { count: unpaidCount })
        : t("parent_portal.dashboard.unpaid_invoices", { count: unpaidCount }),
      detail: `${displayBalance.toFixed(2)} RON`,
      color: "text-warning-600 bg-warning-50 dark:bg-warning-900/20 dark:text-warning-400",
      borderColor: "border-warning-100 dark:border-warning-900/30",
    });
  }
  if (incompleteHomeworkCount > 0) {
    actionItems.push({
      key: "homework",
      href: "/parent/homework/",
      icon: BookOpen,
      label: incompleteHomeworkCount > 1
        ? t("parent_portal.dashboard.homework_pending_plural", { count: incompleteHomeworkCount })
        : t("parent_portal.dashboard.homework_pending", { count: incompleteHomeworkCount }),
      color: "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400",
      borderColor: "border-primary-100 dark:border-primary-900/30",
    });
  }
  if (unreadMessageCount > 0) {
    actionItems.push({
      key: "messages",
      href: "/parent/messages/",
      icon: MessageSquare,
      label: unreadMessageCount > 1
        ? t("parent_portal.dashboard.unread_messages_plural", { count: unreadMessageCount })
        : t("parent_portal.dashboard.unread_messages", { count: unreadMessageCount }),
      color: "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400",
      borderColor: "border-primary-100 dark:border-primary-900/30",
    });
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300 font-sans pb-20">
      {/* 1. Header / Greeting */}
      <section className="px-4 pt-5">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
          {t("parent_portal.welcome", { name: client.parentName?.split(" ")[0] || t("parent_portal.dashboard.parent") })}
        </h1>
        <p className="text-neutral-400 text-sm mt-0.5">
          {new Date().toLocaleDateString(currentLang, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </section>

      {/* 2. Next Session Hero Card */}
      <section className="px-4">
        {nextSession ? (
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Calendar className="w-20 h-20" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary-200 text-xs font-semibold uppercase tracking-wider">
                {t("parent_portal.dashboard.next_session")}
              </span>
              <span className="text-primary-200 text-xs">&middot;</span>
              <span className="text-primary-200 text-xs font-medium">
                {getCountdown(nextSession)}
              </span>
            </div>

            <h2 className="text-lg font-bold mb-3">
              {parseDate(nextSession.startTime).toLocaleDateString(currentLang, { weekday: "long" })},{" "}
              {parseDate(nextSession.startTime).toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" })}
            </h2>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: nextTherapist?.color || "rgba(255,255,255,0.2)" }}
              >
                {nextTherapist?.initials || "??"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{nextSession.type}</p>
                <p className="text-xs text-primary-200">
                  {t("parent_portal.dashboard.with")} {nextTherapist?.name || t("parent_portal.dashboard.assigned_therapist")}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setSelectedEvent(nextSession);
                  setIsDetailOpen(true);
                }}
                className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors text-center"
              >
                {t("parent_portal.dashboard.view_details")}
              </button>
              <Link
                href={`/parent/messages/?therapistId=${nextSession.therapistId}`}
                className="flex-1 py-2 bg-white text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-semibold transition-colors text-center"
              >
                {t("parent_portal.dashboard.message_therapist")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl p-6 text-center border border-dashed border-neutral-300 dark:border-neutral-700">
            <Clock className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-neutral-500 font-medium text-sm">{t("parent_portal.dashboard.no_upcoming")}</p>
          </div>
        )}
      </section>

      {/* 3. Needs Your Attention — Action Items Panel */}
      {actionItems.length > 0 && (
        <section className="px-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {t("parent_portal.dashboard.needs_attention")}
              </h3>
            </div>
            <div className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {actionItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                >
                  <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", item.color)}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-neutral-400">{item.detail}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Monthly Stats — 3 cards */}
      <section className="px-4">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
          {t("parent_portal.dashboard.this_month")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {/* Sessions Completed */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col items-center shadow-sm">
            <span className="text-2xl font-black text-neutral-900 dark:text-white">{completedThisMonth.length}</span>
            <p className="text-[10px] text-neutral-500 font-medium mt-1 text-center uppercase tracking-wider">
              {t("parent_portal.dashboard.sessions_done")}
            </p>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col items-center shadow-sm">
            <span className={clsx(
              "text-2xl font-black",
              attendanceRate >= 80 ? "text-success-600" : attendanceRate >= 50 ? "text-warning-600" : "text-error-600"
            )}>
              {attendanceRate}%
            </span>
            <p className="text-[10px] text-neutral-500 font-medium mt-1 text-center uppercase tracking-wider">
              {t("parent_portal.dashboard.attendance_rate")}
            </p>
          </div>

          {/* Remaining */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col items-center shadow-sm">
            <span className="text-2xl font-black text-neutral-900 dark:text-white">{remainingThisMonth}</span>
            <p className="text-[10px] text-neutral-500 font-medium mt-1 text-center uppercase tracking-wider">
              {t("parent_portal.dashboard.sessions_remaining")}
            </p>
          </div>
        </div>
      </section>

      {/* 5. Latest Session Summary — shows every session from the most recent completed day */}
      {lastSessionDay.length > 0 && (
        <LatestSessionSummary
          sessions={lastSessionDay}
          onSelect={(session) => {
            setSelectedEvent(session);
            setIsDetailOpen(true);
          }}
        />
      )}

      <ParentEventDetailPanel
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
