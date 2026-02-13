# Project Overview: TempoApp

## Executive Summary
TempoApp is a comprehensive, modern management platform designed for therapy centers (e.g., ABA, speech therapy, physiotherapy). It provides a unified ecosystem for clinic administrators, coordinators, therapists, and parents to collaborate effectively. The application facilitates end-to-end clinic operations, including client intake, clinical evaluation, session scheduling, billing, real-time communication, and progress tracking. Built as a Progressive Web App (PWA) with a focus on mobile-first accessibility and real-time data synchronization, TempoApp ensures that therapy teams can focus on clinical outcomes rather than administrative overhead.

## Tech Stack
### Frontend
- **Framework**: Next.js 14 (App Router)
- **Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with `tailwindcss-animate`
- **Icons**: Lucide React
- **Charts**: Recharts
- **Internationalization**: i18next (Multi-language support: English, Romanian, etc.)
- **PDF Generation**: jsPDF & jsPDF-AutoTable
- **PWA**: `next-pwa`

### Backend & Infrastructure (Firebase Suite)
- **Authentication**: Firebase Auth (RBAC support)
- **Database**: Firestore (NoSQL, Real-time SDK)
- **Storage**: Firebase Storage (Documents, Avatars)
- **Functions**: Firebase Cloud Functions (Backend logic, automated tasks)
- **Messaging**: Firebase Cloud Messaging (FCM) for Push Notifications
- **Hosting**: Firebase Hosting (integrated with CI/CD)

## Project Structure
```text
tempo-app-2/
├── functions/              # Firebase Cloud Functions (TypeScript)
├── public/                 # Static assets, PWA manifests, Service Workers
├── src/
│   ├── app/                # Next.js App Router (Routes & Layouts)
│   │   ├── (dashboard)/    # Authenticated staff views
│   │   ├── parent/         # Dedicated Parent Portal
│   │   ├── login/          # Auth entry points
│   │   └── api/            # Serverless API routes (e.g., SmartBill integration)
│   ├── components/         # UI Components organized by feature
│   │   ├── ui/             # Reusable atomic components
│   │   ├── calendar/       # Scheduling system
│   │   ├── billing/        # Invoicing and payouts
│   │   └── ...             # Feature-specific modules
│   ├── context/            # React Context Providers (Global State)
│   ├── hooks/              # Custom React Hooks (Data Fetching, Logic)
│   ├── lib/                # Library initializations & Utilities
│   ├── types/              # Centralized TypeScript interfaces
│   └── data/               # Static protocols and mock data
├── firestore.rules         # Security rules for database
└── storage.rules           # Security rules for file storage
```

## Architecture & Design Principles
- **Role-Based Access Control (RBAC)**: Comprehensive security model spanning UI (protected routes), API, and Database (Firestore Rules). Roles include `Superadmin`, `Admin`, `Coordinator`, `Therapist`, and `Parent`.
- **Real-time Observer Pattern**: Heavy use of Firestore's `onSnapshot` through custom hooks and React Context to ensure UI stays in sync across all devices without manual refreshes.
- **Modular Feature Design**: Code is organized by feature rather than type, making the codebase scalable and easier to navigate (e.g., all billing-related components, hooks, and types are logically grouped).
- **Mobile-First Responsive Design**: The UI is built using Tailwind CSS with a mobile-first approach, ensuring full functionality on tablets and smartphones used by therapists in the field.
- **Singleton Pattern**: Firebase initialization and library instances (i18n) are managed as singletons to prevent multiple connections and redundant initialization.

## Features (in detail)
1.  **Dashboard & Analytics**:
    - Real-time KPIs (Active clients, attendance rates, session volume).
    - Clinical trends and therapist utilization charts.
    - Automated activity feed for clinic-wide transparency.
2.  **Advanced Scheduling (Calendar)**:
    - Daily, Weekly, and Monthly views.
    - Multi-therapist scheduling with conflict detection (via UI logic).
    - Attendance tracking (Present, Absent, Cancelled) directly from the calendar.
