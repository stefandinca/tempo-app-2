import { useState, useEffect } from 'react';
import { Activity, ActivityCategory } from '@/types/activity';
import { fetchActivitiesByCategory } from '@/lib/activityService';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit as firestoreLimit, onSnapshot } from 'firebase/firestore';

/**
 * Hook to fetch recent activities with real-time updates
 */
export function useRecentActivities(limit: number = 10) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    const q = query(
      collection(db, 'activities'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        })) as Activity[];

        setActivities(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to fetch activities:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [limit]);

  return { activities, loading, error };
}

/**
 * Hook to fetch activities by category with lazy loading
 */
export function useActivitiesByCategory(category: ActivityCategory, pageSize: number = 20) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function loadActivities() {
      try {
        setLoading(true);
        const { activities: data, lastDoc: last } = await fetchActivitiesByCategory(category, pageSize);
        if (isMounted) {
          setActivities(data);
          setLastDoc(last);
          setHasMore(data.length === pageSize);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, [category, pageSize]);

  // Load more function
  const loadMore = async () => {
    if (!hasMore || loadingMore || !lastDoc) return;

    try {
      setLoadingMore(true);
      const { activities: data, lastDoc: last } = await fetchActivitiesByCategory(
        category,
        pageSize,
        lastDoc
      );
      setActivities(prev => [...prev, ...data]);
      setLastDoc(last);
      setHasMore(data.length === pageSize);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoadingMore(false);
    }
  };

  return { activities, loading, loadingMore, error, hasMore, loadMore };
}
