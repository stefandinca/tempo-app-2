"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import DayView from "@/components/calendar/DayView";
import MonthAgendaView from "@/components/calendar/MonthAgendaView";
import FilterPanel, { FilterState } from "@/components/calendar/FilterPanel";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import { useData } from "@/context/DataContext";
import { useEventsByDateRange } from "@/hooks/useCollections";
import { CalendarEventSkeleton } from "@/components/ui/Skeleton";
import { Loader2 } from "lucide-react";
import { useEventModal } from "@/context/EventModalContext";
import { useAuth } from "@/context/AuthContext";

/**
 * Compute the visible date range for the calendar based on current date and view.
 * Month view uses a 6-week grid window to cover overflow cells from adjacent months.
 */
function getCalendarDateRange(currentDate: Date, currentView: 'month' | 'week' | 'day'): { start: Date; end: Date } {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const date = currentDate.getDate();
  const day = currentDate.getDay(); // 0=Sun

  if (currentView === 'day') {
    const start = new Date(year, month, date, 0, 0, 0, 0);
    const end = new Date(year, month, date, 23, 59, 59, 999);
    return { start, end };
  }

  if (currentView === 'week') {
    // Monday-based week
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(year, month, date + mondayOffset, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  // Month view: 6-week grid covering overflow cells
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0=Sun
  // How many days to go back to reach Monday
  const offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const gridStart = new Date(year, month, 1 - offsetToMonday, 0, 0, 0, 0);
  // 6 weeks = 42 days
  const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41, 23, 59, 59, 999);
  return { start: gridStart, end: gridEnd };
}

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientIdParam = searchParams.get("clientId");

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
    clients: clientIdParam ? [clientIdParam] : [],
    eventTypes: []
  });

  // Track if we've initialized the default filter
  const hasInitializedFilter = useRef(false);

  // Handle client filter from URL parameter
  useEffect(() => {
    if (clientIdParam) {
      setFilters(prev => ({
        ...prev,
        therapists: [], // Clear therapist filter when filtering by client
        clients: [clientIdParam]
      }));
      // Clean up URL after applying filter
      router.replace("/calendar", { scroll: false });
    }
  }, [clientIdParam, router]);

  // Compute visible date range for the current view
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getCalendarDateRange(currentDate, currentView),
    [currentDate, currentView]
  );

  // Fetch events for the visible date range directly from Firestore
  const { data: rangeEvents, loading: eventsLoading } = useEventsByDateRange(rangeStart, rangeEnd);

  // Team members still come from shared context
  const { teamMembers } = useData();
  const loading = eventsLoading || teamMembers.loading;

  // Set default filter to show only current user's events (if they have any)
  useEffect(() => {
    if (hasInitializedFilter.current) return;
    if (!user || !rangeEvents || eventsLoading) return;

    // Check if current user has any assigned events
    const userEvents = rangeEvents.filter(event => event.therapistId === user.uid);

    if (userEvents.length > 0) {
      // User has events, filter to show only their events by default
      setFilters(prev => ({
        ...prev,
        therapists: [user.uid]
      }));
    }
    // If user has no events, leave filters empty to show all events

    hasInitializedFilter.current = true;
  }, [user, rangeEvents, eventsLoading]);

  // Filter Logic
  const filteredEvents = useMemo(() => {
    if (!rangeEvents) return [];

    return rangeEvents.filter(event => {
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
  }, [rangeEvents, filters]);

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
          <>
            <div className="hidden lg:block h-full">
              <MonthView 
                currentDate={currentDate}
                events={filteredEvents}
                teamMembers={teamMembers.data}
                onEventClick={handleEventClick}
                onSlotClick={handleMonthSlotClick}
              />
            </div>
            <div className="block lg:hidden h-full">
              <MonthAgendaView 
                currentDate={currentDate}
                events={filteredEvents}
                teamMembers={teamMembers.data}
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
                onDateChange={setCurrentDate}
              />
            </div>
          </>
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
