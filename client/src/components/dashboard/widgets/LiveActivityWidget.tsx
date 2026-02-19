import React from 'react';
import { LiveActivityCard } from '../LiveActivityCard';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const LiveActivityWidget: React.FC<WidgetProps> = () => {
  const { liveActivity, loading } = useDashboardData();
  return <LiveActivityCard activities={liveActivity} loading={loading} />;
};

export default React.memo(LiveActivityWidget);
