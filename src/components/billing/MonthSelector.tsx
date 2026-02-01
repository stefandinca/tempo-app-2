"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatMonth } from "@/lib/billing";

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export default function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const handlePrevMonth = () => {
    if (month === 0) {
      onChange(year - 1, 11);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onChange(year + 1, 0);
    } else {
      onChange(year, month + 1);
    }
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth();
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    onChange(now.getFullYear(), now.getMonth());
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-500" />
        </button>

        <div className="px-4 py-2 min-w-[180px] text-center">
          <span className="font-bold text-neutral-900 dark:text-white">
            {formatMonth(year, month)}
          </span>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      {!isCurrentMonth() && (
        <button
          onClick={goToCurrentMonth}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Today
        </button>
      )}
    </div>
  );
}
