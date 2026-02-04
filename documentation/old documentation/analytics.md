# Analytics Development Plan: "The Pulse of TempoApp"

## 1. Overview & Objectives
The Analytics Dashboard is the "Single Source of Truth" for clinic administrators and lead therapists. It must transition from basic administrative stats to **actionable intelligence**, combining operational efficiency with clinical outcomes.

**Primary Goal:** Enable data-driven decisions that improve patient outcomes and business stability.
**Secondary Goal:** Showcase the AI capabilities (predictive trends) to differentiate TempoApp from legacy competitors.

## 2. Target Audience & Personas
*   **Clinic Administrator:** Cares about Revenue, Cash Flow, Therapist Utilization, and Cancellations (Business Health).
*   **Lead Therapist / Clinical Director:** Cares about Patient Progress rates, Intervention Effectiveness, and Compliance (Clinical Health).

## 3. Metrics & Visualization Strategy

### A. High-Level KPIs (The "Pulse")
*Located at the top. Instant visibility.*
1.  **Active Clients:** Total active vs. waitlist (Trend indicator).
2.  **Monthly Revenue:** Actual vs. Projected (based on scheduled sessions).
3.  **Session Completion Rate:** (Completed / Scheduled) % - Critical for operational efficiency.
4.  **Clinical Progress Index:** (New!) Aggregated score of goal achievements across all active plans.

### B. Operational & Financial Charts (Business Logic)
1.  **Revenue Mix (Donut Chart):** Breakdown by Service Type (Therapy vs. Assessment vs. Group).
    *   *Insight:* "Which service drives our growth?"
2.  **Session Volume Trends (Bar/Area Chart):** Weekly/Monthly sessions.
    *   *Insight:* "Are we growing or stagnating?"
3.  **Therapist Utilization (Heatmap or Bar Chart):** Billable hours per therapist vs. Capacity.
    *   *Insight:* "Who is overbooked? Who has capacity?"

### C. Clinical Analytics (The "Differentiation")
*This is critical for the AI_CORE_CONTEXT.*
1.  **Global Goal Achievement Rate (Line Chart):** % of clinical goals marked "Achieved" over time.
    *   *Insight:* "Is our clinic effectively treating patients?"
2.  **Attendance vs. Progress Correlation (Scatter - Future):** Does better attendance correlate with higher goal achievement?

## 4. Technical Implementation (Next.js & Firebase)

### Architecture
*   **Framework:** Next.js 14 (App Router) with Static Export (`output: 'export'`).
*   **Client Components:** The Analytics page and all chart components must use `"use client"` to handle interactive Recharts logic and Firebase real-time listeners.
*   **Data Fetching Strategy:** 
    *   **Custom Hook:** `useAnalyticsData` (built upon the project's `onSnapshot` pattern).
    *   **Aggregation:** Since we are in a Static Export environment, the "Senior Software Developer" role recommends client-side memoized aggregation for the MVP (30-90 day windows).
    *   **Scale Plan:** Shift complex clinical aggregations to Firebase Cloud Functions that write to a `stats` collection, which the client then listens to.

### Data Hooks Integration
We will implement `useAnalyticsData` which internally uses:
*   `useEventsByMonth()`: For session volume and completion rates.
*   `useInvoicesByMonth()`: For revenue data and mix.
*   `useClients()`: For client growth metrics.

### UI/UX Principles
*   **Next.js Optimization:** Leverage the App Router's persistent layouts to ensure the sidebar/header don't re-render when switching between analytics tabs.
*   **Optimistic UI:** Show Skeleton loaders (Tailwind `animate-pulse`) while `onSnapshot` initializes.
*   **Responsive:** Grid layout: Mobile (1 col) -> Tablet (2 cols) -> Desktop (3/4 cols).
*   **Theming:** Full support for Dark Mode using Tailwind's `dark:` utility classes, matching the existing dashboard style.

## 5. Development Phases

### Phase 1: Operational Baseline (Current Focus)
*   Refine `SessionVolumeChart`, `RevenueMixChart`, `AttendanceTrendChart`.
*   Implement `TherapistUtilization` chart.
*   Connect to Real Data (Firestore `sessions` and `users`).

### Phase 2: Clinical Insights
*   Implement `GlobalGoalAchievement` chart.
*   Connect to `plans` and `goals` collections.

### Phase 3: AI & Predictive (Future)
*   "Predicted Cancellations" widget.
*   "Revenue Forecast" based on scheduled recurrence.

## 6. Action Items
1.  **Review:** Validate this plan with the team.
2.  **Refactor:** Ensure `mockData.ts` types match the intended Firestore data shape.
3.  **Build:** Implement the `TherapistUtilization` component.
4.  **Integrate:** Replace mocks with `useCollections` hook queries for the MVP.

---

## Team Review & Perspectives

### PM (Project Manager)
> "The Clinical Progress Index is our 'North Star'. We need to ensure we have enough historical data in Firestore to make this meaningful for the Q4 2026 commercial launch."

### Lead UX Researcher
> "The 'App-First' feel means these charts must be buttery smooth on mobile. Let's ensure Recharts animations are optimized and tooltips are touch-friendly."

### Senior Software Developer
> "Since we are on Static Export, I'll focus on memoizing the aggregation logic in `useAnalyticsData` to prevent UI lag when processing 90+ days of session data."

### UI Designer
> "I've verified the Tailwind color tokens. We'll use `Brand-500` for primary data and `Success-500` for progress indicators to maintain visual hierarchy."
