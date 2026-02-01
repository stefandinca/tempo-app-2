"use client";

import { useMemo } from "react";
import { clsx } from "clsx";

interface Event {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;
  type: string;
  therapistId: string;
  clientId: string;
  status?: string;
}

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date) => void;
}

export default function MonthView({ 
  currentDate, 
  events,
  onEventClick,
  onSlotClick
}: MonthViewProps) {
  
  // Generate days for the Month View (6 weeks grid to cover all months)
  const monthDays = useMemo(() => {
    const d = new Date(currentDate);
    const year = d.getFullYear();
    const month = d.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay() || 7; // Monday = 1
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(1 - (startDayOfWeek - 1)); // Adjust to start on Monday

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + i);
      days.push({
        date: current,
        isCurrentMonth: current.getMonth() === month,
        isToday: isSameDay(current, new Date())
      });
    }
    return days;
  }, [currentDate]);

  function isSameDay(d1: Date, d2: Date) {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(evt => isSameDay(new Date(evt.startTime), date));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 overflow-hidden">
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr">
        {monthDays.map(({ date, isCurrentMonth, isToday }) => {
          const dayEvents = getEventsForDay(date);
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const hiddenCount = dayEvents.length - maxVisible;

          return (
            <div 
              key={date.toISOString()}
              className={clsx(
                "border-b border-r border-neutral-200 dark:border-neutral-800 p-1 flex flex-col transition-colors cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                !isCurrentMonth && "bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400"
              )}
              onClick={() => onSlotClick(date)}
            >
              <div className="flex justify-end p-1">
                <span className={clsx(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  isToday 
                    ? "bg-primary-500 text-white" 
                    : isCurrentMonth ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400"
                )}>
                  {date.getDate()}
                </span>
              </div>

              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleEvents.map(evt => (
                  <div 
                    key={evt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(evt);
                    }}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-colors border-l-2",
                      evt.type.includes("ABA") ? "bg-primary-50 text-primary-700 border-primary-500 dark:bg-primary-900/30 dark:text-primary-300" :
                      evt.type.includes("Speech") ? "bg-purple-50 text-purple-700 border-purple-500 dark:bg-purple-900/30 dark:text-purple-300" :
                      "bg-neutral-100 text-neutral-700 border-neutral-400 dark:bg-neutral-800 dark:text-neutral-300"
                    )}
                  >
                    {new Date(evt.startTime).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} {evt.title}
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <div className="text-[10px] text-neutral-500 px-1">
                    +{hiddenCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
