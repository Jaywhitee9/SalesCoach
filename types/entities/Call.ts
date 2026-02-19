/**
 * Call entity type definitions
 * Represents phone calls and their metadata
 */

export type CallStatus = 'Completed' | 'Missed' | 'In Progress' | 'Scheduled' | 'completed' | 'in_progress' | 'failed';
export type CallDirection = 'inbound' | 'outbound';
export type CallDisposition = 'no_answer' | 'answered' | 'voicemail' | 'busy' | 'failed';
export type SpeakerType = 'agent' | 'customer';
export type SentimentType = 'positive' | 'neutral' | 'negative' | 'Positive' | 'Neutral' | 'Negative';

export interface Message {
  id: string;
  speaker: SpeakerType;
  text: string;
  timestamp: string;
  sentiment?: SentimentType;
  highlight?: boolean;
  isFinal?: boolean;
}

export interface Transcript {
  agent?: Array<{ text: string; timestamp: string }>;
  customer?: Array<{ text: string; timestamp: string }>;
}

export interface AccumulatedSignals {
  pains?: string[];
  objections?: string[];
  gaps?: string[];
  vision?: string[];
}

export interface CallSummary {
  call_id: string;
  organization_id: string;
  summary_text: string;
  score: number;
  successful: boolean;
  created_at?: string;
}

export interface CallMetrics {
  duration: string;
  talkRatio: number;
  sentiment: SentimentType;
}

export interface Call {
  id: string;
  agent_id?: string;
  lead_id?: string;
  organization_id: string;
  org_id?: string;
  phone_number_id?: string;

  status: CallStatus;
  direction: CallDirection;
  disposition?: CallDisposition;

  duration?: number;
  recording_url?: string;
  transcript?: Transcript | Message[];
  coaching_tips?: string[];
  accumulated_signals?: AccumulatedSignals;
  summary_json?: any;

  answered?: boolean;

  created_at: string;
  updated_at?: string;
}

export interface RecentCall {
  id: string;
  leadName: string;
  status: CallStatus;
  outcome: string;
  time: string;
  qualityScore?: number;
  issueTag?: string;
  repName?: string;
  repAvatar?: string;
}
