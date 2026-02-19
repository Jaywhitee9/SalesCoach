/**
 * Organization entity type definitions
 * Represents organizations/companies using the system
 */

export type OrganizationPlan = 'Free' | 'Pro' | 'Enterprise';
export type OrganizationStatus = 'Active' | 'Suspended' | 'Trial';
export type CenterType = 'sales' | 'support';
export type DistributionMethod = 'round_robin' | 'manual';

export interface Organization {
  id: string;
  name: string;
  plan: OrganizationPlan;
  center_type?: CenterType;
  status: OrganizationStatus;
  logo: string;
  usersCount: number;
  mrr: number;
  estCost: number;
  gmv: number;
  joinedAt: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationSettings {
  organization_id: string;
  twilio_phone_number?: string;
  auto_distribute?: boolean;
  distribution_method?: DistributionMethod;
  last_assigned_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiKey {
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

export interface Campaign {
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

export interface Knowledge {
  id: string;
  organization_id: string;
  domain: string;
  knowledge_type: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}
