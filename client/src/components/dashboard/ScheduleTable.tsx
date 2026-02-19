import React, { useCallback } from 'react';
import { Phone, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ScheduleCall {
  id: string;
  time: string;
  leadName: string;
  outcome: string;
  status: 'In Progress' | 'Scheduled' | 'Completed';
  originalTask?: any;
}

interface ScheduleTableProps {
  calls: ScheduleCall[];
  timeRange: 'day' | 'week' | 'month';
  centerType?: 'sales' | 'support';
  activityFilter: string;
  activityOptions: string[];
  isActivityOpen: boolean;
  onActivityFilterToggle: () => void;
  onActivityFilterChange: (filter: string) => void;
  onStartCall: () => void;
  onViewDetails: (leadName: string) => void;
}

export const ScheduleTable = React.memo<ScheduleTableProps>(({
  calls,
  timeRange,
  centerType = 'sales',
  activityFilter,
  activityOptions,
  isActivityOpen,
  onActivityFilterToggle,
  onActivityFilterChange,
  onStartCall,
  onViewDetails
}) => {
  const handleViewDetails = useCallback((leadName: string) => {
    onViewDetails(leadName);
  }, [onViewDetails]);

  const timeRangeLabel = timeRange === 'day' ? 'להיום' : timeRange === 'week' ? 'לשבוע הקרוב' : 'לחודש הקרוב';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 flex flex-col min-h-[420px] overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
            הלו"ז {timeRangeLabel}
          </h2>
          <Badge variant="neutral" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            {calls.length} שיחות
          </Badge>
        </div>

        <div className="relative w-full sm:w-auto">
          <button
            onClick={onActivityFilterToggle}
            className="w-full sm:w-40 flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-300 dark:hover:border-brand-700 transition-colors shadow-sm"
          >
            <span className="truncate">{activityFilter}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isActivityOpen ? 'rotate-180' : ''}`} />
          </button>

          {isActivityOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200 text-right">
              {activityOptions.map(option => (
                <button
                  key={option}
                  onClick={() => onActivityFilterChange(option)}
                  className={`w-full text-right px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                    activityFilter === option
                      ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {option}
                  {activityFilter === option && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-right border-collapse">
          <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-3 font-semibold w-24">שעה</th>
              <th className="px-6 py-3 font-semibold">{centerType === 'support' ? 'פנייה / לקוח' : 'ליד'}</th>
              <th className="px-6 py-3 font-semibold">סוג / תוצאה</th>
              <th className="px-6 py-3 font-semibold">סטטוס</th>
              <th className="px-6 py-3 font-semibold w-24">פעולה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {calls.map((call) => (
              <tr key={call.id} className="group hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors">
                <td className="px-6 py-4 align-middle">
                  <span className="font-mono text-sm text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                    {call.time}
                  </span>
                </td>
                <td className="px-6 py-4 align-middle">
                  <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand-700 transition-colors">
                    {call.leadName}
                  </div>
                  <div className="text-xs text-slate-400">מנכ"ל, חברה בע"מ</div>
                </td>
                <td className="px-6 py-4 align-middle">
                  <div className="text-sm text-slate-600 dark:text-slate-300">{call.outcome}</div>
                </td>
                <td className="px-6 py-4 align-middle">
                  {call.status === 'In Progress' ? (
                    <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold text-xs animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                      בשיחה כעת
                    </div>
                  ) : call.status === 'Scheduled' ? (
                    <span className="text-xs font-medium text-slate-500">מתוכנן</span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      הושלם
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 align-middle">
                  {call.status === 'In Progress' ? (
                    <Button size="sm" onClick={onStartCall} className="h-8 px-4 shadow-lg shadow-brand-500/20 text-xs">
                      חזור לשיחה
                    </Button>
                  ) : call.status === 'Scheduled' ? (
                    <button
                      onClick={onStartCall}
                      className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-white dark:hover:bg-slate-800 hover:border-brand-300 hover:text-brand-600 transition-all flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900"
                    >
                      <Phone className="w-3 h-3" /> התחל
                    </button>
                  ) : (
                    <button
                      onClick={() => handleViewDetails(call.leadName)}
                      className="text-xs text-slate-400 hover:text-brand-600 underline decoration-slate-300 hover:decoration-brand-300 transition-all"
                    >
                      פרטים
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

ScheduleTable.displayName = 'ScheduleTable';
