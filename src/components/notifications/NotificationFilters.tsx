"use client";

import { useNotifications } from "@/context/NotificationContext";
import { NotificationCategory, CATEGORY_META } from "@/types/notifications";
import { clsx } from "clsx";

export type FilterCategory = NotificationCategory | "all" | "unread";

interface NotificationFiltersProps {
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
}

const filterOptions: { id: FilterCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "schedule", label: "Schedule" },
  { id: "attendance", label: "Attendance" },
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing" },
  { id: "client", label: "Client" }
];

export default function NotificationFilters({
  activeFilter,
  onFilterChange
}: NotificationFiltersProps) {
  const { getCategoryCount } = useNotifications();

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 min-w-max pb-2">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.id;
          const count = getCategoryCount(option.id);
          const showCount = option.id === "all" || option.id === "unread";

          return (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              )}
            >
              {option.label}
              {showCount && count > 0 && (
                <span
                  className={clsx(
                    "px-1.5 py-0.5 text-xs rounded-full min-w-[20px] text-center",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
