export type ActivityType =
  | 'session_created'
  | 'session_updated'
  | 'attendance_updated'
  | 'evaluation_created'
  | 'evaluation_updated'
  | 'client_created'
  | 'client_updated'
  | 'team_member_created'
  | 'team_member_updated';

export type ActivityCategory =
  | 'sessions'
  | 'attendance'
  | 'evaluations'
  | 'clients'
  | 'team';

export interface Activity {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  userId: string; // Who performed the action
  userName: string;
  userPhotoURL?: string;
  targetId: string; // ID of the affected resource (client, session, etc.)
  targetName: string; // Name to display (client name, session title, etc.)
  metadata?: {
    clientId?: string;
    clientName?: string;
    sessionType?: string;
    attendance?: 'present' | 'absent' | 'excused';
    evaluationType?: string;
    [key: string]: any;
  };
  createdAt: string;
}
