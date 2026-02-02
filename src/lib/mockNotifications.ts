import { Notification, NotificationCategory, NotificationType } from '@/types/notifications';

// Feature flag for mock mode - set to false when Cloud Functions are ready
export const USE_MOCK_NOTIFICATIONS = false;

interface MockTemplate {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  sourceType: 'event' | 'client' | 'team' | 'billing' | 'system';
  route?: string;
}

const mockTemplates: MockTemplate[] = [
  {
    type: 'schedule_updated',
    category: 'schedule',
    title: 'Session Rescheduled',
    message: 'Session with Emma Martinez moved from 9:00 AM to 10:30 AM tomorrow',
    sourceType: 'event',
    route: '/calendar'
  },
  {
    type: 'attendance_logged',
    category: 'attendance',
    title: 'Attendance Logged',
    message: 'Dr. Garcia marked 4 clients as present today',
    sourceType: 'event',
    route: '/calendar'
  },
  {
    type: 'client_assigned',
    category: 'client',
    title: 'New Client Assigned',
    message: 'You have been assigned to work with Lucas Chen',
    sourceType: 'client',
    route: '/clients'
  },
  {
    type: 'billing_generated',
    category: 'billing',
    title: 'Invoice Generated',
    message: 'January invoice for Martinez family is ready ($1,240.00)',
    sourceType: 'billing',
    route: '/billing'
  },
  {
    type: 'schedule_cancelled',
    category: 'schedule',
    title: 'Session Cancelled',
    message: "Tomorrow's session with Jake Thompson has been cancelled",
    sourceType: 'event',
    route: '/calendar'
  },
  {
    type: 'team_member_added',
    category: 'team',
    title: 'New Team Member',
    message: 'Dr. Sarah Kim joined as Speech Therapist',
    sourceType: 'team',
    route: '/team'
  },
  {
    type: 'system_alert',
    category: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight at 2:00 AM EST',
    sourceType: 'system'
  },
  {
    type: 'report_ready',
    category: 'client',
    title: 'Progress Report Ready',
    message: 'January progress report for Emma Martinez is ready for review',
    sourceType: 'client',
    route: '/clients'
  }
];

export function generateMockNotifications(userId: string, count: number = 8): Notification[] {
  const now = new Date();
  const notifications: Notification[] = [];

  for (let i = 0; i < count; i++) {
    const template = mockTemplates[i % mockTemplates.length];
    // Stagger times: each notification is 1-6 hours older than the previous
    const hoursAgo = i * (1 + Math.random() * 5);
    const createdAt = new Date(now.getTime() - hoursAgo * 3600000);

    notifications.push({
      id: `mock-${i}-${Date.now()}`,
      recipientId: userId,
      recipientRole: 'admin',
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      createdAt: createdAt.toISOString(),
      read: i > 2, // First 3 are unread
      sourceType: template.sourceType,
      sourceId: `mock-source-${i}`,
      actions: template.route
        ? [
            {
              label: 'View Details',
              type: 'navigate',
              route: template.route
            }
          ]
        : undefined
    });
  }

  return notifications;
}
