# TempoApp2 - Comprehensive Bug Audit Report

> **Audited by**: MARCUS (Lead Dev), ALEX (QA), SOFIA (UX), ROBERT (PM)
> **Date**: February 7, 2026
> **Stage**: Post-MVP Security & Quality Audit
> **Files scanned**: ~80+ components, hooks, contexts, rules, config

---

## Summary

| Severity     | Count | Status                          |
|--------------|-------|---------------------------------|
| **CRITICAL** | 7     | Must fix before any deployment  |
| **HIGH**     | 14    | Fix in current sprint           |
| **MEDIUM**   | 22    | Fix before next release         |
| **LOW**      | 18    | Backlog / polish                |
| **TOTAL**    | **61**| -                               |

### Bug Distribution by Area

| Area                      | Bug Count | Worst Severity |
|---------------------------|-----------|----------------|
| Firestore/Storage Rules   | 7         | CRITICAL       |
| Billing/Invoicing         | 9         | CRITICAL       |
| Data Layer (hooks/context) | 11       | HIGH           |
| Calendar/Date handling    | 6         | HIGH           |
| Analytics                 | 6         | CRITICAL       |
| Chat/Messaging            | 5         | CRITICAL       |
| Parent Portal             | 5         | HIGH           |
| i18n/Translations         | 8         | HIGH           |
| Accessibility             | 6         | LOW            |
| PWA/Config                | 3         | MEDIUM         |

---

## Previously Reported Bugs

### P1. Event Creation Pre-selects Wrong Minutes from Current Time

- **Area**: Calendar
- **Problem**: When creating a new event by selecting a box in the calendar, it preselects minutes based on the current hour:minutes. Example: you select 2PM, the current time is 10:22PM. In the event box the start time will appear (preselected) as 2:22PM.
- **Expected**: Should snap to :00 or :00/:15/:30/:45 for the selected hour
- **Severity**: MEDIUM

---

## CRITICAL Severity (7 bugs)

### C1. Unprotected Thread Messages - Any User Can Read All Chats

- **File**: `firestore.rules:143`
- **Problem**: `allow read, create: if isSignedIn()` on messages subcollection has no participant check
- **Impact**: Complete privacy violation. Parents can read staff conversations. Any authenticated user can read any thread's messages.
- **Fix**: Replace with:
  ```
  allow read, create: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/threads/$(threadId)).data.participants;
  ```

---

### C2. Overly Permissive Storage Rules - Client Documents

- **File**: `storage.rules:34-36`
- **Problem**: ANY signed-in user can read/write ALL client documents
- **Impact**: Therapists access other therapists' client files; parents can modify any client's documents
- **Fix**: Add role-based access:
  ```
  allow read: if isAdmin() || isCoordinator() || (isTherapist() && isAssigned(clientId)) || isParent(clientId);
  allow write: if isAdmin() || isCoordinator() || isTherapist();
  ```

---

### C3. SmartBill API Credentials Stored as Plaintext in Firestore

- **File**: `src/components/settings/BillingConfigTab.tsx:40-45`
- **Problem**: SmartBill username and API token stored unencrypted in `system_settings` Firestore collection
- **Impact**: Any user with Firestore read access can steal payment processing credentials. Database backups contain plaintext credentials.
- **Fix**: Move to Firebase Cloud Secret Manager. Only access credentials server-side via Cloud Functions.

---

### C4. SmartBill API Endpoint Missing Role Authorization

- **File**: `src/app/api/smartbill/invoice/route.ts:7-9`
- **Problem**: No check that the caller is Admin or Coordinator. Any authenticated user can call this endpoint.
- **Impact**: Unauthorized invoice creation, financial fraud
- **Fix**: Add role verification:
  ```typescript
  if (!['Admin', 'Coordinator'].includes(userRole)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  ```

---

### C5. Hardcoded Fake Analytics Data in Production

