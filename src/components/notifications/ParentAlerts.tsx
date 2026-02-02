"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  ChevronRight,
  Bell
} from "lucide-react";
import { Notification, CATEGORY_META, formatRelativeTime } from "@/types/notifications";

interface ParentAlertsProps {
  clientName?: string;
}

// Parent-appropriate mock alerts (in production, these would come from a parent-specific notification context)
const parentAlertsMock: Notification[] = [
  {
    id: "parent-1",
    recipientId: "parent",
    recipientRole: "parent",
    type: "schedule_updated",
    category: "schedule",
    title: "Schedule Change",
    message: "Tomorrow's session has been moved to 10:30 AM",
    createdAt: new Date().toISOString(),
    read: false,
    sourceType: "event",
    actions: [{ label: "View Schedule", type: "navigate", route: "/parent/schedule/" }]
  },
  {
    id: "parent-2",
    recipientId: "parent",
    recipientRole: "parent",
    type: "attendance_logged",
    category: "attendance",
    title: "Session Summary",
    message: "Great session today! Attendance: Present, Progress: Excellent",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: false,
    sourceType: "event",
    actions: [{ label: "View Progress", type: "navigate", route: "/parent/progress/" }]
  },
  {
    id: "parent-3",
    recipientId: "parent",
    recipientRole: "parent",
    type: "billing_generated",
    category: "billing",
    title: "Invoice Ready",
    message: "Your February invoice is now available",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    sourceType: "billing",
    actions: [{ label: "View Invoice", type: "navigate", route: "/parent/billing/" }]
  }
];

const categoryIcons = {
  schedule: Calendar,
  attendance: CheckCircle,
  billing: CreditCard,
  client: FileText,
  team: FileText,
  system: Bell
};

export default function ParentAlerts({ clientName }: ParentAlertsProps) {
  // Show max 3 alerts
  const alerts = useMemo(() => parentAlertsMock.slice(0, 3), []);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-neutral-900 dark:text-white">Recent Alerts</h3>
        <Link
          href="/parent/schedule/"
          className="text-sm font-bold text-primary-600 hover:text-primary-700 dark:hover:text-primary-400"
        >
          View All
        </Link>
      </div>

      <div className="space-y-3 pb-8">
        {alerts.map((alert) => {
          const Icon = categoryIcons[alert.category] || Bell;
          const meta = CATEGORY_META[alert.category];
          const actionRoute = alert.actions?.[0]?.route || "/parent/schedule/";

          return (
            <Link
              key={alert.id}
              href={actionRoute}
              className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-start gap-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors group"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bgColor}`}
              >
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {alert.title}
                  </p>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                    {formatRelativeTime(alert.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 line-clamp-2">{alert.message}</p>
                {alert.actions?.[0] && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 group-hover:underline">
                    {alert.actions[0].label}
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
