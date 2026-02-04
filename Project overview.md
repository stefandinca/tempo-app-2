# TempoApp2 - Project Overview

> **Comprehensive Technical Documentation**
> Generated: February 2026
> Stage: Post-MVP (Scaling Features)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture & Design Principles](#4-architecture--design-principles)
5. [Features](#5-features)
6. [Firebase Integration](#6-firebase-integration)
7. [Security Analysis](#7-security-analysis)
8. [Component Architecture](#8-component-architecture)
9. [State Management](#9-state-management)
10. [Type System](#10-type-system)
11. [Optimization Recommendations](#11-optimization-recommendations)
12. [Security Recommendations](#12-security-recommendations)

---

## 1. Executive Summary

TempoApp2 is a modern therapy center management platform that migrates a legacy Vanilla JS/SQL application into an "app-first" experience. The platform serves two distinct user groups:

- **Staff Portal**: Administrators, Coordinators, and Therapists manage clients, schedules, billing, and analytics
- **Parent Portal**: Parents access their child's therapy schedule, progress, documents, and invoices

### Key Capabilities

| Domain | Features |
|--------|----------|
| **Scheduling** | Multi-view calendar, session management, automated notifications |
| **Client Management** | Profiles, intervention plans, documents, progress tracking |
| **Team Management** | Staff directory, role-based access, workload analytics |
| **Billing** | Invoice generation, payment tracking, payout management |
| **Communication** | Real-time chat, push notifications, parent portal |
| **Analytics** | Session metrics, revenue analysis, utilization tracking |

---

## 2. Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.1.0 | React framework with App Router |
| **React** | 18 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.3 | Utility-first styling |

### Backend Services (Firebase)

| Service | Version | Purpose |
|---------|---------|---------|
| **Firebase Auth** | 10.8.0 | Authentication (email/password + anonymous) |
| **Cloud Firestore** | 10.8.0 | Real-time NoSQL database |
| **Cloud Storage** | 10.8.0 | Document/file storage |
| **Cloud Functions** | Node.js | Server-side logic (push notifications) |
| **Cloud Messaging** | 10.8.0 | Push notifications via FCM |

### UI & Visualization

| Library | Purpose |
|---------|---------|
| **Recharts** | Data visualization (charts/graphs) |
| **Lucide React** | Icon library |
| **tailwindcss-animate** | Animation utilities |
| **jsPDF + jspdf-autotable** | PDF generation |
| **clsx + tailwind-merge** | CSS class utilities |

### Build & Deployment

| Tool | Purpose |
|------|---------|
| **Static Export** | Production build outputs to `/out` directory |
| **Base Path** | `/v2` in production |
| **PWA** | Service worker for offline support |

---

## 3. Project Structure

```
tempo-app-2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Staff portal routes
│   │   ├── parent/             # Parent portal routes
│   │   ├── login/              # Authentication
│   │   └── seed/               # Development utility
│   ├── components/             # React components (66 files)
│   │   ├── analytics/          # Charts and metrics
│   │   ├── billing/            # Invoice management
│   │   ├── calendar/           # Calendar views
│   │   ├── chat/               # Messaging system
│   │   ├── clients/            # Client management
│   │   ├── notifications/      # Notification system
│   │   ├── parent/             # Parent-specific components
│   │   ├── services/           # Service management
│   │   ├── settings/           # Configuration
│   │   ├── team/               # Team management
│   │   └── ui/                 # Shared UI primitives
│   ├── context/                # React Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities & Firebase init
│   └── types/                  # TypeScript definitions
├── functions/                  # Firebase Cloud Functions
├── public/                     # Static assets & PWA files
├── documentation/              # Project documentation
└── Configuration Files
    ├── next.config.js          # Next.js configuration
    ├── tailwind.config.ts      # Tailwind customization
    ├── firestore.rules         # Database security rules
    ├── storage.rules           # Storage security rules
    └── firebase.json           # Firebase project config
```

---

## 4. Architecture & Design Principles

### Guiding Principles (from AI_CORE_CONTEXT.md)

1. **App-First Feel**: Prioritize transitions, persistent layouts, and optimistic UI updates
2. **Firebase Best Practices**: Use modular SDK imports for smaller bundles
3. **Component Architecture**: Build reusable, atomic React components
4. **Truth in Documentation**: Reference existing guides before adding features

### Architectural Patterns

| Pattern | Implementation |
|---------|----------------|
| **Route Groups** | `(dashboard)` groups staff routes without URL impact |
| **Provider Hierarchy** | Nested contexts for auth, data, notifications |
| **Real-time Sync** | Firestore `onSnapshot` listeners throughout |
| **Role-based Access** | UI filtering + Firestore security rules |
| **Modal-driven UX** | CRUD operations via modals, not separate pages |
| **Code Splitting** | "use client" directives for client components |

### Provider Hierarchy

```
RootLayout
└── ToastProvider
    └── AuthProvider
        └── DataProvider
            └── NotificationProvider
                └── EventModalProvider
                    └── CommandPaletteProvider
                        └── Page Content
```

---

## 5. Features

### 5.1 Staff Portal

#### Dashboard (`/`)
- KPI cards (sessions today, clients, pending invoices)
- Today's schedule (role-filtered for therapists)
- Activity feed with recent notifications

#### Calendar (`/calendar`)
- Month, Week, Day views with navigation
- Filter by therapist, client, event type
- Event detail panel with attendance logging
- Multi-step event creation wizard

#### Client Management (`/clients`)
- Client directory with search
- Profile page with tabs:
  - **Overview**: Contact info, demographics
  - **Programs**: Progress tracking per skill area
  - **Plan**: Intervention plans with goals
  - **Documents**: Shared files with parent access control

#### Team Management (`/team`)
- Staff directory with roles
- Workload metrics (sessions/week, client count)
- Add/edit team member modals (Admin only)

#### Messaging (`/messages`)
- Real-time 1:1 chat threads
- Unread indicators
- Role-based participant display

#### Analytics (`/analytics`)
- Session volume trends
- Revenue mix by service
- Therapist utilization rates
- Attendance trends
- Goal achievement metrics
- Cancellation risk indicators

#### Billing (`/billing`)
- Invoice generation and tracking
- Payment status management
- Team payout records
- Month selector for historical data

#### Settings (`/settings`)
- Profile customization
- Notification preferences
- Theme toggle (light/dark)
- Admin: Billing configuration, system settings

### 5.2 Parent Portal

#### Login (`/parent`)
- Code-based access (6-8 character client code)
- Anonymous Firebase authentication
- Session persistence via localStorage

#### Dashboard (`/parent/dashboard`)
- Next session preview
- Outstanding balance
- Progress percentage
- Recent notifications

#### Schedule (`/parent/calendar`)
- Upcoming/past sessions
- Therapist information
- Session status

#### Progress (`/parent/progress`)
- Program-based progress cards
- Session history
- Success rate metrics

#### Billing (`/parent/billing`)
- Invoice list with PDF download
- Payment history
- Balance summary

#### Documents (`/parent/docs`)
- Shared documents by category
- File type filtering
- Download functionality

---

## 6. Firebase Integration

### 6.1 Authentication

| Method | Users | Implementation |
|--------|-------|----------------|
| **Email/Password** | Staff | Firebase Auth → team_members lookup |
| **Anonymous** | Parents | Firebase Auth → client code validation |

### 6.2 Firestore Collections

| Collection | Purpose | Subcollections |
|------------|---------|----------------|
| `team_members` | Staff users with roles | - |
| `clients` | Client records | `interventionPlans`, `documents`, `evaluations` |
| `events` | Therapy sessions | - |
| `services` | Service types | - |
| `programs` | Skill tracking programs | - |
| `notifications` | In-app notifications | - |
| `fcm_tokens` | Push notification tokens | - |
| `invoices` | Billing records | - |
| `payouts` | Team payments | - |
| `threads` | Chat conversations | `messages` |
| `system_settings` | App configuration | - |

### 6.3 Cloud Functions

**`sendPushNotification`** - Firestore trigger on notification creation:
1. Fetches recipient's FCM token
2. Sends data-only message via FCM
3. Service worker displays notification
4. Handles invalid token cleanup

### 6.4 Storage Structure

```
clients/{clientId}/documents/{fileName}
```
- Max file size: 10MB
- Allowed types: PDF, Word, Excel, PowerPoint, images

---

## 7. Security Analysis

### 7.1 Firestore Security Rules Summary

| Collection | Read | Write | Notes |
|------------|------|-------|-------|
| `team_members` | Public | Admin only | Intentional for parent portal |
| `clients` | Staff + Parent (own) | Staff | Parents update parentUids only |
| `events` | Public | Staff | Therapists edit own events |
| `services/programs` | Public | Admin only | Read-only catalog |
| `invoices` | **Public** | Admin only | **SECURITY ISSUE** |
| `notifications` | Recipient only | Self | Proper isolation |
| `fcm_tokens` | Self only | Self only | Proper isolation |
| `threads` | Participants | Participants | Chat security |

### 7.2 Storage Security Rules

- Read: Staff or parent of specific client
- Write: Staff only
- File type validation (whitelist)
- Size limit enforcement (10MB)

### 7.3 Identified Security Concerns

| Severity | Issue | Location | Impact |
|----------|-------|----------|--------|
| **HIGH** | Invoices publicly readable | `firestore.rules:91-92` | Billing data exposure |
| **MEDIUM** | Client code brute-force risk | Parent login | 8-char codes, no rate limiting |
| **MEDIUM** | localStorage session storage | ParentAuthContext | XSS vulnerability if compromised |
| **LOW** | No session timeout | Parent portal | Long-lived sessions |
| **LOW** | No audit logging | All mutations | Compliance/debugging gap |

---

## 8. Component Architecture

### 8.1 Design System

#### Colors
```typescript
Primary:   #4A90E2  // Brand blue
Secondary: #E09448  // Brand orange
Success:   #10B981  // Green
Warning:   #F59E0B  // Amber
Error:     #EF4444  // Red
Info:      #3B82F6  // Blue
Neutral:   0-950    // Grayscale
```

#### Typography
- **Sans**: Inter
- **Mono**: JetBrains Mono
- **Weights**: 400, 500, 600, 700

#### Spacing & Borders
- Cards: `rounded-2xl p-5`
- Buttons: `rounded-xl px-4 py-2`
- Inputs: `rounded-lg px-3 py-2`

### 8.2 Component Patterns

#### Card Pattern
```tsx
<div className="bg-white dark:bg-neutral-900 border border-neutral-200
               dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md">
  {/* Header with actions dropdown */}
  {/* Content sections */}
  {/* Footer with buttons */}
</div>
```

#### Modal Pattern
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
  <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl">
    {/* Header */}
    {/* Content (overflow-y-auto) */}
    {/* Footer with actions */}
  </div>
</div>
```

### 8.3 Component Categories

| Category | Count | Examples |
|----------|-------|----------|
| **Layout** | 3 | DashboardShell, Sidebar, MobileSidebar |
| **Navigation** | 3 | Header, BottomNav, CommandPalette |
| **Analytics** | 6 | AttendanceTrendChart, RevenueMixChart |
| **Clients** | 9 | ClientCard, ClientProfileHeader, tabs |
| **Calendar** | 6 | CalendarToolbar, views, EventDetailPanel |
| **Chat** | 4 | ChatView, ChatSidebar, MessageBubble |
| **Billing** | 4 | BillingOverview, tables, MonthSelector |
| **Notifications** | 8 | NotificationBell, dropdown, filters |

---

## 9. State Management

### 9.1 Context Providers

| Context | Purpose | Key State |
|---------|---------|-----------|
| **AuthContext** | Staff authentication | user, userData, userRole |
| **ParentAuthContext** | Parent authentication | user, clientId, isAuthenticated |
| **DataContext** | Collection aggregation | clients, events, teamMembers, services, programs |
| **NotificationContext** | Real-time notifications | notifications, unreadCount, pushPermission |
| **EventModalContext** | Event creation modal | openModal, closeModal |
| **ToastContext** | Toast notifications | showToast, success, error |
| **CommandPaletteContext** | Keyboard shortcuts | isOpen, pendingAction |

### 9.2 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useCollection<T>()` | Generic Firestore listener |
| `useEvents/Clients/TeamMembers()` | Collection-specific hooks |
| `useClientEvents(id)` | Filtered events |
| `useInterventionPlans(id)` | Active plan detection |
| `useAnalyticsData()` | Aggregated metrics |
| `useChat()` | Thread management |
| `useAnyAuth()` | Universal auth bridge |

### 9.3 Data Flow

```
Firestore → Custom Hook (onSnapshot) → React State → Context Provider → Components
                                                                ↓
                                                         UI Updates
```

---

## 10. Type System

### 10.1 Key Interfaces

#### Notification
```typescript
interface Notification {
  id: string;
  recipientId: string;
  recipientRole: 'admin' | 'coordinator' | 'therapist' | 'parent';
  type: NotificationType;  // 14 specific types
  category: NotificationCategory;  // 6 categories
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  sourceType: 'event' | 'client' | 'team' | 'billing' | 'system';
  sourceId?: string;
}
```

#### Chat
```typescript
interface ChatThread {
  id: string;
  participantUids: string[];
  participantDetails: Record<string, ChatParticipant>;
  lastMessage?: LastMessage;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 10.2 Type Safety Patterns

- **Discriminated Unions**: NotificationCategory, NotificationType
- **Strict Role Types**: `'Admin' | 'Coordinator' | 'Therapist' | 'Parent'`
- **Generic Constraints**: `useCollection<T = DocumentData>()`
- **Optional Chaining**: Consistent null checks on user objects

---

## 11. Optimization Recommendations

### 11.1 Performance

| Priority | Issue | Recommendation |
|----------|-------|----------------|
| **HIGH** | No query pagination | Add cursor-based pagination to clients/events lists |
| **HIGH** | All collections load on mount | Implement lazy loading for non-visible data |
| **MEDIUM** | Large bundle size | Enable code splitting for analytics/billing routes |
| **MEDIUM** | No caching strategy | Implement SWR or React Query for API calls |
| **LOW** | Unoptimized images | Enable Next.js Image optimization (remove `unoptimized: true`) |

### 11.2 Code Quality

| Issue | Recommendation |
|-------|----------------|
| Inline TypeScript interfaces | Extract to shared type files |
| Duplicate card styling | Create shared Card component |
| Multiple similar modals | Create generic Modal component |
| Hard-coded colors | Use design tokens consistently |

### 11.3 Bundle Optimization

```javascript
// next.config.js - Consider adding:
experimental: {
  optimizePackageImports: ['lucide-react', 'recharts']
}
```

---

## 12. Security Recommendations

### 12.1 Critical (Immediate Action)

1. **Fix Invoice Security Rules**
   ```javascript
   // firestore.rules - Change from:
   allow read: if true;
   // To:
   allow read: if isSignedIn() && (isAdmin() || isCoordinator());
   ```

2. **Implement Rate Limiting on Parent Code Validation**
   - Add Cloud Function for code validation with rate limiting
   - Consider CAPTCHA for repeated failures

### 12.2 High Priority

3. **Add Session Timeout for Parent Portal**
   - Implement 30-minute idle timeout
   - Clear localStorage on timeout

4. **Migrate to Custom Auth Claims**
   - Move roles to Firebase Auth custom claims
   - Reduces Firestore reads in security rules

### 12.3 Medium Priority

5. **Add Audit Logging**
   ```typescript
   // Log sensitive operations to audit_logs collection
   interface AuditLog {
     action: string;
     userId: string;
     resourceType: string;
     resourceId: string;
     timestamp: Timestamp;
     metadata: Record<string, any>;
   }
   ```

6. **Strengthen Parent Codes**
   - Increase to 12+ characters
   - Add expiration dates
   - Implement single-use invite links

### 12.4 Best Practices Checklist

- [x] Environment variables for Firebase config
- [x] Real-time listener cleanup on unmount
- [x] Role-based UI filtering
- [x] File type validation on upload
- [x] Size limits on storage
- [ ] Rate limiting on authentication
- [ ] Session timeout implementation
- [ ] Audit logging
- [ ] Custom auth claims for roles
- [ ] CSP headers configuration

---

## Appendix: Environment Variables

```env
# Firebase Configuration (NEXT_PUBLIC_ = client-accessible)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tempo-app-2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tempo-app-2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tempo-app-2.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=  # For push notifications
```

---

## Appendix: Route Map

```
/ ─────────────────────── Dashboard Home
├── /login ──────────────── Staff Login
├── /calendar ────────────── Calendar Views
├── /clients ─────────────── Client List
│   └── /clients/profile ─── Client Detail (query: ?id=)
├── /team ────────────────── Team Members
├── /messages ────────────── Internal Chat
├── /notifications ───────── Notification Center
├── /analytics ───────────── Analytics Dashboard
├── /billing ─────────────── Invoices & Payouts
├── /services ────────────── Service Management
├── /settings ────────────── User Settings
├── /seed ────────────────── Dev: Database Seeding
└── /parent ──────────────── Parent Portal
    ├── /parent/dashboard ─── Parent Home
    ├── /parent/calendar ──── Session Schedule
    ├── /parent/progress ──── Progress Tracking
    ├── /parent/billing ───── Invoices
    └── /parent/docs ──────── Documents
```

---

*This document provides a comprehensive overview of TempoApp2's architecture, features, and technical implementation. For specific implementation details, refer to the source code and inline documentation.*
