// Notification Categories (matches user preference categories)
export type NotificationCategory =
  | 'schedule'
  | 'attendance'
  | 'team'
  | 'billing'
  | 'client'
  | 'system'
  | 'message';

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
  | 'homework_assigned'
  | 'voice_feedback_shared'
  | 'video_shared'
  | 'system_alert'
  | 'reminder'
  | 'message_received';

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
  clientId?: string; // Associated client (child) for parent portal notifications

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
// labelKey stores the i18n key — resolve with t(meta.labelKey) at render time
export interface CategoryMeta {
  labelKey: string;
  color: string;
  bgColor: string;
  iconName: string;
}

export const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  schedule: {
    labelKey: 'notifications.categories.schedule',
    color: 'text-primary-500',
    bgColor: 'bg-primary-100 dark:bg-primary-900/30',
    iconName: 'Calendar'
  },
  attendance: {
    labelKey: 'notifications.categories.attendance',
    color: 'text-success-500',
    bgColor: 'bg-success-100 dark:bg-success-900/30',
    iconName: 'CheckCircle'
  },
  team: {
    labelKey: 'notifications.categories.team',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconName: 'Users'
  },
  billing: {
    labelKey: 'notifications.categories.billing',
    color: 'text-warning-500',
    bgColor: 'bg-warning-100 dark:bg-warning-900/30',
    iconName: 'CreditCard'
  },
  client: {
    labelKey: 'notifications.categories.client',
    color: 'text-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    iconName: 'User'
  },
  system: {
    labelKey: 'notifications.categories.system',
    color: 'text-error-500',
    bgColor: 'bg-error-100 dark:bg-error-900/30',
    iconName: 'AlertTriangle'
  },
  message: {
    labelKey: 'notifications.categories.message',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconName: 'MessageSquare'
  }
};

// Format relative time for display
// Pass the t function from useTranslation() and the current language code
export function formatRelativeTime(dateString: string, t: (key: string, opts?: any) => string, lang: string = 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('parent_portal.activity.just_now');
  if (diffMin < 60) return t('parent_portal.activity.mins_ago', { count: diffMin });
  if (diffHour < 24) return t('parent_portal.activity.hours_ago', { count: diffHour });
  if (diffDay === 1) return t('notifications.yesterday');
  if (diffDay < 7) return t('parent_portal.activity.days_ago', { count: diffDay });

  return date.toLocaleDateString(lang.startsWith('ro') ? 'ro-RO' : 'en-US', { month: 'short', day: 'numeric' });
}
