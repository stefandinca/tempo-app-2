"use client";

import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { clsx } from "clsx";

type ViewType = 'month' | 'week' | 'day';

interface CalendarToolbarProps {
  currentDate: Date;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onDateChange: (date: Date) => void;
  onToday: () => void;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

export default function CalendarToolbar({
  currentDate,
  currentView,
  onViewChange,
  onDateChange,
  onToday,
  onToggleFilters,
  activeFilterCount
}: CalendarToolbarProps) {
  
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const multiplier = direction === 'next' ? 1 : -1;

    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + multiplier);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (7 * multiplier));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + multiplier);
        break;
    }
    onDateChange(newDate);
  };

  const getLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    if (currentView === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      start.setDate(diff);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      if (start.getMonth() !== end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      }
    }
    if (currentView === 'day') {
       return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  return (
    <div className="sticky top-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 z-10 px-4 lg:px-6 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onToday}
            className="px-3 py-1.5 text-sm font-medium border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
          >
            Today
          </button>
          <div className="flex items-center">
            <button 
              onClick={() => navigate('prev')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('next')}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white ml-2">
            {getLabel()}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            {['month', 'week', 'day'].map((view) => (
              <button
                key={view}
                onClick={() => onViewChange(view as ViewType)}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                  currentView === view
                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                )}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Filter Button */}
          <button
            onClick={onToggleFilters}
            className={clsx(
              "p-2 rounded-lg transition-colors relative",
              activeFilterCount > 0 
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            )}
          >
            <Filter className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white dark:border-neutral-900" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}