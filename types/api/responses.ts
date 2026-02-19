/**
 * API Response type definitions
 * Represents the structure of API responses
 */

import { Lead } from '../entities/Lead';
import { Call, RecentCall } from '../entities/Call';
import { User, TeamMember } from '../entities/User';
import { Organization, Campaign, ApiKey, Knowledge } from '../entities/Organization';
import { Task } from '../entities/Task';
import { Notification } from '../entities/Notification';

// Generic response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Lead responses
export interface LeadsResponse extends ApiResponse {
  leads?: Lead[];
}

export interface LeadResponse extends ApiResponse {
  lead?: Lead;
}

export interface LeadSourcesResponse extends ApiResponse {
  sources?: string[];
}

// Call responses
export interface CallsResponse extends ApiResponse {
  calls?: Call[];
}

export interface RecentCallsResponse extends ApiResponse {
  calls?: RecentCall[];
}

export interface CallHistoryResponse extends ApiResponse {
  calls?: Call[];
}

// Stats and Analytics
export interface StatsMetrics {
  calls: {
    answered: number;
    total: number;
  };
  appointments: number;
  newLeads: number;
  avgCallTime: number;
  qualityScore: number;
  timeRange: string;
}

export interface StatsResponse extends ApiResponse {
  stats?: StatsMetrics;
}

export interface PerformanceMetrics {
  totalCalls: number;
  answeredCalls: number;
  connectRate: number;
  avgDuration: number;
  callsPerHour: number;
  uniqueLeads: number;
  attemptsPerLead: number;
  dispositions: Record<string, number>;
}

export interface PerformanceMetricsResponse extends ApiResponse {
  metrics?: PerformanceMetrics;
}

// Dashboard Data
export interface PanelStats {
  totalLeads: number;
  activeLeads: number;
  closedDeals: number;
  revenue: number;
  conversionRate: number;
}

export interface PanelStatsResponse extends ApiResponse {
  stats?: PanelStats;
}

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  percentage: number;
  conversionRate: number;
  color: string;
}

export interface PipelineFunnelResponse extends ApiResponse {
  funnel?: FunnelStage[];
}

export interface SourceMetric {
  name: string;
  leads: number;
  deals: number;
  conversionRate: number;
  revenue: number;
}

export interface PipelineSourcesResponse extends ApiResponse {
  sources?: SourceMetric[];
}

// Organization responses
export interface OrganizationsResponse extends ApiResponse {
  organizations?: Organization[];
}

export interface CampaignsResponse extends ApiResponse {
  campaigns?: Campaign[];
}

export interface CampaignResponse extends ApiResponse {
  campaign?: Campaign;
}

export interface ApiKeysResponse extends ApiResponse {
  keys?: ApiKey[];
}

export interface ApiKeyResponse extends ApiResponse {
  key?: ApiKey & { plain_key?: string };
}

export interface KnowledgeResponse extends ApiResponse {
  knowledge?: Knowledge[];
}

// Team responses
export interface TeamMembersResponse extends ApiResponse {
  teamMembers?: User[];
}

export interface TeamPerformanceResponse extends ApiResponse {
  members?: TeamMember[];
  avgQuality?: number;
  totalCalls?: number;
}

// Settings responses
export interface DistributionSettingsResponse extends ApiResponse {
  settings?: {
    auto_distribute: boolean;
    distribution_method: 'round_robin' | 'manual';
    last_assigned_index: number;
  };
}

export interface NextAssigneeResponse extends ApiResponse {
  autoDistribute: boolean;
  assignee?: {
    id: string;
    name: string;
  };
}

// System Health
export interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: string;
  lastCheck: string;
}

export interface SystemHealthResponse extends ApiResponse {
  health?: ServiceStatus[];
}

// Tasks and Notifications
export interface TasksResponse extends ApiResponse {
  tasks?: Task[];
}

export interface NotificationsResponse extends ApiResponse {
  notifications?: Notification[];
}

export interface NotificationCountResponse extends ApiResponse {
  count?: number;
}

// Follow-ups and Retries
export interface FollowUpsResponse extends ApiResponse {
  followUps?: Lead[];
}

export interface RetryLeadsResponse extends ApiResponse {
  leads?: Lead[];
}

export interface RecordAttemptResponse extends ApiResponse {
  lead?: Lead;
  scheduledRetry?: boolean;
  nextRetryAt?: string;
}

// Guardrails
export interface GuardrailIssue {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface GuardrailCheckResponse extends ApiResponse {
  canCall?: boolean;
  issues?: GuardrailIssue[];
}

// AI Quote
export interface QuoteResponse extends ApiResponse {
  description?: string;
  amount?: number;
  confidence?: 'high' | 'medium' | 'low' | 'fallback';
}

// Debrief
export interface DebriefCompleteResponse extends ApiResponse {
  xp_earned?: number;
  level?: number;
  achievements?: string[];
}

// Analytics
export interface RepAnalytics {
  totalCalls: number;
  avgDuration: number;
  avgQuality: number;
  conversionRate: number;
  topObjections: Array<{ objection: string; count: number }>;
  callsByDay: Array<{ date: string; count: number }>;
}

export interface RepAnalyticsResponse extends ApiResponse {
  analytics?: RepAnalytics;
  insights?: string;
}
