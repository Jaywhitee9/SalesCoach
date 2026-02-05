
import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  Activity, 
  Search, 
  Plus, 
  MoreVertical, 
  ExternalLink,
  ShieldAlert,
  Server,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  Building2,
  Settings,
  LogOut,
  Zap,
  Clock
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { MOCK_ORGANIZATIONS } from '../../constants';
import { Organization } from '../../types';

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
  const [filter, setFilter] = useState('');
  
  const filteredOrgs = MOCK_ORGANIZATIONS.filter(org => 
    org.name.toLowerCase().includes(filter.toLowerCase())
  );

  const totalMRR = MOCK_ORGANIZATIONS.reduce((acc, org) => acc + org.mrr, 0);
  const totalCost = MOCK_ORGANIZATIONS.reduce((acc, org) => acc + org.estCost, 0);
  const totalProfit = totalMRR - totalCost;
  const profitMargin = ((totalProfit / totalMRR) * 100).toFixed(1);

  // Helper for Plan Badge color
  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'Enterprise': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Pro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
      
      {/* 1. Command Center Header */}
      <header className="bg-slate-900 text-white pt-6 pb-20 px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

         <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 backdrop-blur-sm">
                    <ShieldAlert className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">Super Admin Console</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                       <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> System Operational</span>
                       <span>•</span>
                       <span>v3.4.2 (Production)</span>
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  <button className="text-slate-400 hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                  <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
               </div>
            </div>

            {/* Global Financials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* MRR Card */}
               <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl hover:bg-slate-800/80 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <CreditCard className="w-5 h-5" />
                     </div>
                     <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
                     </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Total MRR</p>
                  <p className="text-2xl font-mono font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                    ${(totalMRR / 1000).toFixed(1)}k
                  </p>
               </div>

               {/* Costs Card */}
               <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl hover:bg-slate-800/80 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                        <Server className="w-5 h-5" />
                     </div>
                     <span className="flex items-center text-xs font-bold text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full border border-slate-600">
                        Stable
                     </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Est. OpEx (Cost)</p>
                  <p className="text-2xl font-mono font-bold text-white tracking-tight group-hover:text-rose-300 transition-colors">
                    ${(totalCost / 1000).toFixed(1)}k
                  </p>
               </div>

               {/* Profit Card */}
               <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl hover:bg-slate-800/80 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                     <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                     </div>
                     <span className="text-xs font-bold text-emerald-400">Margin {profitMargin}%</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1 relative z-10">Net Profit</p>
                  <p className="text-2xl font-mono font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors relative z-10">
                    ${(totalProfit / 1000).toFixed(1)}k
                  </p>
               </div>

               {/* Usage Card */}
               <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-xl hover:bg-slate-800/80 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                        <Database className="w-5 h-5" />
                     </div>
                     <span className="flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        High Load
                     </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Client Success (GMV)</p>
                  <p className="text-2xl font-mono font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                    ${(MOCK_ORGANIZATIONS.reduce((acc, o) => acc + o.gmv, 0) / 1000000).toFixed(1)}M
                  </p>
               </div>
            </div>
         </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 -mt-10 max-w-7xl mx-auto w-full px-6 lg:px-8 pb-12 relative z-20">
         
         <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[600px]">
            
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
               <div className="flex items-center gap-4 w-full sm:w-auto">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Organizations
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full">{filteredOrgs.length}</span>
                  </h2>
                  <div className="h-6 w-px bg-slate-200 dark:border-slate-700 hidden sm:block"></div>
                  <div className="relative w-full sm:w-64">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder="Search organizations..." 
                       value={filter}
                       onChange={(e) => setFilter(e.target.value)}
                       className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                  </div>
               </div>
               
               <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button variant="secondary" className="hidden sm:flex">
                     <Filter className="w-4 h-4 mr-2" /> Filter
                  </Button>
                  <Button className="w-full sm:w-auto">
                     <Plus className="w-4 h-4 mr-2" /> New Organization
                  </Button>
               </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                        <th className="px-6 py-4">Organization</th>
                        <th className="px-6 py-4">Financials (MRR / Cost)</th>
                        <th className="px-6 py-4">Usage & Health</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {filteredOrgs.map((org) => {
                        const profit = org.mrr - org.estCost;
                        const isProfitable = profit > 0;
                        const usagePercent = Math.min((org.estCost / (org.mrr || 1)) * 100, 100);

                        return (
                           <tr key={org.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              
                              {/* Org Name & Plan */}
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-4">
                                    <img src={org.logo} alt="" className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" />
                                    <div>
                                       <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{org.name}</p>
                                       <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPlanBadge(org.plan)}`}>
                                             {org.plan}
                                          </span>
                                          <span className="text-xs text-slate-400 flex items-center gap-1">
                                             <Users className="w-3 h-3" /> {org.usersCount} users
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                              </td>

                              {/* Financials */}
                              <td className="px-6 py-4">
                                 <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm font-mono font-medium">
                                       <span className="text-slate-900 dark:text-white">${org.mrr}</span>
                                       <span className="text-slate-400">/mo</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                       <span className="text-rose-500">-${org.estCost} cost</span>
                                       <span className="text-slate-300">|</span>
                                       <span className={`${isProfitable ? 'text-emerald-600' : 'text-rose-600'} font-bold`}>
                                          {isProfitable ? '+' : ''}${profit} net
                                       </span>
                                    </div>
                                 </div>
                              </td>

                              {/* Health Bar */}
                              <td className="px-6 py-4 align-middle">
                                 <div className="w-full max-w-[140px]">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                       <span>Margin Utilization</span>
                                       <span>{usagePercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                       <div 
                                          className={`h-full rounded-full ${usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                          style={{ width: `${usagePercent}%` }}
                                       ></div>
                                    </div>
                                    {org.gmv > 0 && (
                                       <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                          <Activity className="w-3 h-3" />
                                          ${(org.gmv / 1000).toFixed(1)}k GMV
                                       </p>
                                    )}
                                 </div>
                              </td>

                              {/* Status */}
                              <td className="px-6 py-4">
                                 <Badge variant={org.status === 'Active' ? 'success' : org.status === 'Trial' ? 'warning' : 'danger'}>
                                    {org.status}
                                 </Badge>
                                 <p className="text-[10px] text-slate-400 mt-1">
                                    Joined {org.joinedAt}
                                 </p>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Login as Admin">
                                       <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                       <Settings className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                       <MoreVertical className="w-4 h-4" />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
            
            {/* Footer Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
               <p className="text-xs text-slate-500">Showing {filteredOrgs.length} of {MOCK_ORGANIZATIONS.length} organizations</p>
               <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled>Previous</Button>
                  <Button variant="secondary" size="sm" disabled>Next</Button>
               </div>
            </div>

         </div>
      </main>

    </div>
  );
};
