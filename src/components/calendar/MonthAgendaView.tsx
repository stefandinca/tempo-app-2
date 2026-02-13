"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { getEventsForDay, type CalendarEvent } from "@/lib/calendarUtils";
import { Users, Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  startTime: string; 
  endTime: string;
  type: string;
  therapistId: string;
  clientId: string;
  status?: string;
}

interface MonthAgendaViewProps {
  currentDate: Date;
  events: Event[];
  teamMembers: any[];
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date) => void;
  onDateChange: (date: Date) => void;
}

export default function MonthAgendaView({ 
  currentDate, 
  events,
  teamMembers,
  onEventClick,
  onSlotClick,
  onDateChange
}: MonthAgendaViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'ro';
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate days for the current month centered around currentDate
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        date,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, currentDate)
      };
    });
  }, [currentDate]);

  function isSameDay(d1: Date, d2: Date) {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  // Scroll active date into view
  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentDate]);

  const dayEvents = useMemo(() => {
    return getEventsForDay(events as CalendarEvent[], currentDate).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events, currentDate]);

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      
      {/* Date Strip */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-4 px-2">
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-2"
        >
          {days.map(({ date, isToday, isSelected }) => (
            <button
              key={date.toISOString()}
              data-selected={isSelected}
              onClick={() => onDateChange(date)}
              className={clsx(
                "flex flex-col items-center justify-center min-w-[56px] h-20 rounded-2xl transition-all shrink-0 border",
                isSelected 
                  ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105" 
                  : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
              )}
            >
              <span className={clsx(
                "text-[10px] font-bold uppercase tracking-wider mb-1",
                isSelected ? "text-primary-100" : "text-neutral-400"
              )}>
                {date.toLocaleDateString(locale, { weekday: 'short' })}
              </span>
              <span className="text-xl font-bold">{date.getDate()}</span>
              {isToday && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-primary-500 mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Agenda List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-neutral-900 dark:text-white">
            {currentDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
          </h3>
          <span className="text-xs font-medium text-neutral-500">
            {dayEvents.length} {t('dashboard.sessions_today')}
          </span>
        </div>

        {dayEvents.length > 0 ? (
          dayEvents.map((event) => {
            const therapist = teamMembers.find(t => t.id === event.therapistId);
            const color = therapist?.color || "#94a3b8";
            
            return (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-1 bg-primary-500 rounded-full self-stretch" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-neutral-900 dark:text-white truncate">
                        {event.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold uppercase">
                        {event.type}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(event.startTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {therapist?.initials || "??"}
                        </div>
                        <span>{therapist?.name || t('common.unknown')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-neutral-300" />
            </div>
            <p className="text-neutral-500 font-medium">{t('dashboard.schedule.no_sessions')}</p>
            <button 
              onClick={() => onSlotClick(currentDate)}
              className="mt-4 text-primary-600 font-bold text-sm"
            >
              + {t('command_palette.actions.new_event.label')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
