/**
 * Central export file for all shared types
 * Import from this file to access any type in the system
 */

// Entity types
export * from './entities/User';
export * from './entities/Lead';
export * from './entities/Call';
export * from './entities/Organization';
export * from './entities/Target';
export * from './entities/Task';
export * from './entities/Notification';

// API types
export * from './api/requests';
export * from './api/responses';
export * from './api/common';

// Database types
export * from './database';

// UI-specific types (keep these in client/types.ts but also export for consistency)
export interface Stage {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface Insight {
  id: string;
  type: 'key_point' | 'objection' | 'next_step';
  title: string;
  description?: string;
  completed?: boolean;
}

export interface CoachSuggestion {
  id: string;
  text: string;
  type: 'tip' | 'warning' | 'info';
}

export interface KPIMetric {
  label: string;
  value: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  subtext?: string;
}

export interface DailyTip {
  id: string;
  category: 'Focus' | 'Strength' | 'Improve';
  text: string;
}

export interface PipelineStage {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  context?: {
    type: 'call' | 'lead';
    id: string;
    label: string;
    subLabel?: string;
  };
}

export interface ChatThread {
  id: string;
  repId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: any;
}
