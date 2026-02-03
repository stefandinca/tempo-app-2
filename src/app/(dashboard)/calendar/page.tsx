"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import DayView from "@/components/calendar/DayView";
import FilterPanel, { FilterState } from "@/components/calendar/FilterPanel";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import { useData } from "@/context/DataContext";
import { CalendarEventSkeleton } from "@/components/ui/Skeleton";
import { Loader2 } from "lucide-react";
import { useEventModal } from "@/context/EventModalContext";
import { useAuth } from "@/context/AuthContext";

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Selected Event state for Detail Panel
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { openModal } = useEventModal();
  const { user } = useAuth();

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    therapists: [],
    clients: [],
    eventTypes: []
  });

  // Track if we've initialized the default filter
  const hasInitializedFilter = useRef(false);

  // Data from shared context
  const { events, teamMembers } = useData();
  const loading = events.loading || teamMembers.loading;

  // Set default filter to show only current user's events (if they have any)
  useEffect(() => {
    if (hasInitializedFilter.current) return;
    if (!user || !events.data || events.loading) return;

    // Check if current user has any assigned events
    const userEvents = events.data.filter(event => event.therapistId === user.uid);

    if (userEvents.length > 0) {
      // User has events, filter to show only their events by default
      setFilters(prev => ({
        ...prev,
        therapists: [user.uid]
      }));
    }
    // If user has no events, leave filters empty to show all events

    hasInitializedFilter.current = true;
  }, [user, events.data, events.loading]);

  // Filter Logic
  const filteredEvents = useMemo(() => {
    if (!events.data) return [];

    return events.data.filter(event => {
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
  }, [events.data, filters]);

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
            teamMembers={teamMembers.data}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}

        {currentView === 'month' && (
          <MonthView 
            currentDate={currentDate}
            events={filteredEvents}
            teamMembers={teamMembers.data}
            onEventClick={handleEventClick}
            onSlotClick={handleMonthSlotClick}
          />
        )}

        {currentView === 'day' && (
          <DayView 
            currentDate={currentDate}
            events={filteredEvents}
            teamMembers={teamMembers.data}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>
    </div>
  );
}
