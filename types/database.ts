/**
 * Database schema type definitions
 * Represents the actual database table structures
 */

import { UserRole, CenterType } from './entities/User';
import { LeadStatus, LeadPriority } from './entities/Lead';
import { CallStatus, CallDirection, CallDisposition, Transcript, AccumulatedSignals } from './entities/Call';
import { OrganizationPlan, OrganizationStatus, DistributionMethod } from './entities/Organization';

// Database Tables

export interface DBProfile {
  id: string;
  email: string;
  full_name: string;
  organization_id: string;
  role: UserRole;
  avatar_url?: string;
  center_type?: CenterType;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DBOrganization {
  id: string;
  name: string;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  center_type?: CenterType;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DBLead {
  id: string;
  organization_id: string;
  org_id?: string;
  owner_id?: string;
  assigned_to?: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  priority: LeadPriority;
  value?: number;
  source?: string;
  tags?: string[];
  notes?: string;
  next_step?: string;
  last_activity_at?: string;
  follow_up_at?: string;
  campaign_id?: string;
  attempt_count?: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  call_disposition?: string;
  do_not_call?: boolean;
  do_not_call_at?: string;
  do_not_call_reason?: string;
  do_not_call_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DBCall {
  id: string;
  organization_id: string;
  org_id?: string;
  agent_id?: string;
  lead_id?: string;
  phone_number_id?: string;
  status: CallStatus;
  direction: CallDirection;
  disposition?: CallDisposition;
  duration?: number;
  recording_url?: string;
  transcript?: Transcript;
  coaching_tips?: string[];
  accumulated_signals?: AccumulatedSignals;
  summary_json?: any;
  answered?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DBCallSummary {
  id: string;
  call_id: string;
  organization_id: string;
  summary_text: string;
  score: number;
  successful: boolean;
  created_at: string;
}

export interface DBTask {
  id: string;
  owner_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface DBNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export interface DBCampaign {
  id: string;
  organization_id: string;
  name: string;
  source_filter: string;
  description?: string;
  is_active: boolean;
  max_attempts?: number;
  retry_interval_minutes?: number;
  retry_on_no_answer?: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  max_calls_per_hour_per_number?: number;
  created_at: string;
  updated_at?: string;
}

export interface DBApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  created_by?: string;
  created_at: string;
  last_used_at?: string;
  is_active: boolean;
}

export interface DBOrganizationSettings {
  organization_id: string;
  twilio_phone_number?: string;
  auto_distribute?: boolean;
  distribution_method?: DistributionMethod;
  last_assigned_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DBPhoneNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  display_name?: string;
  assigned_to?: string;
  campaign_id?: string;
  health_score: number;
  failed_streak: number;
  is_quarantined: boolean;
  quarantine_reason?: string;
  quarantined_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface DBKnowledge {
  id: string;
  organization_id: string;
  domain: string;
  knowledge_type: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Supabase specific types
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count?: number | null;
  status: number;
  statusText: string;
}