3.  **Clinical Management**:
    - **Evaluations**: Specialized modules for VB-MAPP, Portage, CARS, and Carolina protocols.
    - **Intervention Plans**: Dynamic creation of clinical goals and programs.
    - **Homework**: Assigning tasks to parents with completion tracking.
    - **Progress Notes**: Capturing session data and clinical observations.
4.  **Financial Module**:
    - **Invoicing**: Automated generation of client invoices based on session data.
    - **Payouts**: Calculating therapist earnings based on completed sessions.
    - **Expense Management**: Tracking clinic overhead and recurring costs.
    - **SmartBill Integration**: Hooks for local fiscal compliance.
5.  **Communication Suite**:
    - **Messaging**: Real-time chat threads between staff and parents.
    - **Notifications**: Centralized hub for in-app alerts and browser/mobile push notifications.
6.  **Parent Portal**:
    - Transparent view of the child's progress, upcoming sessions, and assigned homework.
    - Secure document sharing and direct communication with the therapy team.

## Firebase Integration
- **Firestore Schema**:
    - Root collections for `clients`, `team_members`, `events`, `services`, `invoices`, and `threads`.
    - Subcollections for high-frequency/client-specific data like `evaluations`, `interventionPlans`, and `messages`.
    - Use of `collectionGroup` queries for cross-client reporting (e.g., fetching all active plans).
- **Security Rules**:
    - Recursive validation of user roles.
    - Data-level isolation ensuring parents can only see their child's data.
    - Write-access restricted to specific roles for sensitive collections (e.g., `system_settings`).

## Security Analysis
- **Authentication**: JWT-based session management via Firebase Auth.
- **Authorization**: Dual-layer check. UI-side guard components prevent unauthorized access to routes, while Firestore Security Rules enforce strict data-level access control.
- **Data Privacy**: Parent access is restricted via `parentUids` array checks in client documents.
- **Sensitive Data**: Clinical evaluations and personal information are protected by rules that require specific staff roles or direct parental relationship.

## Component Architecture
- **Provider Pattern**: The root layout wraps the app in a hierarchy of providers (`Auth`, `Data`, `Toast`, `Notification`, etc.), making global state and utilities available via simple hooks.
- **Composition**: Heavy use of React composition for complex UI elements like Modals and Sidebars.
- **Custom Hooks**: Abstraction of complex Firestore queries into reusable hooks (e.g., `useEventsByMonth`) to keep components focused on rendering.

## State Management
- **Global State**: Managed via React Context API.
    - `AuthContext`: Manages user session, profile, and role.
    - `DataContext`: Maintains a real-time cache of core collections (`clients`, `teamMembers`, `services`) to minimize database reads and improve performance.
    - `NotificationContext`: Handles real-time alert streams and FCM token management.
- **Server State**: Synchronized in real-time with Firestore.
- **Local State**: Managed with `useState` and `useReducer` for component-specific UI logic (e.g., form states, modal toggles).

## Type System
- Centralized TypeScript definitions in `src/types/`.
- Strict interface matching for Firestore documents to ensure data integrity.
- Extensive use of Enums and Unions for statuses (e.g., `EventStatus`, `UserRole`, `EvaluationType`).

## Optimization & Security Recommendations
1.  **Performance**:
    - Implement Firestore Indexing for complex `collectionGroup` queries and multi-field filters to avoid performance bottlenecks.
    - Use `bundle` and `cache` features of Firestore for offline-first capabilities in the PWA.
    - Optimize Recharts rendering for large datasets using memoization.
2.  **Security**:
    - Periodically audit Firestore rules using the Firebase Emulator Suite.
    - Implement rate limiting on Cloud Functions that handle sensitive operations (e.g., invoice generation).
    - Ensure all user-uploaded documents in Storage are scanned or strictly typed to prevent malicious file execution.
3.  **Scalability**:
    - Transition high-frequency calculations (like financial payouts) to Cloud Functions to keep the client-side lightweight.
    - Implement pagination or "load more" patterns for the messaging system and large client lists as the database grows.
