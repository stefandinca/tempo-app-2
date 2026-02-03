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

    const timestamp = new Date().toLocaleTimeString();
    
    const payload = {
      notification: {
        title: notification.title || "New Notification",
        // Append timestamp to ensure uniqueness during testing
        body: (notification.message || "You have a new update") + ` [${timestamp}]`,
      },
      data: {
        url: notification.actions?.[0]?.route || "/parent/dashboard",
        notificationId: context.params.notificationId,
        timestamp: Date.now().toString()
      },
      // Android specific options to prevent collapsing
      android: {
        priority: 'high' as const,
        notification: {
            tag: context.params.notificationId, // Unique tag per notification ID
            visibility: 'public' as const
        }
      },
      token: fcmToken
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log("Successfully sent message:", response);
      return { success: true, messageId: response };
    } catch (error) {
      console.log("Error sending message:", error);
      
      // Optional: If token is invalid, remove it
      if ((error as any).code === 'messaging/registration-token-not-registered') {
          await tokenDoc.ref.delete();
          console.log(`Invalid token deleted for user ${recipientId}`);
      }
      
      return { success: false, error };
    }
  });
