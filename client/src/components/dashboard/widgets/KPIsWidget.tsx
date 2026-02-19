import React from 'react';
import { Phone, Calendar, Target, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const KPIsWidget: React.FC<WidgetProps> = () => {
  const { kpis, isDarkMode } = useDashboardData();

  const colorClasses: Record<string, { bgLight: string; text: string; border: string }> = {
    purple: {
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-900/50'
    },
    emerald: {
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/50'
    },
    amber: {
      bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/50'
    },
    rose: {
      bgLight: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-100 dark:border-rose-900/50'
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon || TrendingUp;
        const colors = colorClasses[kpi.color] || colorClasses.purple;
        const trendValue = parseFloat(kpi.trend?.replace('%', '').replace('+', '') || '0');
        const hasTrend = trendValue !== 0 && !isNaN(trendValue);

        return (
          <div
            key={index}
            className={`bg-white dark:bg-slate-900 rounded-xl p-5 border ${colors.border} hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{kpi.label}</span>
                {hasTrend && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    kpi.trendDirection === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                    kpi.trendDirection === 'down' ? 'text-rose-600 dark:text-rose-400' :
                    'text-slate-500'
                  }`}>
                    {kpi.trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                    {kpi.trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{Math.abs(trendValue).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 rounded-lg ${colors.bgLight} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{kpi.value}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{kpi.subtext}</div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(KPIsWidget);
