# Spike: removing the per-clinic Cloud Function triggers

**Date:** 22 Aug 2026
**Question:** can push leave the Firestore trigger, so onboarding a clinic stops
needing a source edit and a functions deploy?

**Answer: yes, proven end to end against production.** A Next API route created a
notification in `clinic-livebetterlife` and delivered its push, with no Cloud
Function involved — `{"results":[{"id":"QgLpMIBE52APg9fjtuQ6","pushed":true}]}`.

---

## What was proven, and how

Not by reasoning — by minting a real Firebase ID token from the same service
account the deployed app uses, and calling the real route with the real Host
header:

| Link in the chain | Evidence |
|---|---|
| Token verification for staff and anonymous parents | `adminAuth().verifyIdToken` — the pattern `/api/parent/link` already uses in production |
| Host → tenant database | `tenantDatabaseFromRequest`; the route 404s on a non-clinic host |
| Admin SDK write to a **named** database | `adminDb(databaseId)`; document created in `clinic-livebetterlife` |
| FCM send from the API layer | `adminMessaging().send(...)`; `pushed: true`, delivered to a real device |

`firebase-admin` was already a dependency of the app and Admin-SDK routes
already work in production, so nothing new had to be introduced except a
`getMessaging` handle.

---

## The choke point is clean — checked, not assumed

22 call sites create notifications, all through `createNotification` /
`createNotificationsBatch` in `src/lib/notificationService.ts`.

Five other files reference `collection(db, "notifications")`, which looked like
bypassing writers and would have broken the whole design. **All five are reads**
(the pagination queries in `NotificationContext`). So changing those two service
functions covers every write.

---

## What the spike caught

**The route failed on its first real call**, with `not_authorised`, because it
copied the `isActive` check without the Superadmin exemption:

```js
const isStaff = memberSnap.exists && String(memberSnap.data()?.isActive) !== "false";
```

Live Better Life's platform account is a Superadmin carrying `isActive: false` —
that is how it stays out of the clinic's own roster. `serverAuth.ts` and
`firestore.rules` both exempt Superadmin; the new route did not, and would have
locked the platform out of the largest clinic.

This trap was documented the same morning, in the commit that introduced the
`isActive` enforcement, and was walked into anyway within hours. It is worth
treating as a standing rule rather than a note: **any new code that reads
`isActive` must exempt Superadmin.** Fixed in the route, with a comment saying
why.

---

## Migration order — the non-obvious part

While both paths exist, **every notification is pushed twice**: the route sends
it, then `onDocumentCreated` fires on the document the route just wrote and sends
it again. Confirmed in the function logs during the spike; the test device
received two notifications.

So the cutover cannot be "switch the client, delete the triggers later", and it
cannot be "delete the triggers, then switch the client" either — that leaves a
window with no push at all.

**The order that has neither duplicates nor a gap:**

1. Teach the trigger to skip documents the route wrote — the route stamps a
   marker field at creation, and the trigger returns early when it sees it.
   Deploy functions. Nothing changes yet.
2. Switch `notificationService` to call the route. Deploy the app. Push now comes
   from the route; the trigger sees the marker and stays quiet.
3. Verify a real notification still arrives at a real device, per clinic.
4. Delete the eight registrations and deploy functions. Nothing is left to skip.

Step 1 exists only to make steps 2–4 safe, and is deleted by step 4.

---

## What is deliberately worse afterwards

A Firestore trigger is retried by Google; an HTTP request is not. A push that
fails now fails once.

Mitigated rather than solved: the route writes the notification first and sends
second, so a failed push never costs the notification — the in-app bell still
shows it. `pushedAt` is stamped only on success, so a sweeper can find anything
that never went out. Worth building eventually; not required for cutover.

Worth being honest that delivery was never guaranteed anyway — FCM is best
effort and a device may be offline. What changes is that the failure moves from
"retried by Google" to "visible in a field nobody reads yet".

---

## State

`src/app/api/notifications/route.ts` exists, is typechecked, lint-clean, and
**is not wired to anything** — `notificationService` still writes directly and
the triggers still send. It is the foundation for step 1 above, not a live code
path.

The spike's test notification and dev server were cleaned up; the two duplicate
pushes went to the author's own device.

**Next:** step 1 of the migration order, when the trigger removal is scheduled
properly. See `docs/superpowers/specs/2026-08-22-self-onboarding-roadmap.md`
Phase 1.