- **File**: `src/hooks/useAnalyticsData.ts:147-153`
- **Problem**: Attendance rates are hardcoded as `[90%, 92%, 88%, 95%]` and clinical goals use mock `GLOBAL_GOAL_DATA` instead of real calculations from event/program data.
- **Impact**: Decision-makers see fabricated data. Clinical reporting is fiction, not fact. Completely undermines the analytics dashboard.
- **Fix**: Calculate attendance from actual event attendance records. Compute clinical progress from real program scores.

---

### C6. No Discount Validation - Negative Invoice Totals Possible

- **File**: `src/lib/billing.ts:147-148`
- **Problem**: `discountRate` accepts any numeric value. A rate > 1.0 creates negative invoice totals via `const discount = subtotal * discountRate`.
- **Impact**: Financial data corruption, negative invoices, accounting inconsistencies
- **Fix**: Clamp discount rate:
  ```typescript
  const safeRate = Math.max(0, Math.min(1, discountRate));
  const discount = subtotal * safeRate;
  ```

---

### C7. Stale Closure in CreatePlanModal - Client Data Leakage

- **File**: `src/components/clients/CreatePlanModal.tsx:66`
- **Problem**: `useEffect` dependency array is `[existingPlan, isOpen]` but missing `clientId`. Switching between clients doesn't reset the form.
- **Impact**: Wrong intervention plan dates/programs applied to wrong client. Medical data leaks between patients.
- **Fix**: Add `clientId` to dependency array:
  ```typescript
  }, [existingPlan, isOpen, clientId]);
  ```

---

## HIGH Severity (14 bugs)

### H1. No Brute Force Protection on Parent Login

- **File**: `src/app/parent/page.tsx:49-87`
- **Problem**: No rate limiting on parent code login attempts. 4-8 character codes are brute-forceable.
- **Impact**: Attackers can rapidly enumerate client codes to gain unauthorized access
- **Fix**: Implement Cloud Function for code validation with rate limiting (3-5 attempts per 15 min), exponential backoff, and CAPTCHA after 3 failures.

---

### H2. Parent Session Data in Plaintext localStorage (No Timeout)

- **File**: `src/context/ParentAuthContext.tsx:34-48`
- **Problem**: Client code, client ID, and parent UID stored in plain `localStorage` with no expiration or timeout.
- **Impact**: XSS attacks can steal codes. Unattended devices expose medical/billing data indefinitely.
- **Fix**: Switch to `sessionStorage` with encryption. Implement 30-minute idle timeout. Clear storage on tab close.

---

### H3. Publicly Readable Services & Programs Collections

- **File**: `firestore.rules:64-72`
- **Problem**: `allow read: if true` exposes service catalog and programs to unauthenticated users
- **Impact**: Business information leakage; unauthorized data enumeration
- **Fix**: Change to `allow read: if isSignedIn()`

---

### H4. Any User Can Create Notifications for Any Other User

- **File**: `firestore.rules:91-96`
- **Problem**: `allow create: if isSignedIn()` with no validation on recipientId
- **Impact**: Notification spam, phishing attacks, user impersonation
- **Fix**: Validate sender matches role or restrict to system/admin:
  ```
  allow create: if isSignedIn() && (isAdmin() || isCoordinator());
  ```

---

### H5. Memory Leak - Missing Firestore Listener Cleanup in PortalContext

- **File**: `src/app/parent/PortalContext.tsx:152-161`
- **Problem**: `unsubscribeVBMAPP` listener created inside callback but never included in cleanup function
- **Impact**: Orphaned Firestore listeners persist after component unmount, leaking memory
- **Fix**: Store all unsubscribe functions in refs and clean them all up in the return function.

---

### H6. Missing `constraints` Dependency in useCollection Hook

- **File**: `src/hooks/useCollections.ts:52`
- **Problem**: `constraints` parameter is used to build Firestore queries but excluded from the useEffect dependency array. ESLint warning is suppressed.
- **Impact**: Query subscriptions don't update when filters change. Stale data returned to consumers.
- **Fix**: Add `constraints` to dependency array with proper memoization or serialization for deep comparison.

---

