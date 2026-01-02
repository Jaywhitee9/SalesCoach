
export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
  type: 'rep' | 'manager' | 'super_admin';
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: 'New' | 'Follow Up' | 'Closed' | 'Negotiation' | 'Discovery' | 'Proposal';
  priority: 'Hot' | 'Warm' | 'Cold';
  value: string;
  // New fields for Leads Dashboard
  owner?: User;
  source?: string;
  score?: number;
  lastActivity?: string;
  nextStep?: string;
  tags?: string[];
  createdAt?: string;
}

export interface LeadAtRisk extends Lead {
  riskReason: string; // e.g., "No contact 6h"
  timeSinceActivity: string; // e.g., "6 hours"
}

export interface RepCapacity {
  id: string;
  user: User;
  activeLeads: number;
  newLeadsToday: number;
  status: 'available' | 'moderate' | 'busy';
}

export interface Stage {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface Message {
  id: string;
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  highlight?: boolean; // For keywords like "price"
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

export interface CallMetrics {
  duration: string;
  talkRatio: number; // 0-100 for agent
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

// Dashboard Specific Types
export interface KPIMetric {
  label: string;
  value: string;
  trend: string; // e.g., "+12%"
  trendDirection: 'up' | 'down' | 'neutral';
  subtext?: string;
}

export interface DashboardTask {
  id: string;
  title: string;
  leadName: string;
  dueDate: string;
  completed: boolean;
}

export interface RecentCall {
  id: string;
  leadName: string;
  status: 'Completed' | 'Missed' | 'In Progress' | 'Scheduled';
  outcome: string;
  time: string;
  qualityScore?: number;
  issueTag?: string; // e.g. "Price Objection"
  repName?: string; // For manager view
  repAvatar?: string;
}

export interface DailyTip {
  id: string;
  category: 'Focus' | 'Strength' | 'Improve';
  text: string;
}

// Manager Specific Types
export interface PipelineStage {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  percentage: number; // of total
  conversionRate: number; // to next stage
  color: string;
}

export interface SourceMetric {
  name: string;
  leads: number;
  deals: number;
  conversionRate: number;
  revenue: number;
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

// Targets Types
export interface TargetMetric {
  target: number;
  current: number;
  unit?: string;
}

export interface RepTargets {
  id: string;
  userId: string;
  period: 'day' | 'week' | 'month'; // Base configuration
  
  // Activity
  calls: TargetMetric;
  connectedCalls: TargetMetric;
  talkTime: TargetMetric; // Minutes
  
  // Outcome
  deals: TargetMetric;
  revenue: TargetMetric;
  
  // Calculated
  productivityScore: number;
}

// Chat Types
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

// Settings Types
export interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: string;
  lastCheck: string;
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: any; // Using 'any' for Lucide icon component type convenience
}

// Super Admin Types
export interface Organization {
  id: string;
  name: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'Active' | 'Suspended' | 'Trial';
  logo: string;
  usersCount: number;
  mrr: number; // Monthly Recurring Revenue (Income)
  estCost: number; // Operational Cost (AI/Telephony)
  gmv: number; // Client Success (Value of deals closed by them)
  joinedAt: string;
}
