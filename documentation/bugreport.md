# Mobile UI/UX Bug Report & Suggestions

## Personnel Roles
- **Alex**: QA Tester (Mobile Focus)
- **Sofia**: UX Architect (Mobile Optimization)

---

## Alex's Bug Report: UI Positioning & Visibility Issues

### 1. Calendar Module
- **WeekView (`/calendar`)**: The 7-day grid is extremely cramped on mobile devices. Event tiles are too narrow to read titles, and the horizontal space is insufficient.
- **MonthView (`/calendar`)**: Each day cell is too small to show any meaningful event data. The "+X more" indicators are often the only thing visible, requiring multiple clicks to see data.
- **CalendarToolbar**: The date navigation and view switcher buttons stack poorly or overflow on small screens (320px-375px). The "Today" button and arrows take up too much vertical space when stacked.
- **EventDetailPanel**: The slide-over panel occupies the full screen but doesn't have a clear "back" or "close" button prominent enough for thumb-reach.

### 2. Client Management
- **ClientList Toolbar**: The search bar, status filter (Active/Archived/All), and "New Client" button don't wrap gracefully. On narrow screens, the status filter buttons get cut off.
- **ClientCard**: The card is quite tall. On a mobile screen, only about 1.5 cards are visible at a time, requiring excessive scrolling.
- **Profile Tabs**: The horizontal tab list in `ClientProfileHeader` overflows. While it is scrollable, there's no visual indicator (like a fade or arrow) that more tabs exist to the right.

### 3. Analytics
- **Charts**: Recharts components in `AnalyticsPage` sometimes fail to resize immediately when rotating the device, leading to horizontal overflow of the container.
- **KPI Cards**: On very narrow screens, the trend indicator badge overlaps with the value text.

### 4. Parent Portal
- **Bottom Navigation**: The icons are well-positioned, but the active state (fill-current) is sometimes subtle on high-brightness screens.
- **Dashboard Stats**: The Progress Rings are large and take up significant vertical space. On smaller iPhones (SE), the "Quick Actions" grid requires scrolling to reach.

---

## Sofia's UX Proposals: Mobile-First Optimization

### 1. Calendar Optimization (Sofia's Solution)
- **Problem**: Cramped Week/Month views.
- **Proposal**: 
    - Implement a **3-day view** or **Single Day view** as the default for mobile, replacing the 7-day week.
    - For `MonthView`, replace the grid with a **Calendar Strip** (one row of dates) and an **Agenda List** below it. This is a standard mobile pattern that preserves desktop's grid view.
    - **Implementation**: Use Tailwind `hidden lg:block` for the grid and `block lg:hidden` for the Agenda view.

### 2. Toolbar & Navigation (Sofia's Solution)
- **Problem**: Overflowing filters and buttons.
- **Proposal**:
    - **ClientList**: Move the "Status Filter" into a **Filter Sheet** (bottom drawer) triggered by a single "Filter" icon button on mobile. Keep the search bar full width.
    - **Tabs**: Add a CSS `mask-image` (linear gradient) to the right side of the tab container to indicate scrollability.

### 3. Client Card Efficiency (Sofia's Solution)
- **Problem**: Low information density per scroll.
- **Proposal**: 
    - Create a "Compact" version of `ClientCard` for mobile (`flex-row` instead of `flex-col`). 
    - Move the initials/avatar to the left and text to the right to reduce height by ~40%.

### 4. Chart Responsiveness (Sofia's Solution)
- **Problem**: Scaling issues.
- **Proposal**:
    - Wrap charts in a container with a fixed aspect ratio (e.g., `aspect-[4/3]`) and set `ResponsiveContainer` width to 99% (a known Recharts fix for container overflow).

### 5. Parent Portal (Sofia's Solution)
- **Problem**: High vertical occupancy of rings.
- **Proposal**:
    - Reduce Progress Ring size from `64` to `48` on mobile.
    - Change "Quick Actions" from a 4-column grid to a **2x2 grid** or a **horizontal scroll list** to bring "Recent Activity" higher up the fold.

---
*Note: All suggested changes will utilize Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) to ensure zero impact on the existing Desktop experience.*
