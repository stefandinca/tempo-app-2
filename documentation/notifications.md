# TempoApp Notification System Design Document

**Version:** 1.0
**Created:** February 2, 2026
**Status:** Design Phase
**Authors:** Product Squad (PM, Developer, UX Researcher, UI Designer)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Team Design Debate](#2-team-design-debate)
3. [Final Design Decisions](#3-final-design-decisions)
4. [Technical Architecture](#4-technical-architecture)
5. [UI/UX Specification](#5-uiux-specification)
6. [Notification Types by Profile](#6-notification-types-by-profile)
7. [Implementation Plan](#7-implementation-plan)

---

## 1. Executive Summary

### Objective

Implement a comprehensive notification system for TempoApp that serves all four user profiles (Admin, Coordinator, Therapist, Parent) with role-appropriate, actionable notifications that enhance user awareness without causing notification fatigue.

### Current State

- **Exists:** Toast notification system (ToastContext) for transient feedback
- **Missing:** Persistent notification center, user preferences, push notifications, email alerts

### Scope

| In Scope | Out of Scope |
|----------|--------------|
| In-app notification center | SMS notifications |
| Real-time Firestore listeners | WhatsApp/Telegram integration |
| Notification preferences per user | AI-powered notification summarization |
| Email notifications (critical only) | Notification analytics dashboard |
| Push notifications (PWA) | Multi-language notification templates |
| Role-based notification routing | Custom notification sounds |

---

## 2. Team Design Debate

### Topic 1: Notification Storage Architecture

**Question:** Where and how should notifications be stored?

---

**Senior Software Developer (Marcus):**

> I propose a **user-subcollection approach**: `users/{userId}/notifications`. This keeps notifications colocated with users, making queries simple and security rules straightforward. Each user only reads their own subcollection.
>
> However, for cross-user notifications (e.g., "Schedule changed for Client X" that affects multiple therapists), we'd need to write to multiple subcollections atomically via a Cloud Function.

**Lead UX Researcher (Sofia):**

> From a user perspective, the key requirement is **instant delivery**. Parents told us in interviews that knowing about schedule changes immediately is critical. Whatever architecture we choose must support real-time updates, not polling.

**Senior Project Manager (PM):**

> We need to consider the write cost. If a Coordinator changes a schedule affecting 10 therapists, that's 10 writes. At scale with 50 therapists, that's 50 writes per change. Marcus, what's the cost implication?

**Senior Software Developer (Marcus):**

> Good point. Alternative approach: a **global notifications collection** with compound queries (`recipientId == userId && read == false`). Single write per notification, but we'd need a Cloud Function to fan-out for multi-recipient notifications.
>
> Actually, I recommend a **hybrid approach**:
> - Global `notifications` collection for multi-recipient and audit purposes
> - Firestore compound index on `(recipientId, createdAt)` for efficient queries
> - Cloud Function to handle fan-out logic for bulk notifications
>
> This gives us single-write efficiency while maintaining query performance.

**UI Designer (Kai):**

> For the notification center UI, I need to know: will users be able to see notifications from different time periods? The storage needs to support pagination.

**Senior Software Developer (Marcus):**

> Yes, I'll add cursor-based pagination using `createdAt`. We'll load 20 notifications initially, then lazy-load more on scroll.

**Final Decision:** Global `notifications` collection with compound indexes, Cloud Functions for fan-out, cursor-based pagination.

---

### Topic 2: Real-time vs. Polling

**Question:** How should notifications be delivered to the client?

---

**Senior Software Developer (Marcus):**

> Firestore's `onSnapshot` listeners are the obvious choice. We're already using them for events, clients, and team members in DataContext. Adding a notifications listener follows the same pattern.
>
> The challenge is managing listener lifecycle to avoid memory leaks and unnecessary reads when the user isn't active.

**Lead UX Researcher (Sofia):**

> We need to consider the Parent profile specifically. Parents use the app infrequently (weekly, 15-30 mins). They should still get notified of critical changes. In-app real-time isn't enough for them.

**Senior Project Manager (PM):**

> This is where push notifications and email come in. What's the priority order, Marcus?

**Senior Software Developer (Marcus):**

> Proposed priority stack:
> 1. **In-app real-time** (Firestore listener) - immediate for active users
> 2. **Browser push** (PWA service worker) - for background tab/closed browser
> 3. **Email** (via Firebase Extensions or SendGrid) - for critical notifications when user offline
>
> We can use presence tracking (`lastActiveAt` timestamp) to determine which channel to use.

**UI Designer (Kai):**

> The notification bell should show a badge count. Does the listener automatically update this, or do we need a separate count query?

**Senior Software Developer (Marcus):**

> The listener returns all unread notifications, so we can derive the count client-side: `notifications.filter(n => !n.read).length`. No separate query needed.

**Final Decision:** Firestore real-time listeners (primary), PWA push for background (phase 2), email for critical + offline (phase 2).

---

### Topic 3: Notification Granularity & Fatigue

**Question:** How do we prevent notification overload while ensuring important alerts aren't missed?

---

**Lead UX Researcher (Sofia):**

> This is the biggest UX risk. From our legacy app feedback:
> - Therapists complained about too many non-actionable notifications
> - Admins wanted more alerts about billing issues
> - Parents wanted schedule change notifications but not session notes
>
> We need **role-based defaults** with **user-customizable preferences**.

**UI Designer (Kai):**

> I suggest we categorize notifications into:
> - **Critical** (always on, can't disable): Security, account issues, system-wide
> - **Important** (on by default): Schedule changes, attendance logged, new assignments
> - **Informational** (off by default for some roles): Session notes added, comments
>
> Users see a preferences panel where they toggle categories, not individual notification types.

**Senior Project Manager (PM):**

> I like the category approach. It keeps the preferences UI simple. How many categories are we talking?

**Lead UX Researcher (Sofia):**

> Based on user needs analysis:
>
> | Category | Admin | Coordinator | Therapist | Parent |
> |----------|-------|-------------|-----------|--------|
> | Schedule Changes | On | On | On | On (critical) |
> | Attendance/Scores | On | On | Own only | Child only |
> | Team Updates | On | On | Off | N/A |
> | Billing Alerts | On | View only | N/A | On |
> | System/Security | Critical | Critical | Critical | Critical |
> | Client Updates | On | On | Own only | Child only |

**Senior Software Developer (Marcus):**

> For implementation, I'll store preferences in the user's document:
> ```
> notificationPreferences: {
>   scheduleChanges: true,
>   attendanceScores: true,
>   teamUpdates: false,
>   billingAlerts: true,
>   clientUpdates: true,
>   emailDigest: 'daily' | 'weekly' | 'never',
>   pushEnabled: true
> }
> ```
> Cloud Functions check preferences before creating notifications.

**Final Decision:** Category-based preferences with role-appropriate defaults, stored in user document, enforced server-side.

---

### Topic 4: Parent Portal Notifications

**Question:** Parents use code-based auth (not Firebase Auth). How do they receive notifications?

---

**Senior Software Developer (Marcus):**

> This is tricky. Parents authenticate via `clientCode`, not Firebase Auth. They don't have a userId in the traditional sense. Initial options:
>
> 1. **Client-scoped notifications:** Store notifications in `clients/{clientId}/notifications`. Parents query by client code.
> 2. **Shadow user creation:** Create a minimal Firestore document for each parent with their clientCode, used for notification targeting.
> 3. **Email-only for parents:** Skip in-app notifications, send email for schedule changes.
> 4. **Anonymous Auth:** Use Firebase Anonymous Authentication when parent enters clientCode, then link the anonymous UID to the client.

**Lead UX Researcher (Sofia):**

> Parents told us they primarily want:
> 1. Schedule change alerts
> 2. Session summary after each visit
> 3. Monthly progress snapshot
>
> They're okay with email for #2 and #3. But schedule changes need to be immediate and visible in the portal. Real-time updates are crucial.

**UI Designer (Kai):**

> For the Parent Portal, I'd design a simplified notification view - not a bell icon, but a dedicated "Alerts" section on their dashboard showing recent schedule changes and session summaries. But if we can get real-time updates working, we could add a subtle notification badge.

**Senior Project Manager (PM):**

> What about option 4 - Anonymous Auth? Would that simplify things?

**Senior Software Developer (Marcus):**

> Actually, yes! Let me analyze this:
>
> **With Anonymous Auth:**
> - Parent enters clientCode → `signInAnonymously()` → Link UID to client document
> - Parents get a Firebase Auth UID, enabling direct Firestore access
> - Same security rules pattern as staff users
> - Real-time `onSnapshot` listeners work natively
> - No Cloud Function needed for notification fetching
>
> **Cost comparison:**
> - Current approach: Cloud Function invocation per fetch (~$0.40/million)
> - Anonymous Auth: Direct Firestore reads (same cost either way) + no function invocation
>
> **Code simplification:**
> - Current: Two code paths (staff uses Firestore, parents use Cloud Functions)
> - Anonymous Auth: Single unified NotificationContext for everyone

**Senior Project Manager (PM):**

> What about edge cases - multiple devices, cleared browser data?

**Senior Software Developer (Marcus):**

> Good questions:
> - **Multiple devices:** Store `parentUids: []` array on client document. Multiple anonymous UIDs can map to one client.
> - **Cleared browser data:** Parent re-enters clientCode, gets new anonymous UID, we add it to the array.
> - **Auth limits:** Firebase free tier covers 10K monthly active users - plenty for parents.
> - **Future upgrade:** Firebase supports linking anonymous accounts to email/password if parents want full accounts later.

**Lead UX Researcher (Sofia):**

> This is much better for UX. Parents get the same real-time experience as staff. No polling, no delays.

**Final Decision:** Use Firebase Anonymous Authentication for parents. When parent enters clientCode, sign in anonymously and link UID to client document. This enables unified notification architecture with direct Firestore access and real-time listeners for all user types.

---

### Topic 5: Notification Actions & Deep Links

**Question:** Should notifications be actionable? If so, how?

---

**UI Designer (Kai):**

> Actionable notifications significantly improve UX. A "Session cancelled" notification should have a "Reschedule" button that opens the event creation panel with pre-filled data.

**Lead UX Researcher (Sofia):**

> Research shows actionable notifications have 3x higher engagement. But we need to be careful:
> - Action must be relevant to the recipient's permissions
> - Deep links must work even if the notification is old
> - Failed actions (e.g., event already deleted) need graceful handling

**Senior Software Developer (Marcus):**

> I'll implement a standardized action schema:
> ```typescript
> interface NotificationAction {
>   label: string;           // "View Event", "Reschedule", "Mark as Read"
>   type: 'navigate' | 'api' | 'dismiss';
>   target?: string;         // Route for navigate, endpoint for api
>   params?: Record<string, string>;
> }
> ```
>
> Each notification can have 0-2 actions. The UI renders buttons, and clicking triggers the appropriate handler.

**Senior Project Manager (PM):**

> Keep the action count low. One primary action is usually enough. "View Details" handles most cases.

**Final Decision:** Notifications support 0-2 actions with standardized schema. Primary action is "View" linking to the relevant entity.

---

## 3. Final Design Decisions

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| Storage | Global `notifications` collection | Efficient writes, compound queries |
| Delivery | Firestore listeners + PWA push + email | Multi-channel coverage |
| Preferences | Category-based, role defaults | Simple UX, server-enforced |
| Parent Auth | Firebase Anonymous Authentication | Unified architecture, real-time support, lower costs |
| Parent Notifications | Direct Firestore via Anonymous UID | Same as staff, no Cloud Function needed |
| Actions | Up to 2 actions with deep links | Higher engagement, bounded complexity |
| Pagination | Cursor-based, 20 per page | Performance + infinite scroll UX |

---

## 4. Technical Architecture

### 4.1 Data Schema

#### Notifications Collection

```typescript
// Collection: notifications
interface Notification {
  id: string;                          // Auto-generated
  recipientId: string;                 // Firebase Auth UID (staff or anonymous parent)
  recipientRole: 'admin' | 'coordinator' | 'therapist' | 'parent';  // For filtering/analytics

  // Content
  type: NotificationType;              // Enum (see below)
  category: NotificationCategory;      // For preferences matching
  title: string;                       // Short headline
  message: string;                     // Detailed message

  // Metadata
  createdAt: Timestamp;
  read: boolean;
  readAt?: Timestamp;

  // Source
  sourceType: 'event' | 'client' | 'team' | 'billing' | 'system';
  sourceId?: string;                   // ID of related entity
  triggeredBy?: string;                // User ID who triggered this

  // Actions
  actions?: NotificationAction[];

  // For deduplication
  groupKey?: string;                   // Group similar notifications
}

// For parent notifications, recipientId is the anonymous UID
// Cloud Functions look up parentUids array on client document to find recipients

type NotificationType =
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_cancelled'
  | 'attendance_logged'
  | 'score_recorded'
  | 'client_assigned'
  | 'client_unassigned'
  | 'team_member_added'
  | 'billing_generated'
  | 'billing_overdue'
  | 'report_ready'
  | 'system_alert'
  | 'reminder';

type NotificationCategory =
  | 'schedule'
  | 'attendance'
  | 'team'
  | 'billing'
  | 'client'
  | 'system';

interface NotificationAction {
  label: string;
  type: 'navigate' | 'dismiss';
  route?: string;
  params?: Record<string, string>;
}
```

#### Client Document (updated for Anonymous Auth)

```typescript
// Collection: clients
interface Client {
  // ... existing fields ...
  clientCode: string;                  // Code for parent portal access
  parentUids: string[];                // Array of anonymous Firebase Auth UIDs
                                       // Supports multiple devices/sessions per parent

  // ... rest of client data ...
}
```

#### User Preferences (in team_members or clients document)

```typescript
interface NotificationPreferences {
  // Category toggles
  schedule: boolean;
  attendance: boolean;
  team: boolean;
  billing: boolean;
  client: boolean;

  // Delivery channels
  inApp: boolean;
  push: boolean;
  email: 'instant' | 'daily' | 'weekly' | 'never';

  // Quiet hours (optional)
  quietHoursStart?: string;  // "22:00"
  quietHoursEnd?: string;    // "07:00"
}
```

### 4.2 Firestore Security Rules

```javascript
// notifications collection - UNIFIED for staff and parents
match /notifications/{notificationId} {
  // Any authenticated user (staff or anonymous parent) can read their own notifications
  allow read: if request.auth != null
    && resource.data.recipientId == request.auth.uid;

  // Any authenticated user can mark their notifications as read
  allow update: if request.auth != null
    && resource.data.recipientId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read', 'readAt']);

  // Only Cloud Functions can create/delete
  allow create, delete: if false;
}

// clients collection - allow parents to link their anonymous UID
match /clients/{clientId} {
  // ... existing rules ...

  // Allow adding anonymous UID to parentUids array (via Cloud Function for security)
  // Direct client access still restricted - linking done server-side
}
```

**Note:** With Anonymous Auth, both staff and parents have Firebase Auth UIDs. Security rules are simplified to a single pattern: `recipientId == request.auth.uid`. No special handling needed for parents.

### 4.3 Cloud Functions

```typescript
// 1. Link Parent Anonymous UID to Client (called after parent enters clientCode)
export const linkParentToClient = functions.https.onCall(
  async (data, context) => {
    // Require authentication (anonymous or otherwise)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }

    const { clientCode } = data;
    const parentUid = context.auth.uid;

    // Find client by code
    const clientSnap = await db.collection('clients')
      .where('clientCode', '==', clientCode)
      .limit(1)
      .get();

    if (clientSnap.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid client code');
    }

    const clientDoc = clientSnap.docs[0];
    const clientData = clientDoc.data();

    // Add UID to parentUids array if not already present
    const parentUids = clientData.parentUids || [];
    if (!parentUids.includes(parentUid)) {
      await clientDoc.ref.update({
        parentUids: admin.firestore.FieldValue.arrayUnion(parentUid)
      });
    }

    return {
      success: true,
      clientId: clientDoc.id,
      clientName: clientData.name
    };
  }
);

// 2. Notification Creator (triggered by Firestore writes)
export const onEventChange = functions.firestore
  .document('events/{eventId}')
  .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!before && after) {
      // Created
      await createScheduleNotification('schedule_created', after, context.params.eventId);
    } else if (before && after) {
      // Updated - check for meaningful changes
      if (hasScheduleChange(before, after)) {
        await createScheduleNotification('schedule_updated', after, context.params.eventId, before);
      }
    } else if (before && !after) {
      // Deleted
      await createScheduleNotification('schedule_cancelled', before, context.params.eventId);
    }
  });

// 3. Notification Fan-out (for multi-recipient notifications)
async function createScheduleNotification(
  type: NotificationType,
  event: EventData,
  eventId: string,
  previousEvent?: EventData
) {
  const recipients = await getNotificationRecipients(event);
  const batch = db.batch();

  for (const recipient of recipients) {
    // Check user preferences
    if (!await shouldNotify(recipient, 'schedule')) continue;

    const notification: Notification = {
      recipientId: recipient.uid,  // Firebase Auth UID (staff or anonymous parent)
      recipientRole: recipient.role,
      type,
      category: 'schedule',
      title: getNotificationTitle(type, event),
      message: getNotificationMessage(type, event, previousEvent),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      sourceType: 'event',
      sourceId: eventId,
      actions: [{
        label: 'View Event',
        type: 'navigate',
        route: recipient.role === 'parent' ? '/parent/schedule' : '/calendar',
        params: { event: eventId }
      }]
    };

    batch.set(db.collection('notifications').doc(), notification);
  }

  await batch.commit();
}

// 4. Get notification recipients (staff + parent UIDs)
async function getNotificationRecipients(event: EventData) {
  const recipients: Array<{ uid: string; role: string }> = [];

  // Add assigned therapists (staff)
  for (const therapistId of event.therapistIds || []) {
    const therapist = await db.collection('team_members').doc(therapistId).get();
    if (therapist.exists) {
      recipients.push({
        uid: therapist.data()!.authUid,  // Firebase Auth UID
        role: therapist.data()!.role.toLowerCase()
      });
    }
  }

  // Add parents (anonymous UIDs from client document)
  if (event.clientId) {
    const client = await db.collection('clients').doc(event.clientId).get();
    if (client.exists && client.data()!.parentUids) {
      for (const parentUid of client.data()!.parentUids) {
        recipients.push({
          uid: parentUid,
          role: 'parent'
        });
      }
    }
  }

  return recipients;
}
```

**Key Changes with Anonymous Auth:**
- No `getParentNotifications` Cloud Function needed - parents read directly from Firestore
- New `linkParentToClient` function to associate anonymous UID with client
- `getNotificationRecipients` includes parent UIDs from client document
- All notifications use Firebase Auth UID as `recipientId`

### 4.4 Client-Side Integration

#### Parent Portal Auth Flow (with Anonymous Auth)

```typescript
// lib/parentAuth.ts
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";

export async function authenticateParent(clientCode: string) {
  // 1. Sign in anonymously (creates Firebase Auth session)
  const userCredential = await signInAnonymously(auth);
  const user = userCredential.user;

  // 2. Link anonymous UID to client via Cloud Function
  const linkParent = httpsCallable(functions, 'linkParentToClient');
  const result = await linkParent({ clientCode });

  // 3. Store client info for UI
  localStorage.setItem('parent_client_code', clientCode);
  localStorage.setItem('parent_client_id', result.data.clientId);
  localStorage.setItem('parent_client_name', result.data.clientName);

  return {
    user,
    clientId: result.data.clientId,
    clientName: result.data.clientName
  };
}
```

#### NotificationContext.tsx (UNIFIED for all users)

```typescript
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, Timestamp, startAfter, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
  recipientRole: string;
  sourceType: string;
  sourceId?: string;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  type: 'navigate' | 'dismiss';
  route?: string;
  params?: Record<string, string>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();  // Works for both staff AND anonymous parents
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // UNIFIED: Same real-time listener for staff AND parents
  // Both have Firebase Auth UIDs (staff = email/password, parent = anonymous)
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),  // Same field for everyone
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      setNotifications(notifs);
      setLoading(false);
      setHasMore(snapshot.docs.length === 20);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, "notifications", id), {
      read: true,
      readAt: Timestamp.now()
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n =>
        updateDoc(doc(db, "notifications", n.id), {
          read: true,
          readAt: Timestamp.now()
        })
      )
    );
  }, [notifications]);

  const loadMore = useCallback(async () => {
    if (!user || !lastDoc || !hasMore) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(20)
    );

    const snapshot = await getDocs(q);
    const newNotifs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];

    setNotifications(prev => [...prev, ...newNotifs]);
    setHasMore(snapshot.docs.length === 20);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
  }, [user, lastDoc, hasMore]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      loadMore,
      hasMore
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
```

**Key Benefits of Unified Context:**
- Single codebase for staff and parent notifications
- Same real-time `onSnapshot` listener pattern
- No conditional logic based on user type
- Identical security rules apply to all users
- Reduced bundle size (no Cloud Function SDK needed for parents)

---

## 5. UI/UX Specification

### 5.1 Notification Bell (Header Component)

**Location:** Top-right header, next to profile dropdown

```
┌─────────────────────────────────────────────────────────────┐
│ TEMPOAPP                        🔍  [🔔 3]  [👤 Dr. Garcia]│
└─────────────────────────────────────────────────────────────┘
                                       ↑
                                  Bell with badge
```

**States:**

| State | Visual |
|-------|--------|
| No notifications | Bell icon, no badge |
| Unread (1-9) | Bell icon + red badge with count |
| Unread (10-99) | Badge shows "10+", "20+", etc. |
| Unread (100+) | Badge shows "99+" |
| Dropdown open | Bell filled, dropdown visible |

**Interaction:**
- Click bell → Toggle dropdown
- Badge animates (pulse) on new notification
- Click outside → Close dropdown

### 5.2 Notification Dropdown

```
┌─────────────────────────────────────────────────────────────┐
│ Notifications                         [Mark all as read]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🔵 Schedule Updated                           2 min ago ││
│ │ Session with John Smith moved to 10:00 AM              ││
│ │ [View Event]                                           ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🟢 Attendance Logged                          1 hour ago││
│ │ Maria marked 3 clients as Present                      ││
│ │ [View Calendar]                                        ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ○ New Client Assigned                         Yesterday ││
│ │ You've been assigned to Sarah Lee                      ││
│ │ [View Client]                                          ││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    [View All Notifications]                 │
└─────────────────────────────────────────────────────────────┘
```

**Visual Design:**
- Max height: 400px (scrollable)
- Width: 360px
- Shadow: shadow-lg for elevation
- Border radius: rounded-xl
- Background: bg-white dark:bg-neutral-900

**Notification Item:**
- Unread indicator: colored dot (category color)
- Read indicator: hollow circle
- Timestamp: relative time ("2 min ago", "Yesterday")
- Hover: slight background highlight
- Click: marks as read, executes primary action

### 5.3 Full Notification Center (Page)

**Route:** `/notifications`

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back    Notifications                    [⚙️ Preferences] │
├─────────────────────────────────────────────────────────────┤
│ [All] [Unread] [Schedule] [Attendance] [Team] [Billing]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TODAY                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔵 Session Cancelled                                    ││
│  │ Dr. Garcia cancelled session with Mike Brown            ││
│  │ Tomorrow at 2:00 PM → Cancelled                         ││
│  │ [Reschedule] [Dismiss]                       10:32 AM   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  YESTERDAY                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ○ Monthly Report Ready                                  ││
│  │ January 2026 report for John Smith is available         ││
│  │ [Download Report]                            11:45 PM   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  THIS WEEK                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ○ New Team Member                                       ││
│  │ Dr. Alex Kim joined the team as Speech Therapist        ││
│  │ [View Team Member]                            Jan 28    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                    [Load More]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Notification Preferences Panel

**Route:** `/notifications/preferences` or modal from notification center

```
┌─────────────────────────────────────────────────────────────┐
│ Notification Preferences                              [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ IN-APP NOTIFICATIONS                                        │
│ ─────────────────────────────────────────────────────────   │
│ ┌─ Schedule Changes ─────────────────────────────── [ON] ─┐│
│ │ Event created, updated, or cancelled                    ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─ Attendance & Scores ──────────────────────────── [ON] ─┐│
│ │ When attendance is logged or scores recorded            ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─ Team Updates ─────────────────────────────────── [OFF]─┐│
│ │ New team members, role changes                          ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─ Client Updates ───────────────────────────────── [ON] ─┐│
│ │ Client assigned, profile updated                        ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─ Billing Alerts ───────────────────────────────── [ON] ─┐│
│ │ Invoice generated, payment overdue                      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ EMAIL NOTIFICATIONS                                         │
│ ─────────────────────────────────────────────────────────   │
│ Email digest: [Daily ▼]                                     │
│ ☑ Critical alerts (always sent)                            │
│                                                             │
│ PUSH NOTIFICATIONS                                          │
│ ─────────────────────────────────────────────────────────   │
│ ☐ Enable browser push notifications                        │
│   Receive alerts even when the app is closed               │
│                                                             │
│                              [Save Preferences]             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Parent Portal Notifications

**Location:** Dedicated section on Parent Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, Alexandru                                     │
│ Viewing: Emma Marin                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ RECENT ALERTS ─────────────────────────────────────────┐│
│ │                                                         ││
│ │ 📅 Schedule Change                              Today   ││
│ │ Tomorrow's session moved from 9:00 to 10:30 AM         ││
│ │ [View Schedule]                                        ││
│ │                                                         ││
│ │ ─────────────────────────────────────────────────────  ││
│ │                                                         ││
│ │ 📊 Session Summary                            Yesterday ││
│ │ Emma had a great session! Attendance: Present          ││
│ │ [View Details]                                         ││
│ │                                                         ││
│ │ ─────────────────────────────────────────────────────  ││
│ │                                                         ││
│ │ 📄 Report Available                           Jan 28   ││
│ │ January progress report is ready to download           ││
│ │ [Download PDF]                                         ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Category Colors

| Category | Color | Icon | Usage |
|----------|-------|------|-------|
| Schedule | Blue (#4A90E2) | 📅 | Events, calendar changes |
| Attendance | Green (#22C55E) | ✓ | Attendance logged, scores |
| Team | Purple (#8B5CF6) | 👥 | Team member updates |
| Billing | Orange (#F97316) | 💰 | Invoices, payments |
| Client | Teal (#14B8A6) | 👤 | Client assignments, updates |
| System | Red (#EF4444) | ⚠️ | Alerts, security, errors |

### 5.7 Animation & Transitions

| Interaction | Animation |
|-------------|-----------|
| New notification arrives | Bell shake + badge pulse |
| Dropdown open | Fade in + slide down (150ms) |
| Dropdown close | Fade out + slide up (100ms) |
| Mark as read | Dot fades to outline (200ms) |
| Notification item hover | Background fade (100ms) |
| Delete notification | Slide out left + collapse (200ms) |

---

## 6. Notification Types by Profile

### 6.1 Admin

| Notification Type | Trigger | Priority | Default |
|-------------------|---------|----------|---------|
| Schedule created | Any event created | Low | On |
| Schedule updated | Any event modified | Medium | On |
| Schedule cancelled | Any event deleted | Medium | On |
| Attendance logged | Any attendance recorded | Low | Off |
| New team member | User account created | Medium | On |
| Team member deactivated | User account disabled | High | On |
| Billing generated | Monthly invoices created | Medium | On |
| Payment overdue | Invoice past due date | High | On |
| System error | Critical system failure | Critical | Always |
| Security alert | Suspicious login, etc. | Critical | Always |

### 6.2 Coordinator

| Notification Type | Trigger | Priority | Default |
|-------------------|---------|----------|---------|
| Schedule created | Event in their scope | Low | On |
| Schedule updated | Event in their scope | Medium | On |
| Schedule cancelled | Event in their scope | Medium | On |
| Schedule conflict | Overlapping events detected | High | On |
| Attendance missing | End of day, not logged | Medium | On |
| Client assigned | New client added to roster | Medium | On |
| Report due | Monthly report deadline | Medium | On |

### 6.3 Therapist

| Notification Type | Trigger | Priority | Default |
|-------------------|---------|----------|---------|
| My schedule updated | Their event modified | High | On |
| My schedule cancelled | Their event deleted | High | On |
| Reminder: upcoming session | 30 min before session | Medium | On |
| Client assigned to me | New client assigned | Medium | On |
| Client unassigned | Client removed | Medium | On |
| Score target reached | Client milestone | Low | Off |

### 6.4 Parent

| Notification Type | Trigger | Priority | Default |
|-------------------|---------|----------|---------|
| Schedule change | Child's session modified | High | On |
| Session completed | After session ends | Medium | On |
| Session summary | Therapist adds notes | Medium | On |
| Report available | Monthly report ready | Medium | On |
| Invoice ready | New invoice generated | Medium | On |
| Payment reminder | Invoice due soon | High | On |

---

## 7. Implementation Plan

### Phase 1: Foundation (Sprint 5)

| Task | Owner | Priority |
|------|-------|----------|
| Create `notifications` collection schema | Marcus | P0 |
| Add Firestore indexes | Marcus | P0 |
| Add unified security rules | Marcus | P0 |
| **Enable Anonymous Auth in Firebase Console** | Marcus | P0 |
| **Create `linkParentToClient` Cloud Function** | Marcus | P0 |
| **Update Parent Portal auth flow to use Anonymous Auth** | Frontend | P0 |
| **Add `parentUids` array to client schema** | Marcus | P0 |
| Create NotificationContext (unified) | Frontend | P0 |
| Build NotificationBell component | Frontend | P0 |
| Build NotificationDropdown component | Frontend | P0 |
| Integrate bell into Header | Frontend | P0 |
| Create schedule change Cloud Function | Marcus | P0 |
| Add preferences to user schema | Marcus | P1 |

### Phase 2: Full UI (Sprint 6)

| Task | Owner | Priority |
|------|-------|----------|
| Build full Notifications page | Frontend | P0 |
| Build Preferences panel | Frontend | P0 |
| Implement category filters | Frontend | P1 |
| Add notification grouping | Marcus | P1 |
| Create attendance Cloud Function | Marcus | P1 |
| Create billing Cloud Function | Marcus | P1 |
| Parent Portal alerts section (uses unified context) | Frontend | P0 |
| Add notification bell to Parent Portal header | Frontend | P1 |

### Phase 3: Advanced Features (Sprint 7-8)

| Task | Owner | Priority |
|------|-------|----------|
| PWA push notifications | Marcus | P1 |
| Email notification integration | Marcus | P1 |
| Daily/weekly digest emails | Marcus | P2 |
| Quiet hours implementation | Marcus | P2 |
| Notification search | Frontend | P2 |
| Bulk actions (delete old) | Frontend | P2 |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Notification delivery latency | < 2 seconds | Firestore logs |
| Unread notification check rate | > 80% daily | Analytics |
| Preference customization rate | > 30% of users | Analytics |
| Notification-driven navigation | > 20% of actions | Click tracking |
| Parent notification open rate | > 60% | Analytics |

---

## Appendix A: Component File Structure

```
src/
├── context/
│   └── NotificationContext.tsx
├── components/
│   └── notifications/
│       ├── NotificationBell.tsx
│       ├── NotificationDropdown.tsx
│       ├── NotificationItem.tsx
│       ├── NotificationList.tsx
│       ├── NotificationPreferences.tsx
│       └── ParentAlerts.tsx
├── app/
│   ├── (dashboard)/
│   │   └── notifications/
│   │       └── page.tsx
│   └── parent/
│       └── dashboard/
│           └── (includes ParentAlerts)
└── lib/
    └── notifications.ts  // Utility functions
```

---

## Appendix B: Notification Message Templates

```typescript
const templates = {
  schedule_created: {
    title: "New Session Scheduled",
    message: "{therapist} scheduled a session with {client} on {date} at {time}"
  },
  schedule_updated: {
    title: "Schedule Updated",
    message: "Session with {client} changed: {changes}"
  },
  schedule_cancelled: {
    title: "Session Cancelled",
    message: "Session with {client} on {date} has been cancelled"
  },
  attendance_logged: {
    title: "Attendance Logged",
    message: "{therapist} marked {count} client(s) as {status}"
  },
  client_assigned: {
    title: "New Client Assigned",
    message: "You've been assigned to {client}"
  },
  billing_generated: {
    title: "Invoice Ready",
    message: "Invoice for {month} ({amount}) is ready for {client}"
  },
  report_ready: {
    title: "Report Available",
    message: "{month} progress report for {client} is ready to download"
  }
};
```

---

## Appendix C: Anonymous Auth Setup Guide

### Firebase Console Configuration

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Anonymous" provider
3. No additional configuration needed

### Cost Implications

| Metric | Free Tier | Paid Tier |
|--------|-----------|-----------|
| Monthly Active Users (Anonymous) | 10,000 | $0.01/MAU beyond |
| Firestore reads | 50,000/day | $0.06/100K |
| Cloud Function invocations | 2M/month | $0.40/million |

**Expected savings with Anonymous Auth:**
- Eliminates `getParentNotifications` Cloud Function calls
- Estimated 80% reduction in function invocations for parent-related features
- No change to Firestore read costs (reads happen either way)

### Security Considerations

1. **Anonymous UIDs are persistent** per device until user signs out or clears data
2. **Rate limiting**: Consider adding rate limits on `linkParentToClient` to prevent abuse
3. **Client code validation**: Always validate clientCode server-side (in Cloud Function)
4. **UID cleanup**: Consider periodic cleanup of orphaned anonymous UIDs

### Migration Path to Full Accounts

If parents want to upgrade to email/password accounts:

```typescript
import { linkWithCredential, EmailAuthProvider } from "firebase/auth";

async function upgradeToEmailAccount(email: string, password: string) {
  const credential = EmailAuthProvider.credential(email, password);
  await linkWithCredential(auth.currentUser, credential);
  // Anonymous UID is preserved, account now has email/password
}
```

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2, 2026 | Product Squad | Initial design document |
| 1.1 | Feb 2, 2026 | Product Squad | Updated to use Anonymous Auth for parents |

---

**End of Document**
