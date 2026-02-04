# TempoApp UX Specification
## Source of Truth for Product Rebuild

**Version:** 1.0
**Last Updated:** January 31, 2026
**Status:** Approved for Development

---

## Table of Contents

1. [User Personas & Roles](#1-user-personas--roles)
2. [Information Architecture](#2-information-architecture)
3. [User Flows](#3-user-flows)
4. [Figma Design System Specification](#4-figma-design-system-specification)

---

## 1. User Personas & Roles

### 1.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN                                │
│  Full system access, billing, analytics, user management    │
├─────────────────────────────────────────────────────────────┤
│                      COORDINATOR                             │
│  Team scheduling, client assignment, reports                │
├─────────────────────────────────────────────────────────────┤
│                       THERAPIST                              │
│  Own schedule, assigned clients, session logging            │
├─────────────────────────────────────────────────────────────┤
│                         PARENT                               │
│  Read-only access to child's schedule and progress          │
└─────────────────────────────────────────────────────────────┘
```

---

### 1.2 Persona: Administrator

**Profile:**
| Attribute | Value |
|-----------|-------|
| Name | Dr. Elena Popescu |
| Role | Clinic Director / Admin |
| Age | 45 |
| Tech Comfort | Moderate |
| Device | Desktop (primary), Tablet (secondary) |
| Usage Frequency | Daily, 2-3 hours |

**Primary Goals:**
1. Oversee all clinic operations from a single dashboard
2. Manage billing cycles and track revenue
3. Onboard new therapists and assign clients
4. Generate compliance reports for regulatory bodies
5. Monitor therapist performance and client progress

**Pain Points:**
- Needs quick access to financial summaries
- Frustrated by switching between multiple screens for reports
- Wants real-time visibility into daily operations

**Permissions Matrix:**

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Events (All) | ✅ | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ✅ | ✅ |
| Team Members | ✅ | ✅ | ✅ | ✅ |
| Billing | ✅ | ✅ | ✅ | ✅ |
| Analytics | - | ✅ | - | - |
| Event Types | ✅ | ✅ | ✅ | ✅ |
| System Settings | ✅ | ✅ | ✅ | ✅ |
| Activity Logs | - | ✅ | - | - |
| User Accounts | ✅ | ✅ | ✅ | ✅ |

---

### 1.3 Persona: Coordinator

**Profile:**
| Attribute | Value |
|-----------|-------|
| Name | Andrei Ionescu |
| Role | Senior Therapist / Scheduler |
| Age | 35 |
| Tech Comfort | High |
| Device | Desktop and Tablet equally |
| Usage Frequency | Daily, 4-5 hours |

**Primary Goals:**
1. Build and optimize the weekly therapy schedule
2. Match therapists to clients based on specialization
3. Handle schedule changes and cancellations
4. Prepare monthly progress reports for parents
5. Coordinate team meetings and training sessions

**Pain Points:**
- Scheduling conflicts are hard to spot
- Recurring event changes are tedious
- Needs visibility into therapist availability

**Permissions Matrix:**

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Events (All) | ✅ | ✅ | ✅ | ✅ |
| Events (Own) | ✅ | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ✅ | ❌ |
| Team Members | ❌ | ✅ | ❌ | ❌ |
| Billing | ❌ | ✅ | ❌ | ❌ |
| Analytics | - | ✅ (Limited) | - | - |
| Event Types | ❌ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ |

---

### 1.4 Persona: Therapist

**Profile:**
| Attribute | Value |
|-----------|-------|
| Name | Maria Dumitrescu |
| Role | ABA Therapist |
| Age | 28 |
| Tech Comfort | High |
| Device | Tablet (primary during sessions), Phone (quick checks) |
| Usage Frequency | Daily, during and between sessions |

**Primary Goals:**
1. View today's schedule at a glance
2. Log attendance quickly between sessions
3. Record program scores during therapy
4. Add session notes and observations
5. Track client progress over time

**Pain Points:**
- Too many taps to log attendance
- Can't see schedule while filling forms
- Needs offline capability for rural home visits

**Permissions Matrix:**

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Events (All) | ❌ | ✅ (Calendar only) | ❌ | ❌ |
| Events (Own) | ✅ | ✅ | ✅ | ✅ |
| Clients (Assigned) | ❌ | ✅ | ✅ (Notes only) | ❌ |
| Clients (All) | ❌ | ❌ | ❌ | ❌ |
| Team Members | ❌ | ✅ (Names/Colors) | ❌ | ❌ |
| Evolution | ✅ | ✅ | ✅ | ❌ |
| Program Scores | ✅ | ✅ | ✅ | ❌ |

---

### 1.5 Persona: Parent

**Profile:**
| Attribute | Value |
|-----------|-------|
| Name | Alexandru Marin |
| Role | Parent of Client |
| Age | 38 |
| Tech Comfort | Low to Moderate |
| Device | Phone (90%), Desktop (10%) |
| Usage Frequency | Weekly, 15-30 minutes |

**Primary Goals:**
1. Check upcoming therapy appointments
2. View child's progress and evolution charts
3. Download progress reports
4. Confirm or request schedule changes
5. Communicate with therapy team

**Pain Points:**
- Confused by clinical terminology
- Wants simple, visual progress indicators
- Needs notifications for schedule changes

**Permissions Matrix:**

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Events (Child's) | ❌ | ✅ (Public only) | ❌ | ❌ |
| Client Profile (Child) | ❌ | ✅ | ❌ | ❌ |
| Evolution (Child) | ❌ | ✅ | ❌ | ❌ |
| Reports (Child) | ❌ | ✅ (Download) | ❌ | ❌ |
| Messages | ✅ | ✅ | ❌ | ❌ |

---

### 1.6 Permission Summary Table

| Capability | Admin | Coordinator | Therapist | Parent |
|------------|-------|-------------|-----------|--------|
| View all calendars | ✅ | ✅ | ✅ | ❌ |
| Edit any event | ✅ | ✅ | ❌ | ❌ |
| Edit own events | ✅ | ✅ | ✅ | ❌ |
| Manage clients | ✅ | ✅ | ❌ | ❌ |
| View assigned clients | ✅ | ✅ | ✅ | ✅* |
| Log attendance | ✅ | ✅ | ✅ | ❌ |
| Record program scores | ✅ | ✅ | ✅ | ❌ |
| Access billing | ✅ | 👁️ | ❌ | ❌ |
| Access analytics | ✅ | 👁️ | ❌ | ❌ |
| Manage team | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |
| Generate reports | ✅ | ✅ | ❌ | ❌ |
| Download reports | ✅ | ✅ | ✅ | ✅ |

*Parent can only view their own child's data

---

## 2. Information Architecture

### 2.1 Global Navigation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ TEMPOAPP                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                               │
│  │ PUBLIC      │                                               │
│  ├─────────────┤                                               │
│  │ • Login     │──────────────────────────────────────────┐   │
│  │ • Public    │                                          │   │
│  │   Calendar  │                                          │   │
│  │ • Parent    │                                          ▼   │
│  │   Portal    │                              ┌────────────────┤
│  └─────────────┘                              │ AUTHENTICATED  │
│                                               ├────────────────┤
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ MAIN APP (Role-Based)                                   │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │                                                         │  │
│  │  Dashboard ────────────────────────────────────────┐   │  │
│  │  │                                                 │   │  │
│  │  ├── Calendar ─────────────────────────────────┐  │   │  │
│  │  │   ├── Month View                            │  │   │  │
│  │  │   ├── Week View                             │  │   │  │
│  │  │   ├── Day View                              │  │   │  │
│  │  │   └── Event Detail Panel ──────────────┐   │  │   │  │
│  │  │       ├── Attendance                   │   │  │   │  │
│  │  │       ├── Program Scores               │   │  │   │  │
│  │  │       └── Comments                     │   │  │   │  │
│  │  │                                        │   │  │   │  │
│  │  ├── Clients ──────────────────────────────────┤  │   │  │
│  │  │   ├── Client List                      │   │  │   │  │
│  │  │   ├── Client Profile ──────────────┐  │   │  │   │  │
│  │  │   │   ├── Overview                 │  │   │  │   │  │
│  │  │   │   ├── Evolution                │  │   │  │   │  │
│  │  │   │   ├── Programs                 │  │   │  │   │  │
│  │  │   │   ├── Intervention Plan        │  │   │  │   │  │
│  │  │   │   ├── Documents                │  │   │  │   │  │
│  │  │   │   └── Reports                  │  │   │  │   │  │
│  │  │   └── Archived Clients             │  │   │  │   │  │
│  │  │                                    │  │   │  │   │  │
│  │  ├── Team ─────────────────────────────────────┤  │   │  │
│  │  │   ├── Team List                    │  │   │  │   │  │
│  │  │   └── Member Profile               │  │   │  │   │  │
│  │  │                                    │  │   │  │   │  │
│  │  ├── Billing (Admin) ──────────────────────────┤  │   │  │
│  │  │   ├── Monthly Overview             │  │   │  │   │  │
│  │  │   ├── Client Invoices              │  │   │  │   │  │
│  │  │   ├── Subscriptions                │  │   │  │   │  │
│  │  │   └── Discount Settings            │  │   │  │   │  │
│  │  │                                    │  │   │  │   │  │
│  │  ├── Analytics (Admin) ────────────────────────┤  │   │  │
│  │  │   ├── Overview Dashboard           │  │   │  │   │  │
│  │  │   ├── Session Metrics              │  │   │  │   │  │
│  │  │   ├── Attendance Rates             │  │   │  │   │  │ 
│  │  │   └── Revenue Trends               │  │   │  │   │  │
│  │  │                                    │  │   │  │   │  │
│  │  └── Settings (Admin) ─────────────────────────┘  │   │  │
│  │      ├── Event Types                              │   │  │
│  │      ├── Programs                                 │   │  │
│  │      ├── Activity Log                             │   │  │
│  │      └── System Preferences                       │   │  │
│  │                                                   │   │  │
│  └───────────────────────────────────────────────────┘   │  │
│                                                          │  │
│  ┌────────────────────────────────────────────────────┐ │  │
│  │ PARENT PORTAL (Separate App Shell)                 │ │  │
│  ├────────────────────────────────────────────────────┤ │  │
│  │  ├── Child Dashboard                               │ │  │
│  │  ├── Schedule                                      │ │  │
│  │  ├── Progress                                      │ │  │
│  │  └── Documents                                     │ │  │
│  └────────────────────────────────────────────────────┘ │  │
│                                                          │  │
└──────────────────────────────────────────────────────────┘  │
                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Screen Specifications

---

#### SCREEN: Login

**Route:** `/login`
**Access:** Public
**Purpose:** Authenticate users and route to appropriate dashboard

##### Core Features
- User identification via email/password
- Role-based routing after authentication
- Parent portal access via client code
- Password recovery flow
- Theme toggle (dark/light)

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Email Input | Text Field | Required, email validation |
| Password Input | Password Field | Required, show/hide toggle |
| "Remember Me" | Checkbox | Persists session for 30 days |
| Login Button | Primary Button | Submits form, shows loading state |
| "Forgot Password" | Text Link | Opens password recovery modal |
| "Parent Access" | Secondary Button | Switches to parent code entry |
| Theme Toggle | Icon Button | Toggles dark/light mode |
| Language Selector | Dropdown | EN / RO options |

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Page load | Focus on email input, login button disabled |
| Valid Form | Both fields filled | Login button enabled |
| Loading | Form submitted | Button shows spinner, inputs disabled |
| Success | Auth successful | Redirect to role-appropriate dashboard |
| Error: Invalid Credentials | Wrong email/password | Shake animation, error toast, clear password |
| Error: Account Locked | 5+ failed attempts | Show lockout message with timer |
| Error: Network | No connection | Show offline indicator, retry option |
| Empty: No Users | New installation | Show "Create Admin" setup flow |

##### Responsive Behavior
- **Desktop:** Centered card (400px max-width), background illustration
- **Tablet:** Same as desktop, no illustration
- **Mobile:** Full-width form, sticky login button at bottom

---

#### SCREEN: Dashboard

**Route:** `/dashboard`
**Access:** Admin, Coordinator, Therapist
**Purpose:** At-a-glance overview of today's activities and quick actions

##### Core Features
- Today's schedule summary
- Recent activity feed
- Quick action shortcuts
- Key performance indicators (role-based)
- Notifications center

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Today's Events Card | Card List | Click expands to calendar day view |
| Quick Add Event | FAB | Opens event creation panel |
| Activity Feed | Scrollable List | Click item navigates to entity |
| Refresh Button | Icon Button | Reloads all data with animation |
| KPI Cards | Stat Cards | Click opens detailed analytics |
| Notification Bell | Icon Button + Badge | Opens notification dropdown |
| Search Bar | Command Input | Cmd+K opens global search |

##### KPI Cards by Role

| Role | KPI 1 | KPI 2 | KPI 3 | KPI 4 |
|------|-------|-------|-------|-------|
| Admin | Today's Revenue | Active Clients | Attendance Rate | Pending Invoices |
| Coordinator | Events Today | Unassigned Slots | Cancellations | Reports Due |
| Therapist | My Sessions Today | Attendance Logged | Clients Seen | Hours This Week |

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Data loaded | Show populated cards and feed |
| Loading | Initial fetch | Skeleton cards (3 KPI + event list) |
| Empty: No Events | No events today | Illustration + "No sessions scheduled" |
| Empty: No Activity | New user | "Welcome" onboarding card instead |
| Error: Partial | Some APIs fail | Show available data, error badge on failed sections |
| Error: Full | All APIs fail | Full-screen error with retry button |
| Notification Badge | Unread count > 0 | Red badge with count (99+ max) |

##### Today's Schedule Card Layout

```
┌─────────────────────────────────────────────────────────────┐
│ TODAY'S SCHEDULE                           [View All →]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── NOW ───────────────────────────────────────────────┐ │
│  │ 🟢 9:00 - 10:00                                       │ │
│  │ ┌────┐ John Smith                                     │ │
│  │ │ JS │ ABA Session • Dr. Garcia                       │ │
│  │ └────┘                        [✓] [✗] [A/M]          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── UPCOMING ──────────────────────────────────────────┐ │
│  │ ○ 10:30 - 11:30  Jane Doe • Speech Therapy           │ │
│  │ ○ 13:00 - 14:00  Mike Brown • Occupational           │ │
│  │ ○ 15:00 - 16:00  Sara Lee • ABA Session              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── COMPLETED ─────────────────────────────────────────┐ │
│  │ ✓ 8:00 - 9:00   Alex Kim • Present                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### SCREEN: Calendar

**Route:** `/calendar`
**Access:** Admin, Coordinator, Therapist
**Purpose:** Visual schedule management across all views

##### Core Features
- Month, Week, Day view switching
- Event creation, editing, deletion
- Recurring event management
- Therapist and client filtering
- Drag-and-drop rescheduling (desktop)
- Overlap detection and warnings

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| View Switcher | Segmented Control | Month / Week / Day toggle |
| Date Navigator | Button Group | < Today > with date display |
| Date Picker | Calendar Popup | Click date to show picker |
| Filter Chips | Multi-select Chips | Toggle therapist visibility |
| Client Filter | Search Dropdown | Filter by specific client |
| Event Card | Interactive Card | Click opens detail panel |
| Empty Cell | Clickable Area | Click to create event at that time |
| Drag Handle | Icon (Week/Day) | Enables drag-and-drop |
| FAB (Create) | Floating Button | Opens event creation panel |

##### View-Specific Layouts

**Month View:**
```
┌─────────────────────────────────────────────────────────────┐
│  < January 2026 >                    [M] [W] [D]  [Filter] │
├─────┬─────┬─────┬─────┬─────┬─────┬─────────────────────────┤
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun                     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────────┤
│     │     │  1  │  2  │  3  │  4  │  5                      │
│     │     │ ●●  │ ●●● │ ●   │     │                         │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────────┤
│  6  │  7  │  8  │  9  │ 10  │ 11  │ 12                      │
│ ●●●●│ ●●●●│ ●●● │ ●●  │ ●●●●│     │                         │
├─────┴─────┴─────┴─────┴─────┴─────┴─────────────────────────┤
│ ● = Event indicator (color = therapist)                    │
│ Click day to expand, double-click to create                │
└─────────────────────────────────────────────────────────────┘
```

**Week View:**
```
┌─────────────────────────────────────────────────────────────┐
│  < Week of Jan 6, 2026 >              [M] [W] [D]  [Filter]│
├─────────────────────────────────────────────────────────────┤
│      │ Mon 6 │ Tue 7 │ Wed 8 │ Thu 9 │ Fri 10│             │
├──────┼───────┼───────┼───────┼───────┼───────┼─────────────┤
│ 8:00 │ ┌───┐ │       │       │       │       │             │
│      │ │ A │ │       │ ┌───┐ │       │       │             │
│ 9:00 │ │   │ │ ┌───┐ │ │ B │ │ ┌───┐ │ ┌───┐ │             │
│      │ └───┘ │ │ C │ │ │   │ │ │ D │ │ │ E │ │             │
│10:00 │       │ │   │ │ └───┘ │ │   │ │ │   │ │             │
│      │       │ └───┘ │       │ └───┘ │ └───┘ │             │
├──────┴───────┴───────┴───────┴───────┴───────┴─────────────┤
│ Events show: Time, Client initials, Color = Therapist      │
│ Drag to reschedule, resize to change duration              │
└─────────────────────────────────────────────────────────────┘
```

**Day View:**
```
┌─────────────────────────────────────────────────────────────┐
│  < Monday, January 6, 2026 >          [M] [W] [D]  [Filter]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  8:00  ┌──────────────────────────────────────────────────┐│
│        │ 🟢 ABA Session                                   ││
│        │ ┌────┐                                           ││
│  9:00  │ │ JS │ John Smith                                ││
│        │ └────┘ Dr. Maria Garcia                          ││
│        │ ───────────────────────────────────              ││
│        │ Attendance: [✓ Present] [✗] [A/M]               ││
│        │ Programs: ABA (++) Speech (+)                    ││
│        └──────────────────────────────────────────────────┘│
│                                                             │
│  10:00 ┌──────────────────────────────────────────────────┐│
│        │ 🟡 Evaluation                                    ││
│        │ Jane Doe • Initial Assessment                    ││
│  11:00 └──────────────────────────────────────────────────┘│
│                                                             │
│  12:00 ── Lunch Break ────────────────────────────────────  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Data loaded | Render events in selected view |
| Loading | Fetching events | Skeleton grid with pulsing cells |
| Empty: Day | No events on day | "No sessions" + Create button |
| Empty: Month | No events in month | Sparse calendar, no indicators |
| Filtered: No Results | Filter returns 0 | "No matching events" + Clear filter |
| Overlap Warning | Creating conflicting event | Yellow warning banner + details |
| Drag Active | Dragging event | Ghost preview at cursor, drop zones highlighted |
| Drag Invalid | Over blocked time | Red drop zone, snap-back animation |
| Error: Save Failed | Network error on save | Toast error, event reverts to original |
| Offline Mode | No connection | Cached events shown, edit queue indicated |

##### Filter Panel Specification

```
┌─────────────────────────────────────────────────────────────┐
│ FILTERS                                        [Clear All] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Team Members                                                │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│ │🔵 MG  │ │🟢 AI  │ │🟣 MD  │ │🟠 PS  │ │ All   │         │
│ │ ✓     │ │ ✓     │ │       │ │ ✓     │ │       │         │
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘         │
│                                                             │
│ Clients                                                     │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🔍 Search clients...                                │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Event Types                                                 │
│ ☑ ABA Session    ☑ Speech Therapy    ☐ Evaluation         │
│ ☑ Occupational   ☐ Parent Meeting    ☐ Administrative     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### SCREEN: Event Detail Panel

**Route:** `/calendar?event={id}` (Panel overlay, not separate page)
**Access:** Based on event ownership and role
**Purpose:** View and edit all event details without leaving calendar context

##### Core Features
- Event metadata display and editing
- Quick attendance logging
- Program score tracking with counters
- Session notes and comments
- Recurring event management

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Close Button | Icon Button | Closes panel, returns to calendar |
| Edit Toggle | Icon Button | Switches between view/edit mode |
| Delete Button | Danger Button | Confirms then deletes |
| Event Title | Editable Text | Click to edit (if permitted) |
| Date/Time | Date/Time Picker | Opens picker on click |
| Duration | Number Stepper | ±15 min increments |
| Therapist Select | Dropdown | Multi-select with colors |
| Client Select | Dropdown | Multi-select with search |
| Attendance Pills | Toggle Buttons | Present / Absent / Excused per client |
| Program Counter | Stepper Buttons | - / 0 / P / + increment |
| Comments | Textarea | Auto-save on blur |
| Save Button | Primary Button | Saves all changes |
| Cancel Button | Ghost Button | Discards changes |

##### Attendance Quick Toggle

```
┌─────────────────────────────────────────────────────────────┐
│ ATTENDANCE                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌────┐ John Smith                                          │
│ │ JS │ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ └────┘ │ ✓ Here  │ │ ✗ Absent│ │ A/M     │                │
│        └─────────┘ └─────────┘ └─────────┘                │
│           [ON]        [off]       [off]                    │
│                                                             │
│ ┌────┐ Jane Doe                                            │
│ │ JD │ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ └────┘ │ ✓ Here  │ │ ✗ Absent│ │ A/M     │                │
│        └─────────┘ └─────────┘ └─────────┘                │
│           [off]       [off]       [ON]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Program Score Counter

```
┌─────────────────────────────────────────────────────────────┐
│ PROGRAM SCORES                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ABA - Matching                                        │  │
│ │                                                       │  │
│ │    ┌───┐   ┌───┐   ┌───┐   ┌───┐                    │  │
│ │    │ - │   │ 0 │   │ P │   │ + │                    │  │
│ │    └───┘   └───┘   └───┘   └───┘                    │  │
│ │     [3]     [0]     [2]     [5]   Total: 10         │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Speech - Articulation                                 │  │
│ │    [2]     [1]     [4]     [3]   Total: 10          │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| View Mode | Default for non-owner | Read-only display, no edit controls |
| Edit Mode | Owner or admin | All fields editable |
| Unsaved Changes | Form dirty | Save button primary, "Unsaved" badge |
| Saving | Save in progress | Save button loading, form disabled |
| Saved | Save successful | Green checkmark, auto-close after 1s |
| Error: Validation | Required field empty | Field border red, error message |
| Error: Conflict | Event overlap detected | Warning banner with conflict details |
| Recurring: Single | Edit single instance | Normal behavior |
| Recurring: Series | User selects "all" | Confirmation modal, batch update |

---

#### SCREEN: Clients List

**Route:** `/clients`
**Access:** Admin, Coordinator, Therapist (own clients only)
**Purpose:** Manage client roster and access individual profiles

##### Core Features
- Searchable client directory
- Quick filters (active, archived, by therapist)
- Client card with key info preview
- Bulk actions (archive, assign therapist)
- New client creation

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Search Bar | Text Input | Live filter as you type |
| Status Filter | Segmented Control | Active / Archived / All |
| Therapist Filter | Dropdown | Filter by assigned therapist |
| Sort Dropdown | Dropdown | Name / Recent / Sessions |
| Client Card | Clickable Card | Opens client profile |
| Archive Button | Icon Button | Moves to archived |
| New Client Button | Primary Button | Opens creation form |
| Bulk Select | Checkbox per card | Enables bulk actions toolbar |

##### Client Card Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌────┐                                                      │
│ │    │  John Smith                           [···]         │
│ │ JS │  Age: 7 years                                       │
│ │    │  Since: Jan 2024                                    │
│ └────┘  ─────────────────────────────────────────────────  │
│                                                             │
│  👤 Dr. Garcia, Dr. Ionescu                                │
│  📅 Next: Tomorrow, 9:00 AM                                │
│  📊 Progress: ████████░░ 78%                               │
│                                                             │
│  [View Profile]                      [Quick Schedule]      │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Clients loaded | Grid/List of client cards |
| Loading | Initial fetch | Skeleton cards (6 placeholders) |
| Empty: No Clients | Zero clients in system | Illustration + "Add your first client" |
| Empty: Search | Search returns 0 | "No clients matching '{query}'" |
| Empty: Filter | Filter returns 0 | "No {status} clients" + Clear filter |
| Bulk Mode | 1+ cards selected | Floating action bar with bulk options |
| Error | API failure | Error toast, retry button |

---

#### SCREEN: Client Profile

**Route:** `/clients/{id}`
**Access:** Admin, Coordinator, Assigned Therapist
**Purpose:** Comprehensive client management hub

##### Core Features
- Client information management
- Evolution tracking (Portage, ABLLS, VB-MAPP)
- Program history and scores
- Intervention plan management
- Document storage
- Report generation

##### Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ← Clients    John Smith                    [Edit] [···]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Overview] [Evolution] [Programs] [Plan] [Docs] [Reports] │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│                    TAB CONTENT AREA                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Tab: Overview

| Section | Content |
|---------|---------|
| Profile Header | Photo, name, age, diagnosis |
| Contact Info | Parent name, phone, email, address |
| Medical Info | Allergies, medications, notes |
| Assigned Team | Therapist avatars with roles |
| Schedule Summary | This week's appointments |
| Quick Stats | Total sessions, attendance rate, last visit |

##### Tab: Evolution

| Element | Behavior |
|---------|----------|
| Assessment Selector | Dropdown: Portage / ABLLS / VB-MAPP |
| Date Range | Filter evolution data by period |
| Domain Cards | Expandable cards per developmental domain |
| Score Input | Slider or numeric for each skill |
| Progress Chart | Line chart showing domain trends |
| Add Assessment | Button to create new assessment entry |

##### Tab: Programs

| Element | Behavior |
|---------|----------|
| Active Programs | List of currently assigned programs |
| Program Card | Name, target, current score, trend arrow |
| Score History | Table of scores across sessions |
| Add Program | Search and assign new program |
| Archive Program | Move to inactive with end date |

##### Tab: Intervention Plan

| Element | Behavior |
|---------|----------|
| Goals List | Numbered list of intervention goals |
| Goal Card | Title, description, target date, status |
| Add Goal | Button to create new goal |
| Edit Goal | Inline editing of goal details |
| Notes Section | Free-form clinical notes |

##### Tab: Documents

| Element | Behavior |
|---------|----------|
| Upload Zone | Drag-and-drop or click to upload |
| File List | Name, type, date, size, uploader |
| File Actions | Download, rename, delete |
| Categories | Filter by type (Assessment, Report, Other) |

##### Tab: Reports

| Element | Behavior |
|---------|----------|
| Generate Report | Button opens report builder |
| Report Type | Dropdown: Progress / Monthly / Custom |
| Date Range | Start and end date for report period |
| Preview | Shows report preview before generation |
| Download | PDF download button |
| Email | Send to parent email |
| Report History | List of previously generated reports |

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Profile loaded | All tabs accessible |
| Loading | Tab data fetching | Tab-specific skeleton |
| Empty: Evolution | No assessments | "Start first assessment" CTA |
| Empty: Programs | No programs assigned | "Assign programs" CTA |
| Empty: Documents | No uploads | Upload illustration |
| Permission Denied | Therapist accessing non-assigned | Redirect with toast message |
| Archived Client | Client is archived | Yellow banner, edit disabled |

---

#### SCREEN: Team Members

**Route:** `/team`
**Access:** Admin (full), Coordinator (read), Therapist (read)
**Purpose:** Manage therapy team roster and permissions

##### Core Features
- Team member directory
- Role assignment
- Color and initials customization
- User account linking
- Performance overview (admin)

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Search Bar | Text Input | Filter by name |
| Role Filter | Chips | All / Admin / Coordinator / Therapist |
| Member Card | Clickable Card | Opens member panel |
| Add Member | Primary Button | Opens creation form |
| Edit Member | Icon Button | Opens edit panel |
| Deactivate | Toggle | Soft-disable account |

##### Team Member Card

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────┐                                                    │
│ │      │  Dr. Maria Garcia                     [Edit]      │
│ │  MG  │  Senior ABA Therapist                             │
│ │      │  Role: Therapist                                  │
│ └──────┘  ─────────────────────────────────────────────────│
│   🟢                                                        │
│                                                             │
│  📧 maria.garcia@tempo.com                                 │
│  👥 Clients: 12 active                                     │
│  📅 This week: 32 sessions                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Team loaded | Grid of member cards |
| Loading | Initial fetch | Skeleton cards |
| Empty | No team members | "Add first team member" |
| Filter: No Results | Search returns 0 | "No matching team members" |
| Deactivated Member | isActive = false | Greyed out card, "Inactive" badge |
| Permission: Read-Only | Coordinator/Therapist | No edit buttons visible |

---

#### SCREEN: Billing

**Route:** `/billing`
**Access:** Admin only
**Purpose:** Financial management and invoicing

##### Core Features
- Monthly billing overview
- Client invoice generation
- Subscription management
- Discount tier configuration
- Payment tracking

##### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Month Selector | Date Picker | Navigate billing periods |
| Overview Cards | Stat Cards | Revenue, pending, paid |
| Client Invoices Table | Data Table | Sortable, filterable |
| Generate Invoices | Primary Button | Batch generate for month |
| Mark Paid | Action Button | Toggle payment status |
| Export | Dropdown | CSV, PDF, Excel |
| Subscription Tab | Tab | Manage recurring fees |
| Discounts Tab | Tab | Configure discount tiers |

##### Billing Overview

```
┌─────────────────────────────────────────────────────────────┐
│ BILLING                           < January 2026 >         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   REVENUE   │  │   PENDING   │  │    PAID     │        │
│  │  $45,230    │  │  $12,450    │  │  $32,780    │        │
│  │  ↑ 12%      │  │  8 invoices │  │  34 invoices│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ CLIENT INVOICES                    [Generate All]   │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Client      │ Sessions │ Amount  │ Status │ Actions │  │
│  ├─────────────┼──────────┼─────────┼────────┼─────────┤  │
│  │ John Smith  │    12    │ $1,200  │ 🟢 Paid │ [View]  │  │
│  │ Jane Doe    │     8    │   $800  │ 🟡 Pend │ [View]  │  │
│  │ Mike Brown  │    15    │ $1,350  │ 🟢 Paid │ [View]  │  │
│  └─────────────┴──────────┴─────────┴────────┴─────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Data loaded | Full billing interface |
| Loading | Fetching month data | Skeleton table |
| Empty: Month | No sessions in month | "No billable sessions" |
| Generating | Batch invoice creation | Progress bar with count |
| Error: Generation | Invoice failed | Error row highlighted |
| Permission Denied | Non-admin access | Redirect to dashboard |

---

#### SCREEN: Analytics

**Route:** `/analytics`
**Access:** Admin, Coordinator (limited)
**Purpose:** Business intelligence and performance metrics

##### Core Features
- Session volume trends
- Attendance rate tracking
- Revenue analytics
- Therapist performance comparison
- Client progress aggregates

##### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ANALYTICS                      [This Month ▼] [Export]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐     │
│  │ SESSIONS              │  │ ATTENDANCE            │     │
│  │ ████████████████ 342  │  │ ████████████░░░ 89%  │     │
│  │ ↑ 8% vs last month    │  │ ↓ 2% vs last month   │     │
│  └───────────────────────┘  └───────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ SESSION VOLUME TREND                                  │ │
│  │                                                       │ │
│  │   ▲                                                   │ │
│  │   │     ●───●                                        │ │
│  │   │   ●       ●───●───●                              │ │
│  │   │ ●                   ●                            │ │
│  │   └─────────────────────────────────────────────▶    │ │
│  │     Jan  Feb  Mar  Apr  May  Jun                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │ BY THERAPIST        │  │ BY EVENT TYPE               │ │
│  │ ───────────────────│  │ ─────────────────────────── │ │
│  │ Dr. Garcia    ████ │  │ ABA         ██████████ 65% │ │
│  │ Dr. Ionescu   ███  │  │ Speech      ████░░░░░░ 20% │ │
│  │ Dr. Dumitrescu ██  │  │ Occupational███░░░░░░░ 10% │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Data loaded | Full analytics dashboard |
| Loading | Fetching metrics | Skeleton charts |
| Empty: Period | No data in range | "No data for selected period" |
| Partial Data | Some metrics unavailable | Available charts + error badges |
| Export | Export triggered | Progress toast, then download |

---

#### SCREEN: Parent Portal - Dashboard

**Route:** `/parent/{clientCode}`
**Access:** Parent (with valid client code)
**Purpose:** Parent-friendly view of child's therapy journey

##### Core Features
- Child's upcoming appointments
- Recent session summaries
- Progress visualization
- Document downloads
- Message therapist (future)

##### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 👋 Welcome back, Alexandru                    [Profile]    │
│ Viewing: John's Portal                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📅 UPCOMING SESSIONS                                  │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                       │ │
│  │  Tomorrow, Jan 7                                      │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │ 9:00 AM - ABA Session with Dr. Garcia          │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  Thursday, Jan 9                                      │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │ 10:30 AM - Speech Therapy with Dr. Ionescu     │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📊 PROGRESS OVERVIEW                    [View All →] │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                       │ │
│  │  Overall Progress                                     │ │
│  │  ████████████████████░░░░░░░░░░ 68%                  │ │
│  │                                                       │ │
│  │  Recent Achievements:                                 │ │
│  │  ✓ Completed matching colors program                 │ │
│  │  ✓ Improved eye contact duration                     │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📄 RECENT DOCUMENTS                                   │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  📑 Monthly Report - December 2025      [Download]   │ │
│  │  📑 Assessment Results - Nov 2025       [Download]   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🏠        📅         📊         📄        👤              │
│  Home    Schedule   Progress    Docs     Profile           │
└─────────────────────────────────────────────────────────────┘
```

##### Logic & States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Default | Valid code, data loaded | Full parent dashboard |
| Loading | Initial fetch | Skeleton layout |
| Invalid Code | Code not found | Error page with contact info |
| Expired Code | Code deactivated | "Contact clinic" message |
| Empty: Schedule | No upcoming events | "No sessions scheduled" |
| Empty: Documents | No shared documents | "Documents will appear here" |

---

### 2.3 Global Components

#### Modal System

| Modal Type | Trigger | Content | Actions |
|------------|---------|---------|---------|
| Confirmation | Delete actions | Warning message | Cancel, Confirm (Danger) |
| Form | Create/Edit | Input fields | Cancel, Save |
| Alert | System messages | Message text | OK |
| Recurring Edit | Edit recurring event | "This event" or "All events" choice | Cancel, This Only, All Events |
| Overlap Warning | Event conflict | Conflict details | Cancel, Create Anyway |

#### Toast Notifications

| Type | Icon | Color | Duration | Actions |
|------|------|-------|----------|---------|
| Success | Checkmark | Green | 3s | None |
| Error | X Circle | Red | 5s | Retry (optional) |
| Warning | Alert | Amber | 5s | None |
| Info | Info | Blue | 3s | None |
| Undo | Arrow CCW | Gray | 5s | Undo button |

#### Command Palette (Cmd+K)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search or type a command...                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ RECENT                                                      │
│ ├─ 📅 Go to Calendar                                       │
│ ├─ 👤 John Smith (Client)                                  │
│ └─ ➕ Create Event                                         │
│                                                             │
│ ACTIONS                                                     │
│ ├─ ➕ New Event                          ⌘N               │
│ ├─ 👤 New Client                         ⌘⇧C              │
│ └─ 📊 View Analytics                     ⌘⇧A              │
│                                                             │
│ NAVIGATION                                                  │
│ ├─ 📅 Calendar                           ⌘1               │
│ ├─ 👥 Clients                            ⌘2               │
│ └─ 👤 Team                               ⌘3               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. User Flows

### 3.1 Critical Flow #1: Log Attendance and Program Scores

**Persona:** Therapist (Maria)
**Goal:** Record attendance and therapy progress for a just-completed session
**Frequency:** 20+ times per day
**Target Time:** < 10 seconds

#### Happy Path

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: LOG ATTENDANCE & SCORES                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐                                              │
│  │  START   │ Therapist is on Dashboard or Calendar       │
│  └────┬─────┘                                              │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. VIEW TODAY'S SCHEDULE                             │  │
│  │    Dashboard shows "NOW" section with current event  │  │
│  │    Event card displays inline attendance buttons     │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. TAP ATTENDANCE STATUS                             │  │
│  │    Therapist taps [✓ Present] button on event card   │  │
│  │    Button animates to selected state                 │  │
│  │    Haptic feedback confirms selection                │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. EVENT PANEL SLIDES OPEN (Optional Detail)         │  │
│  │    Side panel shows program score counters           │  │
│  │    Previous attendance is auto-saved                 │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 4. INCREMENT PROGRAM SCORES                          │  │
│  │    Tap [+] or [-] buttons for each program           │  │
│  │    Counters update immediately with animation        │  │
│  │    Running totals displayed                          │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 5. ADD QUICK NOTE (Optional)                         │  │
│  │    Tap comment icon to expand notes field            │  │
│  │    Type brief observation                            │  │
│  │    Auto-save on blur                                 │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 6. CLOSE OR CONTINUE                                 │  │
│  │    Swipe panel closed or tap outside                 │  │
│  │    Success toast: "Session logged ✓"                 │  │
│  │    Next event is highlighted                         │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │   END    │ Ready for next session                      │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Wireframe Sequence

**Step 1-2: Dashboard with Inline Attendance**
```
┌─────────────────────────────────────────┐
│ TODAY'S SCHEDULE               9:42 AM  │
├─────────────────────────────────────────┤
│                                         │
│  ── NOW ──────────────────────────────  │
│  ┌─────────────────────────────────────┐│
│  │ 🟢 9:00 - 10:00                     ││
│  │ John Smith • ABA Session            ││
│  │                                     ││
│  │  ┌──────┐ ┌──────┐ ┌──────┐       ││
│  │  │✓ Here│ │✗ Away│ │ A/M  │       ││
│  │  └──────┘ └──────┘ └──────┘       ││
│  │    👆 TAP TO SELECT                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  ── UPCOMING ─────────────────────────  │
│  ○ 10:30 - Jane Doe                     │
│                                         │
└─────────────────────────────────────────┘
```

**Step 3-5: Program Scores Panel**
```
┌────────────────────────┬────────────────┐
│                        │ SESSION DETAILS│
│   CALENDAR VIEW        ├────────────────┤
│                        │                │
│   (dimmed background)  │ ✓ Present      │
│                        │ ───────────────│
│                        │                │
│                        │ PROGRAMS       │
│                        │                │
│                        │ ABA - Matching │
│                        │ [-] 3  [+]     │
│                        │                │
│                        │ Speech         │
│                        │ [-] 1  [+]     │
│                        │                │
│                        │ ───────────────│
│                        │                │
│                        │ 💬 Add note... │
│                        │                │
│                        │ [Done]         │
└────────────────────────┴────────────────┘
```

#### Error States

| Error | Trigger | Recovery |
|-------|---------|----------|
| Network failure | Save fails | Toast with retry, local queue |
| Conflict | Another user edited | Show diff, merge or overwrite |
| Session expired | Token invalid | Re-auth modal, preserve data |

---

### 3.2 Critical Flow #2: Create New Event

**Persona:** Coordinator (Andrei)
**Goal:** Schedule a therapy session for a client
**Frequency:** 10-15 times per day
**Target Time:** < 30 seconds

#### Happy Path

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: CREATE NEW EVENT                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐                                              │
│  │  START   │ Coordinator is on Calendar (Week View)      │
│  └────┬─────┘                                              │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. INITIATE EVENT CREATION                           │  │
│  │    Option A: Click empty time slot                   │  │
│  │    Option B: Press FAB (+) button                    │  │
│  │    Option C: Keyboard shortcut (N)                   │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. EVENT CREATION PANEL OPENS                        │  │
│  │    Side panel slides in from right                   │  │
│  │    Date/time pre-filled if clicked on calendar       │  │
│  │    Focus on first field (Event Type)                 │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. SELECT EVENT TYPE                                 │  │
│  │    Dropdown shows: ABA Session, Speech, Eval, etc.   │  │
│  │    Selection auto-sets default duration              │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 4. SELECT CLIENT                                     │  │
│  │    Searchable dropdown with client list              │  │
│  │    Shows client name + assigned therapist(s)         │  │
│  │    Multi-select for group sessions                   │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 5. SELECT THERAPIST                                  │  │
│  │    Dropdown with team members + color indicators     │  │
│  │    Auto-suggests based on client assignment          │  │
│  │    Multi-select available                            │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 6. SET DATE & TIME                                   │  │
│  │    Date picker (if not pre-filled)                   │  │
│  │    Time picker with 15-min increments                │  │
│  │    Duration stepper (default from event type)        │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 7. OVERLAP CHECK (Automatic)                         │  │
│  │    System checks for therapist conflicts             │  │
│  │    If conflict: Yellow warning banner shown          │  │
│  │    User can proceed or adjust time                   │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 8. SET RECURRENCE (Optional)                         │  │
│  │    Toggle: "Repeat this event"                       │  │
│  │    Options: Daily, Weekly (select days), Monthly     │  │
│  │    End date or occurrence count                      │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 9. SAVE EVENT                                        │  │
│  │    Click "Create Event" button                       │  │
│  │    Button shows loading state                        │  │
│  │    Success: Panel closes, event appears on calendar  │  │
│  │    Toast: "Event created ✓"                          │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │   END    │ Event visible on calendar                   │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Wireframe: Event Creation Panel

```
┌────────────────────────┬────────────────────────────────────┐
│                        │ NEW EVENT                    [X]  │
│   WEEK VIEW            ├────────────────────────────────────┤
│   (visible behind)     │                                    │
│                        │ Event Type *                       │
│   ┌─ Ghost preview ─┐  │ ┌────────────────────────────────┐│
│   │    9:00         │  │ │ ABA Session              ▼    ││
│   │    New Event    │  │ └────────────────────────────────┘│
│   │                 │  │                                    │
│   └─────────────────┘  │ Client *                           │
│                        │ ┌────────────────────────────────┐│
│                        │ │ 🔍 Search clients...           ││
│                        │ └────────────────────────────────┘│
│                        │                                    │
│                        │ Therapist *                        │
│                        │ ┌────────────────────────────────┐│
│                        │ │ 🔵 Dr. Garcia            ▼    ││
│                        │ └────────────────────────────────┘│
│                        │                                    │
│                        │ Date & Time                        │
│                        │ ┌──────────┐  ┌────────┐  ┌─────┐│
│                        │ │ Jan 6    │  │ 9:00   │  │ 60m ││
│                        │ └──────────┘  └────────┘  └─────┘│
│                        │                                    │
│                        │ ☐ Repeat this event               │
│                        │                                    │
│                        │ ┌────────────────────────────────┐│
│                        │ │        Create Event            ││
│                        │ └────────────────────────────────┘│
└────────────────────────┴────────────────────────────────────┘
```

#### Error States

| Error | Trigger | Recovery |
|-------|---------|----------|
| Validation error | Required field empty | Field highlight + message |
| Overlap detected | Time conflict | Warning banner, adjust or override |
| Save failed | Network error | Retry button, data preserved |
| Permission denied | Therapist creating for another | Toast + redirect |

---

### 3.3 Critical Flow #3: View Child's Progress (Parent)

**Persona:** Parent (Alexandru)
**Goal:** Check child's therapy progress and upcoming schedule
**Frequency:** Weekly
**Target Time:** < 60 seconds to key information

#### Happy Path

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW: PARENT VIEWS CHILD PROGRESS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐                                              │
│  │  START   │ Parent opens TempoApp on phone              │
│  └────┬─────┘                                              │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. ENTER PARENT PORTAL                               │  │
│  │    Parent sees login screen                          │  │
│  │    Taps "Parent Access" button                       │  │
│  │    Alternative: Saved session auto-login             │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. ENTER CLIENT CODE                                 │  │
│  │    6-character code input field                      │  │
│  │    "Forgot code?" link to contact clinic             │  │
│  │    Submit validates code                             │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. PARENT DASHBOARD LOADS                            │  │
│  │    Child's name and photo displayed                  │  │
│  │    Upcoming sessions summary                         │  │
│  │    Progress overview card                            │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 4. TAP "PROGRESS" TAB                                │  │
│  │    Bottom navigation: Progress icon                  │  │
│  │    Progress screen loads                             │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 5. VIEW PROGRESS CHARTS                              │  │
│  │    Overall progress percentage                       │  │
│  │    Domain breakdown (Communication, Motor, etc.)     │  │
│  │    Trend line showing improvement over time          │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 6. EXPAND DOMAIN DETAILS (Optional)                  │  │
│  │    Tap domain card to see specific skills            │  │
│  │    Each skill shows: current level, target, trend    │  │
│  │    Plain-language descriptions (not clinical)        │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 7. DOWNLOAD REPORT (Optional)                        │  │
│  │    "Download Report" button visible                  │  │
│  │    PDF generates with progress summary               │  │
│  │    Opens in device PDF viewer                        │  │
│  └────┬─────────────────────────────────────────────────┘  │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                              │
│  │   END    │ Parent informed about child's progress      │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Wireframe: Parent Progress View

```
┌─────────────────────────────────────────┐
│ ← Back         John's Progress          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        OVERALL PROGRESS             ││
│  │                                     ││
│  │           ┌───────┐                 ││
│  │           │       │                 ││
│  │           │  68%  │                 ││
│  │           │       │                 ││
│  │           └───────┘                 ││
│  │                                     ││
│  │    Great progress this month!       ││
│  └─────────────────────────────────────┘│
│                                         │
│  DEVELOPMENT AREAS                      │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🗣️ Communication          78% ▲    ││
│  │ ████████████████░░░░░░░          > ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 🤝 Social Skills           65% ▲    ││
│  │ █████████████░░░░░░░░░           > ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ ✋ Motor Skills            72% ─    ││
│  │ ███████████████░░░░░░░           > ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │      📄 Download Full Report        ││
│  └─────────────────────────────────────┘│
│                                         │
├─────────────────────────────────────────┤
│  🏠       📅       📊       📄      👤  │
│  Home   Schedule Progress  Docs  Profile│
└─────────────────────────────────────────┘
```

#### Error States

| Error | Trigger | Recovery |
|-------|---------|----------|
| Invalid code | Wrong client code | "Code not found" + contact link |
| Expired session | Token timeout | Re-enter code screen |
| No data | No assessments yet | "Check back soon" message |
| Report failed | PDF generation error | Retry button |

---

## 4. Figma Design System Specification

### 4.1 Typography Scale

#### Font Family

| Usage | Font | Weight | Fallback |
|-------|------|--------|----------|
| Primary | Inter | 400, 500, 600, 700 | system-ui, sans-serif |
| Monospace | JetBrains Mono | 400, 500 | monospace |

#### Type Scale (Desktop)

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `display-xl` | 48px | 56px | 700 | Hero headings |
| `display-lg` | 40px | 48px | 700 | Page titles |
| `heading-xl` | 32px | 40px | 600 | Section headers |
| `heading-lg` | 24px | 32px | 600 | Card titles |
| `heading-md` | 20px | 28px | 600 | Subsection headers |
| `heading-sm` | 18px | 24px | 600 | List headers |
| `body-lg` | 18px | 28px | 400 | Lead paragraphs |
| `body-md` | 16px | 24px | 400 | Default body text |
| `body-sm` | 14px | 20px | 400 | Secondary text |
| `caption` | 12px | 16px | 400 | Labels, timestamps |
| `overline` | 11px | 16px | 600 | Section labels (uppercase) |

#### Type Scale (Mobile)

| Token | Desktop | Mobile | Notes |
|-------|---------|--------|-------|
| `display-xl` | 48px | 36px | Scale down 25% |
| `display-lg` | 40px | 32px | Scale down 20% |
| `heading-xl` | 32px | 28px | Slight reduction |
| `heading-lg` | 24px | 22px | Slight reduction |
| Others | Same | Same | No change needed |

#### Font Loading Strategy

```css
/* Preload critical fonts */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Medium.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

---

### 4.2 Color Palette

#### Primary Colors

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary-50` | #EEF4FF | 238, 244, 255 | Subtle backgrounds |
| `primary-100` | #D9E5FF | 217, 229, 255 | Hover states |
| `primary-200` | #BDD1FF | 189, 209, 255 | Light accents |
| `primary-300` | #91B4FF | 145, 180, 255 | Disabled states |
| `primary-400` | #5E91FF | 94, 145, 255 | Secondary actions |
| `primary-500` | #4A90E2 | 74, 144, 226 | **Primary brand** |
| `primary-600` | #3B73B4 | 59, 115, 180 | Hover on primary |
| `primary-700` | #2D5A8C | 45, 90, 140 | Active/pressed |
| `primary-800` | #1F4166 | 31, 65, 102 | Dark accents |
| `primary-900` | #142D47 | 20, 45, 71 | Darkest shade |

#### Secondary Colors (Warm Accent)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `secondary-50` | #FEF8F3 | 254, 248, 243 | Subtle warm bg |
| `secondary-100` | #FDF1E7 | 253, 241, 231 | Card backgrounds |
| `secondary-200` | #F9E1CC | 249, 225, 204 | Borders |
| `secondary-300` | #F4CBA8 | 244, 203, 168 | Decorative |
| `secondary-400` | #EDB07A | 237, 176, 122 | Highlights |
| `secondary-500` | #E09448 | 224, 148, 72 | **Secondary brand** |
| `secondary-600` | #C47A2E | 196, 122, 46 | Hover |
| `secondary-700` | #9E5F1F | 158, 95, 31 | Active |
| `secondary-800` | #784715 | 120, 71, 21 | Dark |
| `secondary-900` | #52310E | 82, 49, 14 | Darkest |

#### Semantic Colors

**Success**
| Token | Hex | Usage |
|-------|-----|-------|
| `success-50` | #ECFDF5 | Success backgrounds |
| `success-100` | #D1FAE5 | Light success |
| `success-500` | #10B981 | **Success primary** |
| `success-600` | #059669 | Success hover |
| `success-700` | #047857 | Success active |

**Warning**
| Token | Hex | Usage |
|-------|-----|-------|
| `warning-50` | #FFFBEB | Warning backgrounds |
| `warning-100` | #FEF3C7 | Light warning |
| `warning-500` | #F59E0B | **Warning primary** |
| `warning-600` | #D97706 | Warning hover |
| `warning-700` | #B45309 | Warning active |

**Error**
| Token | Hex | Usage |
|-------|-----|-------|
| `error-50` | #FEF2F2 | Error backgrounds |
| `error-100` | #FEE2E2 | Light error |
| `error-500` | #EF4444 | **Error primary** |
| `error-600` | #DC2626 | Error hover |
| `error-700` | #B91C1C | Error active |

**Info**
| Token | Hex | Usage |
|-------|-----|-------|
| `info-50` | #EFF6FF | Info backgrounds |
| `info-100` | #DBEAFE | Light info |
| `info-500` | #3B82F6 | **Info primary** |
| `info-600` | #2563EB | Info hover |
| `info-700` | #1D4ED8 | Info active |

#### Neutral Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `neutral-0` | #FFFFFF | #000000 | Pure white/black |
| `neutral-50` | #F9FAFB | #0A0A0A | Page background |
| `neutral-100` | #F3F4F6 | #171717 | Card background |
| `neutral-200` | #E5E7EB | #262626 | Borders, dividers |
| `neutral-300` | #D1D5DB | #404040 | Disabled borders |
| `neutral-400` | #9CA3AF | #525252 | Placeholder text |
| `neutral-500` | #6B7280 | #737373 | Secondary text |
| `neutral-600` | #4B5563 | #A3A3A3 | Body text (dark) |
| `neutral-700` | #374151 | #D4D4D4 | Body text |
| `neutral-800` | #1F2937 | #E5E5E5 | Headings |
| `neutral-900` | #111827 | #F5F5F5 | Primary text |
| `neutral-950` | #030712 | #FAFAFA | Darkest/Lightest |

#### Therapist Color Palette

| Color | Hex | Name |
|-------|-----|------|
| Therapist 1 | #4A90E2 | Ocean Blue |
| Therapist 2 | #10B981 | Emerald |
| Therapist 3 | #8B5CF6 | Violet |
| Therapist 4 | #F59E0B | Amber |
| Therapist 5 | #EC4899 | Pink |
| Therapist 6 | #06B6D4 | Cyan |
| Therapist 7 | #84CC16 | Lime |
| Therapist 8 | #F97316 | Orange |

---

### 4.3 Component Tokens

#### Buttons

**Size Variants**

| Size | Height | Padding X | Font Size | Icon Size | Border Radius |
|------|--------|-----------|-----------|-----------|---------------|
| `sm` | 32px | 12px | 14px | 16px | 6px |
| `md` | 40px | 16px | 14px | 20px | 8px |
| `lg` | 48px | 20px | 16px | 24px | 10px |
| `xl` | 56px | 24px | 18px | 28px | 12px |

**Style Variants**

```
┌─────────────────────────────────────────────────────────────┐
│ PRIMARY                                                     │
├─────────────────────────────────────────────────────────────┤
│ Default:   bg: primary-500    text: white    border: none  │
│ Hover:     bg: primary-600    text: white                  │
│ Active:    bg: primary-700    text: white                  │
│ Disabled:  bg: neutral-200    text: neutral-400            │
│ Focus:     ring: 3px primary-200 offset-2                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECONDARY                                                   │
├─────────────────────────────────────────────────────────────┤
│ Default:   bg: neutral-100    text: neutral-700  border: 1px neutral-300│
│ Hover:     bg: neutral-200    text: neutral-800            │
│ Active:    bg: neutral-300    text: neutral-900            │
│ Disabled:  bg: neutral-100    text: neutral-400            │
│ Focus:     ring: 3px primary-200 offset-2                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GHOST                                                       │
├─────────────────────────────────────────────────────────────┤
│ Default:   bg: transparent    text: neutral-700  border: none│
│ Hover:     bg: neutral-100    text: neutral-800            │
│ Active:    bg: neutral-200    text: neutral-900            │
│ Disabled:  bg: transparent    text: neutral-400            │
│ Focus:     ring: 3px primary-200 offset-2                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DANGER                                                      │
├─────────────────────────────────────────────────────────────┤
│ Default:   bg: error-500      text: white      border: none│
│ Hover:     bg: error-600      text: white                  │
│ Active:    bg: error-700      text: white                  │
│ Disabled:  bg: error-200      text: error-400              │
│ Focus:     ring: 3px error-200 offset-2                    │
└─────────────────────────────────────────────────────────────┘
```

**Button Anatomy**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │  [Icon]  Label Text  [Icon]                       │    │
│   └───────────────────────────────────────────────────┘    │
│      ↑         ↑           ↑                               │
│   Leading   Content     Trailing                           │
│    Icon     (Required)    Icon                             │
│  (Optional)             (Optional)                         │
│                                                             │
│   Gap between icon and text: 8px                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### Input Fields

**Size Variants**

| Size | Height | Padding X | Font Size | Border Radius |
|------|--------|-----------|-----------|---------------|
| `sm` | 36px | 12px | 14px | 6px |
| `md` | 44px | 14px | 16px | 8px |
| `lg` | 52px | 16px | 18px | 10px |

**State Variants**

```
┌─────────────────────────────────────────────────────────────┐
│ DEFAULT                                                     │
├─────────────────────────────────────────────────────────────┤
│ bg: neutral-0 (white)                                      │
│ border: 1px neutral-300                                    │
│ text: neutral-900                                          │
│ placeholder: neutral-400                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ HOVER                                                       │
├─────────────────────────────────────────────────────────────┤
│ border: 1px neutral-400                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FOCUS                                                       │
├─────────────────────────────────────────────────────────────┤
│ border: 2px primary-500                                    │
│ ring: 3px primary-100                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ERROR                                                       │
├─────────────────────────────────────────────────────────────┤
│ border: 2px error-500                                      │
│ bg: error-50                                               │
│ + Error message below: error-600, body-sm                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DISABLED                                                    │
├─────────────────────────────────────────────────────────────┤
│ bg: neutral-100                                            │
│ border: 1px neutral-200                                    │
│ text: neutral-400                                          │
│ cursor: not-allowed                                        │
└─────────────────────────────────────────────────────────────┘
```

**Input Anatomy**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Label Text *                              (Helper Icon)  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ [Icon]  Placeholder or value...           [Action] │  │
│   └─────────────────────────────────────────────────────┘  │
│   Helper text or error message                             │
│                                                             │
│   Components:                                               │
│   - Label: body-sm, neutral-700, 500 weight               │
│   - Required indicator: error-500                          │
│   - Leading icon: 20px, neutral-400                       │
│   - Trailing action: clear button or toggle               │
│   - Helper: caption, neutral-500                          │
│   - Error: caption, error-600                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### Cards

**Elevation Levels**

| Level | Shadow | Usage |
|-------|--------|-------|
| `elevation-0` | none | Flat cards, selected states |
| `elevation-1` | `0 1px 2px rgba(0,0,0,0.05)` | Default cards |
| `elevation-2` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Raised cards, hover |
| `elevation-3` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `elevation-4` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Popovers, tooltips |
| `elevation-5` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Dialog overlays |

**Card Variants**

```
┌─────────────────────────────────────────────────────────────┐
│ CARD - DEFAULT                                              │
├─────────────────────────────────────────────────────────────┤
│ bg: neutral-0 (white)                                      │
│ border: 1px neutral-200                                    │
│ border-radius: 12px                                        │
│ padding: 16px (md) | 20px (lg) | 24px (xl)                │
│ shadow: elevation-1                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CARD - INTERACTIVE (Clickable)                              │
├─────────────────────────────────────────────────────────────┤
│ Default: elevation-1                                        │
│ Hover: elevation-2, border: primary-200                    │
│ Active: elevation-1, bg: primary-50                        │
│ Focus: ring: 3px primary-200                               │
│ cursor: pointer                                            │
│ transition: all 150ms ease                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CARD - SELECTED                                             │
├─────────────────────────────────────────────────────────────┤
│ bg: primary-50                                             │
│ border: 2px primary-500                                    │
│ shadow: elevation-0                                        │
└─────────────────────────────────────────────────────────────┘
```

**Card Anatomy**

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐│
│ │  HEADER (Optional)                                      ││
│ │  ┌────────┐                                             ││
│ │  │ Avatar │  Title                         [Actions]   ││
│ │  │        │  Subtitle                                  ││
│ │  └────────┘                                             ││
│ ├─────────────────────────────────────────────────────────┤│
│ │  BODY                                                   ││
│ │                                                         ││
│ │  Main content area with text, data, or nested          ││
│ │  components. Flexible height.                          ││
│ │                                                         ││
│ ├─────────────────────────────────────────────────────────┤│
│ │  FOOTER (Optional)                                      ││
│ │                                                         ││
│ │  Secondary info              [Button] [Button]         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Spacing:                                                    │
│ - Header/Body/Footer gap: 16px                             │
│ - Internal padding: 16-24px                                │
│ - Avatar/content gap: 12px                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.4 Grid & Spacing System

#### 8pt Grid System

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | No spacing |
| `space-0.5` | 2px | Micro spacing |
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Default inline spacing |
| `space-3` | 12px | Small gaps |
| `space-4` | 16px | Default component padding |
| `space-5` | 20px | Medium gaps |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | XL spacing |
| `space-12` | 48px | Section dividers |
| `space-16` | 64px | Page sections |
| `space-20` | 80px | Major sections |
| `space-24` | 96px | Hero spacing |

#### Layout Grid

**Desktop (1440px viewport)**

```
┌─────────────────────────────────────────────────────────────┐
│                          1440px                             │
├────┬────────────────────────────────────────────────────┬───┤
│    │                                                    │   │
│ 72 │              12-Column Grid (1128px)               │72 │
│ px │  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐│px │
│    │  │ 70 │ 24 │ 70 │ 24 │ 70 │ 24 │ 70 │ 24 │ 70 │... ││   │
│    │  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘│   │
│    │    ↑         ↑                                      │   │
│    │  Column    Gutter                                  │   │
│    │   70px      24px                                   │   │
├────┴────────────────────────────────────────────────────┴───┤
│ Margin: 72px | Columns: 12 | Column: 70px | Gutter: 24px   │
└─────────────────────────────────────────────────────────────┘
```

**Tablet (768px viewport)**

```
┌─────────────────────────────────────────────────────────────┐
│                          768px                              │
├────┬────────────────────────────────────────────────────┬───┤
│    │                                                    │   │
│ 32 │               8-Column Grid (704px)                │32 │
│ px │  ┌────┬────┬────┬────┬────┬────┬────┬────┐        │px │
│    │  │ 72 │ 16 │ 72 │ 16 │ 72 │ 16 │ 72 │ 16 │        │   │
│    │  └────┴────┴────┴────┴────┴────┴────┴────┘        │   │
├────┴────────────────────────────────────────────────────┴───┤
│ Margin: 32px | Columns: 8 | Column: 72px | Gutter: 16px    │
└─────────────────────────────────────────────────────────────┘
```

**Mobile (375px viewport)**

```
┌─────────────────────────────────────────────────────────────┐
│                          375px                              │
├────┬────────────────────────────────────────────────────┬───┤
│    │                                                    │   │
│ 16 │               4-Column Grid (343px)                │16 │
│ px │  ┌────────┬────┬────────┬────┬────────┬────┐      │px │
│    │  │   76   │ 12 │   76   │ 12 │   76   │ 12 │      │   │
│    │  └────────┴────┴────────┴────┴────────┴────┘      │   │
├────┴────────────────────────────────────────────────────┴───┤
│ Margin: 16px | Columns: 4 | Column: 76px | Gutter: 12px    │
└─────────────────────────────────────────────────────────────┘
```

#### Responsive Breakpoints

| Breakpoint | Width | Columns | Margin | Gutter |
|------------|-------|---------|--------|--------|
| `mobile` | < 640px | 4 | 16px | 12px |
| `tablet` | 640-1023px | 8 | 32px | 16px |
| `desktop` | 1024-1439px | 12 | 48px | 20px |
| `wide` | >= 1440px | 12 | 72px | 24px |

#### Container Widths

| Token | Max Width | Usage |
|-------|-----------|-------|
| `container-sm` | 640px | Narrow content (forms) |
| `container-md` | 768px | Medium content |
| `container-lg` | 1024px | Standard content |
| `container-xl` | 1280px | Wide content |
| `container-2xl` | 1440px | Full-width content |

#### Common Layout Patterns

**Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (64px)                                               │
├─────────┬───────────────────────────────────────────────────┤
│         │                                                   │
│ SIDEBAR │              MAIN CONTENT                         │
│ (240px) │                                                   │
│         │  ┌─────────────────────────────────────────────┐ │
│  Fixed  │  │ Content area with internal padding: 24px   │ │
│         │  │ Max-width: container-xl                    │ │
│         │  │ Centered within available space            │ │
│         │  └─────────────────────────────────────────────┘ │
│         │                                                   │
└─────────┴───────────────────────────────────────────────────┘

Mobile: Sidebar collapses to bottom navigation (56px)
```

**Calendar Layout**

```
┌─────────────────────────────────────────────────────────────┐
│ TOOLBAR (56px) - View switcher, navigation, filters        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    CALENDAR GRID                            │
│                                                             │
│  Time    │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │         │
│  Gutter  │ Equal │ Equal │ Equal │ Equal │ Equal │         │
│  (60px)  │ width │ width │ width │ width │ width │         │
│          │       │       │       │       │       │         │
│          │       │       │       │       │       │         │
│          │       │       │       │       │       │         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Grid: Equal columns for each day, flexible width           │
│ Time column: Fixed 60px                                    │
│ Row height: 60px per hour                                  │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.5 Animation & Motion

#### Timing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `ease-default` | cubic-bezier(0.4, 0, 0.2, 1) | General transitions |
| `ease-in` | cubic-bezier(0.4, 0, 1, 1) | Exit animations |
| `ease-out` | cubic-bezier(0, 0, 0.2, 1) | Enter animations |
| `ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy interactions |

#### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `duration-instant` | 0ms | Immediate feedback |
| `duration-fast` | 100ms | Micro-interactions |
| `duration-normal` | 200ms | Standard transitions |
| `duration-slow` | 300ms | Complex animations |
| `duration-slower` | 500ms | Page transitions |

#### Common Animations

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide In Right (Panels) */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Scale In (Modals) */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Shake (Error) */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* Pulse (Loading) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Spin (Spinner) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

### 4.6 Iconography

#### Icon Sizes

| Token | Size | Stroke | Usage |
|-------|------|--------|-------|
| `icon-xs` | 12px | 1.5px | Inline indicators |
| `icon-sm` | 16px | 1.5px | Small buttons, badges |
| `icon-md` | 20px | 2px | Default icons |
| `icon-lg` | 24px | 2px | Large buttons |
| `icon-xl` | 32px | 2px | Feature icons |
| `icon-2xl` | 48px | 2px | Empty states |

#### Icon Library

Recommended: **Lucide Icons** (MIT license, consistent 24px grid)

Core icons needed:
- Navigation: `home`, `calendar`, `users`, `user`, `bar-chart-2`, `settings`
- Actions: `plus`, `edit`, `trash-2`, `download`, `upload`, `send`
- Status: `check`, `x`, `alert-triangle`, `info`, `loader`
- Calendar: `clock`, `repeat`, `calendar-plus`, `calendar-check`
- UI: `chevron-down`, `chevron-right`, `search`, `menu`, `x`, `more-vertical`

---

### 4.7 Accessibility Requirements

#### Color Contrast

| Combination | Minimum Ratio | Status |
|-------------|---------------|--------|
| Body text on background | 4.5:1 | AA Required |
| Large text on background | 3:1 | AA Required |
| UI components | 3:1 | AA Required |
| Focus indicators | 3:1 | AA Required |

#### Touch Targets

| Element | Minimum Size | Recommended |
|---------|-------------|-------------|
| Buttons | 44 × 44px | 48 × 48px |
| Icon buttons | 44 × 44px | 44 × 44px |
| Checkboxes | 24 × 24px + 44px tap area | 44 × 44px |
| Links (inline) | Height of line | N/A |

#### Focus States

All interactive elements must have visible focus indicators:
- **Ring style:** 3px offset, primary-500 color
- **Contrast:** Must meet 3:1 against adjacent colors
- **Motion:** 150ms transition

#### Screen Reader Support

- All images require `alt` text
- Icons used alone require `aria-label`
- Dynamic content updates use `aria-live`
- Form errors linked with `aria-describedby`

---

## Appendix A: Component Checklist for Figma

### Atoms
- [ ] Typography styles (all scales)
- [ ] Color styles (all tokens)
- [ ] Icons (24 core icons minimum)
- [ ] Avatars (sizes: sm, md, lg)
- [ ] Badges (status, count, role)
- [ ] Dividers (horizontal, vertical)
- [ ] Loaders (spinner, skeleton)

### Molecules
- [ ] Buttons (all variants, sizes, states)
- [ ] Input fields (text, password, search)
- [ ] Select/Dropdown
- [ ] Checkbox & Radio
- [ ] Toggle switch
- [ ] Date picker
- [ ] Time picker
- [ ] Chips/Tags
- [ ] Tooltips
- [ ] Toast notifications

### Organisms
- [ ] Cards (event, client, team, stat)
- [ ] Navigation (sidebar, bottom nav, header)
- [ ] Modals (confirmation, form, alert)
- [ ] Side panels
- [ ] Tables
- [ ] Calendar grids (month, week, day)
- [ ] Forms (login, event, client)
- [ ] Empty states
- [ ] Error states

### Templates
- [ ] Login page
- [ ] Dashboard
- [ ] Calendar view
- [ ] Client list
- [ ] Client profile
- [ ] Team list
- [ ] Billing dashboard
- [ ] Analytics dashboard
- [ ] Parent portal

---

## Appendix B: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 31, 2026 | Product Squad | Initial specification |

---

**End of Document**