### H7. Circular Dependency / Infinite Loop Risk in NotificationContext

- **File**: `src/context/NotificationContext.tsx:144-156`
- **Problem**: `requestPushPermission` depends on `user` via `useCallback`. The `useEffect` that calls it also depends on `requestPushPermission`, creating a circular chain.
- **Impact**: Potential infinite re-render loops on login/logout transitions
- **Fix**: Remove `requestPushPermission` from useEffect dependency array, or restructure to avoid circularity.

---

### H8. Race Condition in useCollection - Multiple Simultaneous Subscriptions

- **File**: `src/hooks/useCollections.ts:26-55`
- **Problem**: `setLoading(true)` fires on every dependency change, but `setLoading(false)` only after first snapshot. Rapid changes spawn multiple Firestore listeners simultaneously.
- **Impact**: Old subscription callbacks overwrite data from newer subscriptions. Data inconsistency.
- **Fix**: Track subscription generation with a counter or ref. Only apply snapshot data from the latest subscription.

---

### H9. Month Indexing Bug in TeamPayoutsTable

- **File**: `src/components/billing/TeamPayoutsTable.tsx:56`
- **Problem**: Component uses `month + 1` internally but may receive 1-12 from callers instead of 0-11
- **Impact**: February becomes "month 13". Wrong month on invoices and payout reports.
- **Fix**: Standardize all month indexing to 0-11 (JavaScript convention). Add validation at component boundary.

---

### H10. Event Duration NaN Crash

- **File**: `src/components/calendar/EventDetailPanel/index.tsx:173`
- **Problem**: `event.duration * 60000` produces NaN if `duration` is undefined or null. No validation.
- **Impact**: Event reschedule crashes. End time calculated as Invalid Date.
- **Fix**: Add guard: `const duration = event.duration ?? 60;` (default to 60 min)

---

### H11. Phone Numbers Exposed Without Access Control in Chat

- **File**: `src/components/chat/ChatView.tsx:56-100`
- **Problem**: Phone numbers displayed via `tel:` links without permission checks
- **Impact**: PII exposure. Phone number enumeration by any authenticated user.
- **Fix**: Mask phone numbers (show only last 4 digits). Verify role permissions before displaying.

---

### H12. Demo Mode Grants Admin to Anonymous Users

- **File**: `src/context/AuthContext.tsx:77-86`
- **Problem**: If `IS_DEMO=true` and user is anonymous, they receive full Admin role
- **Impact**: If demo flag is accidentally enabled in production, all anonymous users become Admin
- **Fix**: Guard with explicit environment whitelist. Only enable on development/staging URLs.

---

### H13. Non-Functional FAB Button in Mobile Navigation

- **File**: `src/components/BottomNav.tsx:42-44`
- **Problem**: The floating action button (Plus icon) has no `onClick` handler
- **Impact**: Dead UI element. Mobile users cannot trigger event creation from bottom nav.
- **Fix**: Add `onClick` handler to open the event creation modal.

---

### H14. Missing i18n in Entire MobileSidebar

- **File**: `src/components/MobileSidebar.tsx:27-40`
- **Problem**: All navigation items are hardcoded in English. No `t()` translations used.
- **Impact**: Romanian users see untranslated mobile navigation. Breaks i18n requirement.
- **Fix**: Use `t()` function for all nav item names, matching the pattern in `Sidebar.tsx`.

---

## MEDIUM Severity (22 bugs)

### M1. SmartBill Endpoint Lacks CSRF Protection

- **File**: `src/app/api/smartbill/invoice/route.ts`
- **Problem**: POST endpoint has no CSRF token validation or origin checks
- **Impact**: Cross-site request forgery can trigger unwanted invoice generation

---

### M2. No Input Validation on Invoice Data

- **File**: `src/app/api/smartbill/invoice/route.ts:39-62`
- **Problem**: Invoice items, quantities, and prices are used directly without validation
- **Impact**: Negative prices, huge quantities, or malformed data accepted

---

### M3. Thread Access Rules Logic Flaw

