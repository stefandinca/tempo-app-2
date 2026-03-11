# TempoApp — Project Overview

> A Complete Therapy Center Management Platform

---

# What is TempoApp?

TempoApp is a modern, web-based management platform built specifically for **ABA (Applied Behavior Analysis) therapy centers** in Romania. It brings together everything a therapy center needs into one place: client management, scheduling, clinical evaluations, billing, team coordination, and parent communication.

The platform works on any device — desktop computers, tablets, and phones — and can be installed as an app on mobile devices for quick access. It supports both **English** and **Romanian** languages throughout the entire interface.

---

# Who Uses TempoApp?

TempoApp serves five types of users, each with their own level of access:

## Staff Portal Users

| Role | Description | What They Can Do |
| --- | --- | --- |
| **Superadmin** | System administrator | Everything — full system configuration, all features |
| **Admin** | Center administrator | Billing, analytics, team management, client management |
| **Coordinator** | Clinical coordinator | Scheduling, client management, evaluations, reporting |
| **Therapist** | Therapy professional | View their schedule, manage assigned clients, record session data |

## Parent Portal Users

| Role | Description | What They Can Do |
| --- | --- | --- |
| **Parent** | Parent/guardian of a child client | View their child's progress, schedule, homework, invoices, and communicate with staff |

---

# Key Features

## 1. Dashboard

The main dashboard is the first thing staff see when they log in. It provides an at-a-glance overview of:

- **Today's scheduled sessions** — Who is coming in, when, and with which therapist
- **Key performance indicators (KPIs)** — Total sessions this month, active clients, monthly revenue, attendance rate
- **Recent activity feed** — A live stream of what's happening across the center (new clients added, evaluations completed, sessions updated)
- **Quick actions** — Fast access to create new sessions, add clients, or send messages

---

## 2. Calendar & Scheduling

The calendar is the heart of daily operations. It allows staff to manage all therapy sessions:

- **Multiple views** — View the schedule as a weekly grid, monthly overview, daily timeline, or monthly agenda list
- **Session creation** — A step-by-step wizard to create new sessions:
    1. Choose team members and set the date/time
    2. Select which clients will attend
    3. Assign specific therapy programs and add notes
    4. Review and confirm
- **Recurring sessions** — Set up sessions that repeat automatically (e.g., every Monday at 10am)
- **Attendance tracking** — Mark each client as Present, Absent, or Excused directly from the calendar
- **Session scoring** — During or after a session, therapists can record program scores (minus, zero, prompted, plus) to track how the child performed
- **Session notes** — Add observations and notes for each session
- **Filtering** — Filter the calendar by therapist, client, or service type to see exactly what you need
- **Real-time updates** — Changes made by one team member appear instantly for everyone else

---

## 3. Client Management

Complete management of all therapy clients (children):

- **Client profiles** — Store each child's name, birth date, diagnosis, diagnosis level, and contact information
- **Therapy team** — Assign therapists to each client
- **Client access codes** — Generate codes that parents use to access the Parent Portal

Each client has a detailed profile page with multiple sections:

| Tab | Purpose |
| --- | --- |
| **Overview** | Basic information, assigned therapists, active programs, quick stats |
| **Evaluations** | All clinical evaluations (ABLLS-R, VB-MAPP, Portage, CARS, Carolina) with history |
| **VB-MAPP** | Dedicated view for VB-MAPP assessment tracking and milestone grids |
| **Programs** | Active therapy programs with progress tracking and success rates |
| **Intervention Plan** | Therapy goals and objectives with status tracking (Not Started, In Progress, Achieved) |
| **Homework** | Assignments sent to parents with completion tracking |
| **Billing** | Invoice history and payment status for this client |
| **Documents** | File uploads including reports, consent forms, and shared documents |

---

## 4. Clinical Evaluation System

TempoApp supports **5 standardized evaluation tools** used worldwide in ABA therapy and child development assessment. Each evaluation can be completed step-by-step, saved as a draft, and resumed later.

### ABLLS-R (Assessment of Basic Language and Learning Skills — Revised)

- Comprehensive assessment across **20 developmental categories** including cooperation, language skills, social interaction, academic skills, and self-care
- Each item is scored on a **0–4 scale**
- Visual progress charts and radar graphs show strengths and areas for growth
- Compare current evaluation with previous ones to track improvement over time
- Generate printable PDF reports

### VB-MAPP (Verbal Behavior Milestones Assessment and Placement Program)

- Assesses children across **3 developmental levels** (0–18 months, 18–30 months, 30–48 months equivalent)
- Tracks **milestones** (skills the child has mastered), **barriers** (challenges to learning), and **transition readiness** (readiness for less intensive settings)
- Visual milestone grid for quick overview
- Barrier severity tracking helps identify what's holding the child back

