"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

interface ParentNotificationBellProps {
  desktop?: boolean;
}

export default function ParentNotificationBell({ desktop = false }: ParentNotificationBellProps) {
  const { unreadCount, isDropdownOpen, setDropdownOpen } = useNotifications();

  // Format badge text
  const getBadgeText = () => {
    if (unreadCount === 0) return null;
    if (unreadCount > 99) return "99+";
    if (unreadCount > 9) return "9+";
    return unreadCount.toString();
  };

  const badgeText = getBadgeText();

  if (desktop) {
    return (
      <button
        onClick={() => setDropdownOpen(!isDropdownOpen)}
        className={`
          p-3 rounded-2xl transition-all group relative
          ${isDropdownOpen
            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
            : "text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
          }
        `}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-6 h-6" />

        {/* Badge */}
        {badgeText && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-error-500 text-white text-[10px] font-bold rounded-full px-1 animate-in zoom-in-50 duration-200">
            {badgeText}
          </span>
        )}

        {/* Tooltip */}
        <span className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          Notifications
        </span>
      </button>
    );
  }

  // Mobile version
  return (
    <button
      onClick={() => setDropdownOpen(!isDropdownOpen)}
      className={`
        p-2 rounded-lg transition-colors relative
        ${isDropdownOpen
          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }
      `}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="w-5 h-5" />

      {/* Badge */}
      {badgeText && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-error-500 text-white text-xs font-medium rounded-full px-1 animate-in zoom-in-50 duration-200">
          {badgeText}
        </span>
      )}
    </button>
  );
}
