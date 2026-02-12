import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const TopDealsWidget: React.FC<WidgetProps> = () => {
  const { topDeals } = useDashboardData();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">עסקאות מובילות</h3>
      </div>
      <div className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
        {topDeals.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">אין עסקאות פתוחות</div>
        ) : (
          topDeals.map((deal: any, i: number) => (
            <div key={deal.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{deal.name}</p>
                <p className="text-[10px] text-slate-500">{deal.owner} · {deal.stage}</p>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">₪{(deal.value / 1000).toLocaleString()}k</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 transition-colors" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(TopDealsWidget);
