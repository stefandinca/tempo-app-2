"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  ChevronRight,
  Bell,
  MessageSquare
} from "lucide-react";
import { CATEGORY_META, formatRelativeTime } from "@/types/notifications";
import { useNotifications } from "@/context/NotificationContext";
import { useAnyAuth } from "@/hooks/useAnyAuth";

interface ParentAlertsProps {
  clientName?: string;
}

const categoryIcons = {
  schedule: Calendar,
  attendance: CheckCircle,
  billing: CreditCard,
  client: FileText,
  team: FileText,
  system: Bell,
  message: MessageSquare
};

export default function ParentAlerts({ clientName }: ParentAlertsProps) {
  const { notifications, loading, markAsRead, requestPushPermission, pushPermissionStatus, pushError } = useNotifications();
  const { user } = useAnyAuth();

  // Show max 3 alerts
  const alerts = useMemo(() => notifications.slice(0, 3), [notifications]);
  
// ... existing code ...

  const pushNotificationPrompt = (
    <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100 dark:border-primary-800 flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">Enable Push Notifications</p>
          <p className="text-xs text-neutral-500">Get real-time updates for sessions and messages</p>
          {pushError && <p className="text-xs text-error-500 font-bold mt-1">Error: {pushError}</p>}
        </div>
      </div>
      <button 
        onClick={requestPushPermission}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
      >
        {pushPermissionStatus === 'granted' ? 'Sync' : 'Enable'}
      </button>
    </div>
  );

  if (alerts.length === 0) {
    return (
      <section className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white">Recent Alerts</h3>
        </div>
        {pushPermissionStatus !== 'granted' && pushNotificationPrompt}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center">
          <Bell className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No notifications yet</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            You&apos;ll see updates about sessions and messages here
          </p>
        </div>
      </section>
    );
  }

  const handleAlertClick = async (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert && !alert.read) {
      await markAsRead(alertId);
    }
  };

  return (
    <section className="px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-neutral-900 dark:text-white">Recent Alerts</h3>
        <Link
          href="/parent/calendar/"
          className="text-sm font-bold text-primary-600 hover:text-primary-700 dark:hover:text-primary-400"
        >
          View All
        </Link>
      </div>

      {pushPermissionStatus !== 'granted' && pushNotificationPrompt}

      <div className="space-y-3 pb-8">
        {alerts.map((alert) => {
          const Icon = categoryIcons[alert.category] || Bell;
          const meta = CATEGORY_META[alert.category];
          const actionRoute = alert.actions?.[0]?.route || "/parent/calendar/";

          return (
            <Link
              key={alert.id}
              href={actionRoute}
              onClick={() => handleAlertClick(alert.id)}
              className={`
                bg-white dark:bg-neutral-900 p-4 rounded-2xl border shadow-sm flex items-start gap-4
                hover:border-primary-200 dark:hover:border-primary-800 transition-colors group
                ${!alert.read
                  ? "border-primary-200 dark:border-primary-800/50 bg-primary-50/30 dark:bg-primary-900/10"
                  : "border-neutral-200 dark:border-neutral-800"
                }
              `}
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
