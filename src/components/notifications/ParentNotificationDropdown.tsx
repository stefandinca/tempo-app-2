"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { Bell, Calendar, CheckCircle, CreditCard, FileText, ChevronRight, MessageSquare } from "lucide-react";
import { CATEGORY_META, formatRelativeTime } from "@/types/notifications";

interface ParentNotificationDropdownProps {
  desktop?: boolean;
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

export default function ParentNotificationDropdown({ desktop = false }: ParentNotificationDropdownProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    isDropdownOpen,
    setDropdownOpen
  } = useNotifications();

  if (!isDropdownOpen) return null;

  // Show max 5 in dropdown
  const displayNotifications = notifications.slice(0, 5);

  // Handle notification click
  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to appropriate parent portal page
    const primaryAction = notification.actions?.[0];
    if (primaryAction?.type === "navigate" && primaryAction.route) {
      router.push(primaryAction.route);
    }

    setDropdownOpen(false);
  };

  // Position classes based on desktop/mobile
  const positionClasses = desktop
    ? "absolute left-full bottom-0 ml-2 w-80"
    : "absolute right-0 top-full mt-2 w-80 sm:w-96";

  return (
    <>
      {/* Backdrop to close dropdown on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setDropdownOpen(false)}
      />

      {/* Dropdown panel */}
      <div className={`${positionClasses} bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              className="text-xs font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400 dark:text-neutral-500">
              <Bell className="w-8 h-8 mb-2" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You&apos;ll see updates about schedules and billing here</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {displayNotifications.map((notification) => {
                const Icon = categoryIcons[notification.category] || Bell;
                const meta = CATEGORY_META[notification.category];

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      p-3 cursor-pointer transition-colors
                      hover:bg-neutral-50 dark:hover:bg-neutral-800/50
                      ${!notification.read ? "bg-primary-50/50 dark:bg-primary-900/10" : ""}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bgColor}`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-neutral-900 dark:text-white">
                            {notification.title}
                          </p>
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex-shrink-0">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.actions?.[0] && (
                          <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                            {notification.actions[0].label}
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 5 && (
          <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <button
              onClick={() => {
                setDropdownOpen(false);
                router.push("/parent/notifications/");
              }}
              className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
            >
              View All Notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
}
