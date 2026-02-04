import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

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
