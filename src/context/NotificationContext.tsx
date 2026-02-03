"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo
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
  Timestamp,
  startAfter,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { Notification, NotificationCategory } from "@/types/notifications";
import {
  generateMockNotifications,
  USE_MOCK_NOTIFICATIONS
} from "@/lib/mockNotifications";

export interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  older: Notification[];
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isDropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  filterByCategory: (category: NotificationCategory | 'all' | 'unread') => Notification[];
  getGroupedNotifications: (filtered?: Notification[]) => GroupedNotifications;
  getCategoryCount: (category: NotificationCategory | 'all' | 'unread') => number;
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
  const { user } = useAnyAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

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

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate?.()?.toISOString() ||
            doc.data().createdAt
        })) as Notification[];

        setNotifications(notifs);
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

    return () => unsubscribe();
  }, [user]);

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
    (category: NotificationCategory | 'all' | 'unread'): Notification[] => {
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
    (filtered?: Notification[]): GroupedNotifications => {
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

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);
    const newNotifs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    })) as Notification[];

    setNotifications((prev) => [...prev, ...newNotifs]);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
  }, [user, lastDoc, hasMore]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
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
    getCategoryCount
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
