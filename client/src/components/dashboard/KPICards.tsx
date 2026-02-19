import React from 'react';
import { Phone, Calendar, CheckCircle2, Award } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  target: number;
  trend?: string;
  subtext?: string;
  color?: string;
}

const getKpiIcon = (label: string) => {
  if (label.includes('איכות')) return <Award className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
  if (label.includes('פגישות')) return <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
  if (label.includes('הושלמו')) return <CheckCircle2 className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
  return <Phone className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
};

const KPICard = React.memo<KPICardProps>(({ label, value, target, trend, subtext, color }) => {
  const percentage = Math.min((parseInt(value) / (target || 100)) * 100, 100);

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-200 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors"></div>

      <div className="flex flex-col h-full justify-between relative z-10">
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
          {getKpiIcon(label)}
        </div>

        <div className="mb-4">
          <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">{value}</span>
        </div>

        <div className="space-y-3">
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">{subtext}</span>
            {trend && (
              <span className="text-[11px] font-bold flex items-center text-brand-600 dark:text-brand-400">
                {trend}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

KPICard.displayName = 'KPICard';

interface KPICardsProps {
  kpis: Array<{
    id: string;
    label: string;
    value: string;
    target: number;
    trend?: string;
    subtext?: string;
    color?: string;
  }>;
}

export const KPICards = React.memo<KPICardsProps>(({ kpis }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
});

KPICards.displayName = 'KPICards';
