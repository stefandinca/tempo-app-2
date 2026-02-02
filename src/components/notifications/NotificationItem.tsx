"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle,
  Users,
  CreditCard,
  User,
  AlertTriangle
} from "lucide-react";
import {
  Notification,
  CATEGORY_META,
  formatRelativeTime
} from "@/types/notifications";
import { useNotifications } from "@/context/NotificationContext";

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onAction?: () => void;
}

const categoryIcons = {
  schedule: Calendar,
  attendance: CheckCircle,
  team: Users,
  billing: CreditCard,
  client: User,
  system: AlertTriangle
};

export default function NotificationItem({
  notification,
  compact = false,
  onAction
}: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead } = useNotifications();
  const meta = CATEGORY_META[notification.category];
  const Icon = categoryIcons[notification.category];

  const handleClick = async () => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Execute primary action (navigate)
    const primaryAction = notification.actions?.[0];
    if (primaryAction?.type === "navigate" && primaryAction.route) {
      router.push(primaryAction.route);
    }

    // Callback to close dropdown
    onAction?.();
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 cursor-pointer transition-colors
        hover:bg-neutral-50 dark:hover:bg-neutral-800/50
        ${compact ? "p-3" : "p-4"}
        ${!notification.read ? "bg-primary-50/50 dark:bg-primary-900/10" : ""}
      `}
    >
      {/* Category indicator dot */}
      <div className="flex-shrink-0 mt-1">
        {notification.read ? (
          <div
            className={`w-2.5 h-2.5 rounded-full border-2 ${meta.color.replace(
              "text-",
              "border-"
            )}`}
          />
        ) : (
          <div
            className={`w-2.5 h-2.5 rounded-full ${meta.color.replace(
              "text-",
              "bg-"
            )}`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`font-medium text-neutral-900 dark:text-white ${
              compact ? "text-sm" : "text-sm"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p
          className={`text-neutral-500 dark:text-neutral-400 mt-0.5 ${
            compact ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
          }`}
        >
          {notification.message}
        </p>

        {/* Action button (non-compact mode) */}
        {!compact && notification.actions?.[0] && (
          <button
            className={`mt-2 text-xs font-medium ${meta.color} hover:underline`}
          >
            {notification.actions[0].label}
          </button>
        )}
      </div>
    </div>
  );
}
