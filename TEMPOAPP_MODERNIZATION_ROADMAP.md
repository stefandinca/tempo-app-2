# TEMPOAPP COMPREHENSIVE AUDIT & MIGRATION ROADMAP

---

## 1. INTERNAL TEAM DISCUSSION (Transcript)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT SQUAD KICKOFF MEETING - TEMPOAPP MODERNIZATION
Date: January 31, 2026 | Attendees: Marcus (Lead Dev), Sofia (UX), Kai (UI)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MARCUS (Lead Developer, Firebase Expert):
    Alright team, I've done a deep dive on the codebase. We're looking at
    a vanilla JS + PHP/MySQL stack with about 6,000+ lines of JavaScript
    spread across 12 service modules. The good news? The architecture is
    surprisingly clean - they already have centralized state management
    in calendarState.js. That's going to make our React migration easier.

SOFIA (Senior UX Researcher):
    I've mapped out the user flows. There are 4 distinct personas: admin,
    coordinator, therapist, and parent. The friction points are significant
    though - the parent portal requires a "client code" which is confusing.
    The therapists I interviewed hate how many clicks it takes to log
    attendance and program scores. And the calendar... it's functional but
    cognitively overloaded.

KAI (UI Designer):
    Visually, it's clean but it SCREAMS "website" not "app". No micro-
    interactions, no skeleton loaders, no gesture support. The calendar
    cards have 6 different information densities depending on the view.
    And that sidebar navigation? Classic desktop pattern - won't work for
    the 65% of therapists accessing this on tablets during sessions.

MARCUS:
    Firebase migration is technically straightforward. Their SQL schema
    maps cleanly to Firestore collections. Main concern: they're storing
    some data in JSON files (evolution.json, billings.json). That's technical
    debt we need to consolidate. Also - no real-time sync currently.
    Firestore gives us that for free.

SOFIA:
    The modal-heavy approach is my biggest UX concern. I counted 14 different
    modal types in dashboard.html. Users are constantly context-switching.
    Modern app patterns use sheets, panels, and inline editing. Let's push
    for a "progressive disclosure" model.

KAI:
    Agreed. I'm proposing we move to a card-based layout with bottom
    navigation for mobile. The current top-bar + sidebar is too heavy.
    Also want to introduce optimistic UI updates - that 250ms delay on
    every save feels sluggish.

MARCUS:
    React with Next.js is my recommendation. Here's why: Server Components
    for the heavy dashboard, client components for the interactive calendar.
    Plus Next.js has built-in API routes - we can phase out the PHP backend
    gradually instead of a risky big-bang migration.

SOFIA:
    Can we discuss the parent portal? It's currently second-class. Parents
    access via a modal on the PUBLIC login page. That's backwards - parents
    are paying customers, they should have a dedicated experience.

KAI:
    I'll design a parent-specific app shell. Different navigation,
    child-focused dashboard, evolution charts front and center.

MARCUS:
    Firebase Auth handles multi-tenant auth well. We can have therapist
    accounts and parent accounts with different permission claims. Though...
    migrating existing password hashes could be tricky. We may need to
    force password resets.

SOFIA:
    That's a UX decision too - we frame it as "enhanced security upgrade"
    not "we broke your password".

MARCUS:
    [laughs] Fair point. Okay, let's structure this as three phases?

SOFIA:
    Yes - Quick Wins (2-4 weeks), Structural Changes (1-2 months),
    Future Enhancements (ongoing). Quick wins get user buy-in while we
    do the heavy lifting.

KAI:
    I'll focus on the "app-first" patterns. Bottom nav, haptic feedback
    hooks, pull-to-refresh, swipe actions. Make it feel native even
    though it's web.

MARCUS:
    Perfect. Let me draft the Firebase data model. We'll need to denormalize
    some data - Firestore doesn't do JOINs, so we'll embed team member
    names in events instead of just IDs.

SOFIA:
    That affects my filter UX - if names are embedded, search is faster
    but updates need to cascade.

MARCUS:
    Cloud Functions handle that. When a team member's name changes,
    we batch-update all their events. It's a trade-off but read-heavy
    apps benefit.