- **File**: `firestore.rules:133-140`
- **Problem**: `resource == null` condition in `get` rule allows any user to probe for thread IDs
- **Impact**: Thread ID enumeration; uncontrolled thread document creation

---

### M4. Auto-fill Parent Code from URL Parameter (Phishing Risk)

- **File**: `src/app/parent/page.tsx:32-38`
- **Problem**: Parent login code auto-filled from URL query parameter
- **Impact**: Phishing attacks - attacker sends URL with code pre-filled

---

### M5. Context Value Not Memoized - AuthContext

- **File**: `src/context/AuthContext.tsx:133`
- **Problem**: Provider value object recreated on every render without `useMemo`
- **Impact**: Cascading re-renders across entire app for all `useAuth()` consumers

---

### M6. Context Value Not Memoized - EventModalContext

- **File**: `src/context/EventModalContext.tsx:37`
- **Problem**: Provider value `{ openModal, closeModal }` created fresh every render
- **Impact**: All consumer components re-render unnecessarily

---

### M7. Context Value Not Memoized - ToastContext

- **File**: `src/context/ToastContext.tsx:41`
- **Problem**: Provider value object with 5 methods created fresh every render
- **Impact**: Toast consumers re-render on every parent render

---

### M8. Date Timezone Bug in CreatePlanModal

- **File**: `src/components/clients/CreatePlanModal.tsx:92-94`
- **Problem**: HTML date input is local timezone, but `new Date()` comparison treats as UTC
- **Impact**: Valid date ranges rejected or invalid ranges accepted depending on timezone

---

### M9. Inconsistent Timestamp Formats Across Modals

- **File**: `CreatePlanModal.tsx:118` vs `AddClientModal.tsx:57`
- **Problem**: CreatePlanModal uses `new Date().toISOString()` while AddClientModal uses `serverTimestamp()`
- **Impact**: Data inconsistency. Future queries/sorting behave unpredictably.

---

### M10. Firestore Timestamp vs String Type Mismatch in Queries

- **File**: `src/hooks/useCollections.ts:140-149`
- **Problem**: `where` clauses compare ISO strings with potentially Firestore Timestamp objects
- **Impact**: Queries return incorrect or empty results. Calendar events may not appear for the selected month.

---

### M11. Invoice Date String Comparison Bug

- **File**: `src/hooks/useCollections.ts:315-327`
- **Problem**: String comparison generates invalid dates (e.g., "Feb 31"). Month+1 logic may be wrong if month is 1-indexed.
- **Impact**: Wrong date ranges in invoice queries. Inaccurate monthly billing reports.

---

### M12. Missing `isOpen` Dependency in EditServiceModal useEffect

- **File**: `src/components/services/EditServiceModal.tsx:43`
- **Problem**: useEffect depends on `[service]` but not `isOpen`. Modal reopen with same service shows stale form.
- **Impact**: Users edit stale data when reopening the same service.

---

### M13. Missing `isOpen` Dependency in EditProgramModal useEffect

- **File**: `src/components/programs/EditProgramModal.tsx:39`
- **Problem**: Same as M12 - missing `isOpen` in dependency array
- **Impact**: Stale form data when reopening modal

---

### M14. Weak IBAN Validation (No Checksum)

- **File**: `src/components/settings/BillingConfigTab.tsx:65-69`
- **Problem**: IBAN regex validates format only, not MOD-97 checksum
- **Impact**: Invalid IBANs accepted, causing payment processing failures

---

### M15. Division by Zero in Therapist Utilization Chart

- **File**: `src/components/analytics/TherapistUtilizationChart.tsx:13-14`
- **Problem**: `billable / capacity` when `capacity = 0` produces Infinity, not caught by `|| 0` fallback
- **Impact**: Chart renders Infinity percentage. UI displays broken bars.

---

### M16. Division by Zero in Revenue Projection

- **File**: `src/hooks/useAnalyticsData.ts:34-38`
- **Problem**: `monthlyRevenue / totalInvoicedItems` when items = 0 produces Infinity
- **Impact**: Analytics dashboard shows Infinity for average session value

