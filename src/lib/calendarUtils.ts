/**
 * Calendar utilities for handling event overlap and positioning
 */

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  therapistId: string;
  clientId: string;
  status?: string;
}

export interface EventWithPosition extends CalendarEvent {
  column: number;       // 0-indexed column position
  totalColumns: number; // total columns in this overlap group
}

/**
 * Checks if two events overlap in time
 */
function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = new Date(a.startTime).getTime();
  const aEnd = new Date(a.endTime).getTime();
  const bStart = new Date(b.startTime).getTime();
  const bEnd = new Date(b.endTime).getTime();

  // Events overlap if one starts before the other ends
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Groups events that overlap with each other (directly or transitively)
 */
function groupOverlappingEvents(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];

  const groups: CalendarEvent[][] = [];
  const assigned = new Set<string>();

  for (const event of events) {
    if (assigned.has(event.id)) continue;

    // Start a new group with this event
    const group: CalendarEvent[] = [event];
    assigned.add(event.id);

    // Find all events that overlap with any event in the group (transitive closure)
    let i = 0;
    while (i < group.length) {
      const current = group[i];
      for (const other of events) {
        if (!assigned.has(other.id) && eventsOverlap(current, other)) {
          group.push(other);
          assigned.add(other.id);
        }
      }
      i++;
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Assigns columns to events within an overlap group
 * Uses a greedy algorithm: assign each event to the first available column
 */
function assignColumns(group: CalendarEvent[]): EventWithPosition[] {
  // Sort by start time, then by duration (longer events first)
  const sorted = [...group].sort((a, b) => {
    const aStart = new Date(a.startTime).getTime();
    const bStart = new Date(b.startTime).getTime();
    if (aStart !== bStart) return aStart - bStart;

    // For same start time, put longer events first
    const aDuration = new Date(a.endTime).getTime() - aStart;
    const bDuration = new Date(b.endTime).getTime() - bStart;
    return bDuration - aDuration;
  });

  // Track which columns are occupied and until when
  const columnEndTimes: number[] = [];
  const result: EventWithPosition[] = [];

  for (const event of sorted) {
    const eventStart = new Date(event.startTime).getTime();
    const eventEnd = new Date(event.endTime).getTime();

    // Find first available column (column where previous event has ended)
    let column = 0;
    while (column < columnEndTimes.length && columnEndTimes[column] > eventStart) {
      column++;
    }

    // Update or add column end time
    columnEndTimes[column] = eventEnd;

    result.push({
      ...event,
      column,
      totalColumns: 0, // Will be updated after all events are assigned
    });
  }

  // Set totalColumns for all events in the group
  const totalColumns = columnEndTimes.length;
  for (const event of result) {
    event.totalColumns = totalColumns;
  }

  return result;
}

/**
 * Calculates column positions for overlapping events
 * Returns events with column and totalColumns properties for positioning
 */
export function calculateEventColumns(events: CalendarEvent[]): EventWithPosition[] {
  if (events.length === 0) return [];

  // Sort events by start time first
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Group overlapping events
  const groups = groupOverlappingEvents(sortedEvents);

  // Assign columns within each group
  const result: EventWithPosition[] = [];
  for (const group of groups) {
    result.push(...assignColumns(group));
  }

  return result;
}

/**
 * Filters events for a specific day
 */
export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter(evt => {
    const evtDate = new Date(evt.startTime);
    return evtDate.getDate() === day.getDate() &&
           evtDate.getMonth() === day.getMonth() &&
           evtDate.getFullYear() === day.getFullYear();
  });
}
