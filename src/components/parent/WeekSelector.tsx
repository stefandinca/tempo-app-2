"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface WeekSelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  sessionDates: Set<string>; // Set of ISO date strings (YYYY-MM-DD) that have sessions
  currentLang: string;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WeekSelector({ selectedDate, onSelectDate, sessionDates, currentLang }: WeekSelectorProps) {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    onSelectDate(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    onSelectDate(d);
  };

  const goToToday = () => onSelectDate(new Date());

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-neutral-500" />
        </button>
        <button
          onClick={goToToday}
          className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-primary-600 transition-colors"
        >
          {weekStart.toLocaleDateString(currentLang, { month: "long", year: "numeric" })}
        </button>
        <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      {/* Day chips */}
      <div className="flex gap-1.5">
        {weekDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const hasSession = sessionDates.has(toDateKey(day));

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={clsx(
                "flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all relative",
                isSelected
                  ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                  : isToday
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {day.toLocaleDateString(currentLang, { weekday: "short" }).slice(0, 2)}
              </span>
              <span className={clsx("text-sm font-bold mt-0.5", isSelected ? "text-white" : "text-neutral-900 dark:text-white")}>
                {day.getDate()}
              </span>
              {hasSession && (
                <div
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full mt-1",
                    isSelected ? "bg-white" : "bg-primary-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