---

### M17. KPI Counts Future Scheduled Events as Completed Sessions

- **File**: `src/hooks/useAnalyticsData.ts:16`
- **Problem**: `totalSessions = events.length` includes future scheduled events
- **Impact**: Monthly Sessions KPI is inflated. Misleading dashboard metrics.

---

### M18. Floating-Point Rounding Error in Billing Hours

- **File**: `src/lib/billing.ts:177`
- **Problem**: `Math.round((totalMinutes / 60) * 10) / 10` introduces precision loss (119 min -> 2.0 hrs instead of 1.98)
- **Impact**: Small billing inaccuracies compound across many invoices

---

### M19. Invoice Status Transition Loses SmartBill Reference

- **File**: `src/lib/billing.ts:160-168`
- **Problem**: Transitioning synced -> paid drops the SmartBill reference ID
- **Impact**: Cannot trace paid invoices back to SmartBill records

---

### M20. Service Worker Serves Stale Cache (24h) After Deployment

- **File**: `public/sw.js`
- **Problem**: StaleWhileRevalidate with 24-hour cache for JS/CSS. No versioning strategy.
- **Impact**: Users may run outdated application code for up to 24 hours after a deployment.

---

### M21. Chat Scroll-to-Bottom Race Condition

- **File**: `src/components/chat/ChatView.tsx:30-34`
- **Problem**: `scrollTop` is set before DOM renders new messages
- **Impact**: Users see old messages instead of newest. Unreliable scroll behavior.
- **Fix**: Use `requestAnimationFrame` or `setTimeout` to defer scroll.

---

### M22. Broken Unread Message Count Logic

- **File**: `src/context/NotificationContext.tsx`
- **Problem**: Only counts threads where the LAST message is unread. Earlier unread messages are ignored.
- **Impact**: Inaccurate badge count. Users miss unread messages.

---

## LOW Severity (18 bugs)

### L1. Missing Security Headers

- **File**: `next.config.js`
- **Problem**: No CSP, X-Frame-Options, HSTS, or other security headers configured
- **Impact**: Vulnerable to clickjacking, MIME-type sniffing

---

### L2. Image Optimization Disabled

- **File**: `next.config.js:28-30`
- **Problem**: `unoptimized: true` disables all Next.js image optimization
- **Impact**: Larger payloads, slower LCP, poor performance on mid-range devices

---

### L3. User Zoom/Scaling Disabled (WCAG Violation)

- **File**: `src/app/layout.tsx:44-45`
- **Problem**: `maximumScale: 1` and `userScalable: false` prevent pinch-to-zoom
- **Impact**: Violates WCAG 2.1 accessibility guidelines. Users with low vision cannot zoom.

---

### L4. Missing `viewport-fit=cover` for Notched Devices

- **File**: `src/app/layout.tsx`
- **Problem**: No viewport-fit configuration for devices with notches (iPhone X+)
- **Impact**: Content may be hidden behind the notch on modern iPhones

---

### L5. Missing aria-labels on Icon Buttons

- **Files**: `ChatView.tsx`, `BottomNav.tsx`, `Header.tsx`, `MobileSidebar.tsx`
- **Problem**: Icon-only buttons lack `aria-label` attributes
- **Impact**: Screen readers can't announce button purpose. Accessibility failure.

---

### L6. Missing aria-pressed/aria-label on Custom Toggle Switches

- **Files**: `AddServiceModal.tsx`, `EditServiceModal.tsx`
- **Problem**: Custom toggle button elements lack ARIA attributes
- **Impact**: Screen readers can't identify toggle state

---

### L7. Hardcoded Strings in Sidebar

- **File**: `src/components/Sidebar.tsx:57, 105`
- **Problem**: "Therapy Management" subtitle and "Management" section header not translated
- **Impact**: Romanian users see English in the sidebar

---

### L8. Hardcoded Strings in NotificationPreferences

