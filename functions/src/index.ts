import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const firestore = admin.firestore();

// ============================================================
// CORS + Auth helpers for onRequest-based callable functions
// ============================================================
function setCors(res: functions.Response) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");
}

async function verifyAuth(req: functions.https.Request): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("unauthenticated");
  }
  const token = authHeader.split("Bearer ")[1];
  return admin.auth().verifyIdToken(token);
}

function sendError(res: functions.Response, code: number, status: string, message: string) {
  res.status(code).json({ error: { status, message } });
}

// ============================================================
// createTeamMember — Admin-only Cloud Function
// Creates a Firebase Auth user + matching Firestore team_members doc
// ============================================================
export const createTeamMember = functions.https.onRequest(async (req, res) => {
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

  // 2. Verify caller is Admin/Superadmin
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

  console.log(`Team member created: ${authUser.uid} (${normalizedEmail}) by ${caller.uid}`);

  res.status(200).json({ result: { uid: authUser.uid } });
});

// ============================================================
// migrateTeamMember — Superadmin-only Cloud Function
// Migrates an existing team member doc to use the correct Auth UID
// ============================================================
export const migrateTeamMember = functions.https.onRequest(async (req, res) => {
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

  // 2. Verify caller is Superadmin
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

  console.log(`Team member migrated: ${oldDocId} → ${authUser.uid} (${normalizedEmail})`);

  res.status(200).json({ result: { uid: authUser.uid, migrated: true } });
});

// ============================================================
// sendPushNotification — Firestore trigger (unchanged)
// ============================================================
export const sendPushNotification = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    const recipientId = notification.recipientId;

    if (!recipientId) {
      console.log("No recipientId found in notification");
      return null;
    }

    // Get the user's FCM token
    const tokenDoc = await admin.firestore().collection("fcm_tokens").doc(recipientId).get();

    if (!tokenDoc.exists) {
      console.log(`No FCM token found for user ${recipientId}`);
      return null;
    }

    const tokenData = tokenDoc.data();
    const fcmToken = tokenData?.token;

    if (!fcmToken) {
      console.log(`Token document exists but no token field for user ${recipientId}`);
      return null;
    }

    const title = notification.title || "New Notification";
    const body = notification.message || "You have a new update";
    const url = notification.actions?.[0]?.route || "/parent/dashboard";

    console.log(`Sending push notification: title="${title}", body="${body}", url="${url}"`);

    // Data-only message - service worker will handle display
    // IMPORTANT: Do NOT include 'notification' field or 'fcmOptions.link'
    // as these cause the browser to auto-display a notification
    const payload: admin.messaging.Message = {
      data: {
        title: title,
        body: body,
        url: url,
        notificationId: context.params.notificationId,
        type: notification.type || "general",
        category: notification.category || "system"
      },
      // Web push - only set headers, no notification-triggering options
      webpush: {
        headers: {
          Urgency: "high"
        }
      },
      // Android specific (for future mobile support)
      android: {
        priority: "high"
      },
      token: fcmToken
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log("Successfully sent push notification:", response);
      return { success: true, messageId: response };
    } catch (error: any) {
      console.error("Error sending push notification:", error);

      // If token is invalid, remove it
      if (error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token") {
        await tokenDoc.ref.delete();
        console.log(`Invalid token deleted for user ${recipientId}`);
      }

      return { success: false, error: error.message };
    }
  });
