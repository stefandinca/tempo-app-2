"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

export default function NotificationBell() {
  const { unreadCount, isDropdownOpen, setDropdownOpen } = useNotifications();

  // Format badge text
  const getBadgeText = () => {
    if (unreadCount === 0) return null;
    if (unreadCount > 99) return "99+";
    if (unreadCount > 9) return "9+";
    return unreadCount.toString();
  };

  const badgeText = getBadgeText();

  return (
    <button
      onClick={() => setDropdownOpen(!isDropdownOpen)}
      className={`
        p-2 rounded-lg transition-colors relative
        ${
          isDropdownOpen
            ? "bg-neutral-100 dark:bg-neutral-800"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }
      `}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell
        className={`w-5 h-5 ${
          isDropdownOpen
            ? "text-neutral-900 dark:text-white"
            : "text-neutral-600 dark:text-neutral-400"
        }`}
      />

      {/* Badge */}
      {badgeText && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-error-500 text-white text-xs font-medium rounded-full px-1 animate-in zoom-in-50 duration-200">
          {badgeText}
        </span>
      )}
    </button>
  );
}