- **File**: `src/components/notifications/NotificationPreferences.tsx`
- **Problem**: All category labels ("Schedule Changes", "Attendance & Scores", "Team Updates", etc.) hardcoded in English
- **Impact**: Notification settings page untranslated for Romanian users

---

### L9. Hardcoded Strings in Header Dropdown

- **File**: `src/components/Header.tsx`
- **Problem**: Profile dropdown options ("Profile", "Settings") not translated
- **Impact**: Minor i18n inconsistency

---

### L10. Wrong Currency Symbol in Revenue Chart

- **File**: `src/components/analytics/RevenueMixChart.tsx:31`
- **Problem**: Tooltip uses `$` but the billing system uses RON currency
- **Impact**: Confusing currency display for Romanian users

---

### L11. Inconsistent Null Checking Pattern

- **File**: `src/lib/billing.ts:242`
- **Problem**: `deductions || 0` uses falsy check. Should use `?? 0` for proper nullish handling.
- **Impact**: Explicit `0` deductions could theoretically be treated as "no deduction"

---

### L12. Double-Submit Possible via Enter Key in All Modals

- **Files**: All modal components
- **Problem**: `isSubmitting` flag prevents button clicks but doesn't prevent form submission via Enter key
- **Impact**: Race condition; form could submit twice

---

### L13. O(n*m) Event Lookup in MonthView

- **File**: `src/components/calendar/MonthView.tsx:41-49`
- **Problem**: `eventsByDay` iterates entire events array for each of 42 grid cells
- **Impact**: Slow rendering with large event counts. Should use Map for O(1) lookups.

---

### L14. Non-Memoized Sort in Utilization Chart

- **File**: `src/components/analytics/TherapistUtilizationChart.tsx:12`
- **Problem**: `[...data].sort(...)` creates new array on every render without `useMemo`
- **Impact**: Unnecessary re-computation and potential UI jank

---

### L15. WeekView Re-renders Every 60 Seconds for Time Indicator

- **File**: `src/components/calendar/WeekView.tsx:103-112`
- **Problem**: Current time state updates every 60 seconds, causing full week view re-render
- **Impact**: All event positions recalculated every minute

---

### L16. Weak Parent Code Validation (No Max Length, No Trim)

- **File**: `src/app/parent/page.tsx:51-54`
- **Problem**: Only validates minimum length (4 chars). No maximum validation. No whitespace trimming. Error message uses wrong translation key.
- **Impact**: Invalid codes accepted. Poor error feedback.

---

### L17. Deleted Services Show $0 Line Items With No Indication

- **File**: `src/lib/billing.ts:113-115`
- **Problem**: `service?.basePrice || 0` defaults to 0 when service is deleted. No visual indicator.
- **Impact**: Historical invoices silently show $0 for deleted services. No audit trail.

---

### L18. Blank Analytics Page on Data Error

- **File**: `src/app/(dashboard)/analytics/page.tsx:47`
- **Problem**: `if (!data) return null` renders a completely blank page when data loading fails
- **Impact**: Users see empty screen with no error message or retry option

---

## Fix Execution Plan

### Phase 1: CRITICAL - Security & Data Integrity (Days 1-2)

| Task | Bugs Fixed | Estimated Time |
|------|------------|----------------|
| Fix Firestore rules: messages participant check, notification validation, services/programs auth | C1, H3, H4, M3 | 2h |
| Fix Storage rules: role-based client document access | C2 | 1h |
| Move SmartBill credentials to Cloud Secret Manager + add API role authorization | C3, C4, M1, M2 | 4h |
| Add discount validation (clamp 0-1) + event duration null-safety | C6, H10 | 1h |
| Fix CreatePlanModal clientId dependency (prevent cross-client data leakage) | C7 | 30min |
| Replace hardcoded analytics with real calculations from event/program data | C5 | 4h |

**Phase 1 Total**: ~12.5 hours

---

### Phase 2: HIGH - Auth, Memory, Performance (Days 3-4)

