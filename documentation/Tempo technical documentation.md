# TempoApp - Comprehensive Technical Documentation

> **Version**: 2.2 (Production)  |  **Last Updated**: August 2026  |  **Platform**: Next.js 14 + Firebase v10, deployed on Vercel  |  **Status**: Production-ready. Voice feedback + session videos shipped; parent login via `client_codes` lookup; the Mira AI assistant is live (§27); all clinics share one Firebase and one Vercel project, split by a database and bucket per clinic (§28)

---

# 1. Architecture Overview

TempoApp is a therapy center management platform built for Romanian ABA (Applied Behavior Analysis) therapy centers. It serves two distinct user groups through separate portals:

- **Staff Dashboard** — Used by Superadmin, Admin, Coordinator, and Therapist roles
- **Parent Portal** — Anonymous authentication for parents to view their child's progress

## High-Level Architecture

> 🏗️ **System Layers**

**Hosting Layer**
Vercel, Node.js 22 — one Vercel project per tenant (§28). The former
CloudLinux/Passenger path (`server.js`, `.htaccess`, `npm run package`) is retired.

**Application Layer**
Next.js 14 App Router (SSR + CSR) serving three route groups:
- Staff Dashboard (14 pages — including `/ai-usage`)
- Parent Portal (9 pages)
- API Routes (AI assistant, SmartBill proxy, Cloud Functions proxy, Health check)

**Backend Layer — Firebase v10 (Client SDK)**
- Firestore — Real-time NoSQL database
- Auth — Email/password + Anonymous authentication
- Storage — File uploads (avatars, documents)
- Cloud Messaging (FCM) — Push notifications
- Cloud Functions — Server-side logic (team onboarding, notification delivery)

**External Integration**
- SmartBill API — Romanian invoicing platform

## Key Architectural Decisions

| Decision | Rationale |
| --- | --- |
| Client-side Firebase for all product features | Every product feature runs Firebase in `"use client"` components, so security rules are the enforcement layer |
| Server-side Admin SDK for AI and SmartBill only | `src/lib/firebaseAdmin.ts` is used by `/api/assistant/*` and the SmartBill route, which need to read across clients and write rate-limit counters the client must not be able to forge. These routes gate on a verified ID token + staff role **before** any Admin read (`src/lib/assistant/gate.ts`). Note this makes the app single-tenant server-side — see §28 |
| Real-time listeners everywhere | `onSnapshot` for all Firestore queries ensures instant UI updates across devices |
| Context-based state management | React Context API instead of Redux/Zustand for simplicity |
| Anonymous auth for parents | Parents use access codes + anonymous Firebase auth to avoid account management |
| Node.js server deployment | Not static export; uses API routes for SmartBill proxy and Cloud Functions proxy |

---

# 2. Technology Stack

## Core Framework

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | 14.1.0 | React framework with App Router |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Node.js | 22.x | Server runtime (`engines.node` in package.json) |

## Backend Services (Firebase)

| Service | Version | Purpose |
| --- | --- | --- |
| Firebase SDK | 10.8.0 | Client-side modular SDK |
| Firestore | v10 | Real-time NoSQL database |
| Firebase Auth | v10 | Email/password + anonymous authentication |
| Firebase Storage | v10 | File uploads (avatars, documents) |
| Firebase Cloud Messaging | v10 | Push notifications |
| Cloud Functions | v4.3.1 | Server-side logic (team onboarding, push delivery) |
| Firebase Admin SDK | 12.x | Cloud Functions **and** the Next.js AI/SmartBill API routes (`src/lib/firebaseAdmin.ts`) |

## Frontend Libraries

| Library | Version | Purpose |
| --- | --- | --- |
| Tailwind CSS | 3.3.0 | Utility-first CSS framework |
| react-i18next | 16.5.4 | Internationalization (EN + RO) |
| date-fns | 4.1.0 | Date manipulation with locale support |
| Recharts | 3.7.0 | Chart library for analytics |
| Lucide React | 0.330.0 | Icon library |
| jsPDF | 4.0.0 | PDF generation |
| jspdf-autotable | 5.0.7 | PDF table generation |
| clsx | 2.1.0 | Conditional CSS classes |
| tailwind-merge | 2.2.1 | Tailwind class deduplication |
| next-pwa | 5.6.0 | Progressive Web App support |

## Build & Development

| Tool | Purpose |
| --- | --- |
| ESLint | Code linting |
| PostCSS | CSS processing (Tailwind + Autoprefixer) |
| Workbox | Service worker generation (via next-pwa) |

---

# 3. Project Structure

## Root Level

| Path | Purpose |
| --- | --- |
| `functions/` | Firebase Cloud Functions |
| `public/` | Static assets (SW, manifest, icons, locales) |
| `src/` | Application source code |
| `documentation/` | Project documentation |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Storage security rules |
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Tailwind theme |
| `CLAUDE.md` | AI development guidelines |

## `src/app/` — Pages & Routes

### Staff Dashboard `(dashboard)/`

| Page | Route | Description |
| --- | --- | --- |
| Dashboard | `/` | Main hub with KPIs, schedule, activity |
| Calendar | `/calendar` | Scheduling with Day/Week/Month views |
| Clients | `/clients` | Client roster management |
| Client Profile | `/clients/profile` | Individual client profile (8 tabs) |
| Messages | `/messages` | Real-time chat threads |
| Billing | `/billing` | Invoices, payouts, expenses |
| Analytics | `/analytics` | KPIs & chart visualizations |
| Team | `/team` | Staff management and permissions |
| Activity | `/activity` | System-wide audit log |
| Services | `/services` | Service definitions and pricing |
| Settings | `/settings` | Account, appearance, billing config |
| Notifications | `/notifications` | Notification center |
| Help | `/help` | Help & video tutorials |

### Parent Portal `parent/`

| Page | Route | Description |
| --- | --- | --- |
| Login | `/parent` | Access code entry |
| Dashboard | `/parent/dashboard` | Parent home |
| Calendar | `/parent/calendar` | Session schedule |
| Progress | `/parent/progress` | Child progress tracking |
| Homework | `/parent/homework` | Homework assignments |
| Messages | `/parent/messages` | Chat with staff |
| Billing | `/parent/billing` | Invoice viewing |
| Documents | `/parent/docs` | Shared documents |
| Notifications | `/parent/notifications` | Alerts |
| Profile | `/parent/profile` | Child profile |

### Other Routes

| Page | Route | Description |
| --- | --- | --- |
| Login | `/login` | Staff login |
| Auth Action | `/auth/action` | Password reset, email verify |
| Client Report | `/reports/client` | PDF-ready client report |
| Evaluation Report | `/reports/evaluation` | PDF-ready evaluation report |
| Team Report | `/reports/team` | PDF-ready team report |
| Seed | `/seed` | Development data seeding |

### API Routes

| Route | Method | Description |
| --- | --- | --- |
| `/api/assistant/chat` | POST | Mira streaming chat (§27) |
| `/api/assistant/insights` | POST | Structured AI insights for an evaluation |
| `/api/assistant/health` | GET | AI configuration diagnostic |
| `/api/smartbill/invoice` | POST | SmartBill invoice sync |
| `/api/cloud-functions` | GET/POST | Cloud Functions proxy |
| `/api/test-ping` | GET | Health check |

## `src/components/` — React Components

| Directory | Contents |
| --- | --- |
| `analytics/` | Chart components (SessionVolume, RevenueMix, Attendance, Utilization, GoalAchievement, CancellationRisk) |
| `billing/` | Invoice, payout, expense UI |
| `calendar/` | Calendar views (Week, Month, Day, Agenda), NewEventModal, EventDetailPanel, FilterPanel |
| `chat/` | ChatSidebar, ChatView, MessageBubble, NewChatModal |
| `clients/` | ClientList, ClientCard, AddClientModal, EditClientModal, 8 profile tabs, CreatePlanModal, ClientReportHTML |
| `CommandPalette/` | Cmd+K global search |
| `evaluations/` | EvaluationWizard, CategoryScoring, EvaluationSummary, Comparison, Charts, ReportHTML |
| `evaluations/vbmapp/` | VBMAPPWizard, MilestoneScoring, BarrierScoring, MilestoneGrid, Summary, List |
| `evaluations/shared/` | MobileEvaluationContainer, CategoryBottomSheet |
| `notifications/` | NotificationBell, Dropdown, List, Filters, Preferences, Parent variants |
| `parent/` | LatestSessionSummary, ActivityTimeline, ParentEvaluation, ProgramProgressCard, ProgressRing, TrendSparkline |
| `programs/` | ProgramList, ProgramCard, AddProgramModal, EditProgramModal |
| `services/` | ServiceList, ServiceCard, AddServiceModal, EditServiceModal |
| `settings/` | BillingConfigTab, LimitsConfigTab, TranslationManager |
| `team/` | TeamList, TeamMemberCard, TeamMemberModal, TeamReportHTML |
| `ui/` | Toast, ConfirmationModal, Skeleton |

**Top-level components**: `Header.tsx`, `Sidebar.tsx`, `MobileSidebar.tsx`, `BottomNav.tsx`, `DashboardShell.tsx`, `NavigationProgress.tsx`

## `src/context/` — State Providers

| Provider | File | Purpose |
| --- | --- | --- |
| ToastContext | `ToastContext.tsx` | App-wide toast notifications |
| AuthContext | `AuthContext.tsx` | Staff authentication state |
| ParentAuthContext | `ParentAuthContext.tsx` | Parent portal authentication |
| DataContext | `DataContext.tsx` | Global data cache (clients, team, services) |
| NotificationContext | `NotificationContext.tsx` | Real-time alerts & FCM |
| EventModalContext | `EventModalContext.tsx` | Calendar event creation |
| CommandPaletteContext | `CommandPaletteContext.tsx` | Global search state |
| ConfirmContext | `ConfirmContext.tsx` | Confirmation dialogs |
| PortalContext | `src/app/parent/PortalContext.tsx` | Parent portal data (lives with the parent routes, not in `src/context/`) |

## `src/hooks/` — Custom React Hooks

| Hook | Purpose |
| --- | --- |
| `useCollections.ts` | Generic Firestore query hook with real-time listeners |
| `useEvaluations.ts` | ABLLS-R evaluation queries |
| `useVBMAPP.ts` | VB-MAPP evaluation queries |
| `usePortage.ts` | Portage evaluation queries |
| `useCARS.ts` | CARS evaluation queries |
| `useCarolina.ts` | Carolina evaluation queries |
| `useAnalyticsData.ts` | Dashboard analytics aggregation |
| `useActivities.ts` | Activity feed with pagination |
| `useChat.ts` | Real-time messaging |
| `useClient.ts` | Single client data |
| `useClientDocuments.ts` | Document management |
| `useConnectivity.ts` | Online/offline status |
| `useAnyAuth.ts` | Universal auth check (staff or parent) |
| `useAudioRecorder.ts` | MediaRecorder abstraction for audio-only recording |
| `useMediaRecorder.ts` | MediaRecorder abstraction for video recording (camera + mic) |
| `useVoiceFeedback.ts` | Voice feedback CRUD (`clients/{id}/voiceFeedback`) |
| `useSessionVideos.ts` | Session video CRUD (`clients/{id}/videos`) |

