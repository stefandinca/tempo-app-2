"use client";

import {
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  MessageSquare,
  BarChart2,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers, useClientInvoices } from "@/hooks/useCollections";
import ParentEventDetailPanel from "@/components/parent/ParentEventDetailPanel";
import ProgressRing from "@/components/parent/ProgressRing";
import ActivityTimeline from "@/components/parent/ActivityTimeline";
import { ParentAlerts } from "@/components/notifications";
import { useNotifications } from "@/context/NotificationContext";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

export default function ParentDashboard() {
  const { t, i18n } = useTranslation();
  const { unreadMessageCount } = useNotifications();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, sessions, evaluations, loading: portalLoading, error: portalError } = usePortalData();
  const { data: team } = useTeamMembers();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client?.id || "");

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [balanceDismissed, setBalanceDismissed] = useState(false);

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

  return (
    <div className="space-y-5 animate-in fade-in duration-300 font-sans pb-8">
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
              <span className="text-primary-200 text-xs">•</span>
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

      {/* 3. Status Ring Row */}
      <section className="px-4">
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {/* Progress Ring */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 min-w-[120px] sm:min-w-[130px] flex flex-col items-center shadow-sm">
            <ProgressRing value={client.progress || 0} size={48} strokeWidth={4} color="#22c55e" className="sm:hidden">
              <span className="text-[10px] font-bold text-neutral-900 dark:text-white">{client.progress || 0}%</span>
            </ProgressRing>
            <ProgressRing value={client.progress || 0} size={64} strokeWidth={5} color="#22c55e" className="hidden sm:flex">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">{client.progress || 0}%</span>
            </ProgressRing>
            <p className="text-[10px] text-neutral-500 font-medium mt-2 text-center uppercase tracking-wider">
              {t("parent_portal.dashboard.overall_progress")}
            </p>
          </div>

          {/* Attendance */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 min-w-[120px] sm:min-w-[130px] flex flex-col items-center shadow-sm">
            <ProgressRing value={attendanceRate} size={48} strokeWidth={4} color="#3b82f6" className="sm:hidden">
              <span className="text-[10px] font-bold text-neutral-900 dark:text-white">{attendanceRate}%</span>
            </ProgressRing>
            <ProgressRing value={attendanceRate} size={64} strokeWidth={5} color="#3b82f6" className="hidden sm:flex">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">{attendanceRate}%</span>
            </ProgressRing>
            <p className="text-[10px] text-neutral-500 font-medium mt-2 text-center uppercase tracking-wider">
              {t("parent_portal.dashboard.attendance")}
            </p>
          </div>

          {/* Sessions Completed */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 min-w-[120px] sm:min-w-[130px] flex flex-col items-center shadow-sm">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">{completedThisMonth.length}</span>
            </div>
            <p className="text-[10px] text-neutral-500 font-medium mt-2 text-center uppercase tracking-wider">
              {t("parent_portal.dashboard.sessions_done")}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Alerts / Push Prompt */}
      <ParentAlerts clientName={client.name} />

      {/* 5. Quick Actions */}
      <section className="px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
          {[
            { key: 'messages', href: "/parent/messages/", icon: MessageSquare, label: t("parent_portal.dashboard.quick_message"), color: "text-primary-500 bg-primary-50 dark:bg-primary-900/20" },
            { key: 'calendar', href: "/parent/calendar/", icon: Calendar, label: t("parent_portal.dashboard.quick_schedule"), color: "text-teal-500 bg-teal-50 dark:bg-teal-900/20" },
            { key: 'progress', href: "/parent/progress/", icon: BarChart2, label: t("parent_portal.dashboard.quick_progress"), color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
            { key: 'billing', href: "/parent/billing/", icon: CreditCard, label: t("parent_portal.dashboard.quick_billing"), color: "text-warning-500 bg-warning-50 dark:bg-warning-900/20" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center sm:flex-col gap-3 sm:gap-1.5 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow transition-shadow relative"
            >
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", action.color)}>
                <action.icon className="w-5 h-5" />
              </div>
              {action.key === 'messages' && unreadMessageCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-error-500 border-2 border-white dark:border-neutral-900 rounded-full" />
              )}
              <span className="text-xs sm:text-[10px] font-medium text-neutral-600 dark:text-neutral-400 leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Balance Alert Banner */}
      {displayBalance > 0 && !balanceDismissed && (
        <section className="px-4">
          <div className="bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-900/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/20 rounded-xl flex items-center justify-center text-warning-600 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-warning-800 dark:text-warning-200">
                {t("parent_portal.dashboard.balance_alert", { amount: displayBalance.toFixed(2) })}
              </p>
              <Link href="/parent/billing/" className="text-xs font-medium text-warning-600 hover:underline">
                {t("parent_portal.dashboard.view_invoices")} →
              </Link>
            </div>
            <button onClick={() => setBalanceDismissed(true)} className="p-1.5 text-warning-400 hover:text-warning-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* 6. Recent Activity Timeline */}
      <section className="px-4">
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 px-1">
          {t("parent_portal.activity.title")}
        </h2>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-3">
          <ActivityTimeline sessions={sessions} evaluations={evaluations} invoices={invoices} />
        </div>
      </section>

      <ParentEventDetailPanel
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
