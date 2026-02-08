"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef
} from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  Timestamp,
  startAfter,
  getDocs
} from "firebase/firestore";
import { getToken, onMessage, isSupported } from "firebase/messaging";
import { db, messaging } from "@/lib/firebase";
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { useTranslation } from "react-i18next";
import { Notification as NotificationData, NotificationCategory } from "@/types/notifications";
import {
  generateMockNotifications,
  USE_MOCK_NOTIFICATIONS
} from "@/lib/mockNotifications";

export interface GroupedNotifications {
  today: NotificationData[];
  yesterday: NotificationData[];
  thisWeek: NotificationData[];
  older: NotificationData[];
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  unreadMessageCount: number; // New: Chat messages
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isDropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  filterByCategory: (category: NotificationCategory | 'all' | 'unread') => NotificationData[];
  getGroupedNotifications: (filtered?: NotificationData[]) => GroupedNotifications;
  getCategoryCount: (category: NotificationCategory | 'all' | 'unread') => number;
  requestPushPermission: () => Promise<void>;
  pushPermissionStatus: NotificationPermission;
  pushError: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const PAGE_SIZE = 20;

export function NotificationProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, role, isParent, clientId } = useAnyAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0); // New State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>('default');

  const requestPushPermission = useCallback(async () => {
    setPushError(null);
    
    // Check if messaging is supported in this browser
    const supported = await isSupported();
    if (!supported || !messaging || !user) {
       const msg = !supported 
         ? "Push notifications are not supported in this browser."
         : `Messaging/User missing. Msg: ${!!messaging}, User: ${!!user}`;
       console.log(msg);
       if (!supported) setPushPermissionStatus('denied');
       setPushError(msg);
       return;
    }

    try {
      console.log("[NotificationContext] Requesting permission...");
      const permission = await Notification.requestPermission();
      console.log("[NotificationContext] Permission result:", permission);
      setPushPermissionStatus(permission);

      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            throw new Error("Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY");
        }
        
        console.log("[NotificationContext] Getting service worker registration...");
        let registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          console.log("[NotificationContext] No registration found, registering...");
          const basePath = window.location.pathname.startsWith('/v2') ? '/v2' : '';
          registration = await navigator.serviceWorker.register(`${basePath}/firebase-messaging-sw.js`);
        }

        console.log("[NotificationContext] Getting token...");
        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });
        
        console.log("[NotificationContext] Token retrieved:", token ? "Yes (hidden)" : "No");
        
        if (token) {
          // Save token to firestore
          console.log("[NotificationContext] Saving token to Firestore for user:", user.uid);
          await setDoc(doc(db, 'fcm_tokens', user.uid), {
             token,
             userId: user.uid,
             updatedAt: Timestamp.now(),
             platform: 'web',
             userAgent: navigator.userAgent
          }, { merge: true });
          
          console.log('FCM Token generated and saved');
          setPushError(null); // Success
        } else {
            setPushError("No token received from FCM");
        }
      }
    } catch (err: any) {
      console.error('An error occurred while retrieving token. ', err);
      setPushError(err.message || "Unknown error getting token");
    }
  }, [user]);

  // Use ref to avoid circular dependency: useEffect -> requestPushPermission -> user -> useEffect
  const requestPushPermissionRef = useRef(requestPushPermission);
  requestPushPermissionRef.current = requestPushPermission;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log("[NotificationContext] Initial permission status:", Notification.permission);
      setPushPermissionStatus(Notification.permission);

      // If already granted, ensure we have the token
      if (Notification.permission === 'granted' && user) {
         requestPushPermissionRef.current();
      }
    }
  }, [user]); // Only depend on user, access requestPushPermission via ref

  // Handle Foreground Messages
  // Note: We do NOT show browser notifications here to avoid duplicates.
  // The service worker handles push notifications when in background.
  // When in foreground, the in-app notification list updates via Firestore listener.
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[NotificationContext] Foreground message received:", payload);
      // Don't show browser notification - the Firestore listener will update the in-app list
      // and the user can see the notification badge update in real-time.
      // This prevents duplicate notifications (one from here + one from service worker).
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for Chat Threads (Unread Messages)
  useEffect(() => {
    if (!user) {
      setUnreadMessageCount(0);
      return;
    }

    // Listen to threads where user is a participant OR by clientId for parents
    const q = (isParent && clientId)
      ? query(
          collection(db, "threads"),
          where("clientId", "==", clientId)
        )
      : query(
          collection(db, "threads"),
          where("participants", "array-contains", user.uid)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.lastMessage && !data.lastMessage.readBy.includes(user.uid)) {
          count++;
        }
      });
      setUnreadMessageCount(count);
    }, (error) => {
      console.error("Error listening to threads:", error);
    });

    return () => unsubscribe();
  }, [user, isParent, clientId]);

  // Real-time listener for notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Use mock data if Cloud Functions not ready
    if (USE_MOCK_NOTIFICATIONS) {
      const mockData = generateMockNotifications(user.uid, 8);
      setNotifications(mockData);
      setLoading(false);
      setHasMore(false);
      return;
    }

    // Real Firestore listener (active when USE_MOCK_NOTIFICATIONS = false)
    setLoading(true);

    const q = (isParent && clientId)
      ? query(
          collection(db, "notifications"),
          where("clientId", "==", clientId),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        )
      : query(
          collection(db, "notifications"),
          where("recipientId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );

    // For parents, we also want to catch anything sent specifically to their current UID 
    // that might not have a clientId (like system alerts or old notifications)
    let unsubscribeSecondary: (() => void) | null = null;
    let primaryNotifs: NotificationData[] = [];
    let secondaryNotifs: NotificationData[] = [];

    const mergeAndSetNotifs = (p: NotificationData[], s: NotificationData[]) => {
      const combined = [...p];
      s.forEach(sn => {
        if (!combined.some(pn => pn.id === sn.id)) {
          combined.push(sn);
        }
      });
      // Sort combined by date descending
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      let finalNotifs = combined.slice(0, PAGE_SIZE);
      
      // Filter based on role
      if (role !== 'Admin') {
        finalNotifs = finalNotifs.filter(n => n.category !== 'billing');
      }

      setNotifications(finalNotifs);
    };

    if (isParent && clientId) {
      const qSecondary = query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      unsubscribeSecondary = onSnapshot(qSecondary, (snap) => {
        secondaryNotifs = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        })) as NotificationData[];
        mergeAndSetNotifs(primaryNotifs, secondaryNotifs);
      });
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        primaryNotifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.()?.toISOString() ||
            doc.data().createdAt
        })) as NotificationData[];

        if (isParent && clientId) {
          mergeAndSetNotifs(primaryNotifs, secondaryNotifs);
        } else {
          let notifs = [...primaryNotifs];
          // Filter based on role
          if (role !== 'Admin') {
            notifs = notifs.filter(n => n.category !== 'billing');
          }
          setNotifications(notifs);
        }

        setLoading(false);
        setError(null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (unsubscribeSecondary) unsubscribeSecondary();
    };
  }, [user, role, isParent, clientId]);

  // Computed unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Mark single notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      if (USE_MOCK_NOTIFICATIONS) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
          )
        );
        return;
      }

      await updateDoc(doc(db, "notifications", id), {
        read: true,
        readAt: Timestamp.now()
      });
    },
    []
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);

    if (USE_MOCK_NOTIFICATIONS) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      return;
    }

    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, "notifications", n.id), {
          read: true,
          readAt: Timestamp.now()
        })
      )
    );
  }, [notifications]);

  // Filter by category
  const filterByCategory = useCallback(
    (category: NotificationCategory | 'all' | 'unread'): NotificationData[] => {
      if (category === 'all') return notifications;
      if (category === 'unread') return notifications.filter((n) => !n.read);
      return notifications.filter((n) => n.category === category);
    },
    [notifications]
  );

  // Get category count
  const getCategoryCount = useCallback(
    (category: NotificationCategory | 'all' | 'unread'): number => {
      if (category === 'all') return notifications.length;
      if (category === 'unread') return notifications.filter((n) => !n.read).length;
      return notifications.filter((n) => n.category === category).length;
    },
    [notifications]
  );

  // Get grouped notifications by date
  const getGroupedNotifications = useCallback(
    (filtered?: NotificationData[]): GroupedNotifications => {
      const notifs = filtered || notifications;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const groups: GroupedNotifications = {
        today: [],
        yesterday: [],
        thisWeek: [],
        older: []
      };

      notifs.forEach((n) => {
        const date = new Date(n.createdAt);
        if (date >= today) {
          groups.today.push(n);
        } else if (date >= yesterday) {
          groups.yesterday.push(n);
        } else if (date >= weekAgo) {
          groups.thisWeek.push(n);
        } else {
          groups.older.push(n);
        }
      });

      return groups;
    },
    [notifications]
  );

  // Pagination - load more
  const loadMore = useCallback(async () => {
    if (!user || !lastDoc || !hasMore || USE_MOCK_NOTIFICATIONS) return;

    const q = (isParent && clientId)
      ? query(
          collection(db, "notifications"),
          where("clientId", "==", clientId),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        )
      : query(
          collection(db, "notifications"),
          where("recipientId", "==", user.uid),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );

    const snapshot = await getDocs(q);
    let newNotifs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    })) as NotificationData[];

    if (role !== 'Admin') {
      newNotifs = newNotifs.filter(n => n.category !== 'billing');
    }

    setNotifications((prev) => [...prev, ...newNotifs]);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
  }, [user, lastDoc, hasMore, role]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    unreadMessageCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    loadMore,
    hasMore,
    isDropdownOpen,
    setDropdownOpen,
    filterByCategory,
    getGroupedNotifications,
    getCategoryCount,
    requestPushPermission,
    pushPermissionStatus,
    pushError
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
}
