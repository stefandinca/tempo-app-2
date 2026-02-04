importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app
firebase.initializeApp({
  apiKey: "AIzaSyBLyN1jo8PpJ5OMtkEuC4auhuuviapB3Bs",
  authDomain: "tempo-app-2.firebaseapp.com",
  projectId: "tempo-app-2",
  storageBucket: "tempo-app-2.appspot.com",
  messagingSenderId: "47813899076",
  appId: "1:47813899076:web:cd597912a0755195241d11"
});

const messaging = firebase.messaging();

// Helper to determine base path (handles /v2/ deployment)
const getBaseUrl = () => {
  const scope = self.registration.scope;
  return scope.endsWith('/') ? scope.slice(0, -1) : scope;
};

// Handle background messages from Firebase
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background message received:', JSON.stringify(payload));

  // Extract data from the payload
  const data = payload.data || {};

  const title = data.title || "New Notification";
  const body = data.body || "You have a new update";
  const notificationId = data.notificationId || `notif-${Date.now()}`;
  const url = data.url || '/parent/dashboard';

  console.log('[SW] Showing notification - Title:', title, 'Body:', body);

  const baseUrl = getBaseUrl();

  const notificationOptions = {
    body: body,
    icon: `${baseUrl}/icons/icon-192.svg`,
    badge: `${baseUrl}/icons/icon-192.svg`,
    data: {
      url: url,
      notificationId: notificationId
    },
    tag: notificationId,
    renotify: false
  };

  // Return the promise to ensure notification is shown
  return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click (Deep Linking)
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  // Get the URL from the data payload, or default to dashboard
  const baseUrl = getBaseUrl();
  let targetUrl = event.notification.data?.url || '/parent/dashboard';
  
  // Ensure targetUrl is absolute or correctly relative to base
  if (targetUrl.startsWith('/')) {
    targetUrl = baseUrl + targetUrl; // e.g. /v2 + /parent/calendar
  } else if (!targetUrl.startsWith('http')) {
    targetUrl = `${baseUrl}/${targetUrl}`;
  }

  // This looks for an open window with the app and focuses it, or opens a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If we have a window open to the app origin, focus it and navigate
        if (client.url.indexOf(baseUrl) !== -1 && 'focus' in client) {
          return client.focus().then(c => {
             if ('navigate' in c) {
                 return c.navigate(targetUrl);
             }
             // Fallback for some browsers
             if (c.navigate) return c.navigate(targetUrl);
             return clients.openWindow(targetUrl);
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});