### Portage (Portage Inventory of Early Development)

- Evaluates **5 developmental domains**: Language, Socialization, Self-Care, Cognitive Behavior, and Motor Behavior
- Simple achieved/not achieved scoring for each developmental milestone
- Tracks the child's developmental age in each domain
- Helps identify specific areas where the child needs support

### CARS (Childhood Autism Rating Scale)

- **15-item assessment** that helps classify autism severity
- Each item scored on a 1–4 scale
- Automatically classifies overall severity: None, Mild-Moderate, or Severe
- Items cover relationship skills, imitation, emotional responses, body use, communication, and more
- Generates professional reports for clinical documentation

### Carolina Curriculum (Carolina Curriculum for Infants and Toddlers)

- Assesses **5 developmental domains**: Cognitive, Communication, Social Adaptation, Fine Motor, and Gross Motor
- Three-level scoring: Absent, Developing/Emerging, or Mastered
- Tracks developmental progression across all domains
- Helps plan targeted interventions

### Evaluation Features (All Types)

- **Draft & Resume** — Start an evaluation, save progress, and come back later
- **Progress Comparison** — Compare two evaluations side by side to see improvement
- **Suggested Goals** — The system automatically suggests therapy goals based on evaluation results
- **PDF Reports** — Generate professional printable reports for parents, schools, or insurance
- **Activity Logging** — Every evaluation action is recorded in the audit trail

---

## 5. Programs & Intervention Plans

- **Programs** — Define specific therapy programs for each client (e.g., "Requesting Items", "Social Greetings", "Color Identification")
- **Session Scoring** — Track how the child performs on each program during therapy sessions using a 4-level scoring system
- **Success Rate** — Automatically calculates success rates for each program
- **Trend Analysis** — Shows whether the child is improving, stable, or declining in each program
- **Intervention Plans** — Create comprehensive therapy plans with specific objectives
- **Objective Tracking** — Each objective moves through stages: Not Started → In Progress → Achieved

---

## 6. Billing & Financial Management

Complete financial management for the therapy center.

### Client Invoicing

- **Automated invoice generation** — Invoices are calculated from session attendance data
- **Session-based billing** — Charge per session based on duration and hourly rate
- **Subscription billing** — Fixed monthly rates for subscription clients
- **Discounts** — Apply percentage or fixed discounts to invoices
- **Invoice status tracking** — Draft, Sent, Paid, Overdue
- **SmartBill integration** — Sync invoices directly with SmartBill (Romanian invoicing platform) for legal compliance
- **PDF generation** — Create professional PDF invoices

### Team Payouts

- **Automated payout calculations** — Based on hours worked from calendar data
- **Bonus & deductions** — Add bonuses or deductions to individual payouts
- **Payment status** — Track pending and completed payments

### Expense Tracking

- **Categorized expenses** — Rent, Taxes, Utilities, Supplies, Marketing, Other
- **Recurring expenses** — Set up monthly recurring expenses (like rent)
- **Monthly overview** — See total expenses broken down by category

### Billing Configuration (Settings)

- **Clinic identity** — Legal name, tax ID (CUI), address, bank account, IBAN
- **Multiple legal entities** — Support for centers operating under multiple companies
- **Invoice parameters** — Series prefix, numbering, VAT rate
- **SmartBill credentials** — API connection for invoice synchronization

---

## 7. Analytics Dashboard

Visual analytics for center performance monitoring:

| Chart | What It Shows |
| --- | --- |
| **Session Volume** | Weekly breakdown of total sessions |
| **Revenue Mix** | Revenue breakdown by service type (ABA, Speech Therapy, Assessment, etc.) |
| **Attendance Trend** | Attendance rate over time |
| **Therapist Utilization** | How many hours each therapist is working |
| **Goal Achievement** | Overall progress across all client evaluations |
| **Cancellation Risk** | Identifies clients with multiple recent cancellations |

**KPI cards at the top show:**

- Total sessions this month
- Number of active clients
- Monthly revenue
- Overall attendance rate
- Staff utilization percentage

---

## 8. Team Management

Manage all staff members at the therapy center:

- **Add team members** — Invite new staff by email with automatic account creation
- **Role assignment** — Set each person's role (Superadmin, Admin, Coordinator, Therapist)
- **Profile management** — Name, email, phone, photo, color coding
- **Capacity tracking** — See how many clients each therapist is working with
- **Onboarding** — New team members receive email invitations to set up their accounts

---

## 9. Messaging & Communication

Built-in real-time chat system for team communication:

- **Thread-based conversations** — Organized message threads with participants
- **Staff-to-staff messaging** — Coordinate between team members
- **Parent messaging** — Communicate directly with parents through the platform
- **Real-time delivery** — Messages appear instantly for all participants
- **Unread indicators** — Badge counts show unread messages in the navigation
- **Archive conversations** — Archive completed threads to keep the inbox clean

