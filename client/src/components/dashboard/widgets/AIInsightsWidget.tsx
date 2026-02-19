import React from 'react';
import { AIInsightsCard } from '../AIInsightsCard';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const AIInsightsWidget: React.FC<WidgetProps> = () => {
  const { insights, loading } = useDashboardData();
  return <AIInsightsCard insights={insights} loading={loading} />;
};

export default React.memo(AIInsightsWidget);
