# TempoApp Phase 2 Roadmap: From MVP to Production Ready

**Status:** Draft
**Target Timeline:** 4-6 Weeks
**Focus:** Refinement, Parent Ecosystem, and Advanced Clinical Tools

---

## 1. Executive Summary

We have successfully delivered the **MVP (Sprint 1-4)**, establishing a modern Next.js 14 + Firebase architecture. The core application shell, authentication, calendar, client management, team management, and basic analytics are functional.

**Phase 2** shifts focus from "building the skeleton" to "fleshing out the experience." We will address known technical debt, build the critical Parent Portal (a key differentiator), and deepen the clinical utility of the app with true evolution tracking.

---

## 2. Priority 1: Critical Refinement (The "Must Fixes")

These items must be addressed before any new major features to ensure a stable foundation.

*   **Recurring Events Engine:**
    *   **Goal:** Allow creating series of events (e.g., "Every Monday at 9 AM for 10 weeks") that creates multiple Firestore documents or uses a recurrence pattern logic.
    *   **Current State:** UI exists, but backend creates only a single event.
    *   **Action:** Implement batch creation logic in `NewEventModal` and update `useEvents` to handle recurrence patterns if we choose a virtual expansion strategy.

*   **Toast Notification Polish:**
    *   **Goal:** Restore the "slide-in" animation and ensure z-index stacking is bulletproof across all modals.
    *   **Current State:** Functional but visual animations are disabled/buggy.
    *   **Action:** Re-integrate `tailwindcss-animate` or refine the CSS transitions in `Toast.tsx`.

*   **Calendar Interactions:**
    *   **Goal:** Click-to-create should pre-fill the clicked time slot.
    *   **Current State:** Clicking a slot opens the modal but defaults to "now".
    *   **Action:** Pass `selectedDate` and `selectedTime` from `WeekView`/`DayView` up to the `EventModalContext`.

---

## 3. Priority 2: The Parent Ecosystem

The Parent Portal is a high-value feature for our clinic clients.

*   **Parent Portal (`/parent`):**
    *   **Authentication:** Implement the "Client Code" login flow (or invite link).
    *   **Dashboard:** Read-only view of their child's upcoming sessions.
    *   **Progress View:** Simplified charts showing progress (from `Analytics` module logic).
    *   **Documents:** Ability to download generated reports (PDFs).

*   **Daily Notes Sharing:**
    *   **Feature:** Allow therapists to mark session notes as "Visible to Parent".
    *   **Implementation:** Add `isPublic` flag to `events` schema.

---

## 4. Priority 3: Clinical Tools

Transforming the app from a scheduler to a clinical tool.

*   **Evolution Tracking (The "Heart" of Therapy):**
    *   **Portage / ABLLS / VB-MAPP Support:**
    *   **Implementation:** Create a sub-collection `evaluations` under `clients`.
    *   **UI:** A complex grid/form in the Client Profile > "Evolution" tab to input scores across domains (Motor, Cognitive, Social).
    *   **Visualization:** Line charts showing developmental age vs. chronological age.

*   **Program Management:**
    *   **Library:** Create a master list of therapy programs (matching, imitation, etc.).
    *   **Assignment:** Allow assigning specific programs to clients (many-to-many).
    *   **Data Collection:** Enhance the `EventDetailPanel` to allow real-time scoring (Trial 1: +, Trial 2: -, etc.) instead of just a summary score.

---

## 5. Priority 4: Operations & Billing

*   **Real Billing Logic:**
    *   **Invoice Generation:** Create a Cloud Function or API route to generate PDF invoices based on completed sessions and rates.
    *   **Rate Management:** Add `rate` to `team_members` or `event_types`.
    *   **Export:** Export billing data to CSV/Excel for accounting software.

*   **Reporting:**
    *   **Monthly Progress Reports:** Auto-generate a text summary of all session notes for a given month.

---

## 6. Technical Enhancements

*   **Offline Mode (PWA):**
    *   **Goal:** Therapists in rural areas need to view schedule and log attendance without internet.
    *   **Action:** Configure `next-pwa`, implement Firestore offline persistence (`enableIndexedDbPersistence`).

*   **Security Hardening:**
    *   **Rules:** Tighten Firestore rules to ensure therapists can only read/write their assigned clients' data (if strict privacy is required).
    *   **Validation:** Add Zod schema validation to all form inputs.

---

## 7. Next Steps Summary

1.  **Immediate:** Fix Calendar Slot Pre-selection & Recurring Events.
2.  **Next Sprint:** Build Parent Portal Shell.
3.  **Following Sprint:** Implement Evolution Tracking Data Model.
