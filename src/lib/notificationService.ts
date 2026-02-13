import { collection, addDoc, Timestamp, writeBatch, doc, getDoc } from "firebase/firestore";
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
  clientId?: string;
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

  console.log("[NotificationService] Creating notification:", notificationData);
  const docRef = await addDoc(collection(db, "notifications"), notificationData);
  console.log("[NotificationService] Created notification with ID:", docRef.id);
  return docRef.id;
}

/**
 * Create multiple notifications in a batch (more efficient for multiple recipients)
 */
export async function createNotificationsBatch(
  notifications: CreateNotificationParams[]
): Promise<void> {
  if (notifications.length === 0) {
    console.log("[NotificationService] No notifications to create (empty array)");
    return;
  }

  console.log("[NotificationService] Creating batch of", notifications.length, "notifications");
  console.log("[NotificationService] Recipients:", notifications.map(n => n.recipientId));

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
  console.log("[NotificationService] Batch committed successfully");
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

// ============================================
// Parent-specific notification creators
// ============================================

/**
 * Get parent UIDs from client document
 */
export async function getParentUids(clientId: string): Promise<string[]> {
  try {
    const clientDoc = await getDoc(doc(db, "clients", clientId));
    if (!clientDoc.exists()) {
      console.log("[NotificationService] Client not found:", clientId);
      return [];
    }
    const parentUids = clientDoc.data()?.parentUids || [];
    console.log("[NotificationService] Found parent UIDs for client", clientId, ":", parentUids);
    return parentUids;
  } catch (err) {
    console.error("[NotificationService] Error getting parent UIDs:", err);
    return [];
  }
}

interface ParentNotificationContext {
  eventId: string;
  eventTitle: string;
  eventType: string;
  startTime: string;
  therapistName?: string;
  triggeredByUserId: string;
}

/**
 * Notify parents when a new session is created for their child
 */
export async function notifyParentSessionCreated(
  clientId: string,
  context: ParentNotificationContext
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) {
    console.log("[NotificationService] No parent UIDs found for client:", clientId);
    return;
  }

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

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "schedule_created" as NotificationType,
    category: "schedule" as NotificationCategory,
    title: "New Session Scheduled",
    message: `${context.eventType} session${context.therapistName ? ` with ${context.therapistName}` : ""} on ${dateStr} at ${timeStr}`,
    sourceType: "event" as NotificationSourceType,
    sourceId: context.eventId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Schedule",
        type: "navigate" as const,
        route: "/parent/calendar/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent session created notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when a session is rescheduled
 */
export async function notifyParentSessionRescheduled(
  clientId: string,
  context: ParentNotificationContext & { oldStartTime: string }
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) return;

  const newDate = new Date(context.startTime);
  const newTimeStr = newDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const newDateStr = newDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "schedule_updated" as NotificationType,
    category: "schedule" as NotificationCategory,
    title: "Session Rescheduled",
    message: `${context.eventType} session moved to ${newDateStr} at ${newTimeStr}`,
    sourceType: "event" as NotificationSourceType,
    sourceId: context.eventId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Schedule",
        type: "navigate" as const,
        route: "/parent/calendar/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent session rescheduled notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when a session is cancelled
 */
export async function notifyParentSessionCancelled(
  clientId: string,
  context: ParentNotificationContext
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) return;

  const startDate = new Date(context.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "schedule_cancelled" as NotificationType,
    category: "schedule" as NotificationCategory,
    title: "Session Cancelled",
    message: `${context.eventType} session on ${dateStr} has been cancelled`,
    sourceType: "event" as NotificationSourceType,
    sourceId: context.eventId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Schedule",
        type: "navigate" as const,
        route: "/parent/calendar/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent session cancelled notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when attendance is logged for their child's session
 */
export async function notifyParentAttendanceLogged(
  clientId: string,
  context: ParentNotificationContext & { attendance: string }
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) return;

  const startDate = new Date(context.startTime);
  const dateStr = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "attendance_logged" as NotificationType,
    category: "attendance" as NotificationCategory,
    title: "Session Complete",
    message: `${context.eventType} session on ${dateStr} - Attendance: ${context.attendance}`,
    sourceType: "event" as NotificationSourceType,
    sourceId: context.eventId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Progress",
        type: "navigate" as const,
        route: "/parent/progress/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent attendance notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when an invoice is generated for their child
 */
export async function notifyParentInvoiceGenerated(
  clientId: string,
  context: {
    amount: number;
    period: string;
    invoiceId: string;
    triggeredByUserId: string;
  }
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) return;

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "billing_generated" as NotificationType,
    category: "billing" as NotificationCategory,
    title: "Invoice Ready",
    message: `Your ${context.period} invoice is ready (${context.amount.toFixed(2)} RON)`,
    sourceType: "billing" as NotificationSourceType,
    sourceId: context.invoiceId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Invoice",
        type: "navigate" as const,
        route: "/parent/billing/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent invoice notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when a report is generated for their child (Future Feature)
 * Call this when progress reports, evaluations, or other documents are ready for parents
 */
export async function notifyParentReportGenerated(
  clientId: string,
  context: {
    reportType: string; // e.g., "Progress Report", "Evaluation", "Treatment Summary"
    reportTitle: string;
    reportId: string;
    triggeredByUserId: string;
  }
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) return;

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "report_ready" as NotificationType,
    category: "client" as NotificationCategory,
    title: `${context.reportType} Ready`,
    message: `${context.reportTitle} is now available for viewing`,
    sourceType: "client" as NotificationSourceType,
    sourceId: context.reportId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Report",
        type: "navigate" as const,
        route: "/parent/docs/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent report notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when a document is shared with them
 */
export async function notifyParentDocumentShared(
  clientId: string,
  context: {
    documentId: string;
    documentName: string;
    documentCategory: string; // e.g., "Assessment", "Report", "Consent Form"
    sharedByName: string;
    triggeredByUserId: string;
  }
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) {
    console.log("[NotificationService] No parent UIDs found for client:", clientId);
    return;
  }

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "document_shared" as NotificationType,
    category: "client" as NotificationCategory,
    title: "New Document Available",
    message: `${context.sharedByName} shared a ${context.documentCategory.toLowerCase()}: "${context.documentName}"`,
    sourceType: "client" as NotificationSourceType,
    sourceId: context.documentId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Documents",
        type: "navigate" as const,
        route: "/parent/docs/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent document shared notifications to", parentUids.length, "parents");
}

