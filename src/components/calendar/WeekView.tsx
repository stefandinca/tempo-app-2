"use client";

import { useMemo, useEffect, useState } from "react";
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

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  teamMembers: any[];
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date) => void;
}

export default function WeekView({ 
  currentDate, 
  events,
  teamMembers,
  onEventClick,
  onSlotClick
}: WeekViewProps) {
  
  const [now, setNow] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate days for the current week (starting Monday)
  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(start.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Generate time slots (7 AM to 8 PM)
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  // Helper to position events
  const getEventStyle = (event: Event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    // Calculate top offset (minutes from 7 AM)
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const minutesFrom7AM = (startHour - 7) * 60 + startMin;
    const top = minutesFrom7AM; // 1px per minute

    // Calculate height
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const height = durationMinutes;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Calculate current time indicator position
  const currentTimePosition = useMemo(() => {
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // Only show if between 7 AM and 9 PM (14 hours * 60 + 7*60 = 21:00)
    if (currentHour < 7 || currentHour >= 21) return null;

    const minutesFrom7AM = (currentHour - 7) * 60 + currentMin;
    return minutesFrom7AM;
  }, [now]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-neutral-900">
      {/* Header Row (Days) */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-16 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50" />
        <div className="flex flex-1">
          {weekDays.map((day) => (
            <div 
              key={day.toISOString()} 
              className={clsx(
                "flex-1 py-3 text-center border-r border-neutral-200 dark:border-neutral-800 last:border-r-0",
                isToday(day) ? "bg-primary-50 dark:bg-primary-900/20" : ""
              )}
            >
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={clsx(
                "mt-1 text-lg font-semibold inline-flex items-center justify-center w-8 h-8 rounded-full",
                isToday(day) 
                  ? "bg-primary-500 text-white" 
                  : "text-neutral-900 dark:text-white"
              )}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Scroll Area */}
      <div className="flex-1 overflow-y-auto relative" id="week-scroll-container">
        <div className="flex min-h-[840px] relative"> {/* 14 hours * 60px/hr */}
          
          {/* Time Gutter */}
          <div className="w-16 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 select-none">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] relative">
                <span className="absolute -top-2.5 right-2 text-xs text-neutral-400">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="flex flex-1 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col">
              {hours.map((hour) => (
                <div key={hour} className="h-[60px] border-b border-neutral-100 dark:border-neutral-800/50" />
              ))}
            </div>

            {/* Vertical Lines & Events */}
            {weekDays.map((day) => {
              // Filter events for this day
              const dayEvents = events.filter(evt => {
                const evtDate = new Date(evt.startTime);
                return evtDate.getDate() === day.getDate() &&
                       evtDate.getMonth() === day.getMonth() &&
                       evtDate.getFullYear() === day.getFullYear();
              });

              const isDayToday = isToday(day);

              return (
                <div 
                  key={day.toISOString()} 
                  className={clsx(
                    "flex-1 relative border-r border-neutral-200 dark:border-neutral-800 last:border-r-0",
                    isDayToday ? "bg-primary-50/20 dark:bg-primary-900/5" : ""
                  )}
                >
                  {/* Clickable Slots (background) */}
                  {hours.map((hour, i) => (
                    <div 
                      key={hour} 
                      className="absolute w-full h-[60px] hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer z-0"
                      style={{ top: i * 60 }}
                      onClick={() => {
                        const clickedDate = new Date(day);
                        clickedDate.setHours(hour);
                        onSlotClick(clickedDate);
                      }}
                    />
                  ))}

                  {/* Current Time Indicator (Only for Today's column) */}
                  {isDayToday && currentTimePosition !== null && (
                    <div 
                      className="absolute left-0 right-0 h-0.5 bg-error-500 z-20 pointer-events-none"
                      style={{ top: currentTimePosition }}
                    >
                      <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 bg-error-500 rounded-full" />
                    </div>
                  )}

                  {/* Events */}
                  {dayEvents.map(event => {
                    const style = getEventStyle(event);
                    const therapist = teamMembers.find(t => t.id === event.therapistId);
                    const color = therapist?.color || "#94a3b8";

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="absolute left-1 right-1 rounded-md p-2 border-l-4 text-xs cursor-pointer hover:brightness-95 transition-all z-10 shadow-sm overflow-hidden"
                        style={{
                          ...style,
                          backgroundColor: `${color}20`,
                          borderLeftColor: color,
                          color: "#1e293b" // Slate-800
                        }}
                      >
                        <div className="font-semibold truncate">{event.title}</div>
                        <div className="truncate opacity-80">
                          {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}