## `src/lib/` — Business Logic & Services

| File | Purpose |
| --- | --- |
| `firebase.ts` | Firebase initialization |
| `billing.ts` | Invoice/payout calculations |
| `activityService.ts` | Activity logging |
| `notificationService.ts` | Notification creation |
| `invoiceGenerator.ts` | PDF invoice generation |
| `goalGenerator.ts` | Clinical goal suggestions from evaluation data |
| `clinicalInterpretation.ts` | Evaluation score interpretation |
| `ageUtils.ts` | Age calculation for evaluations |
| `calendarUtils.ts` | Calendar date utilities |
| `progressUtils.ts` | Success rate and trend calculation |
| `objectiveUtils.ts` | Objective status management |
| `callFunction.ts` | Cloud Function invocation wrapper |
| `clientCodeSync.ts` | Keeps `/client_codes/{CODE}` lookup docs in sync with `/clients` |
| `i18n/config.ts` | i18next setup |
| `i18n/locales/en.json` | English translations (~99KB) |
| `i18n/locales/ro.json` | Romanian translations (~102KB) |

## `src/types/` — TypeScript Definitions

| File | Contents |
| --- | --- |
| `evaluation.ts` | ABLLS-R types |
| `vbmapp.ts` | VB-MAPP types |
| `portage.ts` | Portage types |
| `carolina.ts` | Carolina types |
| `cars.ts` | CARS types |
| `activity.ts` | Activity log types |
| `billing.ts` | Financial types |
| `notifications.ts` | Notification types |
| `chat.ts` | Messaging types |
| `client.ts` | Client data types |

## `src/data/` — Static Protocol Data

| File | Contents |
| --- | --- |
| `ablls-r-protocol.ts` | ABLLS-R configuration |
| `carolina-protocol.ts` | Carolina configuration |
| `ablls-r/category-*.json` | 25 ABLLS-R category data files (A–Z, no O), Romanian |

---

# 4. Firebase Infrastructure

## 4.1 Firebase Initialization

**File**: `src/lib/firebase.ts`

Firebase is initialized client-side using the modular SDK (v10) for tree-shaking benefits:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

## 4.2 Firestore Collections Schema

> ⚠️ **Timestamp fields hold two different types.** Anything the app wrote is a
> Firestore `Timestamp`. Almost everything older is an **ISO string**, because
> the tenant migration round-tripped every document through the REST helper in
> `scripts/demo-seed/firestore.mjs`, which decodes `timestampValue` to a plain
> string and re-encodes it as `stringValue`. Measured on Live Better Life: 298
> of 300 activities, 44 of 44 threads, and every migrated event, invoice and
> document.
>
> Ordering is unaffected — ISO strings sort identically — so this is invisible
> in queries and only ever wrong on screen. **Never call `.toDate()` directly.**
> Use `toDateOrNull` / `toISO` / `toMillis` from `src/lib/timestamps.ts`, which
> accept either shape. `value?.toDate()` guards the field being absent, not the
> method being missing, and threw on every migrated row.

### `team_members/{uid}`

| Field | Type | Description |
| --- | --- | --- |
| name | string | Full name |
| email | string | Email address |
| phone | string | Phone number |
| role | string | "Superadmin" / "Admin" / "Coordinator" / "Therapist" |
| language | string | "en" / "ro" |
| color | string | Color coding |
| photoURL | string | Profile photo |
| inviteStatus | string | "pending" / "active" |
| createdAt | Timestamp | Creation date |

### `clients/{clientId}`

| Field | Type | Description |
| --- | --- | --- |
| name | string | Child's name |
| birthDate | string | Date of birth |
| diagnosis | string | Primary diagnosis |
| diagnosisLevel | string | Diagnosis severity level |
| clientCode | string | Parent portal access code |
| parentUids | string[] | Anonymous UIDs of linked parents |
| billingAddress | string | Billing address |
| cif | string | Romanian tax ID |
| regCom | string | Trade registration number |
| hasActiveSubscription | boolean | Subscription status |
| fixedSessionPrice | number | Per-session price |
| assignedTherapists | string[] | Assigned therapist UIDs |
| createdAt | Timestamp | Creation date |

**Subcollections under `clients/{clientId}/`:**

| Subcollection | Description |
| --- | --- |
| `evaluations/{evalId}` | ABLLS-R evaluations |
| `vbmapp_evaluations/{evalId}` | VB-MAPP evaluations |
| `portage_evaluations/{evalId}` | Portage evaluations |
| `cars_evaluations/{evalId}` | CARS evaluations |
| `carolina_evaluations/{evalId}` | Carolina evaluations |
| `interventionPlans/{planId}` | Therapy plans with objectives |
| `homework/{itemId}` | Homework assignments |
| `documents/{docId}` | Uploaded files |
| `reports/{reportId}` | Generated reports |
| `videos/{videoId}` | Session video recordings (metadata; files in Storage) |
| `voiceFeedback/{feedbackId}` | Voice feedback clips (metadata; files in Storage) |

### `client_codes/{CODE}`

Lookup collection for parent login. Document ID is the uppercased access code; kept in sync with `clients.clientCode` by `src/lib/clientCodeSync.ts`. Security rules allow `get` for any signed-in user (including anonymous parents) but forbid `list`, so codes cannot be enumerated.

| Field | Type | Description |
| --- | --- | --- |
| clientId | string | Client document ID |
| clientName | string | Client display name (shown after login) |

### `events/{eventId}`

| Field | Type | Description |
| --- | --- | --- |
| title | string | Event title |
| startTime | string (ISO) | Start date/time |
| duration | number | Duration in minutes |
| type | string | Service ID. **Not** `eventType` — the form field is called that, but it is written as `type` |
| clientId | string | Primary client ID (used by security rules and queries) |
| clientIds | string[] | All assigned client IDs |
| therapistId | string | Primary therapist ID (used by security rules) |
| teamMemberIds | string[] | All assigned team member IDs |
| programIds | string[] | Programs assigned to the session |
| programScores | Record | Per-program scores (minus, zero, prompted, plus) |
| programNotes | Record | Per-program notes |
| objectiveNotes | Record | Per-objective notes |
| endTime | string (ISO) | End date/time |
| details | string | Free-text notes |
| attendance | Record | Client attendance: "present" / "absent" / "excused" |
| status | string | "scheduled" / "completed" / "cancelled" |
| recurringGroupId | string \| null | Groups the occurrences of one recurring series |
| createdAt | Timestamp \| string | Creation date — see the timestamp note below |

### `services/{serviceId}`

| Field | Type | Description |
| --- | --- | --- |
| id | string | Matches the document id, and `events.type` |
| label | string | Display name — **not** `name` |
| basePrice | number | Price per hour — **not** `hourlyRate` |
| isBillable | boolean | False for lunch breaks and days off; excluded from invoices |
| requiresTime | boolean | Whether a duration is meaningful |
| color | string | Calendar colour (seeded clinics only; absent on older records) |

### `invoices/{invoiceId}`

| Field | Type | Description |
| --- | --- | --- |
| clientId | string | Client reference |
| clientName | string | Client display name |
| month | string | Billing period (YYYY-MM) |
| sessions | number | Total sessions |
| billableSessions | number | Billable count |
| excusedSessions | number | Excused count |
| subtotal | number | Pre-discount amount |
| discount | number | Discount amount |
| total | number | Final amount |
| status | string | "draft" / "sent" / "paid" / "overdue" |
| smartbillId | string | SmartBill invoice ID |
| smartbillNumber | string | SmartBill number |
| smartbillUrl | string | SmartBill URL |
| syncedAt | Timestamp | Last sync timestamp |

### `payouts/{payoutId}`

| Field | Type | Description |
| --- | --- | --- |
| teamMemberId | string | Team member reference |
| month | string | Period (YYYY-MM) |
| hours | number | Total hours |
| baseSalary | number | Base amount |
| bonus | number | Bonus amount |
| deductions | number | Deductions |
| total | number | Net payout |
| status | string | "pending" / "paid" |

### `expenses/{expenseId}`

| Field | Type | Description |
| --- | --- | --- |
| title | string | Expense description |
| amount | number | Amount |
| category | string | "rent" / "taxes" / "utilities" / "supplies" / "marketing" / "other" |
| isRecurring | boolean | Recurring flag |
| month | string | Period (YYYY-MM) |

### `activities/{activityId}`

| Field | Type | Description |
| --- | --- | --- |
| type | ActivityType | e.g., "session_created", "evaluation_updated" |
| userId | string | Who performed the action |
| userName | string | Display name |
| userPhotoURL | string | Profile photo |
| targetId | string | Affected entity ID |
| targetName | string | Affected entity name |
| metadata | Record | Additional context |
| createdAt | Timestamp | Immutable creation date |

### `notifications/{notificationId}`

| Field | Type | Description |
| --- | --- | --- |
| recipientId | string | Target user — **not** `userId` |
| recipientRole | string | Role at the time of sending |
| type | NotificationType | e.g. `schedule_created`, `attendance_logged` |
| category | NotificationCategory | `schedule` / `attendance` / `billing` / … |
| title | string | Notification title |
| message | string | Notification body — **not** `body` |
| read | boolean | Read status |
| actions | Action[] | `{ label, route, type }`; the push trigger reads `actions[0].route` — there is no `actionUrl` |
| clientId | string | Set on parent-facing notifications; drives the rules |
| sourceType / sourceId | string | What produced it |
| triggeredBy | string | Who caused it |
| createdAt | Timestamp \| string | Creation date — see the timestamp note below |

### `threads/{threadId}`

| Field | Type | Description |
| --- | --- | --- |
| participants | Participant[] | Thread participants |
| lastMessage | string | Preview text |
| lastMessageAt | Timestamp | Last activity |
| archived | boolean | Archive status |

**Subcollection**: `messages/{messageId}` — senderId, senderName, senderRole, text, type ("text" / "system" / "image"), createdAt

### `fcm_tokens/{userId}`

| Field | Type | Description |
| --- | --- | --- |
| token | string | FCM registration token |

### `system_settings/{settingId}`

| Field | Type | Description |
| --- | --- | --- |
| integrations.smartbill | object | SmartBill credentials |
| billing | object | Series, VAT, entities |
| translations_en | Record | English overrides |
| translations_ro | Record | Romanian overrides |

## 4.3 Firestore Security Rules

**File**: `firestore.rules`

> 🔒 **Security Philosophy**: Default deny, explicitly allow. Role-based access control with helper functions.

```javascript
// Helper functions
function isAuthenticated() { return request.auth != null; }
function isStaff() { /* checks team_members collection for user role */ }
function isAdmin() { /* checks for Admin or Superadmin role */ }
function isParentOf(clientId) { /* checks parentUids array on client doc */ }
```

**Key access patterns:**

| Collection | Read | Write |
| --- | --- | --- |
| `team_members` | All staff | Admin/Superadmin |
| `clients` | Staff list; parents `get` own child only | Staff only — the browser never writes `parentUids`; linking goes through `/api/parent/link` (§16.1) |
| `client_codes` | `get`: any signed-in user; `list`: staff only | Staff |
| `events` | Staff + parents (child assigned) | Staff |
| `evaluations` (subcollections) | Staff + parents (own child) | Staff |
| `invoices` | Admin + parents (own) | Admin |
| `activities` | All staff | Staff (create only, immutable) |
| `threads` | Participants only | Participants only |
| `system_settings` | Admin | Admin |

