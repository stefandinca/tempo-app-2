"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import NotificationItem from "./NotificationItem";
import { Bell } from "lucide-react";

export default function NotificationDropdown() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    isDropdownOpen,
    setDropdownOpen
  } = useNotifications();

  if (!isDropdownOpen) return null;

  // Show max 5 in dropdown
  const displayNotifications = notifications.slice(0, 5);

  return (
    <>
      {/* Backdrop to close dropdown on outside click */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setDropdownOpen(false)}
      />

      {/* Dropdown panel */}
      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
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
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  compact
                  onAction={() => setDropdownOpen(false)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <button
              onClick={() => {
                setDropdownOpen(false);
                router.push("/notifications");
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
