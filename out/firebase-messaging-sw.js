importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app
// TODO: Replace these with your actual Firebase config values
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
  // If the SW is served from /v2/firebase-messaging-sw.js, the scope is /v2/
  const scope = self.registration.scope;
  return scope.endsWith('/') ? scope.slice(0, -1) : scope;
};

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Data-only message structure
  const data = payload.data || {};
  const notificationTitle = data.title || "New Notification";
  const baseUrl = getBaseUrl();
  
  const notificationOptions = {
    body: data.body || "You have a new update",
    // Use absolute path for icon including /v2 if present
    icon: `${baseUrl}/icons/icon-192.svg`,
    // Optional: Small badge for status bar (needs to be monochrome/transparent ideally)
    badge: `${baseUrl}/icons/icon-192.svg`, 
    data: data, // Pass the entire data object
    tag: data.notificationId // Restore unique tag behavior
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
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