| Task | Bugs Fixed | Estimated Time |
|------|------------|----------------|
| Implement parent login rate limiting via Cloud Function | H1 | 3h |
| Switch parent session to sessionStorage + add 30-min idle timeout | H2 | 2h |
| Fix useCollection hook: add constraints dependency + subscription race guard | H6, H8 | 2h |
| Fix NotificationContext circular dependency | H7 | 1.5h |
| Fix PortalContext memory leak (unsubscribe all listeners) | H5 | 30min |
| Fix month indexing in TeamPayoutsTable (standardize 0-11) | H9 | 30min |
| Add useMemo to AuthContext, EventModalContext, ToastContext provider values | M5, M6, M7 | 1.5h |
| Fix mobile nav: FAB onClick handler + i18n translations for MobileSidebar | H13, H14 | 1h |
| Guard demo admin bypass with environment whitelist | H12 | 30min |
| Mask phone numbers in chat, add permission checks | H11 | 1h |

**Phase 2 Total**: ~13.5 hours

---

### Phase 3: MEDIUM - Data Correctness & UX (Days 5-7)

| Task | Bugs Fixed | Estimated Time |
|------|------------|----------------|
| Standardize all timestamps to `serverTimestamp()` | M9 | 2h |
| Fix Firestore Timestamp vs string comparisons in collection hooks | M10, M11 | 2h |
| Fix date timezone handling in CreatePlanModal | M8 | 1h |
| Fix useEffect dependencies in EditServiceModal and EditProgramModal | M12, M13 | 1h |
| Fix division-by-zero guards in charts + analytics | M15, M16, M17 | 1.5h |
| Fix billing: rounding precision, status transitions, IBAN checksum validation | M18, M19, M14 | 2h |
| Fix service worker: add versioning strategy, NetworkFirst for app shell | M20 | 1.5h |
| Fix chat: scroll-to-bottom timing + unread count logic | M21, M22 | 2h |
| Remove URL auto-fill for parent login code | M4 | 30min |

**Phase 3 Total**: ~13.5 hours

---

### Phase 4: LOW - Polish & Accessibility (Days 8-9)

| Task | Bugs Fixed | Estimated Time |
|------|------------|----------------|
| Add security headers to next.config.js (CSP, X-Frame-Options, HSTS) | L1 | 1h |
| Re-enable Next.js image optimization | L2 | 30min |
| Fix WCAG: re-enable zoom, add aria-labels to all icon buttons, add notch support | L3, L4, L5, L6 | 2h |
| Replace all remaining hardcoded strings with i18n keys | L7, L8, L9 | 2h |
| Fix currency symbol (RON not $) in RevenueMixChart | L10 | 15min |
| Add double-submit prevention: disable form on submit across all modals | L12 | 1h |
| Performance: memoize MonthView lookups with Map, memoize chart sorts, debounce WeekView time indicator | L13, L14, L15 | 2h |
| Misc: fix null checking pattern, blank analytics fallback, deleted service indicator, parent code validation | L11, L16, L17, L18 | 1.5h |

**Phase 4 Total**: ~10.25 hours

---

## Total Estimated Effort

| Phase   | Days  | Bug Count | Focus Area                       |
|---------|-------|-----------|----------------------------------|
| Phase 1 | 1-2   | 10        | Security & data integrity        |
| Phase 2 | 3-4   | 14        | Auth, memory leaks, performance  |
| Phase 3 | 5-7   | 14        | Data correctness, UX             |
| Phase 4 | 8-9   | 18        | Polish, accessibility, i18n      |
| **Total** | **~9 days** | **61** | -                           |

---

## Notes

- **Phase 1 is a hard deployment blocker.** No production release should happen until all Critical bugs are resolved.
- **Phases 2-3** should complete within the current sprint.
- **Phase 4** can be parallelized or deferred if timeline is tight, but accessibility fixes (L3, L5) should be prioritized for compliance.
- All time estimates assume familiarity with the codebase and Firebase tooling.

---

*Generated by the TempoApp2 QA Team - February 2026*