---

## 10. Notification System

Comprehensive alerts to keep everyone informed:

- **In-app notifications** — Bell icon with dropdown showing recent alerts
- **Push notifications** — Browser notifications even when the app isn't focused
- **Notification types:**
    - Schedule changes (sessions created, updated, or cancelled)
    - Attendance logged
    - New team members added
    - Billing alerts (invoices generated, overdue payments)
    - Client assignments
    - New messages
- **Notification preferences** — Each user can choose which notification types they want to receive
- **Mark as read** — Clear notifications individually or in bulk

---

## 11. Activity Feed & Audit Trail

A complete history of all actions taken in the system:

- **Real-time feed** — See what's happening across the center as it happens
- **Action tracking** — Records who did what and when:
    - Sessions created, updated, or cancelled
    - Attendance marked
    - Evaluations started, updated, or completed
    - Clients added or modified
    - Team members added or updated
- **Category filtering** — Filter activities by type (Sessions, Evaluations, Clients, Team)
- **User attribution** — Each action shows who performed it with their profile photo
- **Compliance ready** — Immutable records that cannot be edited or deleted

---

## 12. Services Management

Define the types of therapy services the center offers:

- **Service definitions** — Create services like "ABA Therapy", "Speech Therapy", "Psychological Assessment", "Social Skills Group"
- **Hourly rates** — Set pricing for each service type
- **Color coding** — Assign colors for visual identification on the calendar
- **Used in scheduling** — Services are linked to calendar events for billing and reporting

---

## 13. Document Management

File management for each client:

- **Upload documents** — Consent forms, medical reports, school documents
- **Categorization** — Organize documents by type
- **Parent sharing** — Choose which documents are visible to parents in the Parent Portal
- **Download** — Parents and staff can download shared documents

---

## 14. Homework System

Assign and track homework for parents to work on at home:

- **Create assignments** — Therapists create homework tasks with descriptions
- **Frequency settings** — Daily, weekly, or custom frequency
- **Parent tracking** — Parents can mark tasks as complete and add notes
- **Progress monitoring** — Staff can see which homework is being completed

---

## 15. Help & Video Tutorials

Built-in help system for users:

- **Searchable help** — Find answers quickly with the search bar
- **Categorized guides** — Help organized by feature (Dashboard, Calendar, Clients, etc.)
- **Video tutorials** — Step-by-step video guides for common tasks
- **Contextual explanations** — Each section explains what the feature does and how to use it

---

## 16. Command Palette (Quick Search)

A power-user feature for fast navigation:

- **Keyboard shortcut** — Press Ctrl+K (or Cmd+K on Mac) to open
- **Quick search** — Find clients, team members, or navigate to any page
- **Quick actions** — Create new events, add clients, send messages — all without navigating through menus
- **Keyboard navigation** — Use arrow keys to browse and Enter to select

---

## 17. Settings & Configuration

Personalize the app and configure center-wide settings:

| Setting | What It Controls |
| --- | --- |
| **Profile** | Your name, email, phone number, profile photo |
| **Appearance** | Light mode, dark mode, or system-automatic theme |
| **Language** | Switch between English and Romanian |
| **Billing Config** | Clinic identity, legal entities, invoice parameters, SmartBill API |
| **Account Limits** | Maximum active clients, maximum team members |
| **Notifications** | Which alerts you receive and how |

---

## 18. Reports & PDF Export

Generate professional reports for various purposes:

- **Client Reports** — Comprehensive profile export with all client information
- **Evaluation Reports** — Detailed assessment reports with scores, interpretations, and recommendations (available for all 5 evaluation types)
- **Team Reports** — Staff performance and utilization summaries
- **Invoice PDFs** — Professional invoices for billing

Reports are formatted in HTML and can be printed or saved as PDFs directly from the browser.

---

# Parent Portal

The Parent Portal is a separate, simplified interface designed specifically for parents. Parents access it using an **access code** provided by the therapy center — no email or password needed.

## Home Dashboard

- **Next session** — See when the child's next therapy session is, with therapist name and time
- **Latest session summary** — Overview of what happened in the most recent session
- **Progress overview** — A visual progress indicator showing overall child development
- **Unpaid invoices** — Quick view of any outstanding balances
- **Quick links** — Easy navigation to all portal sections

## Session Schedule

- View all upcoming therapy sessions
- See which therapist is assigned to each session
- View session details including programs covered

## Progress Tracking

- **Program progress** — See how the child is doing in each therapy program
- **Trend indicators** — Visual sparkline charts showing improvement over time
- **Evaluation comparisons** — Compare current evaluations with previous ones
- **Goal status** — Track which therapy goals have been achieved
- **Success rates** — Percentage-based progress for each program

