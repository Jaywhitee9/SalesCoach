import React, { createContext, useContext } from 'react';

export interface DashboardData {
  kpis: any[];
  funnelData: any[];
  teamMembers: any[];
  attentionQueue: any[];
  topDeals: any[];
  qualityTrend: any[];
  insights: any[];
  goalProgress: any;
  liveActivity: any[];
  loading: boolean;
  orgId?: string;
  isDarkMode: boolean;
  centerType: 'sales' | 'support';
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export const useDashboardData = () => {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider');
  return ctx;
};

export const DashboardDataProvider: React.FC<{ value: DashboardData; children: React.ReactNode }> = ({ value, children }) => {
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
};
