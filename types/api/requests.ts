/**
 * API Request type definitions
 * Represents the structure of incoming API requests
 */

import { LeadStatus, LeadPriority, LeadSource } from '../entities/Lead';
import { TargetPeriod } from '../entities/Target';

// Lead Operations
export interface CreateLeadRequest {
  organization_id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: LeadSource | string;
  status?: LeadStatus;
  priority?: LeadPriority;
  value?: string | number;
  notes?: string;
  tags?: string[];
  assigned_to?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  value?: string | number;
  notes?: string;
  tags?: string[];
  assigned_to?: string;
  next_step?: string;
  follow_up_at?: string;
}

export interface LeadWebhookRequest {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  status?: string;
  priority?: string;
  value?: string | number;
  notes?: string;
  tags?: string[];
}

// Call Operations
export interface RecordCallAttemptRequest {
  disposition: string;
  organizationId: string;
}

// Campaign Operations
export interface CreateCampaignRequest {
  organizationId: string;
  name: string;
  sourceFilter: string;
  description?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  sourceFilter?: string;
  description?: string;
  isActive?: boolean;
}

// Organization Settings
export interface UpdateDistributionSettingsRequest {
  organizationId: string;
  auto_distribute?: boolean;
  distribution_method?: 'round_robin' | 'manual';
}

export interface UpdateOrganizationSettingsRequest {
  organizationId: string;
  settings: Record<string, any>;
}

// Knowledge Base
export interface UpsertKnowledgeRequest {
  organizationId: string;
  domain: string;
  knowledge_type: string;
  title: string;
  content: string;
  id?: string;
}

// Phone Numbers
export interface AddPhoneNumberRequest {
  phoneNumber: string;
  displayName?: string;
  organizationId: string;
  assignedTo?: string;
  campaignId?: string;
}

export interface AssignPhoneNumberRequest {
  assignedTo?: string;
  campaignId?: string;
}

export interface QuarantinePhoneNumberRequest {
  quarantine: boolean;
  reason?: string;
}

// Query Parameters
export interface DashboardQueryParams {
  organizationId?: string;
  userId?: string;
  range?: TargetPeriod;
  limit?: number;
  days?: number;
  hours?: number;
  unread_only?: string;
  completed?: string;
  withInsights?: string;
}

// AI Operations
export interface GenerateQuoteRequest {
  transcript?: string;
  summary?: any;
  leadName?: string;
}