/**
 * Notify parents when new homework is assigned
 */
export async function notifyParentHomeworkAssigned(
  clientId: string,
  context: {
    homeworkTitle: string;
    therapistName: string;
    triggeredByUserId: string;
  }
): Promise<void> {
  const parentUids = await getParentUids(clientId);
  if (parentUids.length === 0) return;

  const notifications: CreateNotificationParams[] = parentUids.map((uid) => ({
    recipientId: uid,
    recipientRole: "parent" as NotificationRecipientRole,
    clientId,
    type: "homework_assigned" as NotificationType,
    category: "client" as NotificationCategory,
    title: "New Homework Assigned",
    message: `${context.therapistName} assigned new practice: "${context.homeworkTitle}"`,
    sourceType: "client" as NotificationSourceType,
    sourceId: clientId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "View Homework",
        type: "navigate" as const,
        route: "/parent/homework/"
      }
    ]
  }));

  await createNotificationsBatch(notifications);
  console.log("[NotificationService] Sent homework notifications to", parentUids.length, "parents");
}

/**
 * Notify recipient about a new message
 */
export async function notifyMessageReceived(
  recipientId: string,
  recipientRole: NotificationRecipientRole,
  context: {
    senderName: string;
    text: string;
    threadId: string;
    triggeredByUserId: string;
    clientId?: string;
  }
): Promise<void> {
  if (recipientId === context.triggeredByUserId) return;

  const route = recipientRole === 'parent' ? '/parent/messages/' : '/messages';

  await createNotification({
    recipientId,
    recipientRole,
    clientId: context.clientId,
    type: "message_received",
    category: "message",
    title: `New Message from ${context.senderName}`,
    message: context.text.length > 50 ? context.text.substring(0, 47) + "..." : context.text,
    sourceType: "system", // Or 'team'/'client' depending on context, but message is generic
    sourceId: context.threadId,
    triggeredBy: context.triggeredByUserId,
    actions: [
      {
        label: "Reply",
        type: "navigate",
        route
      }
    ]
  });
}
