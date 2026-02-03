"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.sendPushNotification = functions.firestore
    .document("notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
    var _a, _b;
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
    const fcmToken = tokenData === null || tokenData === void 0 ? void 0 : tokenData.token;
    if (!fcmToken) {
        console.log(`Token document exists but no token field for user ${recipientId}`);
        return null;
    }
    const payload = {
        notification: {
            title: notification.title || "New Notification",
            body: notification.message || "You have a new update in TempoApp",
        },
        data: {
            url: ((_b = (_a = notification.actions) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.route) || "/parent/dashboard",
            notificationId: context.params.notificationId
        },
        token: fcmToken
    };
    try {
        const response = await admin.messaging().send(payload);
        console.log("Successfully sent message:", response);
        return { success: true, messageId: response };
    }
    catch (error) {
        console.log("Error sending message:", error);
        // Optional: If token is invalid, remove it
        if (error.code === 'messaging/registration-token-not-registered') {
            await tokenDoc.ref.delete();
            console.log(`Invalid token deleted for user ${recipientId}`);
        }
        return { success: false, error };
    }
});
//# sourceMappingURL=index.js.map