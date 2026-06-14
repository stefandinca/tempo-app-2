"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useInvoicesByMonth, useEventsByMonth } from "@/hooks/useCollections";
import { useRecentActivities } from "@/hooks/useActivities";
import { formatUsd } from "@/lib/assistant/pricing";
import { useTranslation } from "react-i18next";
import { Users, UserCircle, CalendarCheck, Sparkles, Banknote, Activity, ChevronRight, TrendingUp } from "lucide-react";

const ronFmt = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 });

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>{icon}</div>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SuperadminPage() {
  const { userRole } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("ro") ? "ro" : "en";
  const { clients, teamMembers } = useData();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();

  const { data: monthInvoices } = useInvoicesByMonth(year, month);
  const { data: monthEvents } = useEventsByMonth(year, month);
  const { activities } = useRecentActivities(10);

  const [aiConvCost, setAiConvCost] = useState(0);
  const [aiConvCount, setAiConvCount] = useState(0);
  const [aiConvTokens, setAiConvTokens] = useState(0);
  const [aiEventCost, setAiEventCost] = useState(0);

  useEffect(() => {
    if (userRole !== "Superadmin") return;
    const unsubConv = onSnapshot(
      query(collection(db, "ai_conversations"), orderBy("lastMessageAt", "desc"), limit(500)),
      (snap) => {
        let cost = 0, tokens = 0;
        snap.forEach((d) => {
          const c = d.data() as any;
          cost += c.costUsd || 0;
          tokens += (c.inputTokens || 0) + (c.outputTokens || 0) + (c.cacheReadTokens || 0) + (c.cacheWriteTokens || 0);
        });
        setAiConvCost(cost);
        setAiConvTokens(tokens);
        setAiConvCount(snap.size);
      },
      () => {},
    );
    const unsubEvents = onSnapshot(
      query(collection(db, "ai_usage_events"), orderBy("createdAt", "desc"), limit(500)),
      (snap) => {
        let cost = 0;
        snap.forEach((d) => (cost += (d.data() as any).costUsd || 0));
        setAiEventCost(cost);
      },
      () => {},
    );
    return () => { unsubConv(); unsubEvents(); };
  }, [userRole]);

  const estRecurring = useMemo(
    () => clients.data.reduce((s: number, c: any) => s + (c.hasActiveSubscription ? c.subscriptionPrice || 0 : 0), 0),
    [clients.data],
  );
  const invoicedThisMonth = useMemo(() => monthInvoices.reduce((s: number, i: any) => s + (i.total || 0), 0), [monthInvoices]);
  const collectedThisMonth = useMemo(
    () => monthInvoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total || 0), 0),
    [monthInvoices],
  );

  const sessionStats = useMemo(() => {
    const withAttendance = monthEvents.filter((e: any) => e.attendance);
    const present = withAttendance.filter((e: any) => e.attendance === "present").length;
    const rate = withAttendance.length ? Math.round((present / withAttendance.length) * 100) : 0;
    return { total: monthEvents.length, present, rate };
  }, [monthEvents]);

  const aiTotal = aiConvCost + aiEventCost;
  const monthLabel = now.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { month: "long", year: "numeric" });

  const fmtRelative = (iso?: string) => {
    if (!iso) return "";
    const diff = now.getTime() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return t("superadmin.just_now", { defaultValue: "just now" });
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.round(hrs / 24)}d`;
  };

  if (userRole !== "Superadmin") {
    return <div className="p-6 text-sm text-neutral-500">{t("superadmin.forbidden", { defaultValue: "Only a Superadmin can view this page." })}</div>;
  }

  return (
    <main className="p-4 lg:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary-500" />
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t("superadmin.title", { defaultValue: "Superadmin overview" })}</h1>
      </div>
      <p className="text-sm text-neutral-500 mb-5">{t("superadmin.subtitle", { defaultValue: "Key metrics for the clinic" })} · {monthLabel}</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard icon={<Users className="w-4 h-4" />} accent="bg-primary-100 dark:bg-primary-900/30 text-primary-600"
          label={t("superadmin.clients", { defaultValue: "Clients" })} value={String(clients.data.length)} />
        <StatCard icon={<UserCircle className="w-4 h-4" />} accent="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          label={t("superadmin.team", { defaultValue: "Team members" })} value={String(teamMembers.data.length)} />
        <StatCard icon={<Banknote className="w-4 h-4" />} accent="bg-success-100 dark:bg-success-900/30 text-success-600"
          label={t("superadmin.est_recurring", { defaultValue: "Est. recurring / month" })} value={ronFmt.format(estRecurring)}
          sub={t("superadmin.est_recurring_sub", { defaultValue: "active subscriptions" })} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} accent="bg-success-100 dark:bg-success-900/30 text-success-600"
          label={t("superadmin.invoiced_month", { defaultValue: "Invoiced this month" })} value={ronFmt.format(invoicedThisMonth)}
          sub={`${ronFmt.format(collectedThisMonth)} ${t("superadmin.collected", { defaultValue: "collected" })}`} />
        <StatCard icon={<CalendarCheck className="w-4 h-4" />} accent="bg-warning-100 dark:bg-warning-900/30 text-warning-600"
          label={t("superadmin.sessions_month", { defaultValue: "Sessions this month" })} value={String(sessionStats.total)}
          sub={`${sessionStats.rate}% ${t("superadmin.attendance", { defaultValue: "attendance" })}`} />
        <StatCard icon={<Sparkles className="w-4 h-4" />} accent="bg-primary-100 dark:bg-primary-900/30 text-primary-600"
          label={t("superadmin.ai_cost", { defaultValue: "AI cost (total)" })} value={formatUsd(aiTotal)}
          sub={`${aiConvCount} ${t("superadmin.conversations", { defaultValue: "conversations" })}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI usage panel */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              {t("superadmin.ai_usage", { defaultValue: "AI usage" })}
            </h2>
            <Link href="/ai-usage/" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
              {t("superadmin.view_details", { defaultValue: "Details" })}<ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{formatUsd(aiTotal)}</p>
              <p className="text-[11px] text-neutral-400">{t("superadmin.total_cost", { defaultValue: "Total cost" })}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{aiConvTokens.toLocaleString()}</p>
              <p className="text-[11px] text-neutral-400">{t("superadmin.tokens", { defaultValue: "Tokens" })}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{aiConvCount}</p>
              <p className="text-[11px] text-neutral-400">{t("superadmin.conversations", { defaultValue: "Conversations" })}</p>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h2 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary-500" />
            {t("superadmin.recent_activity", { defaultValue: "Recent activity" })}
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-neutral-400">{t("superadmin.no_activity", { defaultValue: "No recent activity." })}</p>
          ) : (
            <div className="space-y-2.5">
              {activities.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                  <span className="text-neutral-700 dark:text-neutral-300 truncate">
                    <span className="font-medium">{a.userName || "—"}</span>
                    {a.targetName ? <span className="text-neutral-400"> · {a.targetName}</span> : null}
                  </span>
                  <span className="ml-auto text-[11px] text-neutral-400 shrink-0">{fmtRelative(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mt-5">
        {[
          { href: "/analytics/", label: t("nav.analytics", { defaultValue: "Analytics" }) },
          { href: "/billing/", label: t("nav.billing", { defaultValue: "Billing" }) },
          { href: "/ai-usage/", label: t("nav.ai_usage", { defaultValue: "AI Usage" }) },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
