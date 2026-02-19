import React from 'react';
import { Users } from 'lucide-react';
import { useDashboardData } from '../DashboardDataContext';
import type { WidgetProps } from './types';

const TeamPerformanceWidget: React.FC<WidgetProps> = () => {
  const { teamMembers } = useDashboardData();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">ביצועי צוות</h3>
        <span className="mr-auto text-xs text-slate-500">{teamMembers.length} נציגים</span>
      </div>
      <div className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
        {teamMembers.slice(0, 8).map((member: any) => (
          <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <img
              src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{member.name}</p>
              <p className="text-[10px] text-slate-500">שיחות: {member.calls || 0}</p>
            </div>
            <span className="text-xs font-bold text-emerald-600">₪{((member.revenue || 0) / 1000).toFixed(0)}k</span>
          </div>
        ))}
        {teamMembers.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">אין נתוני צוות</div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TeamPerformanceWidget);
