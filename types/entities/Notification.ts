/**
 * Notification entity type definitions
 * Represents system notifications for users
 */

export type NotificationType = 'lead_assigned' | 'task_due' | 'call_missed' | 'system' | 'alert';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}
