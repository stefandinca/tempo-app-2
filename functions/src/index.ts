// v1 API explicitly: firebase-functions 7 makes the bare import v2. These two
// HTTP functions stay on v1 so their public URLs do not change — the
// /api/cloud-functions proxy builds them as
// https://{region}-{project}.cloudfunctions.net/{name}, a v1 URL shape.
import * as functionsV1 from "firebase-functions/v1";
// v2 because a trigger has to name the NAMED Firestore database it watches.
// v1 triggers only ever fire on (default), so under one database per clinic
// push silently stopped for everyone. One registration per clinic, below.
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

/**
 * Every clinic has its own Firestore database, derived from the hostname by
 * src/lib/tenant.ts. Nothing here reaches the right one by accident:
 * `admin.firestore()` is always `(default)`, which is the control plane and
 * holds no clinic's records.
 *
 * That was the bug. createTeamMember wrote team_members and team_public into
 * `(default)`, so a member added through the app got an Auth account and then
 * stayed invisible to the clinic that added them. The caller's own admin check
 * read `(default)` too, which is why it appeared to half-work for exactly one
 * clinic — the one whose original records still sit there — and returned
 * PERMISSION_DENIED for every other.
 */
const CLINIC_DATABASE = /^clinic-[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

/**
 * Which clinic a request is about, from the `X-Tempo-Database` header set by
 * /api/cloud-functions — that proxy runs on the clinic's own hostname, so it is
 * the only participant that knows. This function answers on cloudfunctions.net
 * and can tell nothing from its own Host.
 *
 * Taking it from the caller is safe ONLY because the caller's role is then
 * checked in that same database: name someone else's clinic and you are simply
 * not staff there. Anyone moving a role check back to a fixed database has to
 * stop reading this header in the same commit.
 *
 * Required, and `(default)` is refused: no clinic lives there, so a request
 * naming it is a misconfiguration rather than an intention. Defaulting instead
 * of refusing is the bug above, and its failure mode is silence.
 */
function requestedDatabase(req: functionsV1.https.Request): string | null {
  const raw = String(req.get("x-tempo-database") || "").trim();
  return CLINIC_DATABASE.test(raw) ? raw : null;
}

// ============================================================
// CORS + Auth helpers for onRequest-based callable functions
// ============================================================
function setCors(res: functionsV1.Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");
}

async function verifyAuth(req: functionsV1.https.Request): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("unauthenticated");
  }
  const token = authHeader.split("Bearer ")[1];
  return admin.auth().verifyIdToken(token);
}

function sendError(res: functionsV1.Response, code: number, status: string, message: string) {
  res.status(code).json({ error: { status, message } });
}

