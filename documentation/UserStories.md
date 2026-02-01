# TempoApp User Stories

This document outlines the core functional requirements for TempoApp, categorized by user role. These stories serve as the foundation for development, testing, and feature prioritization.

---

## 1. Administrator User Stories

**Focus:** Clinic oversight, billing, team management, and system configuration.

| ID | User Story | UX / Functional Specifics |
|:---|:---|:---|
| **A1** | As an Admin, I want to see a financial overview on my dashboard so I can monitor the clinic's revenue health. | Dashboard should show KPI cards: "Today's Revenue", "Active Clients", and "Pending Invoices". Each card should have a sparkline trend. |
| **A2** | As an Admin, I want to send role-based invite links to new users so they can register themselves securely. | Invite modal should have a dropdown for roles (Therapist, Coordinator, Admin, Parent). Admin enters email; system generates a unique, single-use link. |
| **A3** | As an Admin, I want parents to be excluded from the "Team" page while therapists are visible. | The `team_members` collection logic must distinguish between clinic staff and parent users. The `/team` page filter should exclude users with the `Parent` role. |
| **A4** | As an Admin, I want to see a monthly billing report showing what each client owes. | A table view in `/billing` that aggregates completed sessions for the current month, applies the client's rate/subscription, and displays a "Generate Invoice" button. |
| **A5** | As an Admin, I want to track team member hours and calculate their monthly payouts. | Billing page should have a "Team Payouts" tab showing: `Therapist Name | Total Hours | Session Count | Calculated Payout` (based on their specific rate). |
| **A6** | As an Admin, I want to manage the master list of therapy programs (e.g., ABA, Speech). | A "Settings > Programs" area where I can CRUD programs. These programs populate the multi-select list in the Event Modal. |

---

## 2. Coordinator User Stories

**Focus:** Scheduling, client assignments, and report management.

| ID | User Story | UX / Functional Specifics |
|:---|:---|:---|
| **C1** | As a Coordinator, I want to create recurring weekly events so I don't have to manually schedule every session. | In the Event Creation panel, a "Repeat Weekly" toggle that allows selecting days (M, T, W, etc.) and an end date or occurrence count. |
| **C2** | As a Coordinator, I want to be warned if I schedule a therapist for overlapping sessions. | On "Save" in the Event Modal, the system performs a conflict check. If a collision is found, a yellow warning banner appears: "Therapist is already booked for [Client Name] at this time. Create anyway?" |
| **C3** | As a Coordinator, I want to assign specific therapy programs to a client's profile. | In the Client Profile > Programs tab, a "Assign Program" button opens a search/multi-select list of all master programs. Assigned programs appear as cards on the client profile. |
| **C4** | As a Coordinator, I want to generate a monthly progress report for a client to share with their parent. | A "Reports" tab in Client Profile with a "Generate PDF" button that pulls data from session notes and program scores for a selected date range. |

---

## 3. Therapist User Stories

**Focus:** Daily schedule, attendance logging, and clinical data collection.

| ID | User Story | UX / Functional Specifics |
|:---|:---|:---|
| **T1** | As a Therapist, I want to see my "Now" session on the dashboard so I can quickly log attendance. | The Dashboard should have a "Schedule" card. If a session is currently active (based on system time), it is highlighted with large "Present", "Absent", and "Excused" buttons. |
| **T2** | As a Therapist, I want to record program scores (Trial 1: +, Trial 2: -, etc.) during a session. | The Event Detail Panel (right slide-in) should list the programs assigned to that client. Each program has `[-] 0 [+]` counters for different score types (+, -, 0, P). |
| **T3** | As a Therapist, I want to add clinical observations to a session. | A "Session Notes" textarea in the Event Detail Panel that auto-saves on blur or periodically. |
| **T4** | As a Therapist, I want to see a client's medical alerts before starting a session. | Client Profile "Overview" and Event Detail Panel should both feature a prominent "Medical Info" section with a red/amber alert icon if data exists. |

---

## 4. Parent User Stories

**Focus:** Viewing child progress, schedule, and documents.

| ID | User Story | UX / Functional Specifics |
|:---|:---|:---|
| **P1** | As a Parent, I want to log in using a "Client Code" so I don't have to manage another complex password. | The `/login` page has a "Parent Access" toggle that replaces the email/password fields with a single 6-character alphanumeric input. |
| **P2** | As a Parent, I want to see my child's upcoming therapy schedule on a mobile-friendly dashboard. | Mobile-first dashboard showing a simple vertical list of upcoming appointments with therapist names and times. |
| **P3** | As a Parent, I want to see visual charts of my child's progress in different developmental areas. | "Progress" tab showing line or bar charts for domains like "Communication", "Motor Skills", and "Social Play" based on clinical assessments. |
| **P4** | As a Parent, I want to download reports shared by the clinic. | A "Documents" tab that lists shared PDF reports with a clear "Download" icon. |

---

## 5. Technical & System Stories

**Focus:** Reliability, security, and performance.

| ID | User Story | UX / Functional Specifics |
|:---|:---|:---|
| **S1** | As a User, I want the app to work offline so I can log sessions in areas with poor connectivity. | Implement Firestore offline persistence. A "Syncing" vs "Synced" status indicator should appear in the header when connectivity changes. |
| **S2** | As a User, I want the UI to be fast and responsive, especially on tablets. | Target <2s load time. Use skeleton loaders for all cards and lists during data fetching to provide immediate visual feedback. |
| **S3** | As a User, I want a "Dark Mode" option to reduce eye strain during evening documentation. | A theme toggle in the header/sidebar that persists the user's preference in local storage. |
