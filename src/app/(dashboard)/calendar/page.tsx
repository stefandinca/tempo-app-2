"use client";

import { useState, useMemo } from "react";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import DayView from "@/components/calendar/DayView";
import FilterPanel, { FilterState } from "@/components/calendar/FilterPanel";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import { useEvents } from "@/hooks/useCollections";
import { Loader2 } from "lucide-react";
import { useEventModal } from "@/context/EventModalContext";

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Selected Event state for Detail Panel
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const { openModal } = useEventModal();
  
  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    therapists: [],
    clients: [],
    eventTypes: []
  });

  // Data Fetching
  const { data: events, loading } = useEvents();

  // Filter Logic
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    return events.filter(event => {
      // 1. Therapist Filter
      if (filters.therapists.length > 0 && !filters.therapists.includes(event.therapistId)) {
        return false;
      }
      
      // 2. Client Filter
      if (filters.clients.length > 0 && !filters.clients.includes(event.clientId)) {
        return false;
      }

      // 3. Event Type Filter
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) {
        return false;
      }

      return true;
    });
  }, [events, filters]);

  const activeFilterCount = filters.therapists.length + filters.clients.length + filters.eventTypes.length;

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const handleSlotClick = (date: Date) => {
    const timeString = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    openModal({ date, time: timeString });
  };

  // Helper to switch to day view when clicking a month cell
  const handleMonthSlotClick = (date: Date) => {
    setCurrentDate(date);
    setCurrentView('day');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <CalendarToolbar 
        currentDate={currentDate}
        currentView={currentView}
        onViewChange={setCurrentView}
        onDateChange={setCurrentDate}
        onToday={() => setCurrentDate(new Date())}
        onToggleFilters={() => setIsFilterOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      <FilterPanel 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Event Detail Panel */}
      <EventDetailPanel 
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-900/50 z-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {currentView === 'week' && (
          <WeekView 
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}

        {currentView === 'month' && (
          <MonthView 
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            onSlotClick={handleMonthSlotClick}
          />
        )}

        {currentView === 'day' && (
          <DayView 
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>
    </div>
  );
}
