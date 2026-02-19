
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
import { TEAM_MEMBERS } from '../../constants';
import { RepTargets } from '../../types';
import { supabase } from '../../src/lib/supabaseClient';

interface TargetsDashboardProps {
   isDarkMode: boolean;
   orgId?: string;
}

export const TargetsDashboard: React.FC<TargetsDashboardProps> = ({ isDarkMode, orgId }) => {
   const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
   const [selectedTeam, setSelectedTeam] = useState<string>('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [isTeamOpen, setIsTeamOpen] = useState(false);
   const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

   const [teamMembers, setTeamMembers] = useState<any[]>([]); // Real users
   const [targetsMap, setTargetsMap] = useState<Record<string, Record<string, number>>>({});
   const [progressMap, setProgressMap] = useState<Record<string, { calls: number; connectedCalls: number; talkTime: number; deals: number; revenue: number }>>({});
   const [loading, setLoading] = useState(true);

   // Fetch Targets & Users
   React.useEffect(() => {
      fetchData();
   }, [period, selectedTeam, orgId]);

   const fetchData = async () => {
      if (!orgId) return;

      try {
         setLoading(true);

         // 1. Fetch Team Members
         // 1. Fetch Team Members
         const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role, organization_id')
            .eq('organization_id', orgId);

         if (usersData) {
            setTeamMembers(usersData.map((u: any) => ({
               id: u.id,
               name: u.full_name,
               avatar: u.avatar_url,
               role: u.role,
               organization_id: u.organization_id
            })));
         }

         // 2. Fetch Targets + Progress in parallel
         const { data: { session } } = await supabase.auth.getSession();
         const headers = { 'Authorization': `Bearer ${session?.access_token}` };

         const [targetsResult, progressResponse] = await Promise.all([
            supabase
               .from('user_targets')
               .select('*')
               .eq('period', period),
            fetch(`/api/targets/progress?range=${period}`, { headers })
         ]);

         const { data, error } = targetsResult;
         if (error) throw error;

         // Transform to Map: userId -> { calls: 10, deals: 5 ... }
         const newMap: Record<string, Record<string, number>> = {};
         data?.forEach((row: any) => {
            if (!newMap[row.user_id]) newMap[row.user_id] = {};
            newMap[row.user_id][row.target_type] = row.target_value;
         });
         setTargetsMap(newMap);

         // Parse progress
         const progressData = await progressResponse.json();
         if (progressData.success && progressData.progress) {
            setProgressMap(progressData.progress);
         }
      } catch (err) {
         console.error('Error fetching data:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleSaveTargets = async (formData: any) => {
      if (!selectedRepId) return;

      // Map form data to EAV rows
      const updates = Object.keys(formData).map(key => ({
         user_id: selectedRepId,
         organization_id: teamMembers.find(u => u.id === selectedRepId)?.organization_id || orgId,
         target_type: key,
         target_value: formData[key],
         period: period
      }));

      try {
         // Upsert all
         const { error } = await supabase
            .from('user_targets')
            .upsert(updates, { onConflict: 'user_id, organization_id, target_type, period' });

         if (error) throw error;

         // Refresh
         fetchData();
         setSelectedRepId(null);
      } catch (err) {
         console.error('Error saving targets:', err);
         alert('Error saving targets');
      }
   };

   // Helper to get target for user
   const getUserTarget = (userId: string) => {
      const userTargets = targetsMap[userId];
      const progress = progressMap[userId] || { calls: 0, connectedCalls: 0, talkTime: 0, deals: 0, revenue: 0 };

      const callsTarget = userTargets?.calls || 40;
      const connTarget = userTargets?.connectedCalls || 15;
      const talkTarget = userTargets?.talkTime || 120;
      const dealsTarget = userTargets?.deals || 5;
      const revTarget = userTargets?.revenue || 50000;

      // Weighted productivity score
      const pct = (current: number, target: number) => target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const productivityScore = Math.round(
         pct(progress.calls, callsTarget) * 0.2 +
         pct(progress.connectedCalls, connTarget) * 0.2 +
         pct(progress.deals, dealsTarget) * 0.3 +
         pct(progress.revenue, revTarget) * 0.3
      );

      return {
         userId,
         calls: { target: callsTarget, current: progress.calls },
         connectedCalls: { target: connTarget, current: progress.connectedCalls },
         talkTime: { target: talkTarget, current: progress.talkTime },
         deals: { target: dealsTarget, current: progress.deals },
         revenue: { target: revTarget, current: progress.revenue },
         productivityScore
      } as RepTargets;
   };

   const selectedRepTarget = selectedRepId ? getUserTarget(selectedRepId) : null;
   const selectedUser = teamMembers.find(u => u.id === selectedRepId);

   // Progress Bar Component
   const ProgressBar = ({ current, target, colorClass = "bg-brand-600" }: { current: number, target: number, colorClass?: string }) => {
      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return (
         <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
         </div>
      );
   };

   // Filter Team Members
   const filteredMembers = teamMembers.filter(member => {
      const matchesTeam = selectedTeam === 'all' || member.id === selectedTeam;

      const matchesSearch = searchQuery === '' || member.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTeam && matchesSearch;
   });

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
                        <span className="text-sm">
                           {selectedTeam === 'all' ? 'כל הצוות' : teamMembers.find(m => m.id === selectedTeam)?.name}
                        </span>
                     </div>
                     <ChevronDown className="w-3.5 h-3.5 mr-2 opacity-50" />
                  </Button>

                  {isTeamOpen && (
                     <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsTeamOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                           <button onClick={() => { setSelectedTeam('all'); setIsTeamOpen(false); }} className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">כל הצוות</button>
                           {teamMembers.map(m => (
                              <button key={m.id} onClick={() => { setSelectedTeam(m.id); setIsTeamOpen(false); }} className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{m.name}</button>
                           ))}
                        </div>
                     </>
                  )}
               </div>

               {/* Search */}
               <div className="relative w-64 hidden xl:block">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                     type="text"
                     placeholder="חפש נציג..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
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
                     {filteredMembers.map((user) => {
                        const target = getUserTarget(user.id);

                        // Current values are 0 until we implement fetching actual performance stats per period
                        // For now we just use 0, or we could fetch stats from the API if available.
                        // Ideally we merge `stats` fetching here too.

                        const callsTarget = target.calls.target;
                        const callsCurrent = target.calls.current;

                        const connTarget = target.connectedCalls.target;
                        const connCurrent = target.connectedCalls.current;

                        const dealsTarget = target.deals.target;
                        const dealsCurrent = target.deals.current;

                        const revTarget = target.revenue.target;
                        const revCurrent = target.revenue.current;

                        return (
                           <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors" onClick={() => setSelectedRepId(user.id)}>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <img
                                       src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                                       className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                                       alt=""
                                    />
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
                                    onClick={(e) => { e.stopPropagation(); setSelectedRepId(user.id); }}
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
            onSave={handleSaveTargets}
         />

      </div>
   );
};
