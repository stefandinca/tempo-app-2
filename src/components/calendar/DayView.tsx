"use client";

import { useMemo, useEffect, useState } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { calculateEventColumns, getEventsForDay, type CalendarEvent, type EventWithPosition } from "@/lib/calendarUtils";

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

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  teamMembers: any[];
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date) => void;
}

export default function DayView({
  currentDate,
  events,
  teamMembers,
  onEventClick,
  onSlotClick
}: DayViewProps) {
  
  const { i18n } = useTranslation();
  const locale = i18n.language || 'ro';
  const [now, setNow] = useState(new Date());

  // Format hour based on locale (24h for ro, 12h for en)
  const formatHour = (hour: number) => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: undefined });
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate time slots (7 AM to 8 PM)
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  // Helper to calculate vertical position (top and height)
  const getEventVerticalStyle = (event: Event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const minutesFrom7AM = (startHour - 7) * 60 + startMin;
    const top = minutesFrom7AM;
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const height = durationMinutes;

    return { top: `${top}px`, height: `${height}px` };
  };

  // Helper to calculate horizontal position (left and width) for overlapping events
  const getEventHorizontalStyle = (event: EventWithPosition) => {
    const { column, totalColumns } = event;
    const widthPercent = 100 / totalColumns;
    const leftPercent = column * widthPercent;
    const gap = 8; // pixels gap between columns (larger for day view)

    return {
      left: `calc(${leftPercent}% + ${gap}px)`,
      width: `calc(${widthPercent}% - ${gap * 2}px)`,
    };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Filter events for the current day and calculate column positions
  const positionedEvents = useMemo(() => {
    const dayEvents = getEventsForDay(events as CalendarEvent[], currentDate);
    return calculateEventColumns(dayEvents);
  }, [currentDate, events]);

  // Calculate current time indicator position
  const currentTimePosition = useMemo(() => {
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    if (currentHour < 7 || currentHour >= 21) return null;

    const minutesFrom7AM = (currentHour - 7) * 60 + currentMin;
    return minutesFrom7AM;
  }, [now]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-neutral-900">
      
      {/* Header */}
      <div className="flex h-20 border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-16 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-neutral-500 uppercase">
            {currentDate.toLocaleDateString(locale, { weekday: 'long' })}
          </div>
          <div className={clsx(
            "text-3xl font-bold mt-1",
            isToday(currentDate) ? "text-primary-500" : "text-neutral-900 dark:text-white"
          )}>
            {currentDate.getDate()}
          </div>
        </div>
      </div>

      {/* Grid Scroll Area */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-h-[840px] relative">
          
          {/* Time Gutter */}
          <div className="w-16 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 select-none">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] relative">
                <span className="absolute -top-2.5 right-2 text-xs text-neutral-400">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day Column */}
          <div className="flex-1 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col">
              {hours.map((hour) => (
                <div key={hour} className="h-[60px] border-b border-neutral-100 dark:border-neutral-800/50" />
              ))}
            </div>

            {/* Current Time Indicator */}
            {isToday(currentDate) && currentTimePosition !== null && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-error-500 z-20 pointer-events-none"
                style={{ top: currentTimePosition }}
              >
                <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 bg-error-500 rounded-full" />
              </div>
            )}

            {/* Clickable Slots */}
            {hours.map((hour, i) => (
              <div 
                key={hour} 
                className="absolute w-full h-[60px] hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer z-0"
                style={{ top: i * 60 }}
                onClick={() => {
                  const clickedDate = new Date(currentDate);
                  clickedDate.setHours(hour);
                  onSlotClick(clickedDate);
                }}
              />
            ))}

            {/* Events */}
            {positionedEvents.map(event => {
              const verticalStyle = getEventVerticalStyle(event);
              const horizontalStyle = getEventHorizontalStyle(event);
              const therapist = teamMembers.find(t => t.id === event.therapistId);
              const color = therapist?.color || "#94a3b8";

              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className="absolute rounded-lg p-2 border-l-4 cursor-pointer hover:brightness-95 transition-all z-10 shadow-sm overflow-hidden"
                  style={{
                    ...verticalStyle,
                    ...horizontalStyle,
                    backgroundColor: `${color}20`,
                    borderLeftColor: color,
                    color: "#1e293b" // Slate-800
                  }}
                >
                  <div className="font-semibold text-sm truncate">{event.title}</div>
                  <div className="text-xs opacity-80 truncate">
                    {new Date(event.startTime).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})} - {new Date(event.endTime).toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}