// ============================================================
// createTeamMember — Admin-only Cloud Function
// Creates a Firebase Auth user + matching Firestore team_members doc
// ============================================================
export const createTeamMember = functionsV1.https.onRequest(async (req, res) => {
  setCors(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "INVALID_ARGUMENT", "Only POST is allowed.");
    return;
  }

  // 1. Verify caller is authenticated
  let caller: admin.auth.DecodedIdToken;
  try {
    caller = await verifyAuth(req);
  } catch {
    sendError(res, 401, "UNAUTHENTICATED", "Must be signed in.");
    return;
  }

  // The clinic this request is about. Every read and write below is scoped to
  // it, the caller's own role check included.
  const databaseId = requestedDatabase(req);
  if (!databaseId) {
    sendError(res, 400, "INVALID_ARGUMENT", "Missing or malformed X-Tempo-Database header.");
    return;
  }
  const firestore = getFirestore(databaseId);

  // 2. Verify caller is Admin/Superadmin — in THAT clinic, which is what makes
  // trusting the header above safe: naming another clinic fails right here.
  const callerDoc = await firestore.collection("team_members").doc(caller.uid).get();
  if (!callerDoc.exists) {
    sendError(res, 403, "PERMISSION_DENIED", "Caller is not a team member.");
    return;
  }
  const callerRole = (callerDoc.data()?.role || "").toLowerCase();
  if (!["admin", "superadmin"].includes(callerRole)) {
    sendError(res, 403, "PERMISSION_DENIED", "Only admins can create team members.");
    return;
  }

  // 3. Validate input
  const data = req.body.data || req.body;
  const { name, email, phone, role, specialty, color, initials, isActive, baseSalary, defaultBonus, photoURL } = data;
  if (!name || !email || !role) {
    sendError(res, 400, "INVALID_ARGUMENT", "name, email, and role are required.");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 4. Check for duplicate email in team_members
  const existingQuery = await firestore.collection("team_members")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();
  if (!existingQuery.empty) {
    sendError(res, 409, "ALREADY_EXISTS", "A team member with this email already exists.");
    return;
  }

  // 5. Create Firebase Auth user (no password — user sets it via email link)
  let authUser: admin.auth.UserRecord;
  try {
    // Check if Auth user already exists (e.g. from Google sign-in)
    try {
      authUser = await admin.auth().getUserByEmail(normalizedEmail);
    } catch {
      // User doesn't exist in Auth, create new one
      authUser = await admin.auth().createUser({
        email: normalizedEmail,
        displayName: name,
        disabled: false,
      });
    }
  } catch (err: any) {
    console.error("Error creating auth user:", err);
    sendError(res, 500, "INTERNAL", "Failed to create authentication account.");
    return;
  }

  // 6. Create team_members/{authUid} doc (UID matches Auth account)
  const memberData: Record<string, any> = {
    name,
    email: normalizedEmail,
    phone: phone || "",
    role,
    specialty: specialty || "",
    color: color || "#4A90E2",
    initials: initials || name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    isActive: isActive !== false,
    baseSalary: baseSalary || 0,
    defaultBonus: defaultBonus || 0,
    photoURL: photoURL || "",
    inviteStatus: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: caller.uid,
  };

  await firestore.collection("team_members").doc(authUser.uid).set(memberData);

  // Mirror of the display-only fields, readable by the parent portal.
  // /team_members is staff-only because it carries e-mail, phone and salary;
  // parents still need a therapist's name/initials/colour. Keep this minimal —
  // anything added here is visible to every anonymous session.
  //
  // The platform Superadmin is never mirrored: they are not clinic staff, and
  // publishing their name and role to every anonymous parent session is exactly
  // the leak the roster filter exists to prevent.
  if (String(memberData.role || "").toLowerCase() !== "superadmin") {
    await firestore.collection("team_public").doc(authUser.uid).set({
      name: memberData.name,
      initials: memberData.initials,
      color: memberData.color,
      role: memberData.role,
    });
  }

  console.log(`Team member created: ${authUser.uid} (${normalizedEmail}) in ${databaseId} by ${caller.uid}`);

  res.status(200).json({ result: { uid: authUser.uid } });
});

