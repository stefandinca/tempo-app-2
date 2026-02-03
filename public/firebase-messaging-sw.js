importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// TODO: Replace these with your actual Firebase config values
firebase.initializeApp({
  apiKey: "AIzaSyBLyN1jo8PpJ5OMtkEuC4auhuuviapB3Bs",
  authDomain: "tempo-app-2.firebaseapp.com",
  projectId: "tempo-app-2",
  storageBucket: "tempo-app-2.appspot.com",
  messagingSenderId: "47813899076",
  appId: "1:47813899076:web:cd597912a0755195241d11"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});