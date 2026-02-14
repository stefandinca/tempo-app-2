import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where, startAfter, Query } from 'firebase/firestore';
import { Activity, ActivityType, ActivityCategory } from '@/types/activity';

const ACTIVITIES_COLLECTION = 'activities';

/**
 * Log an activity to Firestore
 */
export async function logActivity(params: {
  type: ActivityType;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  targetId: string;
  targetName: string;
  metadata?: Activity['metadata'];
}): Promise<void> {
  try {
    const category = getCategoryFromType(params.type);

    await addDoc(collection(db, ACTIVITIES_COLLECTION), {
      type: params.type,
      category,
      userId: params.userId,
      userName: params.userName,
      userPhotoURL: params.userPhotoURL || null,
      targetId: params.targetId,
      targetName: params.targetName,
      metadata: params.metadata || {},
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

/**
 * Get category from activity type
 */
function getCategoryFromType(type: ActivityType): ActivityCategory {
  if (type.startsWith('session_')) return 'sessions';
  if (type.startsWith('attendance_')) return 'attendance';
  if (type.startsWith('evaluation_')) return 'evaluations';
  if (type.startsWith('client_')) return 'clients';
  if (type.startsWith('team_member_')) return 'team';
  return 'sessions'; // fallback
}

/**
 * Fetch recent activities
 */
export async function fetchRecentActivities(limitCount: number = 10): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, ACTIVITIES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Activity[];
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return [];
  }
}

/**
 * Fetch activities by category with pagination
 */
export async function fetchActivitiesByCategory(
  category: ActivityCategory,
  limitCount: number = 20,
  lastDoc?: any
): Promise<{ activities: Activity[]; lastDoc: any }> {
  try {
    let q: Query = query(
      collection(db, ACTIVITIES_COLLECTION),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, ACTIVITIES_COLLECTION),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })) as Activity[];

    const last = snapshot.docs[snapshot.docs.length - 1];

    return { activities, lastDoc: last };
  } catch (error) {
    console.error('Failed to fetch activities by category:', error);
    return { activities: [], lastDoc: null };
  }
}