---

# 5. Authentication & Authorization

## 5.1 Staff Authentication

**Provider**: Firebase Auth (Email/Password)

**Flow:**

1. Staff logs in at `/login` with email/password
2. `AuthContext.tsx` listens to `onAuthStateChanged`
3. On auth success, fetches `team_members/{uid}` for user data
4. Role extracted from Firestore document
5. Role determines sidebar visibility, page access, and data scope

```typescript
interface AuthContextType {
  user: User | null;            // Firebase Auth user
  userData: TeamMember | null;  // Firestore user document
  loading: boolean;
  signIn: (email, password) => Promise<void>;
  signOut: () => Promise<void>;
}
```

## 5.2 Parent Authentication

**Provider**: Firebase Auth (Anonymous) + Access Code

**Flow:**

1. Parent navigates to `/parent`
2. Selects language (EN/RO)
3. Enters client access code (4-8 character alphanumeric)
4. App signs in anonymously (if not already), then `getDoc` on `/client_codes/{CODE}` — the lookup doc holds `{ clientId, clientName }`
5. On match → the browser calls `POST /api/parent/link` with the code. The server re-resolves the child from the **code** with the Admin SDK and writes `parentUids` itself, ignoring any client id the caller supplies (stale UIDs dropped via `localStorage` `parent_prev_uid`)
6. Session info persisted in `sessionStorage`; all subsequent queries filter by this client association

> ⚠️ **Security**: Rate limited — 5 failed attempts triggers 60-second lockout. Codes live on client documents and are mirrored to `/client_codes` (get-only for parents, list forbidden), so parents never query the `clients` collection. A 30-minute idle timeout auto-signs parents out.

## 5.3 Role-Based Access Control

| Feature | Superadmin | Admin | Coordinator | Therapist | Parent |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Full | Full | Limited | Own data | Child only |
| Calendar | All events | All events | All events | Assigned | Child's sessions |
| Clients | All | All | All | Assigned | Own child |
| Evaluations | Full CRUD | Full CRUD | Full CRUD | View | View child's |
| Billing | Full | Full | View | — | View own |
| Analytics | Full | Full | View | — | — |
| Team | Full CRUD | Full CRUD | View | View | — |
| Settings | Full | Full | — | Profile only | — |
| Messages | All | All | All | All | With staff |
| Activity Log | Full | Full | Full | Own | — |
| Services | Full CRUD | Full CRUD | View | View | — |

---

# 6. Real-Time Data Architecture

## 6.1 Listener Pattern

All Firestore queries use `onSnapshot` for real-time synchronization:

```typescript
// Generic hook pattern (src/hooks/useCollections.ts)
function useCollection<T>(
  collectionName: string,
  constraints?: QueryConstraint[]
): { data: T[]; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      setData(items);
      setLoading(false);
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, [collectionName]); // constraints intentionally excluded (Bug H6)

  return { data, loading, error };
}
```

## 6.2 Specialized Hooks

| Hook | Collection | Purpose |
| --- | --- | --- |
| `useCollections` | Any | Generic Firestore query with constraints |
| `useEvaluations` | `clients/{id}/evaluations` | ABLLS-R evaluations |
| `useVBMAPP` | `clients/{id}/vbmapp_evaluations` | VB-MAPP evaluations |
| `usePortage` | `clients/{id}/portage_evaluations` | Portage evaluations |
| `useCARS` | `clients/{id}/cars_evaluations` | CARS evaluations |
| `useCarolina` | `clients/{id}/carolina_evaluations` | Carolina evaluations |
| `useChat` | `threads`, `threads/{id}/messages` | Real-time messaging |
| `useActivities` | `activities` | Activity feed with pagination |
| `useAnalyticsData` | Multiple collections | Aggregated analytics |
| `useClientDocuments` | `clients/{id}/documents` | Document management |
| `useConnectivity` | Browser API | Online/offline detection |

## 6.3 Data Flow

> 📡 Firestore Change → `onSnapshot` Callback → React State Update (`setState`) → Component Re-render → UI Updated (real-time)

All listeners include proper cleanup via `return () => unsubscribe()` in `useEffect`.

---

# 7. State Management

## 7.1 Context Provider Hierarchy

**Files**: `src/app/layout.tsx` (root) and `src/app/(dashboard)/layout.tsx` (staff dashboard)

> ⚠️ **Critical**: Providers must be nested in this exact order due to dependency chains.

```
Root layout (all routes):
ConfirmProvider            ← Outermost: confirmation dialogs
  └── ToastProvider        ← App-wide toasts
    └── AuthProvider       ← Staff authentication state
      └── ParentAuthProvider     ← Parent portal auth
        └── NotificationProvider ← Notifications (needs auth)
          └── {children}

Dashboard layout (staff routes only, after role gate):
DataProvider               ← Global data cache (clients, team, services)
  └── EventModalProvider   ← Calendar event creation
    └── CommandPaletteProvider   ← Cmd+K search
      └── DashboardShell + {children}
```

## 7.2 Context Providers Detail

**AuthContext** — `src/context/AuthContext.tsx`
Manages Firebase Auth state (`onAuthStateChanged`), fetches and caches user's `team_members` document. Provides `user`, `userData`, `signIn`, `signOut`.

**DataContext** — `src/context/DataContext.tsx`
Global data cache for frequently-accessed collections. Real-time listeners for `clients`, `team_members`, `services`. Prevents redundant Firestore queries across components.

**NotificationContext** — `src/context/NotificationContext.tsx`
Manages FCM token registration, tracks unread notification count, real-time listener for user's notifications.

> ⚠️ Has known circular dependency issue (Phase 2 fix).

**EventModalContext** — `src/context/EventModalContext.tsx`
Manages calendar event creation modal state. Can be triggered from multiple locations (calendar, Cmd+K, FAB button).

**CommandPaletteContext** — `src/context/CommandPaletteContext.tsx`
Global Cmd+K search modal state. Stores pending actions in sessionStorage.

**PortalContext** — `src/app/parent/PortalContext.tsx`
Parent portal data provider. Fetches child's client data, sessions, evaluations. Scoped to authenticated parent's child only.

## 7.3 Known Issues

- **Bug M5/M6/M7**: Context values are not memoized with `useMemo`, causing unnecessary re-renders
- **Bug H6**: `useCollections` hook suppresses ESLint exhaustive-deps warning for `constraints` parameter to avoid infinite render loops

---

# 8. Routing & Navigation

## 8.1 Navigation Components

| Component | Platform | Description |
| --- | --- | --- |
| `Sidebar.tsx` | Desktop | Persistent left sidebar with role-based menu items |
| `BottomNav.tsx` | Mobile | Fixed bottom tab bar with floating action button (FAB) |
| `MobileSidebar.tsx` | Mobile | Slide-out menu drawer |
| `CommandPalette/index.tsx` | All | Cmd+K / Ctrl+K overlay for global search |
| `NavigationProgress.tsx` | All | Visual loading indicator during route transitions |

## 8.2 Responsive Breakpoints

| Breakpoint | Width | Navigation |
| --- | --- | --- |
| Mobile | < 768px | Bottom nav, single column, mobile sidebar |
| Tablet | 768px – 1024px | Two-column layouts |
| Desktop | > 1024px | Full sidebar, multi-column layouts |

---

# 9. Clinical Evaluation System

TempoApp implements **5 standardized clinical evaluation tools** used in ABA therapy.

## 9.1 ABLLS-R

> **Assessment of Basic Language and Learning Skills — Revised**

| Property | Detail |
| --- | --- |
| Categories | 25 domains (A–Z, no O), 536 items, 1,428 points total |
| Scoring | Per-item `maxScore` (commonly 0–4, but 0–2 and 0–1 items exist); items may be marked N/A and are then excluded from the denominator |
| Age awareness | `src/lib/abllsAgeReference.ts` — sections above the child's developmental level are reported as not-yet-expected rather than as deficits |
| Data Files | `src/data/ablls-r/category-*.json` (25 JSON files, Romanian, rebuilt from the official RO source) |
| Hook | `src/hooks/useEvaluations.ts` |
| Types | `src/types/evaluation.ts` |
| Key Components | `EvaluationWizard.tsx`, `CategoryScoring.tsx`, `EvaluationSummary.tsx` |
| Storage | `clients/{id}/evaluations/{evalId}` |

**Categories**: Cooperation, Visual Performance, Receptive Language, Motor Imitation, Vocal Imitation, Requests (Mands), Labeling (Tacts), Intraverbals, Spontaneous Vocalizations, Syntax/Grammar, Play/Leisure, Social Interaction, Group Instruction, Classroom Routines, Generalization, Reading, Math, Writing, Spelling, Dressing

## 9.2 VB-MAPP

> **Verbal Behavior Milestones Assessment and Placement Program**

| Property | Detail |
| --- | --- |
| Structure | 3 developmental levels + Barriers + Transitions |
| Level 1 | 0–18 months developmental equivalent |
| Level 2 | 18–30 months developmental equivalent |
| Level 3 | 30–48 months developmental equivalent |
| Milestone Scoring | 0 (not present), 0.5 (emerging), 1 (mastered) |
| Barrier Scoring | 0–4 severity scale |
| Transition Scoring | 1–5 readiness level |
| Hook | `src/hooks/useVBMAPP.ts` |
| Types | `src/types/vbmapp.ts` |
| Key Components | `VBMAPPWizard.tsx`, `VBMAPPMilestoneScoring.tsx`, `VBMAPPBarrierScoring.tsx`, `VBMAPPMilestoneGrid.tsx`, `VBMAPPSummary.tsx` |
| Storage | `clients/{id}/vbmapp_evaluations/{evalId}` |

## 9.3 Portage

> **Portage Inventory of Early Development**

| Property | Detail |
| --- | --- |
| Categories | 5 developmental domains |
| Domains | Language, Socialization, Self-Care, Cognitive Behavior, Motor Behavior |
| Scoring | Binary (achieved / not achieved) |
| Age Tracking | Developmental age per domain |
| Hook | `src/hooks/usePortage.ts` |
| Types | `src/types/portage.ts` |
| Key Components | `PortageWizard.tsx`, `PortageScoring.tsx`, `PortageSummary.tsx`, `PortageReportHTML.tsx` |
| Storage | `clients/{id}/portage_evaluations/{evalId}` |

## 9.4 CARS

> **Childhood Autism Rating Scale**

| Property | Detail |
| --- | --- |
| Items | 15 behavioral items |
| Scoring | 1–4 severity scale per item |
| Classification | None, Mild-Moderate, Severe autism |
| Hook | `src/hooks/useCARS.ts` |
| Types | `src/types/cars.ts` |
| Key Components | `CARSWizard.tsx`, `CARSScoring.tsx`, `CARSSummary.tsx`, `CARSReportHTML.tsx` |
| Storage | `clients/{id}/cars_evaluations/{evalId}` |

**Items**: Relating to People, Imitation, Emotional Response, Body Use, Object Use, Adaptation to Change, Visual Response, Listening Response, Taste/Smell/Touch Response, Fear/Nervousness, Verbal Communication, Nonverbal Communication, Activity Level, Intellectual Response, General Impressions

