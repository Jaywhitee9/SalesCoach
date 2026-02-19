import React from 'react';
import { GoalProgressCard } from '../GoalProgressCard';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const GoalProgressWidget: React.FC<WidgetProps> = () => {
  const { goalProgress, loading } = useDashboardData();
  if (!goalProgress) return null;
  return <GoalProgressCard teamProgress={goalProgress} loading={loading} />;
};

export default React.memo(GoalProgressWidget);
