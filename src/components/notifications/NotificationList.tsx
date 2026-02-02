"use client";

import { useNotifications, GroupedNotifications } from "@/context/NotificationContext";
import { Notification } from "@/types/notifications";
import NotificationItem from "./NotificationItem";
import { Bell } from "lucide-react";

interface NotificationListProps {
  notifications: Notification[];
  compact?: boolean;
  showDateGroups?: boolean;
  onItemAction?: () => void;
  emptyMessage?: string;
}

interface DateGroupProps {
  title: string;
  notifications: Notification[];
  compact: boolean;
  onItemAction?: () => void;
}

function DateGroup({ title, notifications, compact, onItemAction }: DateGroupProps) {
  if (notifications.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 sticky top-0 z-10">
        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            compact={compact}
            onAction={onItemAction}
          />
        ))}
      </div>
    </div>
  );
}

export default function NotificationList({
  notifications,
  compact = false,
  showDateGroups = true,
  onItemAction,
  emptyMessage = "No notifications"
}: NotificationListProps) {
  const { getGroupedNotifications, loading } = useNotifications();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
        <Bell className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  if (!showDateGroups) {
    return (
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            compact={compact}
            onAction={onItemAction}
          />
        ))}
      </div>
    );
  }

  const grouped = getGroupedNotifications(notifications);

  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      <DateGroup
        title="Today"
        notifications={grouped.today}
        compact={compact}
        onItemAction={onItemAction}
      />
      <DateGroup
        title="Yesterday"
        notifications={grouped.yesterday}
        compact={compact}
        onItemAction={onItemAction}
      />
      <DateGroup
        title="This Week"
        notifications={grouped.thisWeek}
        compact={compact}
        onItemAction={onItemAction}
      />
      <DateGroup
        title="Older"
        notifications={grouped.older}
        compact={compact}
        onItemAction={onItemAction}
      />
    </div>
  );
}
