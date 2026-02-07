"use client";

import { Calendar, CheckCircle2, MessageSquare, FileText, CreditCard } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface ActivityItem {
  id: string;
  type: "session_completed" | "message" | "evaluation" | "invoice";
  text: string;
  timestamp: Date;
}

interface ActivityTimelineProps {
  sessions: any[];
  evaluations: any[];
  invoices: any[];
}

function parseDate(val: any): Date {
  if (!val) return new Date(0);
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
}

function formatRelativeTime(date: Date, t: (key: string, opts?: any) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("parent_portal.activity.just_now");
  if (diffMins < 60) return t("parent_portal.activity.mins_ago", { count: diffMins });
  if (diffHours < 24) return t("parent_portal.activity.hours_ago", { count: diffHours });
  if (diffDays < 7) return t("parent_portal.activity.days_ago", { count: diffDays });
  return date.toLocaleDateString();
}

const typeConfig = {
  session_completed: { icon: CheckCircle2, color: "text-success-500", bg: "bg-success-50 dark:bg-success-900/20" },
  message: { icon: MessageSquare, color: "text-primary-500", bg: "bg-primary-50 dark:bg-primary-900/20" },
  evaluation: { icon: FileText, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  invoice: { icon: CreditCard, color: "text-warning-500", bg: "bg-warning-50 dark:bg-warning-900/20" },
};

export default function ActivityTimeline({ sessions, evaluations, invoices }: ActivityTimelineProps) {
  const { t } = useTranslation();

  // Build activity items from data
  const activities: ActivityItem[] = [];

  // Completed sessions
  (sessions || [])
    .filter((s: any) => s.status === "completed")
    .forEach((s: any) => {
      activities.push({
        id: `sess-${s.id}`,
        type: "session_completed",
        text: t("parent_portal.activity.session_completed", { type: s.type || t("parent_portal.activity.therapy") }),
        timestamp: parseDate(s.startTime),
      });
    });

  // Evaluations
  (evaluations || []).forEach((e: any) => {
    activities.push({
      id: `eval-${e.id}`,
      type: "evaluation",
      text: t("parent_portal.activity.evaluation_added", { type: e.type || t("parent_portal.activity.evaluation") }),
      timestamp: parseDate(e.completedAt || e.createdAt),
    });
  });

  // Invoices
  (invoices || []).forEach((inv: any) => {
    activities.push({
      id: `inv-${inv.id}`,
      type: "invoice",
      text: t("parent_portal.activity.invoice_issued", { number: `${inv.series}-${inv.number}` }),
      timestamp: parseDate(inv.createdAt || inv.date),
    });
  });

  // Sort by timestamp descending, take last 5
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentActivities = activities.slice(0, 5);

  if (recentActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
        <p className="text-sm text-neutral-400">{t("parent_portal.activity.no_activity")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recentActivities.map((item, idx) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        return (
          <div key={item.id} className="flex items-start gap-3 py-2.5 px-1">
            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
              <Icon className={clsx("w-4 h-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{item.text}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{formatRelativeTime(item.timestamp, t)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