// ============================================================
// migrateTeamMember — Superadmin-only Cloud Function
// Migrates an existing team member doc to use the correct Auth UID
// ============================================================
export const migrateTeamMember = functionsV1.https.onRequest(async (req, res) => {
  setCors(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    sendError(res, 405, "INVALID_ARGUMENT", "Only POST is allowed.");
    return;
  }

  // 1. Verify caller is authenticated
  let caller: admin.auth.DecodedIdToken;
  try {
    caller = await verifyAuth(req);
  } catch {
    sendError(res, 401, "UNAUTHENTICATED", "Must be signed in.");
    return;
  }

  // The clinic this request is about — see createTeamMember above.
  const databaseId = requestedDatabase(req);
  if (!databaseId) {
    sendError(res, 400, "INVALID_ARGUMENT", "Missing or malformed X-Tempo-Database header.");
    return;
  }
  const firestore = getFirestore(databaseId);

  // 2. Verify caller is Superadmin — in that clinic.
  const callerDoc = await firestore.collection("team_members").doc(caller.uid).get();
  if (!callerDoc.exists) {
    sendError(res, 403, "PERMISSION_DENIED", "Caller is not a team member.");
    return;
  }
  const callerRole = (callerDoc.data()?.role || "").toLowerCase();
  if (callerRole !== "superadmin") {
    sendError(res, 403, "PERMISSION_DENIED", "Only superadmins can migrate team members.");
    return;
  }

  // 3. Validate input
  const data = req.body.data || req.body;
  const { email, oldDocId } = data;
  if (!email || !oldDocId) {
    sendError(res, 400, "INVALID_ARGUMENT", "email and oldDocId are required.");
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 4. Fetch old doc
  const oldDocRef = firestore.collection("team_members").doc(oldDocId);
  const oldDoc = await oldDocRef.get();
  if (!oldDoc.exists) {
    sendError(res, 404, "NOT_FOUND", "Old team member document not found.");
    return;
  }

  // 5. Find or create Firebase Auth user for that email
  let authUser: admin.auth.UserRecord;
  try {
    authUser = await admin.auth().getUserByEmail(normalizedEmail);
  } catch {
    // User doesn't exist in Auth, create new one
    authUser = await admin.auth().createUser({
      email: normalizedEmail,
      displayName: oldDoc.data()?.name || "",
      disabled: false,
    });
  }

  // If the old doc ID already matches the auth UID, nothing to migrate
  if (oldDocId === authUser.uid) {
    res.status(200).json({ result: { uid: authUser.uid, migrated: false, message: "Doc ID already matches Auth UID." } });
    return;
  }

  // 6. Copy old doc data to new doc with correct Auth UID
  const oldData = oldDoc.data()!;
  const newData = {
    ...oldData,
    inviteStatus: "migrated",
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    migratedFrom: oldDocId,
    migratedBy: caller.uid,
  };

  const batch = firestore.batch();

  // Create new doc
  batch.set(firestore.collection("team_members").doc(authUser.uid), newData);
  // Delete old doc
  batch.delete(oldDocRef);

  // 7. Update foreign key references in events
  const eventsQuery = await firestore.collection("events")
    .where("therapistId", "==", oldDocId)
    .get();
  for (const eventDoc of eventsQuery.docs) {
    batch.update(eventDoc.ref, { therapistId: authUser.uid });
  }

  // Update foreign key references in events.team array
  const teamEventsQuery = await firestore.collection("events")
    .where("team", "array-contains", oldDocId)
    .get();
  for (const eventDoc of teamEventsQuery.docs) {
    const eventData = eventDoc.data();
    const updatedTeam = (eventData.team || []).map((id: string) =>
      id === oldDocId ? authUser.uid : id
    );
    batch.update(eventDoc.ref, { team: updatedTeam });
  }

  // Update threads participants
  const threadsQuery = await firestore.collection("threads")
    .where("participants", "array-contains", oldDocId)
    .get();
  for (const threadDoc of threadsQuery.docs) {
    const threadData = threadDoc.data();
    const updatedParticipants = (threadData.participants || []).map((id: string) =>
      id === oldDocId ? authUser.uid : id
    );
    batch.update(threadDoc.ref, { participants: updatedParticipants });
  }

  await batch.commit();

  console.log(`Team member migrated: ${oldDocId} → ${authUser.uid} (${normalizedEmail}) in ${databaseId}`);

  res.status(200).json({ result: { uid: authUser.uid, migrated: true } });
});

// ============================================================
// sendPushNotification — Firestore trigger (v2), one per clinic
// ============================================================
/**
 * A Firestore trigger binds to exactly ONE database at deploy time — the v2
 * `database` option is a plain string with no wildcard, and v1 triggers only
 * ever fire on `(default)`. Under one database per clinic, push therefore has
 * to be registered once per clinic.
 *
 * Until it was, push did nothing for anyone. The single registration watched
 * `(default)`, which no clinic writes notifications to, so every send was a
 * no-op that logged nothing and failed nowhere.
 *
 * ADDING A CLINIC MEANS ADDING A LINE BELOW and redeploying functions. The list
 * cannot be derived: registration happens at deploy time, long before any
 * request carries a hostname. A missing entry is silent, which is precisely how
 * this went unnoticed — so the onboarding runbook names this file at the step
 * that creates the database.
 */
function pushNotificationTrigger(databaseId: string) {
  return onDocumentCreated(
    {
      document: "notifications/{notificationId}",
      database: databaseId,
      region: "us-central1",
    },
    async (event) => {
      // v2 delivers the snapshot on event.data, and it is optional — a delete
      // racing the create can fire the trigger with nothing attached.
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot on event; nothing to send");
        return;
      }
      const notification = snapshot.data();

      // Written by /api/notifications, which sent its own push already.
      //
      // This exists for the cutover, and only for the cutover. Both paths are
      // live at once while notifications move off Firestore triggers, and
      // without this marker every notification would be pushed TWICE — the
      // route sends it, then this trigger fires on the document the route just
      // wrote and sends it again. Confirmed in the logs during the spike; the
      // test device received two.
      //
      // The alternative orderings are both worse: deleting the triggers first
      // leaves a window with no push at all, and switching the client first
      // gives every user duplicates until the triggers go.
      //
      // DELETE THIS, and the registrations below, once the client no longer
      // writes notifications directly. See
      // docs/superpowers/specs/2026-08-22-trigger-removal-spike.md.
      if (notification.pushVia === "api") {
        console.log("Skipping: already pushed by the API route");
        return;
      }

      const recipientId = notification.recipientId;

      if (!recipientId) {
        console.log("No recipientId found in notification");
        return;
      }

      // The token lives in the SAME clinic database as the notification that
      // triggered this. admin.firestore() here would read the control plane.
      const tokenDoc = await getFirestore(databaseId)
        .collection("fcm_tokens")
        .doc(recipientId)
        .get();

      if (!tokenDoc.exists) {
        console.log(`No FCM token found for user ${recipientId} in ${databaseId}`);
        return;
      }

      const tokenData = tokenDoc.data();
      const fcmToken = tokenData?.token;

      if (!fcmToken) {
        console.log(`Token document exists but no token field for user ${recipientId}`);
        return;
      }

      const title = notification.title || "New Notification";
      const body = notification.message || "You have a new update";
      const url = notification.actions?.[0]?.route || "/parent/dashboard";

      console.log(`Sending push (${databaseId}): title="${title}", body="${body}", url="${url}"`);

      // Data-only message - service worker will handle display
      // IMPORTANT: Do NOT include 'notification' field or 'fcmOptions.link'
      // as these cause the browser to auto-display a notification
      const payload: admin.messaging.Message = {
        data: {
          title: title,
          body: body,
          url: url,
          notificationId: event.params.notificationId,
          type: notification.type || "general",
          category: notification.category || "system",
        },
        // Web push - only set headers, no notification-triggering options
        webpush: {
          headers: {
            Urgency: "high",
          },
        },
        // Android specific (for future mobile support)
        android: {
          priority: "high",
        },
        token: fcmToken,
      };

      try {
        const response = await admin.messaging().send(payload);
        console.log("Successfully sent push notification:", response);
        return;
      } catch (error: any) {
        console.error("Error sending push notification:", error);

        // If token is invalid, remove it
        if (error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token") {
          await tokenDoc.ref.delete();
          console.log(`Invalid token deleted for user ${recipientId}`);
        }

        return;
      }
    },
  );
}

