import React from 'react';
import {
  Phone, Activity, Target, Zap, BarChart3, Users,
  AlertTriangle, FileText, TrendingUp, CheckCircle2, Bell
} from 'lucide-react';
import type { WidgetProps } from './types';
import type { LayoutItem, LayoutsByBreakpoint } from '../types';
import { deriveBreakpoints } from '../types';

export interface WidgetDefinition {
  id: string;
  label: string;
  component: React.LazyExoticComponent<React.ComponentType<WidgetProps>> | React.FC<WidgetProps>;
  defaultLayout: Pick<LayoutItem, 'w' | 'h' | 'minW' | 'minH'>;
  icon: React.FC<any>;
}

const KPIsWidget = React.lazy(() => import('./KPIsWidget'));
const AIInsightsWidget = React.lazy(() => import('./AIInsightsWidget'));
const GoalProgressWidget = React.lazy(() => import('./GoalProgressWidget'));
const LiveActivityWidget = React.lazy(() => import('./LiveActivityWidget'));
const PipelineWidget = React.lazy(() => import('./PipelineWidget'));
const TeamPerformanceWidget = React.lazy(() => import('./TeamPerformanceWidget'));
const AttentionQueueWidget = React.lazy(() => import('./AttentionQueueWidget'));
const TopDealsWidget = React.lazy(() => import('./TopDealsWidget'));
const QualityTrendWidget = React.lazy(() => import('./QualityTrendWidget'));
const TasksWidgetGrid = React.lazy(() => import('./TasksWidgetGrid'));
const NotificationsWidgetGrid = React.lazy(() => import('./NotificationsWidgetGrid'));

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  'kpis': {
    id: 'kpis',
    label: 'סטטיסטיקות ראשיות',
    component: KPIsWidget,
    defaultLayout: { w: 12, h: 3, minW: 6, minH: 2 },
    icon: Phone
  },
  'ai-insights': {
    id: 'ai-insights',
    label: 'תובנות AI',
    component: AIInsightsWidget,
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 3 },
    icon: Activity
  },
  'goal-progress': {
    id: 'goal-progress',
    label: 'התקדמות יעדים',
    component: GoalProgressWidget,
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 3 },
    icon: Target
  },
  'live-activity': {
    id: 'live-activity',
    label: 'פעילות חיה',
    component: LiveActivityWidget,
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 3 },
    icon: Zap
  },
  'pipeline': {
    id: 'pipeline',
    label: 'Pipeline הכנסות',
    component: PipelineWidget,
    defaultLayout: { w: 4, h: 4, minW: 3, minH: 3 },
    icon: BarChart3
  },
  'team-performance': {
    id: 'team-performance',
    label: 'ביצועי צוות',
    component: TeamPerformanceWidget,
    defaultLayout: { w: 4, h: 4, minW: 3, minH: 3 },
    icon: Users
  },
  'attention-queue': {
    id: 'attention-queue',
    label: 'דורש תשומת לב',
    component: AttentionQueueWidget,
    defaultLayout: { w: 4, h: 4, minW: 3, minH: 3 },
    icon: AlertTriangle
  },
  'top-deals': {
    id: 'top-deals',
    label: 'עסקאות מובילות',
    component: TopDealsWidget,
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    icon: FileText
  },
  'quality-trend': {
    id: 'quality-trend',
    label: 'איכות שיחות',
    component: QualityTrendWidget,
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    icon: TrendingUp
  },
  'tasks': {
    id: 'tasks',
    label: 'משימות',
    component: TasksWidgetGrid,
    defaultLayout: { w: 4, h: 4, minW: 3, minH: 3 },
    icon: CheckCircle2
  },
  'notifications': {
    id: 'notifications',
    label: 'התראות',
    component: NotificationsWidgetGrid,
    defaultLayout: { w: 4, h: 4, minW: 3, minH: 3 },
    icon: Bell
  }
};

export const DEFAULT_LAYOUT_LG: LayoutItem[] = [
  { i: 'kpis', x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 },
  { i: 'ai-insights', x: 8, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'goal-progress', x: 4, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'live-activity', x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'pipeline', x: 8, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'team-performance', x: 4, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'attention-queue', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'top-deals', x: 6, y: 12, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'quality-trend', x: 0, y: 12, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'tasks', x: 8, y: 16, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'notifications', x: 4, y: 16, w: 4, h: 4, minW: 3, minH: 3 }
];

export const DEFAULT_LAYOUTS: LayoutsByBreakpoint = deriveBreakpoints(DEFAULT_LAYOUT_LG);

export type { WidgetProps } from './types';