## Homework

- View homework assignments from therapists
- See frequency requirements (daily, weekly, etc.)
- Mark tasks as complete
- Add notes about how the homework went
- Track active vs. completed assignments

## Messages

- Send and receive messages with the therapy team
- Organized conversation threads
- Archive completed conversations

## Documents

- Access documents shared by the therapy center
- Download reports, assessments, consent forms
- Documents organized by category

## Billing

- View all invoices
- See payment status and outstanding balances
- Track payment history

## Notifications

- Receive alerts about schedule changes, new documents, and other updates

## Child Profile

- View the child's profile information and contact details

---

# Technical Highlights (Simplified)

## Works Everywhere

- **Desktop** — Full-featured interface with sidebar navigation
- **Tablet** — Optimized layouts for touch screens
- **Mobile** — Bottom tab navigation, touch-friendly buttons (minimum 44x44 pixel tap targets)
- **Install as App** — Can be installed on phones and tablets like a native app (Progressive Web App)

## Real-Time Updates

Everything updates instantly across all devices. When a therapist marks attendance, the coordinator sees it immediately. When a parent sends a message, the therapist gets notified right away.

## Bilingual

The entire platform — every button, label, message, and notification — is available in both **English** and **Romanian**. Users can switch languages at any time.

## Secure

- Staff accounts are protected with email and password authentication
- Parent access uses secure access codes with rate limiting (protection against guessing)
- All data access is controlled by security rules that ensure users can only see what they're authorized to see
- Activity logging creates an immutable audit trail

## Offline Capable

The app works even with intermittent internet. Data is cached locally and syncs when the connection is restored.

## Dark Mode

Full dark mode support for comfortable use in any lighting condition.

---

# Data & Privacy

## What Data is Stored

- **Client records** — Names, birth dates, diagnoses, evaluation results, session history
- **Staff records** — Names, emails, phone numbers, roles
- **Session data** — Dates, attendance, program scores, notes
- **Financial data** — Invoices, payouts, expenses
- **Communication** — Chat messages between staff and parents
- **Documents** — Uploaded files (reports, consent forms, etc.)
- **Activity logs** — Audit trail of all actions

## Who Can See What

- **Parents** can only see their own child's information
- **Therapists** can only see clients assigned to them
- **Coordinators** can see all clients and schedules
- **Admins** can see everything including billing and team management
- **Superadmins** have full system access

## Security Measures

- All data is stored in Google's Firebase cloud infrastructure
- Data access is controlled by server-side security rules
- Communication between the app and servers is encrypted
- Parent access codes are rate-limited to prevent unauthorized access
- Phone numbers are never stored in chat messages (privacy protection)

---

# External Integrations

| Service | Purpose |
| --- | --- |
| **SmartBill** | Romanian invoicing platform — automatically creates legal invoices from billing data |
| **Firebase Cloud Messaging** | Sends push notifications to users' devices |
| **Google Fonts** | Provides the app's typography (Inter, Plus Jakarta Sans) |

---

# Summary Statistics

| Metric | Count |
| --- | --- |
| Staff portal pages | 15 |
| Parent portal pages | 9 |
| Evaluation types supported | 5 |
| User roles | 5 |
| Supported languages | 2 (English, Romanian) |
| React components | 130+ |
| Translation keys | 2,000+ |

---

# Glossary

| Term | Definition |
| --- | --- |
| **ABA** | Applied Behavior Analysis — a scientific approach to understanding and changing behavior, commonly used in autism therapy |
| **ABLLS-R** | Assessment of Basic Language and Learning Skills — Revised. A comprehensive assessment tool for children with language delays |
| **VB-MAPP** | Verbal Behavior Milestones Assessment and Placement Program. An assessment that tracks language and social milestones |
| **Portage** | A developmental assessment that evaluates children across five key areas of development |
| **CARS** | Childhood Autism Rating Scale. A screening tool that helps classify the severity of autism |
| **Carolina Curriculum** | An assessment for infants and toddlers that tracks development across five domains |
| **BCBA** | Board Certified Behavior Analyst — a professional certification for ABA practitioners |
| **Intervention Plan** | A structured therapy plan with specific goals and objectives for a child |
| **PWA** | Progressive Web App — a technology that allows the website to be installed and used like a native app |
| **SmartBill** | A Romanian online invoicing platform used for legal invoice generation |
| **Firestore** | Google's real-time cloud database used to store all TempoApp data |
| **FCM** | Firebase Cloud Messaging — the technology that delivers push notifications |
| **i18n** | Internationalization — the technical term for multi-language support |
| **KPI** | Key Performance Indicator — important metrics shown on the dashboard |

---

*TempoApp — Built for therapy centers. Designed for better outcomes.*

*Last Updated: March 2026*