export const sendPushNotificationLivebetterlife = pushNotificationTrigger("clinic-livebetterlife");
export const sendPushNotificationDiaconumaria = pushNotificationTrigger("clinic-diaconumaria");
export const sendPushNotificationDemo = pushNotificationTrigger("clinic-demo");
export const sendPushNotificationAicaa = pushNotificationTrigger("clinic-aicaa");

// ============================================================
// FCM TOKEN OWNERSHIP
// ============================================================
/**
 * One browser has exactly ONE FCM token, and it belongs to the browser, not to
 * whoever is signed in. So when a second account signs in on the same device,
 * the client writes that same token under a second uid — and until now nothing
 * removed the first.
 *
 * Measured 21 Aug 2026 at clinic-livebetterlife: 46 registrations across 14
 * real devices, one token held by 12 different accounts. Because notification
 * bodies name children ("session with X", "X marked as absent"), a push meant
 * for one recipient was delivered to whoever happened to be using that browser
 * — including, in three cases, accounts belonging to different families.
 *
 * The invariant enforced here: a token has exactly one owner, the account that
 * most recently signed in on that device. That is the only model a single
 * browser can support. It does mean a device receives notifications only for
 * the account currently signed into it, which is the correct trade — the
 * alternative is one identity seeing another identity's notifications.
 *
 * This lives server-side because a browser cannot do it: the rules stop one
 * user deleting another user's token document, and they should. An Admin-SDK
 * endpoint would also work but would need its own auth path for anonymous
 * parent sessions; a trigger needs none.
 *
 * Residual: if this function errors on a given write, that duplicate survives
 * and no later write of the SAME token will retry it (see the unchanged-token
 * guard below). scripts/cleanup-fcm-tokens.mjs reconciles in bulk.
 */
