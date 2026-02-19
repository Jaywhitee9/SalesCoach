/**
 * User/Profile entity type definitions
 * Represents users in the system (reps, managers, admins)
 */

export type UserRole = 'rep' | 'manager' | 'super_admin';
export type CenterType = 'sales' | 'support';

export interface UserPreferences {
  darkMode?: boolean;
  leadNotifications?: boolean;
  language?: string;
  timezone?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
  type: UserRole;
  email?: string;
  organization_id?: string;
  center_type?: CenterType;
  preferences?: UserPreferences;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  organization_id: string;
  role: UserRole;
  avatar_url?: string;
  center_type?: CenterType;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  calls: number;
  meetings: number;
  winRate: number;
  qualityScore: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface RepCapacity {
  id: string;
  user: User;
  activeLeads: number;
  newLeadsToday: number;
  status: 'available' | 'moderate' | 'busy';
}
