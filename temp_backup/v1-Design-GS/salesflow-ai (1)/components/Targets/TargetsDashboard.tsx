
import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  ChevronDown, 
  Search, 
  Target, 
  Edit2,
  TrendingUp,
  Filter
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { TargetDrawer } from './TargetDrawer';
import { TEAM_MEMBERS, MOCK_REP_TARGETS } from '../../constants';
import { RepTargets } from '../../types';

interface TargetsDashboardProps {
  isDarkMode: boolean;
}

export const TargetsDashboard: React.FC<TargetsDashboardProps> = ({ isDarkMode }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  // Helper to scale targets for display based on period
  const getScaledTarget = (baseTarget: number, type: 'count' | 'currency' | 'time') => {
    let multiplier = 1;
    if (period === 'week') multiplier = 5;
    if (period === 'month') multiplier = 20;
    
    // For time (minutes) -> convert to HH:MM if needed, but here we just show number
    // For simple demo, we just multiply
    return baseTarget * multiplier;
  };

  const getScaledCurrent = (baseCurrent: number) => {
    // In a real app, current data would be aggregated for the period.
    // Here we simulate accumulated data for week/month
    let multiplier = 1;
    if (period === 'week') multiplier = 3.5; // Simulate mid-week
    if (period === 'month') multiplier = 12; // Simulate mid-month
    return Math.floor(baseCurrent * multiplier);
  };

  const selectedRepTarget = MOCK_REP_TARGETS.find(t => t.userId === selectedRepId) || null;
  const selectedUser = TEAM_MEMBERS.find(u => u.id === selectedRepId);

  // Progress Bar Component
  const ProgressBar = ({ current, target, colorClass = "bg-brand-600" }: { current: number, target: number, colorClass?: string }) => {
    const percentage = Math.min((current / target) * 100, 100);
    return (
      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">
      
      {/* 1. Header */}
      <div className="px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <h1 className="text-2xl font-bold text-slate-900 dark:text-white">יעדים לנציגים</h1>
             <Badge variant="brand" className="text-xs">Manager Only</Badge>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm">הגדרת יעדים יומיים, שבועיים וחודשיים לכל נציג בצוות.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
           
           {/* Period Switcher */}
           <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setPeriod('day')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${period === 'day' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                יום
              </button>
              <button 
                onClick={() => setPeriod('week')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${period === 'week' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                שבוע
              </button>
              <button 
                onClick={() => setPeriod('month')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${period === 'month' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                חודש
              </button>
           </div>

           <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

           {/* Team Dropdown */}
           <div className="relative">
             <Button 
               variant="secondary" 
               className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-w-[140px] justify-between items-center"
               onClick={() => setIsTeamOpen(!isTeamOpen)}
             >
               <div className="flex items-center">
                 <Users className="w-4 h-4 ml-2" />
                 <span className="text-sm">כל הצוותים</span>
               </div>
               <ChevronDown className="w-3.5 h-3.5 mr-2 opacity-50" />
             </Button>
           </div>

           {/* Search */}
           <div className="relative w-64 hidden xl:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="חפש נציג..." 
                className="w-full pr-9 pl-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-500"
              />
           </div>
        </div>
      </div>

      {/* 2. Main Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-right">
               <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                     <th className="px-6 py-4">נציג</th>
                     <th className="px-6 py-4">שיחות</th>
                     <th className="px-6 py-4">שיחות מחוברות</th>
                     <th className="px-6 py-4">זמן שיחה</th>
                     <th className="px-6 py-4">עסקאות</th>
                     <th className="px-6 py-4">מחזור (₪)</th>
                     <th className="px-6 py-4">ציון פריון</th>
                     <th className="px-6 py-4 w-16"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {MOCK_REP_TARGETS.map((target) => {
                     const user = TEAM_MEMBERS.find(u => u.id === target.userId);
                     if (!user) return null;

                     const callsTarget = getScaledTarget(target.calls.target, 'count');
                     const callsCurrent = getScaledCurrent(target.calls.current);
                     
                     const connTarget = getScaledTarget(target.connectedCalls.target, 'count');
                     const connCurrent = getScaledCurrent(target.connectedCalls.current);

                     const dealsTarget = getScaledTarget(target.deals.target, 'count');
                     const dealsCurrent = getScaledCurrent(target.deals.current);

                     const revTarget = getScaledTarget(target.revenue.target, 'currency'); // Rev target is usually monthly based in mock, but lets just scale for UI consistency
                     const revCurrent = getScaledCurrent(target.revenue.current); 

                     return (
                        <tr key={target.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" onClick={() => setSelectedRepId(target.userId)}>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <img src={user.avatar} className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt="" />
                                 <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</p>
                                    <p className="text-xs text-slate-500">{user.role}</p>
                                 </div>
                              </div>
                           </td>
                           
                           {/* Calls */}
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{callsCurrent}</span>
                                    <span className="text-xs text-slate-400">/ {callsTarget}</span>
                                 </div>
                                 <ProgressBar current={callsCurrent} target={callsTarget} />
                              </div>
                           </td>

                           {/* Connected */}
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{connCurrent}</span>
                                    <span className="text-xs text-slate-400">/ {connTarget}</span>
                                 </div>
                                 <ProgressBar current={connCurrent} target={connTarget} colorClass="bg-indigo-500" />
                              </div>
                           </td>

                           {/* Talk Time */}
                           <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                 {target.talkTime.current} דק׳ <span className="text-slate-400 font-normal">/ {target.talkTime.target}</span>
                              </span>
                           </td>

                           {/* Deals */}
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{dealsCurrent}</span>
                                    <span className="text-xs text-slate-400">/ {dealsTarget}</span>
                                 </div>
                                 <ProgressBar current={dealsCurrent} target={dealsTarget} colorClass="bg-emerald-500" />
                              </div>
                           </td>

                           {/* Revenue */}
                           <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                 ₪{(target.revenue.current / 1000).toFixed(0)}k <span className="text-slate-400 font-normal text-xs">/ {(target.revenue.target / 1000).toFixed(0)}k</span>
                              </span>
                           </td>

                           {/* Score */}
                           <td className="px-6 py-4">
                              <Badge variant={target.productivityScore > 90 ? 'success' : target.productivityScore > 75 ? 'warning' : 'danger'}>
                                 {target.productivityScore}%
                              </Badge>
                           </td>

                           <td className="px-6 py-4">
                              <button 
                                 onClick={() => setSelectedRepId(target.userId)}
                                 className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
                              >
                                 <Edit2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* 3. Drawer */}
      <TargetDrawer 
         targetData={selectedRepTarget} 
         user={selectedUser}
         onClose={() => setSelectedRepId(null)}
         onSave={() => setSelectedRepId(null)}
      />

    </div>
  );
};
