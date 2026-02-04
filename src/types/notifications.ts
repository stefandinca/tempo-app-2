// Notification Categories (matches user preference categories)
export type NotificationCategory =
  | 'schedule'
  | 'attendance'
  | 'team'
  | 'billing'
  | 'client'
  | 'system';

// Notification Types (specific event triggers)
export type NotificationType =
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_cancelled'
  | 'attendance_logged'
  | 'score_recorded'
  | 'client_assigned'
  | 'client_unassigned'
  | 'team_member_added'
  | 'billing_generated'
  | 'billing_overdue'
  | 'report_ready'
  | 'document_shared'
  | 'system_alert'
  | 'reminder';

// Recipient roles (matches existing userRole in AuthContext)
export type NotificationRecipientRole = 'admin' | 'coordinator' | 'therapist' | 'parent';

// Source types for linking to entities
export type NotificationSourceType = 'event' | 'client' | 'team' | 'billing' | 'system';

// Action types for notification buttons
export interface NotificationAction {
  label: string;
  type: 'navigate' | 'dismiss';
  route?: string;
  params?: Record<string, string>;
}

// Core notification interface
export interface Notification {
  id: string;
  recipientId: string;
  recipientRole: NotificationRecipientRole;

  // Content
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;

  // Timestamps
  createdAt: string;
  read: boolean;
  readAt?: string;

  // Source linking
  sourceType: NotificationSourceType;
  sourceId?: string;
  triggeredBy?: string;

  // Actions
  actions?: NotificationAction[];

  // Grouping
  groupKey?: string;
}

// Category metadata for UI rendering
export interface CategoryMeta {
  label: string;
  color: string;
  bgColor: string;
  iconName: string;
}

export const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  schedule: {
    label: 'Schedule',
    color: 'text-primary-500',
    bgColor: 'bg-primary-100 dark:bg-primary-900/30',
    iconName: 'Calendar'
  },
  attendance: {
    label: 'Attendance',
    color: 'text-success-500',
    bgColor: 'bg-success-100 dark:bg-success-900/30',
    iconName: 'CheckCircle'
  },
  team: {
    label: 'Team',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconName: 'Users'
  },
  billing: {
    label: 'Billing',
    color: 'text-warning-500',
    bgColor: 'bg-warning-100 dark:bg-warning-900/30',
    iconName: 'CreditCard'
  },
  client: {
    label: 'Client',
    color: 'text-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    iconName: 'User'
  },
  system: {
    label: 'System',
    color: 'text-error-500',
    bgColor: 'bg-error-100 dark:bg-error-900/30',
    iconName: 'AlertTriangle'
  }
};

// Format relative time for display
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
