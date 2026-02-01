# TempoApp Technical Debt & Fixes

This file tracks issues, incomplete features, and architectural improvements to be addressed in future sprints.

---

## 1. Recurring Events Implementation
**Status:** Placeholder (Sprint 2)
**Severity:** High (Core Feature)

### Current Limitation
The "New Event Modal" includes a recurrence UI (weekly selector), but the backend logic in `NewEventModal/index.tsx` currently only creates a **single document** in Firestore for the initial date/time.

### Requirements for Full Implementation
To support true recurring events, we need to implement the following:

1.  **Batch Creation:** When a user selects multiple days (e.g., Mon, Wed, Fri), the app should generate a series of events for a defined period (e.g., 3 months or until an end date).
2.  **Grouping:** Recurring events must share a `recurringGroupId` so they can be identified as part of a series.
3.  **Update/Delete Logic:** 
    *   **Single Instance:** Updating "just this event" (break from series).
    *   **Entire Series:** Updating all future events in the group (patching multiple Firestore documents).
4.  **Exceptions:** Handling cases where a single event in a series is cancelled or moved without affecting the rest of the schedule.
5.  **Schema Support:** Update the Firestore `events` schema to include:
    *   `isRecurring`: boolean
    *   `recurringGroupId`: string
    *   `recurrencePattern`: object { daysOfWeek: number[], endDate: timestamp }

### Future Strategy
Consider using a **Cloud Function** to generate event documents automatically to avoid heavy client-side processing, or implement a "Virtual Expansion" where events are generated on-the-fly in the UI (though this makes querying/filtering more complex in Firestore).

---

## 2. Toast Notification System Not Displaying
**Status:** Incomplete / Bug (Sprint 2)
**Severity:** Medium (UX Polish)

### Current Issue
The `ToastProvider` and `useToast` hook are correctly triggering (console logs confirm `showToast` is called), but the visual `Toast` component is not appearing on the screen.

### Observations
- "Showing toast: ..." logs appear in the browser console.
- Simplified versions of `Toast.tsx` (without animations and with `z-[9999]`) also failed to appear.
- Likely causes to investigate:
    1.  **Z-Index Stacking:** The `fixed` container in `ToastContext.tsx` might be trapped behind the `NewEventModal` or another layout element.
    2.  **Context Provider Order:** Check if the hierarchy in `layout.tsx` affects rendering.
    3.  **Client-Side Rendering:** Ensure the toast container is correctly hydrated and attached to the body or root.
    4.  **Tailwind JIT:** Confirm that specific `z-[60]` or color classes are being generated.

### Requirements for Fix
- Ensure toasts are visible even when modals/drawers are open.
- Restore smooth slide-in/out animations.
- Verify visibility across all routes (Login, Dashboard, Calendar).

---

## 3. Calendar Interaction Improvements
**Status:** Pending (Sprint 2 Feedback)
**Severity:** Medium (UX)

### Tasks
1.  **Slot Pre-selection:** When a user clicks an empty time slot in the calendar (Week/Day view), the "New Event Modal" should open with that specific Date and Time pre-filled in the form. Currently, it defaults to the current time or isn't passing the clicked slot data correctly to the modal state.
2.  **Current Time Indicator:** Add a visual indicator (red horizontal line, 2px height) in the Week and Day views to show the current time. This helps users quickly orient themselves in the schedule.
    *   Should update position every minute.
    *   Should span the full width of the day columns.
3. Edit an already existing event: add a button to edit an already existing event. it should open the flow and let us update the information.