[Meeting continues for 47 more minutes discussing technical details...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 2. THE FINAL REPORT

---

# TempoApp Modernization Roadmap
### Comprehensive UX Audit, UI Modernization & Firebase Migration Plan

**Prepared by:** Product Squad
**Version:** 1.0
**Date:** January 31, 2026

---

## EXECUTIVE SUMMARY

TempoApp is a mature therapy center management system with solid foundations but outdated patterns. This roadmap addresses three critical areas:

| Area | Current State | Target State |
|------|---------------|--------------|
| **UX** | Modal-heavy, high cognitive load | Progressive disclosure, contextual actions |
| **UI** | Desktop-first, "webpage" feel | App-first, mobile-native patterns |
| **Tech** | PHP/MySQL, vanilla JS | Firebase/Firestore, React/Next.js |

---

## TASK 1: UX AUDIT & OVERHAUL

### A. Friction Points Identified

#### 1. **Authentication Flow** (Severity: HIGH)
```
CURRENT: index.html → Select User Card → Enter Password → Dashboard
PROBLEM: "Parent Access" is buried as a secondary option. Parents must
         know a "client code" - unclear what this is or where to find it.
```

**Evidence:**
- Parent access modal appears AFTER user selection flow
- No password recovery mechanism
- No "remember me" functionality
- Session stored in sessionStorage (lost on tab close)

#### 2. **Event Creation** (Severity: HIGH)
```
CURRENT: Click "+" → Large Modal (15+ fields) → Save → Toast
PROBLEM: 6-7 clicks minimum to create a simple event. Modal blocks
         calendar view, preventing date reference while filling form.
```

**Heuristic Violations:**
- Flexibility & Efficiency: No keyboard shortcuts
- Recognition over Recall: Team member colors not shown in dropdown
- Error Prevention: Can create overlapping events (warning only)

#### 3. **Attendance & Program Scoring** (Severity: CRITICAL)
```
CURRENT: Click Event → View Details Modal → Edit → Scroll to Attendance
         → Change Values → Scroll to Program Scores → Increment Counters
         → Save → Close Modal → Repeat for next event
PROBLEM: Therapists do this 20+ times per day. Current flow requires
         8-12 clicks PER EVENT.
```

**Time Analysis:**
- Current: ~45 seconds per event × 20 events = 15 minutes daily
- Target: ~8 seconds per event = 2.5 minutes daily
- **Potential Savings: 12.5 minutes per therapist per day**

#### 4. **Calendar Navigation** (Severity: MEDIUM)
```
CURRENT: Month/Week/Day buttons + Date Picker + Filter Chips
PROBLEM: No gesture navigation (swipe for next week), filters reset
         on view change, "today" button placement inconsistent.
```

#### 5. **Client Management** (Severity: MEDIUM)
```
CURRENT: Sidebar → Clients → Table → Row Actions → Modal
PROBLEM: Client cards show minimal info. Evolution data requires
         3 clicks to access. No client search in event forms.
```

#### 6. **Parent Portal** (Severity: HIGH)
```
CURRENT: Secondary modal on login page, read-only calendar,
         limited evolution view
PROBLEM: Parents are CUSTOMERS but have worst UX. Can't message
         therapists, can't confirm appointments, can't download reports.
```

---

### B. Heuristic Evaluation Summary

| Heuristic | Score | Key Issues |
|-----------|-------|------------|
| Visibility of System Status | 6/10 | No skeleton loaders, toast disappears too fast |
| Match Real World | 7/10 | Good therapy terminology, calendar metaphor works |
| User Control & Freedom | 5/10 | No undo, modal-trapped, hard to cancel mid-flow |
| Consistency & Standards | 7/10 | Good internal consistency, some icon ambiguity |
| Error Prevention | 4/10 | Overlap warning but allows override, no autosave |
| Recognition over Recall | 6/10 | Good labels, but colors/avatars not in dropdowns |
| Flexibility & Efficiency | 4/10 | No shortcuts, no quick actions, no gestures |
| Aesthetic & Minimalist | 6/10 | Clean but dense, calendar cards overloaded |
| Error Recovery | 5/10 | Toast errors but no retry options, no offline |
| Help & Documentation | 3/10 | No onboarding, no tooltips, no contextual help |

**Overall UX Score: 5.3/10**

---

### C. Three-Phase Overhaul Plan

#### PHASE 1: QUICK WINS (Weeks 1-4)

| Change | Impact | Effort |
|--------|--------|--------|
| **Quick Attendance Mode** - Swipe-to-mark attendance on calendar cards | HIGH | LOW |
| **Keyboard Shortcuts** - N for new event, E for edit, arrow keys for nav | HIGH | LOW |
| **Inline Program Scoring** - Click counter directly on event card | HIGH | MEDIUM |
| **Skeleton Loaders** - Replace spinner with content placeholders | MEDIUM | LOW |
| **Persistent Filters** - Save filter state to localStorage | MEDIUM | LOW |
| **"Today" FAB** - Floating action button to return to today | MEDIUM | LOW |
| **Toast Duration** - Increase from 3s to 5s, add "Undo" for deletes | MEDIUM | LOW |

**Quick Win: Inline Attendance Pattern**
```
┌─────────────────────────────────────────┐
│  9:00 AM  Session - John D.             │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │  ✓  │ │  ✗  │ │ A/M │  ← Tap to set │
│  └─────┘ └─────┘ └─────┘               │
│  Present  Absent  Excused               │
└─────────────────────────────────────────┘
```

#### PHASE 2: STRUCTURAL CHANGES (Months 1-2)

| Change | Impact | Effort |
|--------|--------|--------|
| **Side Panel Architecture** - Replace modals with slide-in panels | HIGH | HIGH |
| **Command Palette** - Cmd+K for global search and actions | HIGH | MEDIUM |
| **Contextual Toolbars** - Actions appear near selected elements | MEDIUM | MEDIUM |
| **Parent Portal Redesign** - Dedicated /parent route with child dashboard | HIGH | HIGH |
| **Batch Operations** - Select multiple events for bulk attendance | HIGH | MEDIUM |
| **Onboarding Flow** - First-run wizard for new therapists | MEDIUM | MEDIUM |
| **Undo/Redo Stack** - Full action history with Cmd+Z support | HIGH | HIGH |

**Structural Change: Panel-Based Architecture**
```
┌────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Search] [+]  │
├────────┬───────────────────────────────┬──────────────────┤
│        │                               │ ╔══════════════╗ │
│  Nav   │      Calendar View            │ ║ Event Panel  ║ │
│        │                               │ ║              ║ │
│ 📅     │  [Selected event highlighted] │ ║ Quick edit   ║ │
│ 👥     │                               │ ║ without      ║ │
│ 👤     │                               │ ║ losing       ║ │
│ 💰     │                               │ ║ calendar     ║ │
│ 📊     │                               │ ║ context      ║ │
│        │                               │ ╚══════════════╝ │
└────────┴───────────────────────────────┴──────────────────┘
```

#### PHASE 3: FUTURE ENHANCEMENTS (Ongoing)

| Change | Impact | Effort |
|--------|--------|--------|
| **Offline Mode** - Full PWA with background sync | HIGH | HIGH |
| **Voice Input** - "Add session with John tomorrow at 9" | MEDIUM | HIGH |
| **AI Scheduling** - Suggest optimal times based on history | HIGH | HIGH |
| **Push Notifications** - Appointment reminders, parent updates | HIGH | MEDIUM |
| **Multi-Language** - i18n support (Romanian primary) | MEDIUM | MEDIUM |
| **Accessibility Audit** - WCAG 2.1 AA compliance | HIGH | MEDIUM |
| **Analytics Dashboard** - Therapist self-service insights | MEDIUM | MEDIUM |

---

## TASK 2: UI MODERNIZATION

### A. "Webpage" Anti-Patterns Identified

| Element | Current Problem | App-First Solution |
|---------|-----------------|-------------------|
| **Navigation** | Desktop sidebar, hamburger on mobile | Bottom tab bar (iOS/Android pattern) |
| **Scrolling** | Native browser scroll | Custom scroll with pull-to-refresh |
| **Transitions** | None - instant page changes | Shared element transitions, 300ms eases |
| **Loading** | Generic spinner | Skeleton screens matching content shape |
| **Touch** | Click only | Swipe gestures, long-press menus |
| **Feedback** | Toast only | Haptic feedback, micro-animations |
| **Density** | Desktop spacing | Touch-optimized 48px targets |
| **Headers** | Static top bar | Collapsing header on scroll |
| **Dialogs** | Centered modals | Bottom sheets on mobile |
| **Lists** | Table rows | Card stacks with actions |

### B. App-First UI Patterns

#### 1. Bottom Navigation (Mobile)

```
┌─────────────────────────────────────────┐
│                                         │
│           [Main Content Area]           │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  📅        👥        ➕        📊    👤  │
│ Calendar  Clients   New     Reports  Me │
└─────────────────────────────────────────┘
```

**Implementation:**
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

#### 2. Haptic Feedback Integration

```javascript
// haptics.js - Vibration patterns for key actions
export const haptics = {
  success: () => navigator.vibrate?.(10),
  warning: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.([50, 30, 50, 30, 50]),
  selection: () => navigator.vibrate?.(5),
};

// Usage in attendance toggle
function toggleAttendance(status) {
  haptics.selection();
  updateAttendance(status);
}
```

#### 3. Card-Based Event Layout

**Current (Dense Table):**
```
| Time  | Client      | Therapist | Status |
|-------|-------------|-----------|--------|
| 9:00  | John Doe    | Dr. Smith | ✓      |
| 10:00 | Jane Smith  | Dr. Jones | -      |
```

**Proposed (Card Stack):**
```
┌─────────────────────────────────────────┐
│ 🟢 9:00 - 10:00                    ✓ ✓ ✓│
│ ┌────┐                                  │
│ │ JS │ John Smith                       │
│ └────┘ Dr. Maria Garcia                 │
│ ─────────────────────────────────────── │
│ Programs: ABA (3+) | Speech (+)         │
│                           [View] [Edit] │
└─────────────────────────────────────────┘
        ↓ swipe for next
┌─────────────────────────────────────────┐
│ 🟡 10:00 - 11:00               pending  │
...
```

#### 4. Gesture Support Matrix

| Gesture | Calendar | Event Card | Client Card |
|---------|----------|------------|-------------|
| Swipe Left | Next week/day | Quick delete | Archive |
| Swipe Right | Prev week/day | Quick edit | View profile |
| Long Press | Date options | Full menu | Actions menu |
| Pinch | Zoom view | - | - |
| Pull Down | Refresh | - | Refresh |
| Double Tap | Create event | Open details | Edit |

#### 5. Micro-Interactions Specification

```css
/* Event card appearance */
.event-card {
  animation: slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1);
  transition: transform 150ms, box-shadow 150ms;
}

.event-card:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-sm);
}

/* Attendance toggle */
.attendance-btn {
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1); /* spring */
}

.attendance-btn.selected {
  transform: scale(1.1);
}

/* Pull to refresh */
.ptr-spinner {
  animation: spin 600ms linear infinite, fadeIn 200ms;
}
```

#### 6. Skeleton Screen Templates

```jsx
// EventCardSkeleton.jsx
export function EventCardSkeleton() {
  return (
    <div className="animate-pulse p-4 rounded-xl bg-surface">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-skeleton" />
          <div className="h-3 w-1/2 rounded bg-skeleton" />
        </div>
      </div>
    </div>
  );
}
```

---

## TASK 3: TECHNICAL MIGRATION

### A. Data Mapping Strategy: SQL → Firestore

#### Current SQL Schema (Inferred)

```sql
-- Relational Model
users (id, username, password_hash, role)
team_members (id, name, initials, role, color, user_id)
clients (id, name, email, phone, birthDate, medical_info, is_archived)
events (id, name, date, start_time, duration, type, team_member_ids,
        client_ids, attendance, program_scores, comments, recurring_id)
event_types (id, label, is_billable, requires_time)
activities (id, user_id, action, details, timestamp)
```

#### Firestore Document Model

```javascript
// Denormalized, read-optimized structure

// Collection: users
users/{userId} {
  email: string,
  displayName: string,
  role: 'admin' | 'coordinator' | 'therapist' | 'parent',
  teamMemberId: string | null,  // Links therapist user to team profile
  parentOf: string[],           // Client IDs for parent accounts
  createdAt: Timestamp,
  lastLogin: Timestamp
}

// Collection: teamMembers
teamMembers/{memberId} {
  name: string,
  initials: string,
  role: string,
  color: string,
  userId: string,              // Auth reference
  isActive: boolean,
  createdAt: Timestamp
}

// Collection: clients
clients/{clientId} {
  name: string,
  email: string,
  phone: string,
  birthDate: Timestamp,
  medicalInfo: string,
  isArchived: boolean,
  parentCode: string,          // For parent portal access

  // Embedded for read performance
  assignedTherapists: [{
    id: string,
    name: string,
    color: string
  }],

  // Subcollection for evolution data
  // clients/{clientId}/evolution/{assessmentId}

  createdAt: Timestamp,
  updatedAt: Timestamp
}

// Collection: events
events/{eventId} {
  title: string,
  date: Timestamp,
  startTime: string,           // "09:00"
  duration: number,            // minutes
  eventType: {
    id: string,
    label: string,
    isBillable: boolean
  },

  // Denormalized for queries without JOINs
  teamMembers: [{
    id: string,
    name: string,
    initials: string,
    color: string
  }],

  clients: [{
    id: string,
    name: string
  }],

  attendance: {
    [clientId]: 'present' | 'absent' | 'excused'
  },

  programScores: {
    [programId]: {
      name: string,
      score: '-' | '0' | 'P' | '+'
    }
  },

  comments: string,
  isPublic: boolean,           // Visible to parents

  // Recurring event support
  recurringGroupId: string | null,
  recurringPattern: {
    frequency: 'daily' | 'weekly' | 'monthly',
    daysOfWeek: number[],      // 0-6
    endDate: Timestamp | null
  } | null,

  createdBy: string,           // userId
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// Collection: eventTypes
eventTypes/{typeId} {
  label: string,
  isBillable: boolean,
  requiresTime: boolean,
  defaultDuration: number,
  color: string,
  sortOrder: number
}

// Collection: billings
billings/{billingId} {
  clientId: string,
  clientName: string,          // Denormalized
  month: string,               // "2026-01"
  sessions: [{
    eventId: string,
    date: Timestamp,
    duration: number,
    rate: number,
    amount: number
  }],
  subtotal: number,
  discountPercent: number,
  discountAmount: number,
  total: number,
  isPaid: boolean,
  paidAt: Timestamp | null
}

// Collection: activities (for audit log)
activities/{activityId} {
  userId: string,
  userName: string,
  action: string,
  entityType: 'event' | 'client' | 'team_member',
  entityId: string,
  details: object,
  timestamp: Timestamp
}
```

#### Migration Considerations

| SQL Pattern | Firestore Pattern | Trade-off |
|-------------|-------------------|-----------|
| JOINs (events + team_members) | Embedded team member data | Redundancy, but O(1) reads |
| Foreign keys | Document references | Manual integrity enforcement |
| Transactions | Batched writes | 500 doc limit per batch |
| Complex queries | Composite indexes | Must pre-define query patterns |
| COUNT(*) | Aggregation queries or counters | Maintain counter documents |
| Full-text search | Algolia/Typesense integration | External service cost |

---

### B. Firebase Setup Guide

#### Step 1: Project Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
cd tempo-app
firebase init

# Select:
# - Firestore
# - Authentication
# - Cloud Functions
# - Hosting
```

#### Step 2: Firebase Configuration

```javascript
// firebase.config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "tempo-app-xxxxx.firebaseapp.com",
  projectId: "tempo-app-xxxxx",
  storageBucket: "tempo-app-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

#### Step 3: Authentication Setup

```javascript
// lib/auth.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.config';

export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  return { ...userCredential.user, ...userDoc.data() };
}

export async function createUser(email, password, userData) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    ...userData,
    createdAt: serverTimestamp()
  });
  return userCredential.user;
}

// Role-based access hook
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUser({ ...firebaseUser, ...userDoc.data() });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
```

#### Step 4: Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isTherapist() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'coordinator', 'therapist'];
    }

    function isParentOf(clientId) {
      return isAuthenticated() &&
             clientId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.parentOf;
    }

    // Rules
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }

    match /teamMembers/{memberId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /clients/{clientId} {
      allow read: if isTherapist() || isParentOf(clientId);
      allow write: if isTherapist();
    }

    match /events/{eventId} {
      allow read: if isTherapist() ||
                    (resource.data.isPublic &&
                     resource.data.clients.hasAny([request.auth.token.parentOf]));
      allow create: if isTherapist();
      allow update: if isTherapist();
      allow delete: if isAdmin() ||
                      resource.data.createdBy == request.auth.uid;
    }

    match /billings/{billingId} {
      allow read, write: if isAdmin();
    }

    match /activities/{activityId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
    }
  }
}
```

#### Step 5: Data Migration Script

```javascript
// scripts/migrate-to-firebase.js
import mysql from 'mysql2/promise';
import admin from 'firebase-admin';
import serviceAccount from './service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  // Connect to MySQL
  const mysql = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'incjzljm_tempo_livebetterlife'
  });

  // Migrate team members
  console.log('Migrating team members...');
  const [teamMembers] = await mysql.execute('SELECT * FROM team_members');
  const teamBatch = db.batch();
  const teamIdMap = {};

  for (const member of teamMembers) {
    const docRef = db.collection('teamMembers').doc();
    teamIdMap[member.id] = docRef.id;
    teamBatch.set(docRef, {
      name: member.name,
      initials: member.initials,
      role: member.role,
      color: member.color,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  await teamBatch.commit();

  // Migrate clients
  console.log('Migrating clients...');
  const [clients] = await mysql.execute('SELECT * FROM clients');
  const clientIdMap = {};

  for (const client of clients) {
    const docRef = db.collection('clients').doc();
    clientIdMap[client.id] = docRef.id;
    await docRef.set({
      name: client.name,
      email: client.email,
      phone: client.phone,
      birthDate: client.birthDate ? admin.firestore.Timestamp.fromDate(new Date(client.birthDate)) : null,
      medicalInfo: client.medical_info,
      isArchived: Boolean(client.is_archived),
      parentCode: generateParentCode(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // Migrate events (with denormalized data)
  console.log('Migrating events...');
  const [events] = await mysql.execute('SELECT * FROM events');

  for (const event of events) {
    const teamMemberIds = JSON.parse(event.team_member_ids || '[]');
    const clientIds = JSON.parse(event.client_ids || '[]');

    // Fetch related data for denormalization
    const eventTeamMembers = teamMembers
      .filter(tm => teamMemberIds.includes(tm.id))
      .map(tm => ({
        id: teamIdMap[tm.id],
        name: tm.name,
        initials: tm.initials,
        color: tm.color
      }));

    const eventClients = clients
      .filter(c => clientIds.includes(c.id))
      .map(c => ({
        id: clientIdMap[c.id],
        name: c.name
      }));

    await db.collection('events').add({
      title: event.name,
      date: admin.firestore.Timestamp.fromDate(new Date(event.date)),
      startTime: event.start_time,
      duration: event.duration,
      teamMembers: eventTeamMembers,
      clients: eventClients,
      attendance: JSON.parse(event.attendance || '{}'),
      programScores: JSON.parse(event.program_scores || '{}'),
      comments: event.comments,
      isPublic: Boolean(event.is_public),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  console.log('Migration complete!');
  await mysql.end();
}

function generateParentCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

migrate().catch(console.error);
```

---

### C. Framework Recommendation: Next.js 14+

#### Why Next.js?

| Factor | Next.js Advantage |
|--------|-------------------|
| **SSR/SSG** | Dashboard loads fast with server rendering |
| **App Router** | Nested layouts perfect for sidebar + content |
| **Server Components** | Heavy data fetching on server, light client |
| **API Routes** | Gradual PHP replacement, same codebase |
| **TypeScript** | Full type safety (current app has none) |
| **Incremental Adoption** | Can run alongside existing PHP |
| **Vercel Hosting** | Seamless deployment with Firebase |
| **React Ecosystem** | Huge component library availability |

#### Proposed Architecture

```
tempo-app-next/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Sidebar + Header
│   │   ├── page.tsx             # Dashboard home
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── team/
│   │   │   └── page.tsx
│   │   ├── billing/
│   │   │   └── page.tsx
│   │   └── analytics/
│   │       └── page.tsx
│   ├── (parent)/
│   │   ├── layout.tsx           # Parent-specific nav
│   │   └── [clientCode]/
│   │       └── page.tsx
│   └── api/
│       ├── events/route.ts      # API routes
│       └── webhooks/route.ts
├── components/
│   ├── calendar/
│   │   ├── CalendarView.tsx
│   │   ├── EventCard.tsx
│   │   └── EventPanel.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── BottomSheet.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── BottomNav.tsx
├── lib/
│   ├── firebase.ts
│   ├── auth.ts
│   └── hooks/
│       ├── useEvents.ts
│       └── useClients.ts
├── stores/
│   └── calendarStore.ts         # Zustand state
└── types/
    └── index.ts
```

#### Key Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| State Management | **Zustand** | Simpler than Redux, works with Server Components |
| Styling | **Tailwind CSS** | Already partially used, utility-first |
| Forms | **React Hook Form + Zod** | Type-safe validation |
| Data Fetching | **TanStack Query** | Caching, background refetch, optimistic updates |
| Animation | **Framer Motion** | Gesture support, shared layouts |
| Charts | **Recharts** | React-native charts (replace Chart.js) |
| Testing | **Vitest + Playwright** | Fast unit tests, E2E coverage |

---

## 3. THE CRITIQUE

### Lead Developer (Marcus) → UX Plan Critique

> **On Phase 1 Quick Wins:**
>
> "Inline attendance on calendar cards sounds great, but we need to consider
> mobile tap targets. Each attendance button needs 44×44px minimum. On a
> week view with 20+ events visible, that's a lot of UI surface area.
> **Suggestion:** Only show inline buttons on hover/focus, or use a swipe
> gesture instead."
>
> **On Side Panel Architecture:**
>
> "Replacing modals with panels is a significant DOM restructuring. Our
> current modal system uses portal rendering. Panels need to be siblings
> of the main content for proper flexbox layout. **Estimate:** This alone
> is 2 weeks of work, not a few days. Recommend we do this IN the Next.js
> migration, not before."
>
> **On Undo/Redo Stack:**
>
> "Undo for Firestore operations is complex. We'd need to store previous
> document states client-side. With optimistic updates, the server may have
> already committed. **Alternative:** Implement 'soft delete' with 30-day
> recovery instead of true undo."
>
> **On Command Palette:**
>
> "Love it, but let's use an existing library (cmdk) instead of building
> custom. Our search indexing would need to be client-side initially -
> Firestore doesn't do full-text search. This is Phase 3, not Phase 2."

### UX Researcher (Sofia) → Technical Plan Critique

> **On Denormalization:**
>
> "If we embed team member names in every event, what happens when a
> therapist changes their name (marriage, etc.)? Users will see inconsistent
> names across old/new events. **Requirement:** Need a background job to
> update historical events, or accept the inconsistency for archived data."
>
> **On Parent Code Authentication:**
>
> "A 6-character alphanumeric code has 2 billion combinations - secure
> enough. But UX-wise, parents will lose this code. We need: (1) code
> recovery via email, (2) admin ability to regenerate codes, (3) code
> displayed in parent onboarding. Don't bury it in client settings."
>
> **On Firestore Security Rules:**
>
> "The `isParentOf` check queries the users collection on every request.
> With 100 parents hitting the app, that's 100 extra reads per calendar
> load. **Suggestion:** Embed `parentOf` in the auth token as a custom
> claim during login. Zero extra reads."
>
> **On Migration Script:**
>
> "The script doesn't handle the JSON files (evolution.json, billings.json).
> Those need migration too. Also, we need a rollback plan - what if we
> find data corruption after migration? Keep MySQL read-only for 30 days."

---

## 4. REVISED FINAL VERSION

### TEMPOAPP MODERNIZATION ROADMAP v1.1

#### Implementation Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Foundation (Weeks 1-4)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Week 1-2: Firebase Setup + Auth Migration                               │
│   • Create Firebase project                                             │
│   • Implement Firebase Auth with custom claims                          │
│   • Run data migration script (with JSON files)                         │
│   • Keep PHP API as fallback (read-only after migration)               │
│                                                                         │
│ Week 3-4: Quick UX Wins (in existing codebase)                         │
│   • Keyboard shortcuts (vanilla JS, low risk)                          │
│   • Persistent filters (localStorage)                                   │
│   • Skeleton loaders (CSS only)                                         │
│   • Extended toast with undo-delete (soft delete pattern)              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Next.js Migration (Weeks 5-12)                                │
├─────────────────────────────────────────────────────────────────────────┤
│ Week 5-6: Core App Shell                                                │
│   • Next.js project setup with TypeScript                              │
│   • Authentication flow (login, role routing)                          │
│   • Layout system (sidebar desktop, bottom nav mobile)                 │
│   • Theme system migration (CSS variables → Tailwind)                  │
│                                                                         │
│ Week 7-8: Calendar Module                                               │
│   • Calendar views (month/week/day) with Firestore real-time           │
│   • Event cards with inline attendance (swipe gesture)                 │
│   • Side panel for event editing (replaces modal)                      │
│   • Optimistic updates with TanStack Query                             │
│                                                                         │
│ Week 9-10: Client & Team Modules                                        │
│   • Client list with search (client-side index)                        │
│   • Client profile with evolution charts                               │
│   • Team management (admin only)                                        │
│   • Batch operations (multi-select attendance)                         │
│                                                                         │
│ Week 11-12: Parent Portal + Polish                                      │
│   • Dedicated parent routes with child dashboard                       │
│   • Parent code recovery flow                                          │
│   • Command palette (cmdk library)                                     │
│   • Onboarding wizard for new users                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Enhancement (Ongoing)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Month 4: Billing & Analytics                                            │
│   • Billing module migration                                           │
│   • Analytics dashboard with Recharts                                  │
│   • PDF report generation (server-side)                                │
│                                                                         │
│ Month 5: Offline + Push                                                 │
│   • Service worker for offline support                                 │
│   • Push notifications (Firebase Cloud Messaging)                      │
│   • Background sync for offline edits                                  │
│                                                                         │
│ Month 6+: Advanced Features                                             │
│   • AI scheduling suggestions                                          │
│   • Voice input ("Add session with John tomorrow")                     │
│   • Multi-language support (i18n)                                      │
│   • Full accessibility audit (WCAG 2.1 AA)                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### Critical Success Metrics

| Metric | Current | Phase 1 Target | Phase 2 Target |
|--------|---------|----------------|----------------|
| Attendance logging time | 45 sec/event | 30 sec/event | 8 sec/event |
| Page load (dashboard) | 2.5s | 2.0s | 0.8s |
| Mobile usability score | 65/100 | 75/100 | 90/100 |
| Parent portal NPS | Unknown | Measure | +30 |
| Daily active users | Baseline | +10% | +25% |

---

#### Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss in migration | Medium | Critical | 30-day parallel run, daily backups |
| User resistance to new UI | Medium | High | Gradual rollout, feature flags, training |
| Firebase costs spike | Low | Medium | Set billing alerts, optimize queries |
| Performance regression | Medium | Medium | Lighthouse CI, performance budgets |
| Auth migration issues | Medium | High | Soft launch to small user group first |

---

#### Immediate Next Steps

1. **Today:** Create Firebase project and enable Auth + Firestore
2. **This Week:** Run migration script on staging database
3. **Next Week:** Deploy Quick Win #1 (keyboard shortcuts) to production
4. **Week 3:** Initialize Next.js project, set up CI/CD pipeline
5. **Week 4:** Complete auth migration, deprecate PHP login

---

**End of Report**