## 9.5 Carolina Curriculum

> **Carolina Curriculum for Infants and Toddlers**

| Property | Detail |
| --- | --- |
| Domains | 5 developmental domains |
| Domains List | Cognitive, Communication, Social Adaptation, Fine Motor, Gross Motor |
| Scoring | A (Absent), D (Developing/Emerging), M (Mastered) |
| Hook | `src/hooks/useCarolina.ts` |
| Types | `src/types/carolina.ts` |
| Key Components | `CarolinaWizard.tsx`, `CarolinaScoring.tsx`, `CarolinaSummary.tsx`, `CarolinaReportHTML.tsx` |
| Storage | `clients/{id}/carolina_evaluations/{evalId}` |

## 9.6 Evaluation Workflow

1. **Create Evaluation** → Select protocol type
2. **Score Items** → Score per domain/category
3. **Save Draft** → Progress saved, resume later
4. **Complete Evaluation** → Finalize scores
5. **View Summary** → Charts, radar graphs, grids
6. **Generate Report** → PDF/HTML export
7. **Compare** → Side-by-side with previous evaluation
8. **Suggest Goals** → Auto-generated intervention goals (`goalGenerator.ts`)
9. **Create Plan** → Build intervention plan with objectives

## 9.7 Supporting Utilities

| File | Purpose |
| --- | --- |
| `src/lib/ageUtils.ts` | Chronological age, developmental age, age equivalents |
| `src/lib/clinicalInterpretation.ts` | Interpret evaluation scores, clinical narratives |
| `src/lib/goalGenerator.ts` | Auto-generate intervention goals from evaluation deficits |
| `src/lib/progressUtils.ts` | Success rates, trend analysis (improving/stable/declining) |
| `src/lib/objectiveUtils.ts` | Objective status cycling (not_started → in_progress → achieved) |

---

# 10. Calendar & Scheduling Engine

## 10.1 Views

| View | Component | Description |
| --- | --- | --- |
| Week | `WeekView.tsx` | 7-day grid with hourly time slots |
| Month | `MonthView.tsx` | Traditional month grid with event dots |
| Day | `DayView.tsx` | Single day with full event details |
| Month Agenda | `MonthAgendaView.tsx` | Month list with event summaries |

## 10.2 Event Creation (4-Step Wizard)

**Component**: `src/components/calendar/NewEventModal/index.tsx`

| Step | Purpose |
| --- | --- |
| Step 1 | Select team members, set date/time, configure recurrence |
| Step 2 | Select clients for the session |
| Step 3 | Assign programs, add objective notes |
| Step 4 | Summary and confirmation |

## 10.3 Event Detail Panel

**Component**: `src/components/calendar/EventDetailPanel/index.tsx`

- View event details (clients, therapists, time, programs)
- Mark attendance (Present / Absent / Excused)
- Score programs during sessions (minus, zero, prompted, plus)
- Add session notes and observations
- Edit or cancel events
- Long-press score buttons to auto-decrement

## 10.4 Filtering

**Component**: `src/components/calendar/FilterPanel.tsx`

Filter by therapist(s), client(s), or event type/service.

## 10.5 Recurring Events

Events can be configured as recurring with a configurable end date. Recurrence creates individual event documents for each occurrence.

## 10.6 Session Media — Voice Feedback & Videos (Shipped)

Therapists can record audio voice notes and video clips from the EventDetailPanel and optionally share them with parents. Full specs (archived, still accurate): `documentation/archive/voice-feedback.md` and `documentation/archive/video-recording.md`.

| Aspect | Voice Feedback | Session Videos |
| --- | --- | --- |
| Firestore | `clients/{id}/voiceFeedback/{feedbackId}` | `clients/{id}/videos/{videoId}` |
| Storage | `clients/{id}/voiceFeedback/{eventId}/...` | `clients/{id}/videos/{eventId}/...` |
| Hooks | `useVoiceFeedback` + `useAudioRecorder` | `useSessionVideos` + `useMediaRecorder` |
| Staff UI | `VoiceFeedbackSection` + `AudioRecordingModal` (EventDetailPanel) | `SessionVideosSection` + `VideoRecordingModal` / `VideoPlayerModal` |
| Parent UI | `ParentVoiceFeedback` | `ParentSessionVideos` |
| Parent access | Gated by `sharedWithParent` flag (Firestore rules) | Gated by `sharedWithParent` flag (Firestore rules) |
| Limits | 3 min / 10 MB per clip, 10 clips / 50 MB per event | 5 min / 100 MB per clip, 20 clips / 500 MB per event |

Both flows log activities (`voice_feedback_*`, `video_*` activity types) and notify parents on share.

---

# 11. Billing & Financial System

## 11.1 Components

| Component | Purpose |
| --- | --- |
| `BillingOverview.tsx` | Summary KPIs (total revenue, outstanding, expenses) |
| `ClientInvoicesTable.tsx` | Client invoice list with status and actions |
| `TeamPayoutsTable.tsx` | Team member payout calculations |
| `ExpenseManager.tsx` | Expense tracking with categories |
| `MonthSelector.tsx` | Month navigation for billing periods |

## 11.2 Invoice Calculation

**File**: `src/lib/billing.ts`

- Aggregates events for a given client and month
- Counts billable sessions (present + excused)
- Applies session pricing (hourly rate or fixed price)
- Calculates subtotals, discounts, and totals
- Supports both session-based and subscription-based billing

## 11.3 Payout Calculation

- Hours from events where therapist was assigned
- Base salary calculation
- Bonus and deduction adjustments
- Net payout calculation

## 11.4 Expense Tracking

**Categories**: Rent, Taxes, Utilities, Supplies, Marketing, Other

Supports one-time and recurring expenses with monthly aggregation.

## 11.5 SmartBill Integration

**API Route**: `src/app/api/smartbill/invoice/route.ts`

| Property | Value |
| --- | --- |
| API Endpoint | `https://api.smartbill.ro/biz/eu/v1/invoice` |
| Auth | HTTP Basic (base64-encoded user:token) |
| Credentials | Stored in `system_settings.integrations.smartbill` or env variables |
| Validation | Items: description required, quantity 0–10000, price 0–1000000 |

Creates invoices in SmartBill, stores SmartBill ID/number/URL back on local invoice.

## 11.6 PDF Generation

**File**: `src/lib/invoiceGenerator.ts` — Uses jsPDF + jspdf-autotable for client-side PDF generation.

---

# 12. Messaging System

## 12.1 Architecture

**Hook**: `src/hooks/useChat.ts` | **Types**: `src/types/chat.ts`

Thread-based messaging with real-time Firestore listeners.

**Data Model:**

- `threads/{threadId}` — participants, lastMessage, lastMessageAt, archived
- `threads/{threadId}/messages/{messageId}` — senderId, senderName, senderRole, text, type, createdAt

## 12.2 Components

| Component | Purpose |
| --- | --- |
| `ChatSidebar.tsx` | Thread list with unread indicators |
| `ChatView.tsx` | Message display and input |
| `MessageBubble.tsx` | Individual message rendering |
| `NewChatModal.tsx` | Create new conversation |

## 12.3 Features

- Real-time message delivery
- Participant management with roles
- Thread archiving
- Unread message count in navigation badge
- Staff-to-staff and staff-to-parent communication
- System messages for thread events

---

# 13. Notification Pipeline

## 13.1 Architecture

> 📡 **Notification Flow:**

1. **User Action** (e.g., event created)
2. **logActivity()** + **createNotification()** called
3. **Firestore**: `notifications/{notificationId}` document created
4. **Path A — Push**: Cloud Function trigger → Fetch FCM token → FCM data-only message → Service Worker → Browser notification
5. **Path B — In-App**: `onSnapshot` listener in NotificationContext → Bell badge + dropdown update

## 13.2 Notification Types

- Schedule (event created/updated/cancelled)
- Attendance (logged/updated)
- Team (member added/removed)
- Billing (invoice generated/overdue)
- Client (assigned/unassigned)
- System alerts
- Messages (new chat message)

## 13.3 Components

| Component | Purpose |
| --- | --- |
| `NotificationBell.tsx` | Header bell icon with unread badge |
| `NotificationDropdown.tsx` | Quick notification preview |
| `NotificationList.tsx` | Full notification page |
| `NotificationFilters.tsx` | Category-based filtering |
| `NotificationPreferences.tsx` | Per-user toggle settings |
| `ParentNotificationBell.tsx` | Parent portal notification bell |
| `ParentNotificationDropdown.tsx` | Parent notification preview |
| `ParentAlerts.tsx` | Parent-specific alert messages |

## 13.4 Service

**File**: `src/lib/notificationService.ts`

- `createNotification()` — Create single notification
- `createBatchNotifications()` — Bulk create for efficiency
- Mark as read, delete, filter by type

---

# 14. Analytics Engine

## 14.1 Data Aggregation

**Hook**: `src/hooks/useAnalyticsData.ts`

Aggregates data from events, invoices, clients, and team members collections in real-time.

## 14.2 Charts & Visualizations

| Chart | Component | Type |
| --- | --- | --- |
| Session Volume | `SessionVolumeChart.tsx` | BarChart |
| Revenue Mix | `RevenueMixChart.tsx` | PieChart |
| Attendance Trend | `AttendanceTrendChart.tsx` | LineChart |
| Therapist Utilization | `TherapistUtilizationChart.tsx` | BarChart |
| Goal Achievement | `GlobalGoalAchievementChart.tsx` | AreaChart |
| Cancellation Risk | `CancellationRiskWidget.tsx` | Custom widget |

All charts use the **Recharts** library with dynamic imports to reduce bundle size.

## 14.3 KPI Metrics

- Total sessions this month
- Active clients count
- Monthly revenue
- Attendance rate percentage
- Staff utilization rate
- Cancellation risk clients (2+ cancellations)

---

# 15. Activity Logging & Audit Trail

## 15.1 Service

**File**: `src/lib/activityService.ts`

```typescript
await logActivity({
  type: 'session_created',
  userId: user.uid,
  userName: userData.name,
  userPhotoURL: userData.photoURL,
  targetId: eventId,
  targetName: 'Session with John',
  metadata: { clientName: 'John Doe', therapistName: 'Jane Smith' }
});
```

## 15.2 Activity Types

| Type | Trigger |
| --- | --- |
| `session_created` | New calendar event created |
| `session_updated` | Event details modified |
| `session_cancelled` | Event cancelled |
| `attendance_updated` | Attendance marked for a client |
| `evaluation_created` | New evaluation started |
| `evaluation_updated` | Evaluation scores modified |
| `evaluation_completed` | Evaluation finalized |
| `client_created` | New client added |
| `client_updated` | Client details modified |
| `team_member_created` | New team member invited |
| `team_member_updated` | Team member details changed |

## 15.3 Design Decisions

- Activities are **immutable** (create-only, no updates or deletes)
- Logging is **non-blocking** (wrapped in try-catch)
- All CRUD operations must log activities

---

# 16. Parent Portal

## 16.1 Authentication Flow

