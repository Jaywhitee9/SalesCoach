/**
 * Target/Goals entity type definitions
 * Represents sales targets and performance goals
 */

export type TargetPeriod = 'day' | 'week' | 'month';

export interface TargetMetric {
  target: number;
  current: number;
  unit?: string;
}

export interface RepTargets {
  id: string;
  userId: string;
  period: TargetPeriod;

  // Activity metrics
  calls: TargetMetric;
  connectedCalls: TargetMetric;
  talkTime: TargetMetric;

  // Outcome metrics
  deals: TargetMetric;
  revenue: TargetMetric;

  // Calculated score
  productivityScore: number;
}

export interface GoalProgress {
  organizationId: string;
  period: TargetPeriod;
  targets: {
    calls: TargetMetric;
    meetings: TargetMetric;
    deals: TargetMetric;
    revenue: TargetMetric;
  };
  updated_at: string;
}
