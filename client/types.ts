/**
 * Client-side type definitions for Sales Coach
 * This file re-exports shared types and adds client-specific UI types
 */

// Re-export all shared entity types
export type {
  User,
  UserRole,
  UserPreferences,
  Profile,
  TeamMember,
  RepCapacity,
  CenterType
} from '../types/entities/User';

export type {
  Lead,
  LeadStatus,
  LeadPriority,
  LeadSource,
  LeadScoreDetails,
  LeadAtRisk,
  Deal
} from '../types/entities/Lead';

export type {
  Call,
  CallStatus,
  CallDirection,
  CallDisposition,
  Message,
  Transcript,
  AccumulatedSignals,
  CallSummary,
  CallMetrics,
  RecentCall,
  SpeakerType,
  SentimentType
} from '../types/entities/Call';

export type {
  Organization,
  OrganizationPlan,
  OrganizationStatus,
  OrganizationSettings,
  ApiKey,
  Campaign,
  Knowledge,
  DistributionMethod
} from '../types/entities/Organization';

export type {
  RepTargets,
  TargetMetric,
  TargetPeriod,
  GoalProgress
} from '../types/entities/Target';

export type {
  Task,
  DashboardTask
} from '../types/entities/Task';

export type {
  Notification,
  NotificationType
} from '../types/entities/Notification';

// Re-export API types
export type {
  ApiResponse,
  StatsMetrics,
  StatsResponse,
  PerformanceMetrics,
  PanelStatsResult,
  FunnelStage,
  PipelineFunnelResponse,
  SourceMetric,
  PipelineSourcesResponse,
  TeamMembersResponse,
  ServiceStatus,
  SystemHealthResponse,
  GuardrailIssue,
  GuardrailCheckResponse
} from '../types/api/responses';

export type {
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadWebhookRequest,
  DashboardQueryParams,
  GenerateQuoteRequest
} from '../types/api/requests';

// Client-specific UI types (not used in backend)

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
  trend: string; // e.g., "+12%"
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
  id: string; // usually repId
  repId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: any; // Using 'any' for Lucide icon component type convenience
}