1. Parent → `/parent` → Select Language
2. Enter access code (4-8 alphanumeric chars)
3. Anonymous Firebase sign-in, then `getDoc` on `/client_codes/{CODE}` (get-only lookup; listing forbidden by rules)
4. Match found → `POST /api/parent/link` links the uid server-side, resolving the child from the code rather than trusting the browser (old UIDs dropped best-effort)
5. No match → Show error (rate limited: 5 attempts / 60s lockout)
6. Redirect to `/parent/dashboard` (30-minute idle timeout auto-signs out)

## 16.2 Pages & Features

| Page | Features |
| --- | --- |
| Dashboard | Next session, latest session summary, progress ring, unpaid invoices, quick links |
| Calendar | Upcoming sessions, therapist info, session details |
| Progress | Program progress with trend sparklines, evaluation comparison, goal status |
| Homework | Active/completed tasks, frequency labels, parent notes, mark complete |
| Messages | Chat with therapists/staff, thread-based conversations |
| Documents | Shared documents organized by category, download |
| Billing | Invoice list, payment status, balance tracking |
| Notifications | Activity feed from staff actions |
| Profile | Child info and contact details |

## 16.3 Data Access Scope

Parents can **only** access:

- Their linked child's client document
- Events where their child is assigned
- Evaluations for their child
- Homework assigned to their child
- Documents, session videos, and voice feedback marked as `sharedWithParent: true`
- Their own invoices
- Chat threads they participate in

---

# 17. Internationalization (i18n)

## 17.1 Configuration

**File**: `src/lib/i18n/config.ts`

**Detection order**: Browser language → localStorage → Fallback to Romanian (`ro`)

```typescript
i18n.use(LanguageDetector).use(initReactI18next).init({
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: enTranslations },
    ro: { translation: roTranslations },
  }
});
```

## 17.2 Translation Files

| File | Size | Language |
| --- | --- | --- |
| `src/lib/i18n/locales/en.json` | ~99KB | English |
| `src/lib/i18n/locales/ro.json` | ~102KB | Romanian |

## 17.3 Dynamic Overrides

Base translations can be overridden via Firestore:

- `system_settings.translations_en` — English overrides
- `system_settings.translations_ro` — Romanian overrides

**Merging**: Base JSON + Firestore overrides (Firestore wins on conflict)

## 17.4 Usage Pattern

```typescript
"use client";
import { useTranslation } from 'react-i18next';

export default function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
}
```

---

# 18. Progressive Web App (PWA)

## 18.1 Manifest

**File**: `public/manifest.json`

| Property | Value |
| --- | --- |
| Name | TempoApp |
| Short Name | Tempo |
| Start URL | `/?source=pwa` |
| Display | Standalone |
| Theme Color | #4A90E2 |
| Icons | SVG 192x192, 512x512 (maskable) |

## 18.2 Service Worker

**File**: `public/sw.js` — Generated by Workbox (via next-pwa)

| Strategy | Target |
| --- | --- |
| Precaching | All build artifacts and static assets |
| Cache-first | Fonts (Google Fonts), Images |
| Stale-while-revalidate | CSS/JS assets |
| Network-first | API calls, dynamic content |

## 18.3 Firebase Messaging Service Worker

**File**: `public/firebase-messaging-sw.js`

Handles background FCM data-only messages → displays browser notifications → deep links on click.

## 18.4 Offline Support

**Hook**: `src/hooks/useConnectivity.ts` — detects online/offline status, shows indicator in header. Firestore has built-in offline persistence for cached data.

---

# 19. Cloud Functions

**Directory**: `functions/` | **Runtime**: Node.js 22 | **Region**: us-central1 |
**firebase-functions** 7.x, **firebase-admin** 13.x

## Which database a function talks to

> ⚠️ `admin.firestore()` is **always** `(default)` — the control plane, which
> holds no clinic's records. A Cloud Function answers on `cloudfunctions.net`,
> so unlike the app and the API routes it cannot derive the tenant from its own
> hostname. Every function here has to be told, and none may assume.

The two HTTP functions read an `X-Tempo-Database` header, set by
`/api/cloud-functions` — that proxy runs on the clinic's own hostname, so it is
the only participant that knows which clinic is calling. The header is required
and `(default)` is refused.

Trusting a caller-supplied database is safe **only** because the caller's role is
then checked in that same database: name another clinic and you are not staff
there, so the request fails at the role check. Moving a role check back to a
fixed database would break that property.

## `createTeamMember` (HTTP POST)

- Admin/Superadmin **of the calling clinic** only
- Creates a Firebase Auth user (shared platform-wide — the same person can be
  staff at several clinics) + `team_members` and `team_public` documents **in
  that clinic's database**
- Email validation, duplicate checking
- Sets `inviteStatus: "pending"`

## `migrateTeamMember` (HTTP POST)

- Superadmin of the calling clinic only
- Migrates old team member docs to correct Auth UID
- Updates foreign key references in events, threads
- Batch operations for consistency

## `sendPushNotification*` (Firestore Triggers — one per clinic)

A Firestore trigger binds to exactly one database, named at deploy time: the v2
`database` option is a plain string with no wildcard, and v1 triggers only ever
fire on `(default)`. So there is one export per clinic, all built by
`pushNotificationTrigger(databaseId)`:

```
sendPushNotificationLivebetterlife   sendPushNotificationDiaconumaria
sendPushNotificationDemo             sendPushNotificationAicaa
```

Each one:

- Triggers on `notifications/{notificationId}` creation **in its own database**
- Fetches the target user's FCM token from `fcm_tokens/{userId}` in that same
  database
- Sends a data-only message via FCM
- Auto-cleans invalid tokens

**Onboarding a clinic must add a line here.** Nothing warns you if it is missed:
in-app notifications keep working, because the bell and the notifications page
read Firestore directly, and only push goes quiet — which reads like users
declining permission rather than a deployment gap. See
`documentation/new-tenant-runbook.md` step 1.

---

# 20. API Routes

## SmartBill Invoice Sync

**Route**: `POST /api/smartbill/invoice`

**Request**: invoiceId, items (description, quantity, price, vatRate), clientData, seriesName

**Flow**: Authenticate caller (Admin/Coordinator) → Validate items → Load SmartBill credentials → POST to SmartBill API → Update local invoice with SmartBill ID/number/URL

## Cloud Functions Proxy

**Route**: `GET|POST /api/cloud-functions`

Eliminates CORS by proxying calls to `https://us-central1-{projectId}.cloudfunctions.net/{functionName}`. Forwards Authorization header.

## Health Check

**Route**: `GET /api/test-ping` — Returns `"API is working"`

---

# 21. Design System & UI Components

## 21.1 Color System

