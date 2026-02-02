import { collection, addDoc, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationRecipientRole,
  NotificationSourceType,
  NotificationAction
} from "@/types/notifications";

interface CreateNotificationParams {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  sourceType: NotificationSourceType;
  sourceId?: string;
  triggeredBy?: string;
  actions?: NotificationAction[];
  groupKey?: string;
}

/**
 * Create a single notification in Firestore
 */
export async function createNotification(params: CreateNotificationParams): Promise<string> {
  const notificationData = {
    ...params,
    createdAt: Timestamp.now(),
    read: false
  };

  const docRef = await addDoc(collection(db, "notifications"), notificationData);
  return docRef.id;
}

/**
 * Create multiple notifications in a batch (more efficient for multiple recipients)
 */
export async function createNotificationsBatch(
  notifications: CreateNotificationParams[]
): Promise<void> {
  if (notifications.length === 0) return;

  const batch = writeBatch(db);

  notifications.forEach((params) => {
    const docRef = doc(collection(db, "notifications"));
    batch.set(docRef, {
      ...params,
      createdAt: Timestamp.now(),
      read: false
    });
  });

  await batch.commit();
}

// ============================================
// Event-specific notification creators
// ============================================

interface EventNotificationContext {
  eventId: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  clientName?: string;
  therapistName?: string;
  triggeredByUserId: string;
  triggeredByName?: string;
}

/**
 * Notify when a new session is created
 */
export async function notifySessionCreated(
  recipientIds: string[],
  context: EventNotificationContext
): Promise<void> {
  const startDate = new Date(context.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  const notifications: CreateNotificationParams[] = recipientIds
    .filter((id) => id !== context.triggeredByUserId) // Don't notify the creator
    .map((recipientId) => ({
      recipientId,
      recipientRole: "therapist" as NotificationRecipientRole,
      type: "schedule_created" as NotificationType,
      category: "schedule" as NotificationCategory,
      title: "New Session Scheduled",
      message: `${context.eventType} session${context.clientName ? ` with ${context.clientName}` : ""} on ${dateStr} at ${timeStr}`,
      sourceType: "event" as NotificationSourceType,
      sourceId: context.eventId,
      triggeredBy: context.triggeredByUserId,
      actions: [
        {
          label: "View Calendar",
          type: "navigate" as const,
          route: "/calendar"
        }
      ]
    }));

  await createNotificationsBatch(notifications);
}

/**
 * Notify when a session is rescheduled (time changed)
 */
export async function notifySessionRescheduled(
  recipientIds: string[],
  context: EventNotificationContext & { oldStartTime: string }
): Promise<void> {
  const newDate = new Date(context.startTime);
  const oldDate = new Date(context.oldStartTime);

  const newTimeStr = newDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const newDateStr = newDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const notifications: CreateNotificationParams[] = recipientIds
    .filter((id) => id !== context.triggeredByUserId)
    .map((recipientId) => ({
      recipientId,
      recipientRole: "therapist" as NotificationRecipientRole,
      type: "schedule_updated" as NotificationType,
      category: "schedule" as NotificationCategory,
      title: "Session Rescheduled",
      message: `${context.eventType}${context.clientName ? ` with ${context.clientName}` : ""} moved to ${newDateStr} at ${newTimeStr}`,
      sourceType: "event" as NotificationSourceType,
      sourceId: context.eventId,
      triggeredBy: context.triggeredByUserId,
      actions: [
        {
          label: "View Calendar",
          type: "navigate" as const,
          route: "/calendar"
        }
      ]
    }));

  await createNotificationsBatch(notifications);
}

/**
 * Notify when a session is cancelled/deleted
 */
export async function notifySessionCancelled(
  recipientIds: string[],
  context: EventNotificationContext
): Promise<void> {
  const startDate = new Date(context.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const notifications: CreateNotificationParams[] = recipientIds
    .filter((id) => id !== context.triggeredByUserId)
    .map((recipientId) => ({
      recipientId,
      recipientRole: "therapist" as NotificationRecipientRole,
      type: "schedule_cancelled" as NotificationType,
      category: "schedule" as NotificationCategory,
      title: "Session Cancelled",
      message: `${context.eventType}${context.clientName ? ` with ${context.clientName}` : ""} on ${dateStr} has been cancelled`,
      sourceType: "event" as NotificationSourceType,
      sourceId: context.eventId,
      triggeredBy: context.triggeredByUserId,
      actions: [
        {
          label: "View Calendar",
          type: "navigate" as const,
          route: "/calendar"
        }
      ]
    }));

  await createNotificationsBatch(notifications);
}

/**
 * Notify when attendance is logged for a session
 */
export async function notifyAttendanceLogged(
  recipientIds: string[],
  context: EventNotificationContext & { attendance: string }
): Promise<void> {
  const notifications: CreateNotificationParams[] = recipientIds
    .filter((id) => id !== context.triggeredByUserId)
    .map((recipientId) => ({
      recipientId,
      recipientRole: "admin" as NotificationRecipientRole,
      type: "attendance_logged" as NotificationType,
      category: "attendance" as NotificationCategory,
      title: "Attendance Logged",
      message: `${context.clientName || "Client"} marked as ${context.attendance} for ${context.eventType} session`,
      sourceType: "event" as NotificationSourceType,
      sourceId: context.eventId,
      triggeredBy: context.triggeredByUserId,
      actions: [
        {
          label: "View Details",
          type: "navigate" as const,
          route: "/calendar"
        }
      ]
    }));

  await createNotificationsBatch(notifications);
}

/**
 * Notify admins/coordinators about billing events
 */
export async function notifyBillingGenerated(
  recipientIds: string[],
  context: {
    clientName: string;
    amount: number;
    period: string;
    invoiceId: string;
    triggeredByUserId: string;
  }
): Promise<void> {
  const notifications: CreateNotificationParams[] = recipientIds.map((recipientId) => ({
    recipientId,
    recipientRole: "admin" as NotificationRecipientRole,
    type: "billing_generated" as NotificationType,
    category: "billing" as NotificationCategory,
    title: "Invoice Generated",
    message: `${context.period} invoice for ${context.clientName} is ready (${context.amount.toFixed(2)} RON)`,
    sourceType: "billing" as NotificationSourceType,
    sourceId: context.invoiceId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Invoice",
        type: "navigate" as const,
        route: "/billing"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
}

/**
 * Notify when a team member is assigned to a client
 */
export async function notifyClientAssigned(
  therapistId: string,
  context: {
    clientName: string;
    clientId: string;
    triggeredByUserId: string;
    triggeredByName?: string;
  }
): Promise<void> {
  if (therapistId === context.triggeredByUserId) return;

  await createNotification({
    recipientId: therapistId,
    recipientRole: "therapist",
    type: "client_assigned",
    category: "client",
    title: "New Client Assigned",
    message: `You have been assigned to work with ${context.clientName}`,
    sourceType: "client",
    sourceId: context.clientId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Client",
        type: "navigate",
        route: "/clients"
      }
    ]
  });
}
