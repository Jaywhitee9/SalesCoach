/**
 * Lead entity type definitions
 * Represents sales leads in the system
 */

import { User } from './User';

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type LeadPriority = 'Hot' | 'Warm' | 'Cold';
export type LeadSource = 'Webhook' | 'Facebook' | 'Landing Page' | 'Google Ads' | 'Manual' | 'Import' | 'API';

export interface LeadScoreDetails {
  fit?: number;
  activity?: number;
  intent?: number;
  reasoning?: string;
  recommendations?: string[];
  generatedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: LeadStatus;
  priority: LeadPriority;
  value: string | number;

  // Ownership and organization
  owner_id?: string;
  assigned_to?: string;
  organization_id?: string;
  org_id?: string;

  // Additional fields
  owner?: User;
  source?: LeadSource | string;
  score?: number;
  scoreDetails?: LeadScoreDetails;
  lastActivity?: string;
  last_activity_at?: string;
  nextStep?: string;
  next_step?: string;
  tags?: string[];
  notes?: string;

  // Campaign and retry logic
  campaign_id?: string;
  attempt_count?: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  call_disposition?: string;

  // Do-Not-Call
  do_not_call?: boolean;
  do_not_call_at?: string;
  do_not_call_reason?: string;
  do_not_call_by?: string;

  // Follow-up
  follow_up_at?: string;

  // Timestamps
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadAtRisk extends Lead {
  riskReason: string;
  timeSinceActivity: string;
}

export interface Deal {
  id: string;
  company: string;
  owner: string;
  ownerAvatar: string;
  stage: string;
  value: string;
  closeDate: string;
}
