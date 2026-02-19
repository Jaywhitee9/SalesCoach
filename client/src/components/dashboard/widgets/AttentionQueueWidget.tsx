import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const AttentionQueueWidget: React.FC<WidgetProps> = () => {
  const { attentionQueue } = useDashboardData();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">דורש תשומת לב</h3>
        <span className="text-[10px] font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
          {attentionQueue.length}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
        {attentionQueue.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">אין התראות</div>
        ) : (
          attentionQueue.map((call: any) => (
            <div key={call.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${call.id}`} alt="" className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{call.name || '(ליד נמחק)'}</p>
                <p className="text-[10px] text-rose-600">לא נוצר קשר {call.hours_since}h</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(AttentionQueueWidget);
