# Notification System Implementation Plan

This document outlines the steps to complete and optimize the notification system for TempoApp2, covering both in-app and push notifications for staff and parents.

## 1. Infrastructure & Security

### 1.1 Firestore Rules Update
Update `firestore.rules` to allow parents to read notifications based on `clientId` while maintaining privacy for other users. This is critical because a parent's UID may change, but their child's `clientId` remains constant.
- **Action:** Modify `match /notifications/{notificationId}` rule to allow access if the user is a parent of the associated `clientId`.
- **Goal:** Enable the query `where("clientId", "==", clientId)` to work for parents even if their Auth UID changed since the notification was created.

### 1.2 Parent UID Change Resilience
Since parent UIDs can change:
- Notifications sent to parents **must** include the `clientId`.
- Security rules and queries should prefer `clientId` + role-based access over strict `recipientId` matching for parents.
- When a parent's UID is updated in the `clients` collection, we don't need to migrate old notifications if the rules allow access via `clientId`.

### 1.2 Notification Preferences Storage
Currently, notification preferences in the UI are mocked. We need to persist them in Firestore.
- **Staff:** Store in `team_members/{uid}/notificationPreferences`.
- **Parents:** Store in `clients/{clientId}/parentPreferences/{parentUid}`.
- **Default Preferences:** Define a set of default enabled/disabled categories.

### 1.3 Cloud Function Enhancements
The `sendPushNotification` function should be optimized:
- [ ] Check recipient's notification preferences before sending push.
- [ ] Handle multiple tokens per user if needed (currently supports one).
- [ ] Ensure `clientId` is always passed when relevant to help parents filter.

## 2. Trigger Point Implementation

Ensure all key events in the application trigger notifications via `notificationService.ts`.

### 2.1 Staff Triggers
- [x] **Schedule Changes:** (Done in `NewEventModal` & `EventDetailPanel`)
- [x] **Attendance Logged:** (Done in `EventDetailPanel`)
- [ ] **Team Updates:** Call `notifyClientAssigned` when a therapist is added to a client.
- [ ] **Client Updates:** Trigger notification when a new lead becomes a client.
- [ ] **Billing Alerts:** Call `notifyBillingGenerated` when an invoice is created.
- [x] **New Messages:** (Done in `useChat.ts`)

### 2.2 Parent Triggers
- [x] **Schedule Changes:** (Done in `NewEventModal` & `EventDetailPanel`)
- [x] **Attendance Logged:** (Done in `EventDetailPanel`)
- [ ] **Billing Alerts:** Trigger when an invoice status changes to "shared" or is newly created for a client.
- [ ] **Document Updates:** Call `notifyParentDocumentShared` in `ClientDocsTab.tsx` when `handleUpload` or `handleToggleReportShare` is called.
- [x] **New Messages:** (Done in `useChat.ts`)

## 3. User Interface Enhancements

### 3.1 Staff Portal
- [ ] **Settings:** Complete `NotificationPreferences.tsx` to save/load from Firestore.
- [ ] **Navigation:** Ensure the "Show All" link in the bell dropdown points to `/notifications`.

### 3.2 Parent Portal
- [ ] **Notifications Page:** Create `src/app/parent/notifications/page.tsx` to list all notifications for their child.
- [ ] **Settings:** Add a "Notification Settings" section in `src/app/parent/profile/page.tsx` or a new settings page to toggle Push Notifications.
- [ ] **Navigation:** Fix the footer link in `ParentNotificationDropdown.tsx` to point to the new notifications page.

## 4. Technical Debt & Cleanup

- [ ] **FCM VAPID Key:** Ensure `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is correctly set in all environments.
- [ ] **Service Worker Path:** Verify `${basePath}/firebase-messaging-sw.js` registration logic handles all deployment scenarios (root vs /v2).
- [ ] **Mock Toggle:** Ensure `USE_MOCK_NOTIFICATIONS` is `false` in production.

## 5. Testing Checklist

- [ ] **In-App Real-time:** Verify bell icon updates immediately when a new notification doc is created.
- [ ] **Push Background:** Verify system notification appears when app is in background.
- [ ] **Push Foreground:** Verify app handles foreground messages gracefully (badge update only, no duplicate system alert).
- [ ] **Deep Linking:** Verify clicking a notification (push or in-app) navigates to the correct specific entity (e.g., specific event or chat thread).
- [ ] **Permissions:** Test "Deny" then "Allow" flow for push permissions.
