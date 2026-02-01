"use client";

import { useMemo, useEffect, useState } from "react";
import { clsx } from "clsx";

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
  onEventClick: (event: Event) => void;
  onSlotClick: (date: Date) => void;
}

export default function DayView({ 
  currentDate, 
  events,
  onEventClick,
  onSlotClick
}: DayViewProps) {
  
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate time slots (7 AM to 8 PM)
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  // Helper to position events (Same as WeekView)
  const getEventStyle = (event: Event) => {
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const dayEvents = useMemo(() => {
    return events.filter(evt => {
      const evtDate = new Date(evt.startTime);
      return evtDate.getDate() === currentDate.getDate() &&
             evtDate.getMonth() === currentDate.getMonth() &&
             evtDate.getFullYear() === currentDate.getFullYear();
    });
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
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
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
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
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
            {dayEvents.map(event => {
              const style = getEventStyle(event);
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className={clsx(
                    "absolute left-4 right-4 rounded-xl p-4 border-l-4 cursor-pointer hover:brightness-95 transition-all z-10 shadow-sm overflow-hidden",
                    event.type.includes("ABA") ? "bg-primary-100 border-primary-500 text-primary-900 dark:bg-primary-900/50 dark:text-primary-100" :
                    event.type.includes("Speech") ? "bg-purple-100 border-purple-500 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100" :
                    "bg-neutral-100 border-neutral-500 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  )}
                  style={style}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{event.title}</div>
                      <div className="opacity-80 mt-1">
                        {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(event.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    {/* Could add therapist avatar here if needed */}
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