function fcmTokenOwnershipTrigger(databaseId: string) {
  return onDocumentWritten(
    {
      document: "fcm_tokens/{uid}",
      database: databaseId,
      region: "us-central1",
    },
    async (event) => {
      const after = event.data?.after;
      // A delete — including the ones this function performs below. Returning
      // here is what stops it recursing.
      if (!after?.exists) return;

      const token = after.data()?.token;
      if (!token || typeof token !== "string") return;

      // The client re-registers on every load, rewriting the same token with a
      // fresh updatedAt. Only a CHANGE of token can create a duplicate, so
      // there is nothing to reconcile otherwise.
      const before = event.data?.before;
      if (before?.exists && before.data()?.token === token) return;

      const uid = event.params.uid;
      const db = getFirestore(databaseId);
      const holders = await db
        .collection("fcm_tokens")
        .where("token", "==", token)
        .get();

      // Delete only registrations OLDER than this one — never "everyone except
      // me". Two accounts signing in close together produce two concurrent
      // invocations, and a cold start can delay the first past the second. With
      // mutual deletion each handler then deletes the other and the token ends
      // up owned by nobody: observed in testing, both fixtures vanished.
      // Comparing timestamps makes the operation ordered, so whichever handler
      // runs last still converges on the newest registration.
      const stamp = (data?: FirebaseFirestore.DocumentData) => {
        const v = data?.updatedAt ?? data?.createdAt;
        if (v && typeof v.toMillis === "function") return v.toMillis();
        const parsed = Date.parse(String(v));
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      const mine = stamp(after.data());
      const stale = holders.docs.filter((d) => {
        if (d.id === uid) return false;
        const theirs = stamp(d.data());
        // Identical timestamps mean a genuine tie; break it on document id so
        // exactly one of the two handlers deletes and one survives.
        return theirs === mine ? d.id < uid : theirs < mine;
      });
      if (!stale.length) return;

      const batch = db.batch();
      stale.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      console.log(
        `Token now owned by ${uid} in ${databaseId}; removed ${stale.length} ` +
          `stale registration(s): ${stale.map((d) => d.id).join(", ")}`,
      );
    },
  );
}

// One per clinic, for the same reason as the push triggers above: a v2 trigger
// binds to one named database at deploy time. ADDING A CLINIC MEANS ADDING A
// LINE HERE.
export const fcmTokenOwnershipLivebetterlife = fcmTokenOwnershipTrigger("clinic-livebetterlife");
export const fcmTokenOwnershipDiaconumaria = fcmTokenOwnershipTrigger("clinic-diaconumaria");
export const fcmTokenOwnershipDemo = fcmTokenOwnershipTrigger("clinic-demo");
export const fcmTokenOwnershipAicaa = fcmTokenOwnershipTrigger("clinic-aicaa");