| Token | Value | Usage |
| --- | --- | --- |
| Primary | Indigo (#4A90E2) | Buttons, links, active states (50–900 scale) |
| Secondary | Orange (#E09448) | Accents (50–900 scale) |
| Success | Green (#10B981) | Positive states, completion |
| Warning | Amber (#F59E0B) | Caution states |
| Error | Red (#EF4444) | Error states, destructive actions |
| Info | Blue (#3B82F6) | Informational states |
| Neutral | Grayscale | Text, borders, backgrounds (0–950) |

## 21.2 Typography

| Font | Usage |
| --- | --- |
| Inter | Default sans-serif body text |
| Plus Jakarta Sans | Display headings |
| JetBrains Mono | Monospace code |

## 21.3 Design Tokens

| Token | Value |
| --- | --- |
| Spacing base | 4px (0.25rem) |
| Border radius | 4px, 8px, 12px, 16px |
| Touch target minimum | 44x44px (WCAG 2.1 AA) |
| Elevation | elevation-1, elevation-2, elevation-3 |
| Color contrast | Minimum 4.5:1 for text |

**Dark Mode**: CSS class-based strategy with `[data-theme="dark"]` fallback.

## 21.4 Shared UI Components

| Component | File | Purpose |
| --- | --- | --- |
| Toast | `src/components/ui/Toast.tsx` | Success/error/info notifications |
| ConfirmationModal | `src/components/ui/ConfirmationModal.tsx` | Destructive action confirmation |
| Skeleton | `src/components/ui/Skeleton.tsx` | Loading state placeholders |

---

# 22. Security Model

## 22.1 Firestore Security Rules

**File**: `firestore.rules`

- **Default deny**: No access unless explicitly granted
- **Role-based**: Access determined by `team_members.role` field
- **Data isolation**: Parents can only access their linked child's data
- **Immutable audit**: Activities collection is create-only

## 22.2 Storage Security Rules

**File**: `storage.rules`

- `/avatars/{userId}/{fileName}` — Public read, owner/admin write
- `/clients/{clientId}/documents/{fileName}` — Staff read/write, parents read-only

## 22.3 API Security

- SmartBill route validates Admin/Coordinator role before processing
- Cloud Functions proxy forwards Firebase auth token for server-side validation
- Input validation: quantity (0–10000), price (0–1000000) limits

## 22.4 Data Privacy

- Phone numbers are **never** cached in chat threads (fetched on-demand)
- Parent access codes stored on client documents and mirrored to `/client_codes` (get-only; enumeration forbidden)
- FCM tokens are user-isolated and auto-cleaned when invalid

---

# 23. Build & Deployment

## 23.1 Build Scripts

All dev/build commands go through `scripts/tenant-env.mjs`, which selects a tenant
explicitly and refuses to guess (§28.2).

| Command | Purpose |
| --- | --- |
| `npm run dev:demo` / `dev:livebetterlife` / `dev:diaconumaria` | Dev server as that clinic's host |
| `npm run dev` | **Fails** — a default would silently target a live clinic |
| `npm run build:demo` / `build:livebetterlife` | Production build as that clinic's host |
| `npm run test:isolation` | Tenant mapping + Firestore rules + Storage rules |
| `npm run test:parent-link` | Parent sign-in, end to end against a running build |
| `npm run build` | Build using the ambient environment — the Vercel path |
| `npm run check:env` | Print the resolved tenant/project without running anything |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

> The cPanel packaging scripts and artefacts (`server.js`, `app.js`, `.htaccess`,
> `maintenance.html`, `scripts/build-prod.js`, `npm run package*`) were removed in
> Aug 2026. Deployment is Vercel only.

## 23.2 Next.js Configuration

**File**: `next.config.js`

- **Rendering**: Node.js server (not static export)
- **trailingSlash**: Enabled for server compatibility
- **Image optimization**: Disabled (`unoptimized: true`)
- **PWA**: Enabled via next-pwa (Workbox service worker generation)
- **Webpack**: Custom aliases for Firebase browser-compatible ESM builds

## 23.3 Deployment Process

**Hosting**: Vercel — **one project, `tempo-app-2`, for every clinic** (§28). The
tenant is the hostname, not the deployment.

1. Push to `main`; Vercel builds once with `npm run build`
2. Environment comes from the Vercel dashboard. Anything that differs per clinic
   is resolved from the request host instead — see §28.3
3. Every clinic subdomain is attached to that one project, and must also be an
   authorized domain in Firebase Auth. That list is project-wide, and
   `scripts/register-tenant.mjs` now adds the host as part of onboarding — a
   missing entry breaks only federated sign-in, silently, on that one host
4. Environment variables bind at **build time**: a running deployment cannot see
   one added afterwards, and the symptom looks exactly like a wrong value.
   Redeploy after changing them

The marketing site (`tempoapp.ro`, `www`) is a different repository on its own
Vercel project. The retired per-clinic projects still exist with builds disabled
as rollback targets.

Onboarding a new clinic: `documentation/new-tenant-runbook.md`.

> The cPanel/Passenger artefacts were deleted in Aug 2026.

## 23.4 Firebase Deployment

| Command | Purpose |
| --- | --- |
| `firebase deploy --only firestore:rules` | Security rules |
| `firebase deploy --only storage:rules` | Storage rules |
| `firebase deploy --only functions` | Cloud Functions |

---

# 24. Performance Optimizations

## Bundle Size

- Current first-load: ~320KB (acceptable)
- Firebase modular SDK with tree-shaking
- Dynamic imports for analytics charts (Recharts)
- Package imports optimization for `lucide-react`, `recharts`, `firebase`, `jspdf`

## Firestore Query Optimization

- All queries include `limit()` clauses
- Pagination for large datasets (`startAfter` + `limit`)
- Composite indexes for complex queries
- Denormalized data for efficient reads

## Known Performance Issues

- Context providers don't use `useMemo` — extra re-renders (Bug M5/M6/M7)
- Image optimization disabled — using `<img>` instead of Next.js `<Image>`

---

# 25. Known Issues & Technical Debt

## Phase 1 (Completed)

- [x]  Firestore rules hardened
- [x]  Storage rules hardened
- [x]  SmartBill API integration fixed
- [x]  Billing validation fixed
- [x]  Analytics fake data removed

## Active Known Issues

| Bug ID | Severity | Description | Mitigation |
| --- | --- | --- | --- |
| H6 | High | `useCollections` hook exhaustive deps warning | Intentionally suppressed to avoid infinite loops |
| M5/M6/M7 | Medium | ~~Context providers don't memoize values~~ — **partly fixed**: `AuthContext` and `DataContext` now use `useMemo`. `ParentAuthContext` still builds its value inline | Remaining work is `ParentAuthContext` only |
| M9 | Medium | Timestamp fields hold both `Timestamp` and ISO string — the migration flattened the historical ones (§4.2) | New code writes `serverTimestamp()`; readers must go through `src/lib/timestamps.ts`, which takes either. Covered by `npm run test:timestamps` |
| — | Medium | Deterministic thread ids (`thread_{uidA}_{uidB}`) plus `allow get` on `threads` leave thread metadata and `lastMessage` previews reachable by id | Message bodies are still protected by the participants check. The staff-roster half of this is fixed — see below |
| — | Medium | The parent access-code lockout (5 attempts / 60s) is enforced only in React state in `src/app/parent/page.tsx`; `client_codes` allows `get` to any signed-in user | Enumeration is blocked (`list` is staff-only), but brute force via the SDK bypasses the UI limit |
| — | Low | Image optimization disabled | Using `<img>` instead of `<Image>` |
| — | Low | `MODEL` and `PRICING` are hardcoded in `src/lib/assistant/` | Must be changed together or `/ai-usage` reports wrong costs (§27.6) |

## Fixed Since March 2026

- `team_members` is no longer readable by any signed-in user. Reads are staff-only, and parents read `team_public/{uid}` — a mirror carrying name, initials, colour and role and nothing else, kept in sync by `src/lib/teamPublicSync.ts`. Rules grant whole documents and cannot hide fields, so the fields parents legitimately need had to live somewhere else
- Parent linking no longer happens in the browser. `/api/parent/link` resolves the child from the **access code** server-side, and the rule that let any signed-in user append themselves to `clients.parentUids` is gone. Client ids were largely guessable (`firstname` + a four-digit birthday), so that rule alone was enough to reach a child's whole record

- Chat: deterministic thread IDs prevent duplicate threads; message attribution uses `senderRole`/`senderClientId` so parent re-logins keep correct sent/received display
- Chat: archiving persists across parent sessions (keyed by `clientId`, not anonymous UID); archived threads view with unarchive (`useArchivedThreads`)
- Parent portal: message input no longer overlapped by bottom nav (layout `pb-20`); intervention plan card removed from parent profile
- Parent auth: login moved to `/client_codes/{CODE}` lookup (no `clients` queries pre-auth); fixed permission errors and double-login; duplicate parent notifications from stale UIDs
- Notifications: read status persists with optimistic updates

> 📋 Full bug audit: `documentation/archive/bugreport.md` (61 catalogued bugs)

---

# 26. Environment Configuration

## Required Environment Variables

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

NEXT_PUBLIC_FIREBASE_VAPID_KEY    # Web Push key — PER PROJECT, not shared

# Application
NEXT_PUBLIC_APP_ENV               # "demo" only for the demo tenant; omit otherwise

# Server-only (never NEXT_PUBLIC_)
ANTHROPIC_API_KEY_<TENANT>        # Mira, per clinic — e.g. ANTHROPIC_API_KEY_AICAA (§28.3)
ANTHROPIC_API_KEY                 # Unsuffixed fallback. Deliberately NOT set on the platform
                                  # project, so a clinic with no key of its own answers
                                  # ai_unavailable rather than silently billing another
                                  # clinic's key
FIREBASE_SERVICE_ACCOUNT          # Admin SDK JSON, minified to one line

# Bug reports (§28.9)
RESEND_API_KEY                    # absent -> the report is still stored, the email is not
RESEND_FROM                       # must name a sender verified in the Resend account
BUG_REPORT_TO                     # defaults to the maintainer's address

# SmartBill Integration
SMARTBILL_USER                    # SmartBill API username
SMARTBILL_TOKEN                   # SmartBill API token
```

> `FIREBASE_SERVICE_ACCOUNT` is a full-admin credential and is what ties the
> deployment to a single tenant server-side (§28.4).

## Environment Files

| File | Purpose |
| --- | --- |
| `.env.platform` (or `.env.live`) | The one Firebase config for every clinic. The tenant is the HOST, not the credentials (§28.2) |
| `.env.local` | Local overrides (never committed) |
| `.env.disabled-was-live` | The retired always-loaded `.env`; kept only as a rollback |
| Vercel dashboard | The real source of environment for deployed builds |

## Demo Mode

When `NEXT_PUBLIC_APP_ENV=demo`, the app connects to a separate Firebase project for testing without affecting production data.

---

# 27. AI Assistant — "Mira"

A staff-only clinical assistant powered by the Claude API, plus structured AI insights on completed evaluations. **Never exposed to parents.**

## 27.1 Components

| Path | Purpose |
| --- | --- |
| `src/lib/assistant/anthropic.ts` | Lazily-constructed server-only Anthropic client; `MODEL` constant |
| `src/lib/assistant/gate.ts` | The security gate — verifies the Firebase ID token, requires a staff role, requires recorded consent, enforces the daily cap |
| `src/lib/assistant/tools.ts` | Server-side tools the model may call: `find_clients`, `get_client_details` |
| `src/lib/assistant/prompts.ts` | System prompts (EN/RO), the `record_insights` tool schema |
| `src/lib/assistant/knowledge.ts` | Product knowledge base so "how do I…" answers stay grounded |
| `src/lib/assistant/context.ts` | De-identified evaluation context builders |
| `src/lib/assistant/pricing.ts` | Token pricing table and USD cost accounting |
| `src/lib/assistant/clientApi.ts` | Browser-side fetch helpers (attaches the ID token) |
| `src/components/assistant/` | `AssistantPanel`, `AssistantLauncher`, `AiConsentModal`, `MarkdownMessage` |
| `src/components/evaluations/AiInsights.tsx` | Insights modal on an evaluation |
| `src/app/(dashboard)/ai-usage/page.tsx` | Superadmin cost/usage view |

## 27.2 API Routes

| Route | Purpose |
| --- | --- |
| `POST /api/assistant/chat` | Streaming chat. Persists history server-side, runs the tool loop (max 6 round-trips, 16 messages of history) |
| `POST /api/assistant/insights` | One-shot structured insights for an evaluation |
| `GET /api/assistant/health` | Diagnostic — distinguishes "no API key" from "Admin SDK misconfigured" |

## 27.3 The gate — read this before changing anything

Every AI route calls `requireStaffWithConsent()` **before** touching data. In order:

1. Bearer token present → else `401`
2. `adminAuth().verifyIdToken()` → `401` on a bad token, `500` when the failure is a malformed service account (a config problem must not masquerade as an auth problem)
3. `team_members/{uid}` exists and the role is one of superadmin/admin/coordinator/therapist → else `403 not_staff`. **The role comes from the verified user, never from the request body**
4. `user_consents/{uid}` has `allowExternalAI` and a matching `CONSENT_VERSION` → else `403 consent_required`
5. `user_ai_usage/{uid}` daily counter below `DAILY_LIMIT` (100) → else `429`

The tools then run with Admin (rule-bypassing) credentials. They are safe only because the gate has already established a staff caller — **never call `executeAssistantTool` without it**.

> Bump `CONSENT_VERSION` whenever the consent copy materially changes; it forces every user to re-consent. It went to `"2"` when the assistant gained access to identifiable client data.

## 27.4 Data minimisation (GDPR)

What reaches Anthropic is deliberately narrower than what staff see on screen:

| Sent | Never sent |
| --- | --- |
| Initials (max 3 chars) | Full names |
| Age in months / years | Birth dates |
| Diagnosis and level | Parent name, phone, e-mail |
| Evaluation scores, session status/notes, objectives, invoice totals | Access codes, raw contact details |

Enforced in `tools.ts` and `context.ts` — the code that assembles the payload cannot include the excluded fields, so this is a property of the implementation rather than a policy.

## 27.5 Collections

| Collection | Written by | Notes |
| --- | --- | --- |
| `user_consents/{uid}` | Client | Owner read/write; `allowExternalAI`, `version` |
| `user_ai_usage/{uid}` | Server only | Daily counter; client writes denied by rules |
| `ai_conversations/{id}` + `messages/*` | Server only | Chat history, token usage, per-message cost. Owner or Superadmin may read |
| `ai_usage_events/{id}` | Server only | Per-call ledger for evaluation insights |

## 27.6 Cost control

Prompt caching on the system prompt and the conversation prefix; usage accumulated per message via `addUsage()`; cost computed by `computeCostUsd()` against the `PRICING` table in `pricing.ts` and rolled up onto the conversation document.

> ⚠️ `PRICING` and `MODEL` are hardcoded. **Both must be updated together** when the model changes, or `/ai-usage` will report confidently wrong figures.

## 27.7 Demo behaviour

`IS_DEMO` short-circuits the assistant in the UI, and the chat route returns `503 ai_unavailable` when `ANTHROPIC_API_KEY` is unset — a "full release only" signal rather than an error.

---

# 28. Tenancy & Deployment Model

**Cut over 20 August 2026.** Every clinic runs from **one Firebase project**
(`tempo-app-2`) and **one Vercel project** (also `tempo-app-2`), separated by a
Firestore database and a Storage bucket. Both are derived from the hostname the
request arrived on.

## 28.1 Current tenants

| Clinic | Hostname | Database | Storage bucket |
| --- | --- | --- | --- |
| Live Better Life | `livebetterlife.tempoapp.ro` | `clinic-livebetterlife` | `tempo-app-2-livebetterlife` |
| Diaconu Maria | `diaconumaria.tempoapp.ro` | `clinic-diaconumaria` | `tempo-app-2-diaconumaria` |
| Demo | `demo.tempoapp.ro` | `clinic-demo` | `tempo-app-2-demo` |
| Academia lui Alex | `aicaa.tempoapp.ro` | `clinic-aicaa` | `tempo-app-2-aicaa` |

`tempoapp.ro` and `www` are the marketing site — a **different repository**
(`tempo-web`) on its own Vercel project. Never touch it from here.

The old per-clinic Firebase projects (`tempo-app-demo`, `tempo-diaconumaria`) and
the old Vercel projects (`tempo-demo`, `tempo-livebetterlife`,
`tempo-app-diaconumaria`) still exist with builds disabled. They are rollback
targets and hold no live traffic.

## 28.2 How a tenant is resolved

`src/lib/tenant.ts` is the whole of it, and it is a **security boundary** — a
hostname resolved one label too generously hands one clinic another clinic's
records, and nothing in the UI would look wrong.

| Hostname | Database | Bucket |
| --- | --- | --- |
| `<clinic>.tempoapp.ro` | `clinic-<clinic>` | `tempo-app-2-<clinic>` |
| apex, `www`, `admin`, `app`, `api` | `(default)` | platform bucket |
| `localhost`, `*.vercel.app` | `(default)` | platform bucket |
| malformed or unknown label | `(default)` | platform bucket |

Unknown hosts fall back to `(default)` — the control plane, which holds no
clinical records and whose rules deny clients outright. Failing closed to an
empty database beats guessing a tenant.

`src/lib/firebase.ts` binds the `db` and `storage` singletons from that answer at
module load, so the 68 files importing `db` need to know nothing about tenancy.
API routes resolve per request instead, via `tenantDatabaseFromRequest`.

Covered by `npm run test:tenant` — 46 assertions over hostname shapes, including
the hostile ones.

## 28.3 Per-clinic configuration comes from the host

One deployment cannot hold three values for one environment variable, so
anything that differs per clinic is resolved at request time:

| Was | Now |
| --- | --- |
| `NEXT_PUBLIC_APP_ENV=demo` | `isDemoHost(hostname)` |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY_<TENANT>`, falling back to the unsuffixed name |

`IS_DEMO` is **false during prerender**, because there is no hostname. That is
safe only because every consumer renders behind a client-side gate — the login
page returns a spinner while auth resolves, and the dashboard components mount
after it. A component that renders `IS_DEMO` into server-sent markup would
hydrate into different content on the demo host.

`NEXT_PUBLIC_TENANT_HOST` overrides the hostname, which is how a local dev server
reaches a clinic at all: `localhost` otherwise resolves to the control plane and
renders an empty app.

## 28.4 The control plane — the `(default)` database

Storage rules **cannot read a named Firestore database**. This was proven by
runtime spike, and the failure mode is silent: a named-database read compiles,
deploys, and then denies everything with no error. So Storage authorisation
resolves against mirrors in `(default)`:

| Collection | Contents | Rules |
| --- | --- | --- |
| `tenants/{tenantId}` | `{ databaseId, bucket, name, status }` | Superadmin read |
| `tenant_members/{bucket}__{uid}` | `{ tenantId, role }` | `if false` |
| `tenant_parents/{bucket}__{uid}` | `{ tenantId, clientIds }` | `if false` |

The mirrors are keyed **`{bucket}__{uid}`, not `{uid}`**. One person can work at
several clinics — a Superadmin works at all of them — and a uid-keyed document
could name only one bucket, so registering a second clinic would silently revoke
their access to the first.

`firestore.get` inside Storage rules is a **privileged read that bypasses
Firestore rules**, which is why the mirrors can be locked to `if false` and still
be usable from there.

Staff mirrors are written by `scripts/register-tenant.mjs`. Parent mirrors are
written by `/api/parent/link`, because anonymous uids are per-device and change
on every new session.

## 28.5 Storage

One bucket per clinic. The bucket *is* the tenant, so `storage.rules` reduces to
one lookup against the `{bucket}` wildcard, and one rules file serves every
clinic. Object paths are unchanged.

`firebase.json` lists the per-clinic buckets. The platform bucket
(`tempo-app-2.firebasestorage.app`) is deliberately absent while it still holds
Live Better Life's original objects; the new rules would deny everything there.

Buckets are in the **EU** with CORS restricted to their own clinic's origin plus
localhost — the platform bucket's `origin: ["*"]` was never carried over.

Verified by `npm run test:storage-rules` — 29 assertions against the real buckets
with real end-user tokens, including both directions of the cross-tenant check.

## 28.6 Deploying rules

Rules are **per database and do not sync**. Use the script, never a bare
`firebase deploy`:

```bash
npm run test:rules                                  # 43 cases, deploys nothing
node scripts/deploy-rules.mjs --project=tempo-app-2 # all four databases
firebase deploy --only storage --project tempo-app-2
```

`npm run test:isolation` runs the tenant, Firestore and Storage suites together.

## 28.7 Onboarding a clinic

See `documentation/new-tenant-runbook.md`. A new clinic is now a database, a
bucket, a registry entry and a DNS record — **no new Firebase project, and no new
Vercel project**.

## 28.8 Things that are ours, not the clinic's

Set by a Superadmin, per clinic, from that clinic's own subdomain:

| Feature | Where | Stored |
| --- | --- | --- |
| Which evaluation protocols the clinic has | Settings → Evaluation access | `system_settings/evaluation_access` |
| The clinic's logo | Settings → Branding | `system_settings/branding` + `branding/` in its bucket |

Both are **opt-out**: a clinic with no document has everything enabled and our
branding. An allowlist would have switched every protocol off for every clinic
the moment the rules deployed.

Writes are Superadmin-only — an Admin runs the clinic but does not decide what
the clinic bought, or how it is branded. Disabling a protocol denies the reads at
the rules layer, so previous evaluations are genuinely hidden rather than merely
unlinked; with all five disabled the evaluations tab says they are coming soon,
and the assessment card and the parent portal's evaluations tab disappear.

`system_settings/branding` is **world-readable on purpose**: the logo renders on
the login and password-reset screens, before anyone signs in. It holds a URL to an
image that is public by nature and nothing else.

## 28.9 Bug reports

`/api/report-bug` — reachable from the sidebar and the mobile menu, open to any
staff role. Reports go to `bug_reports` in **one** database so they can be read
together, and are then emailed through Resend. The write happens first and the
email is best-effort: if Resend is unreachable or unconfigured, the report is
still stored and the response says whether the email went. Browsers cannot write
the collection at all, so a clinic cannot forge a report against another clinic.

## 28.10 What still needs a human

- **The wildcard covers DNS but never TLS.** `*.tempoapp.ro CNAME
  cname.vercel-dns.com` is in the zone, so any subdomain resolves to Vercel. A
  wildcard *certificate* still needs a DNS-01 challenge, which requires Vercel to
  control the zone; DNS is at hostico (`serviceType: external`), so Vercel reports
  `acceptedChallenges: []` and issues nothing for a host it has not been told
  about. Moving the nameservers would fix that, and would mean recreating the MX
  records that carry mail for the domain — still not worth it.

  Attaching the hostname to the project supplies the certificate by another route:
  Vercel completes an **HTTP-01** challenge, which needs only that the name already
  resolves to it. So **onboarding needs no registrar step**, and the per-clinic DNS
  record was dropped from the runbook on 20 Aug 2026. Verified while onboarding
  `aicaa`: an unregistered subdomain resolves and fails the handshake, while
  `aicaa.tempoapp.ro` — attached to the project, never given a record of its own —
  serves a certificate whose only SAN is `aicaa.tempoapp.ro`.
- `RESEND_FROM` must name a sender verified in the Resend account. The default,
  `bugs@tempoapp.ro`, is rejected until `tempoapp.ro` is verified.
- The platform bucket and `(default)`'s clinic data are still the rollback
  target. Purge them only once the new arrangement has settled.

---

# 29. Platform Console

The operator console for the whole estate — every clinic, from one screen —
reached at `superadmin.tempoapp.ro` and built from the same `tempo-app-2`
Next.js bundle and the same Vercel project as every clinic. There is no
separate deployment; a request reaches the console the same way it reaches a
clinic — by `Host`.

## 29.1 The host, and why `superadmin` is reserved

`superadmin.tempoapp.ro` used to resolve to `clinic-superadmin` — a database
that does not exist, so the host rendered an empty app with no error rather
than the console. `src/lib/tenant.ts`'s `RESERVED` set already excluded `www`,
`admin`, `app`, `api` and `localhost` from ever being read as a clinic label;
`superadmin` was added alongside them so `resolveDatabaseId` sends that host to
`(default)` like every other reserved label, instead of manufacturing a clinic
id for a clinic that was never onboarded. The same set that reserves the host
also refuses it as a tenant label — no clinic can ever be given `superadmin`.

`src/lib/platform/labels.ts` carries a second, narrower answer to a different
question: `isPlatformHost` is an explicit allowlist of the one hostname the
console is actually reached at (plus local development), not "anything
`tenant.ts` didn't claim as a clinic" — that would also cover `localhost`,
every Vercel preview deployment and a bare IP, none of which should pass a
Superadmin-only gate.

## 29.2 Why the console is a path, not the root

`/` already belongs to the `(dashboard)` route group — the staff dashboard's
home page, on every clinic host and on `(default)` alike. The console cannot
also claim `/` in the same Next.js app, so it lives under `/platform`, a plain
path segment rather than its own route group: on `superadmin.tempoapp.ro`,
`/platform` is the console and `/` still resolves to whatever `(dashboard)`
renders against the control-plane database — which is nothing usable, since
`(default)` holds no clinic to sign in to. The console does not attempt to own
the apex of its own host.

## 29.3 The two-check gate, and why a clinic host gets 404

Every `/api/platform/*` route is gated by `requireSuperadmin`
(`src/lib/platform/gate.ts`), which checks two independent things before
touching the Admin SDK. That matters because the Admin SDK bypasses Firestore
rules entirely — the gate is the only thing standing between a request and all
four clinics' records:

| Check | Question | Failure |
| --- | --- | --- |
| `isPlatformHost` | Did this arrive on `superadmin.tempoapp.ro` (or local dev)? | 404 |
| `requireStaffRole` against `(default)` | Is the caller a verified Superadmin? | 401 (no/invalid token) or 403 (authenticated but not Superadmin) |

The host check runs first — it needs no I/O — and failing it returns **404,
not 403**. A clinic host must not even learn these routes exist: 403 would
confirm to a clinic's own compromised session, or to a scanner probing
`livebetterlife.tempoapp.ro/api/platform/clinics`, that there is something
here to be denied. 404 says nothing was ever there. `npm run test:platform`
asserts this directly — a clinic host gets 404, never 401, on every platform
route.

Neither check alone would do. Host-only would let any clinic's domain reach
these routes. Role-only would work, but the host check means a session token
stolen on a clinic domain cannot be replayed against the platform — it never
arrives on a request that satisfies the host check in the first place.

The client-side gate in `src/app/platform/layout.tsx` (wrong database, or not
signed in as Superadmin) is signposting only. Every route re-checks
server-side, because the bundle is shared by every clinic and anything decided
in the browser can be bypassed.

## 29.4 Route table

| Route | Reads | Notes |
| --- | --- | --- |
| `/platform` | `tenants` (control plane) + one fan-out read per clinic | Every registered clinic with live client/staff/session counts |
| `/platform/clinics/[id]` | `tenants/{id}` + that clinic's own database | Database id, bucket, licence, legal entity, evaluation access, staff roster |
| `/platform/bug-reports` | `clinic-demo` | Every clinic's reports in one inbox; status is editable |
| `/platform/leads` | `clinic-demo` | The demo site's sales-enquiry form |
| `/platform/ai-usage` | `tenants` + each clinic's `ai_conversations` / `ai_usage_events` | Mira spend, summed server-side with `AggregateField`, never fetched-and-summed |
| `/platform/health` | `tenants` + each clinic's database | Reachability, bucket, Mira key, licence — a broken clinic degrades to a flag, not a 500 |

Each page calls the matching `/api/platform/*` route — `clinics`,
`clinics/[id]`, `bug-reports` (GET and PATCH), `leads`, `ai-usage`, `health` —
all behind `requireSuperadmin`.

## 29.5 Bug reports and leads live in `clinic-demo`, not the control plane

Both routes read from `clinic-demo` (`BUG_REPORT_DATABASE` /
`LEADS_DATABASE`), not `(default)`. `/api/report-bug` has always written every
clinic's reports to one database so they can be triaged together instead of
scattered per clinic where nobody would look — the console is the reader that
feature never had. Leads come from the demo site's own sales form, written
with the browser's own `db` handle, so they land wherever `demo.tempoapp.ro`
resolves — `clinic-demo`, since the form only exists on the demo host.

Neither collection belongs to the control-plane's tenant registry; they
happen to live in a database that is also a clinic's. `BUG_REPORT_DATABASE`
and `LEADS_DATABASE` are pinned string constants for exactly that reason —
not a lookup that could drift if `clinic-demo` were ever renamed or retired.

## 29.6 The licence: two records, one write order, and why it fails open

A clinic's licence is not one document but two, written in a fixed order.
`tenants/{id}.licence` in the control plane (the `(default)` database) is the
source of truth; `system_settings/licence` in the clinic's own database is a
mirror of it. The mirror exists because Firestore rules cannot read another
database — `get(/databases/$(database)/...)` always binds to whichever
database the request landed on, so a rule evaluating inside
`clinic-diaconumaria` has no way to consult `(default)`. Duplicating the
record is the only way for that clinic's own rules to see it at all.

Exactly two things write it, and both write registry first, mirror second:
the console's `PUT /api/platform/clinics/[id]/licence`
(`src/app/api/platform/clinics/[id]/licence/route.ts`, one clinic at a time,
Superadmin, from the browser) and `scripts/set-licences.mjs` (all four
clinics, bulk, refuses to run without `--yes`). Both call the same
`buildLicence`/`licenceMirror` pair in `src/lib/platform/licence.ts` rather
than recomputing the arithmetic, so the two paths can never compute two
different answers for the same clinic. Registry first matters because a
mirror failure after a successful registry write leaves the clinic
unrestricted — the console shows a licence that isn't enforced yet, and
re-running the write is what fixes it. The reverse order would risk the
opposite: a clinic frozen by a mirror the console cannot see or undo.

Of the fields on a licence, only `graceEndsAtMillis` is load-bearing — it's
the one value `firestore.rules` actually compares against. `plan`,
`expiresAt` and `updatedAt` are mirrored too, but only for the console and
the Health screen to display; nothing in the rules reads them. It's computed
once, at write time:

```
graceEndsAtMillis = Date.parse(expiresAt) + graceDays * 86400000
```

— epoch milliseconds rather than a date, specifically so the rule can compare
it against `request.time.toMillis()` with no date parsing and no timezone
question. A lifetime licence stores `graceEndsAtMillis: null`, and `null`
means unrestricted forever, in the rule as much as in the maths. The default
grace period, on both writers, is 14 days (`DEFAULT_GRACE_DAYS` in
`src/lib/platform/licence.ts`); either can override it per clinic.

It fails open, on purpose. `licenceActive()` in `firestore.rules` reads:

```
!exists(/databases/$(database)/documents/system_settings/licence)
  || get(...).data.get('graceEndsAtMillis', null) == null
  || request.time.toMillis() < get(...).data.graceEndsAtMillis
```

The `!exists(...)` clause runs first and short-circuits before either `get()`
does. A clinic with no `system_settings/licence` document at all is
unrestricted — not because that is a safe default in the abstract, but
because these rules deploy to every database at once while the mirrors are
written per clinic afterwards, and fail-closed would freeze every clinic for
the length of that gap. The same clause covers a document that exists but
carries no `graceEndsAtMillis`: `.get('graceEndsAtMillis', null)` treats a
malformed or partial mirror exactly like no mirror at all.

The Health screen (`/platform/health`) makes that gap visible instead of
inferred: a "Licence in sync" column compares the registry's
`graceEndsAtMillis` against the mirror's. `undefined` — no `licence` field on
the registry document — is kept distinct from `null` — a licence that was
recorded, and is a deliberate lifetime grant — because both are unrestricted
at runtime but only one of them means nobody has set a licence yet. Both
absent counts as "in sync": that is the state every new clinic starts in, and
it is not drift. An unreachable clinic database is reported as out of sync
rather than compared, because reporting a clinic Health could not even read
as "fine" would be the one wrong answer available.

## 29.7 What `licenceActive()` gates, and what it deliberately does not

`licenceActive()` is appended to 38 `allow create` / `update` / `delete` /
`write` clauses across `firestore.rules` — every staff write to clinical,
scheduling and financial data: `clients`, the admin branch of
`team_members`, `team_public`, `client_codes`, `events`, `services`,
`programs`, `invoices`, `payouts`, `expenses`, `recurring_expenses`, all five
evaluation subcollections, `interventionPlans`, `documents`, session
`videos`, `voiceFeedback`, `reports`, and the staff side of `homework`. The
`&&` binds across the whole `allow` expression in every one of those clauses,
roles included, so past the grace deadline none of the four staff roles —
Superadmin included — writes through any of them. Recovery doesn't depend on
any of the 38: the console's own licence write goes through the Admin SDK,
which bypasses Firestore rules entirely, and the one rule that would matter
if a Superadmin ever needed to write `system_settings/licence` from a
browser session is exempt from `licenceActive()` by design (§29.8).

Several write paths are deliberately left ungated, and the reasoning isn't
the same reasoning twice:

| Not gated | Why |
| --- | --- |
| Every read, without exception | A billing lapse must not become an outage on a child's clinical record. |
| `activities` (the audit log) | An audit trail must not gain holes at exactly the moment — a billing dispute — when it is most likely to be read closely. |
| `homework`'s parent-completion branch, `threads`/`messages`, `notifications`, `user_consents` | A parent has no relationship with our invoice. Ticking off homework, messaging a therapist and recording consent must keep working past a lapse that is entirely between us and the clinic. |
| `team_members`'s self-update branch | Someone editing their own profile is not the clinic buying anything, and locking a person out of their own record would be a strange thing for an unpaid invoice to do. |
| `system_settings` | Gating it would stop us fixing the very licence that is blocking them — see §29.8. |

## 29.8 Two vulnerabilities the licence review closed, 21 Aug 2026

Making `system_settings/licence` load-bearing turned two pre-existing gaps
into something worth fixing immediately rather than eventually. Both shipped
to all four clinics on 21 Aug 2026.

`system_settings/{settingId}` had a single write rule — `isAdmin()`, for
every document in the collection. `licence` fell through to it like any
other setting, but `licenceActive()` fails open on an absent or malformed
document, so an Admin at an expired clinic could simply delete
`system_settings/licence`, or push `graceEndsAtMillis` forward into the next
century, and lift all 38 gates at their own clinic in one write. The fix
splits the rule by document id: `licence`, `branding` and
`evaluation_access` now require `isSuperadmin()`; every other document in the
collection stays `isAdmin()`. This costs the platform nothing operationally
— the console itself writes the licence with the Admin SDK, which bypasses
these rules entirely.

The second was older, and related to the licence work only in how it was
found. The self-update branch of `team_members/{memberId}` — the clause that
lets a signed-in user edit their own document without being an Admin —
placed no restriction on which fields that write could touch. Any Therapist
could call `updateDoc` on their own document with `{ role: "superadmin" }`;
`hasRole()` accepts the lowercase form, so `isSuperadmin()` would then return
true for them, handing them a live clinic holding real children's clinical
records. That clause was byte-identical before any of the licence-gate work
began — it had been live in all four clinics for as long as the self-branch
existed, and surfaced only because reviewing every new `licenceActive()`
clause meant reading this one closely for the first time. The fix is a
denylist of exactly the two fields that grant access, `role` and `isActive`,
rather than an allowlist of fields already known to be safe: self-writes are
spread across the settings page (`photoURL`, `name`/`email`/`phone`/`color`,
`language`), `NotificationPreferences` (`notificationPreferences`) and
`AuthContext` (`inviteStatus`) — five call sites in total — and an allowlist
built from today's search would silently break whichever one a future search
missed. Naming only the two fields that grant access cannot break any of the
other five. `weeklyCapacity` is deliberately left off the denylist: it is
capacity planning, not access. The Admin path (`TeamMemberModal`, which does
write `role` and `isActive`) is unaffected — it satisfies the `isAdmin()`
branch of the same `allow update` before this branch is ever evaluated.

## 29.9 The licences in force, 21 Aug 2026

| Clinic | Plan | Expires | Writes actually stop |
| --- | --- | --- | --- |
| Live Better Life | lifetime | never | never |
| Demo | lifetime | never | never |
| Diaconu Maria | term | 20 Aug 2027 | 3 Sep 2027 |
| Academia lui Alex | term | 20 Aug 2027 | 3 Sep 2027 |

Set by `scripts/set-licences.mjs --project=tempo-app-2 --yes`, which holds
the same four rows as a literal table at the top of the file. Diaconu Maria
and Academia lui Alex expire twelve months from onboarding, with the
fourteen-day default grace pushing the actual write freeze to 3 Sep 2027.
Every date here is editable per clinic from `superadmin.tempoapp.ro` through
the `LicenceEditor` panel described in 29.6 — this is a starting position,
not a commitment, and none of the four clinics is within a year of it
mattering.

---

# Appendix A: Command Palette Commands

| Command | Shortcut | Action |
| --- | --- | --- |
| Send Message | M | Navigate to messages |
| New Event | N | Open event creation modal |
| New Client | — | Open add client modal |
| View Client | — | Search and navigate to client profile |
| New Team Member | — | Open add team member modal |
| View Analytics | — | Navigate to analytics page |
| View Billing | — | Navigate to billing page |
| View Settings | — | Navigate to settings page |
| View Team | — | Navigate to team page |
| View Notifications | — | Navigate to notifications page |
| View Activity | — | Navigate to activity page |

---

# Appendix B: Third-Party Integrations

| Service | Purpose | Integration Point |
| --- | --- | --- |
| SmartBill | Romanian invoicing | API route (`/api/smartbill/invoice`) |
| Firebase Auth | User authentication | Client SDK (`AuthContext`) |
| Firebase Cloud Messaging | Push notifications | Service worker + Cloud Function |
| Google Fonts | Typography (Inter, Plus Jakarta Sans) | Tailwind config |

---

*End of Technical Documentation*
