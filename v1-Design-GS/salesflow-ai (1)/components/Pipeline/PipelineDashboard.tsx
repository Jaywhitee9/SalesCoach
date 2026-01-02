
import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Calendar, 
  ChevronDown, 
  Users, 
  TrendingUp, 
  AlertOctagon,
  ArrowLeft,
  Search,
  LayoutList,
  Play,
  Phone,
  Target,
  Clock,
  CheckCircle2,
  Flame,
  ArrowLeftCircle,
  MoreHorizontal,
  UserPlus,
  Archive,
  BarChart3,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { LeadDrawer } from '../Leads/LeadDrawer';
import { LeadsTable } from '../Leads/LeadsTable';
import { 
  PIPELINE_FUNNEL, 
  PIPELINE_SOURCES, 
  AT_RISK_LEADS, 
  MOCK_LEADS, 
  REP_DAILY_GOALS, 
  REP_LEAD_QUEUE, 
  REP_FUNNEL_DATA, 
  REP_HOT_LEADS,
  REP_AT_RISK_LEADS,
  PIPELINE_MANAGER_KPIS,
  UNASSIGNED_LEADS,
  REP_CAPACITY_STATS,
  TEAM_MEMBERS
} from '../../constants';
import { Lead, User } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineDashboardProps {
  isDarkMode: boolean;
  currentUser?: User;
}

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({ isDarkMode, currentUser }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Manager Filters
  const [dateRange, setDateRange] = useState('היום');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [sourceMetric, setSourceMetric] = useState<'leads' | 'revenue'>('leads');

  // Rep Filters
  const [repGoalPeriod, setRepGoalPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const userType = currentUser?.type || 'manager';

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleToggleSelectAll = () => {
    if (selectedIds.length === MOCK_LEADS.length) setSelectedIds([]);
    else setSelectedIds(MOCK_LEADS.map(l => l.id));
  };

  const barColors = isDarkMode ? '#818cf8' : '#6366f1';

  // --- SALES REP VIEW ---
  if (userType === 'rep') {
    // Calculate Goals based on period
    const currentGoals = REP_DAILY_GOALS.map(goal => {
      let multiplier = 1;
      if (repGoalPeriod === 'week') multiplier = 5;
      if (repGoalPeriod === 'month') multiplier = 20;

      // Adjust label for context
      const label = goal.label.replace('היום', repGoalPeriod === 'day' ? 'היום' : repGoalPeriod === 'week' ? 'השבוע' : 'החודש');

      return {
        ...goal,
        label,
        current: Math.floor(goal.current * multiplier),
        target: Math.floor(goal.target * multiplier),
      };
    });

    const periodLabel = repGoalPeriod === 'day' ? 'יום' : repGoalPeriod === 'week' ? 'שבוע' : 'חודש';

    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 font-sans relative">
        
        {/* 1. Header & Daily Goals */}
        <div className="mb-8">
           <div className="flex items-center justify-between mb-6">
             <div>
               <h1 className="text-2xl font-bold text-slate-900 dark:text-white">היעדים שלי 🎯</h1>
               <p className="text-sm text-slate-500 dark:text-slate-400">תצוגה לפי {periodLabel}</p>
             </div>
             
             {/* Segmented Control */}
             <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setRepGoalPeriod('day')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${repGoalPeriod === 'day' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  יום
                </button>
                <button 
                  onClick={() => setRepGoalPeriod('week')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${repGoalPeriod === 'week' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  שבוע
                </button>
                <button 
                  onClick={() => setRepGoalPeriod('month')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${repGoalPeriod === 'month' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  חודש
                </button>
             </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {currentGoals.map((goal) => (
               <div key={goal.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{goal.label}</p>
                 <div className="flex items-end justify-between">
                   <div className="flex items-baseline gap-1">
                     <span className="text-2xl font-bold text-slate-900 dark:text-white">{goal.current}</span>
                     <span className="text-sm text-slate-400 font-medium">/ {goal.target}</span>
                   </div>
                   <Badge variant={goal.status === 'success' ? 'success' : 'warning'} className="text-[10px]">
                     {Math.round((goal.current / goal.target) * 100)}%
                   </Badge>
                 </div>
                 {/* Mini Progress Bar */}
                 <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                   <div 
                     className={`h-full rounded-full ${goal.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                     style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                   ></div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* 2. Main Work Zone */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
          
          {/* Right Panel: Lead Queue (8 cols) - RTL: Visual Right */}
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col min-h-[500px]">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-l from-transparent to-brand-50/30 dark:to-brand-900/10">
               <div>
                 <h2 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                   תור הלידים שלי
                   <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 text-xs">{REP_LEAD_QUEUE.length}</span>
                 </h2>
                 <p className="text-xs text-slate-500 mt-0.5">ממוין לפי עדיפות וזמן המתנה</p>
               </div>
               <Button className="shadow-lg shadow-brand-500/25 px-6 animate-pulse hover:animate-none">
                 <Play className="w-4 h-4 ml-2 fill-current" />
                 התחל שיחה הבאה
               </Button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">שם ליד</th>
                    <th className="px-6 py-4">סטטוס</th>
                    <th className="px-6 py-4">פעילות אחרונה</th>
                    <th className="px-6 py-4">הצעד הבא</th>
                    <th className="px-6 py-4">פעולה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {REP_LEAD_QUEUE.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{lead.name}</p>
                          <p className="text-xs text-slate-500">{lead.company}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={lead.priority === 'Hot' ? 'danger' : lead.status === 'New' ? 'success' : 'neutral'}>
                          {lead.priority === 'Hot' ? 'חם 🔥' : lead.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
                          {lead.lastActivity}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs font-medium text-slate-700 dark:text-slate-300">
                          <ArrowLeftCircle className="w-3.5 h-3.5 ml-1.5 text-brand-500" />
                          {lead.nextStep}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="w-full border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 hover:border-brand-300 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                          }}
                        >
                          <Phone className="w-3.5 h-3.5 ml-1.5" />
                          התקשר
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Left Panel: Hot & At Risk (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            {/* Hot Leads Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 flex-1">
               <div className="flex items-center gap-2 mb-4">
                 <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                   <Flame className="w-4 h-4 fill-current" />
                 </div>
                 <h3 className="font-bold text-slate-900 dark:text-white">לידים חמים שלי</h3>
               </div>
               
               <div className="space-y-3">
                 {REP_HOT_LEADS.map(lead => (
                   <div 
                     key={lead.id} 
                     onClick={() => setSelectedLead(lead)}
                     className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-orange-200 dark:hover:border-orange-900/50 cursor-pointer transition-colors"
                   >
                     <div>
                       <p className="text-sm font-bold text-slate-900 dark:text-white">{lead.name}</p>
                       <div className="flex items-center gap-2 mt-0.5">
                         <Badge variant="warning" className="text-[10px] px-1.5 py-0">{lead.score} נק׳</Badge>
                         <span className="text-xs text-slate-500">{lead.company}</span>
                       </div>
                     </div>
                     <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90" />
                   </div>
                 ))}
               </div>
            </div>

            {/* At Risk Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 flex-1">
               <div className="flex items-center gap-2 mb-4">
                 <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                   <AlertOctagon className="w-4 h-4" />
                 </div>
                 <h3 className="font-bold text-slate-900 dark:text-white">לידים בסיכון שלי</h3>
               </div>
               
               <div className="space-y-3">
                 {REP_AT_RISK_LEADS.map(lead => (
                   <div 
                     key={lead.id} 
                     onClick={() => setSelectedLead(lead)}
                     className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-rose-200 dark:hover:border-rose-900/50 cursor-pointer transition-colors"
                   >
                     <div>
                       <p className="text-sm font-bold text-slate-900 dark:text-white">{lead.name}</p>
                       <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">{lead.riskReason}</p>
                     </div>
                     <span className="text-xs text-slate-400 font-mono">{lead.timeSinceActivity}</span>
                   </div>
                 ))}
               </div>
            </div>

          </div>

        </div>

        {/* 3. Bottom: Personal Performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">הביצועים שלי היום</h3>
              <p className="text-xs text-slate-500">התקדמות במשפך המכירות האישי</p>
            </div>
            
            {/* Metrics Row */}
            <div className="flex items-center gap-8">
               <div className="text-center">
                 <span className="block text-2xl font-bold text-slate-900 dark:text-white">14</span>
                 <span className="text-xs text-slate-500">שיחות שבוצעו</span>
               </div>
               <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
               <div className="text-center">
                 <span className="block text-2xl font-bold text-slate-900 dark:text-white">18%</span>
                 <span className="text-xs text-slate-500">אחוז המרה</span>
               </div>
               <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
               <div className="text-center">
                 <div className="flex items-center justify-center gap-1">
                   <span className="block text-2xl font-bold text-slate-900 dark:text-white">92</span>
                   <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded">+2</span>
                 </div>
                 <span className="text-xs text-slate-500">ציון איכות</span>
               </div>
            </div>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={REP_FUNNEL_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      direction: 'rtl'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {REP_FUNNEL_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Drawer */}
        <LeadDrawer 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
        />
      </div>
    );
  }

  // --- MANAGER VIEW ---
  
  // Sort and Prepare Sources Data based on metric
  const sortedSources = [...PIPELINE_SOURCES].sort((a, b) => b[sourceMetric] - a[sourceMetric]);
  const totalValue = sortedSources.reduce((acc, curr) => acc + curr[sourceMetric], 0);
  const maxValue = sortedSources[0][sourceMetric];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 font-sans relative">
      
      {/* 1. Top Bar: Title & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">לידים & פאנל</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className="text-sm text-slate-500 dark:text-slate-400">סקירת משפך המכירות וניהול לידים</span>
             <Badge variant="success" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
               בקצב של 112% מהיעד 🚀
             </Badge>
           </div>
        </div>
        
        {/* Filters Group */}
        <div className="flex items-center gap-3 relative z-20">
           
           {/* Team Dropdown */}
           <div className="relative">
             <Button 
               variant="secondary" 
               className="hidden sm:flex bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-w-[140px] justify-between items-center"
               onClick={() => { setIsTeamOpen(!isTeamOpen); setIsTimeOpen(false); }}
             >
               <div className="flex items-center">
                 <Users className="w-4 h-4 ml-2" />
                 <span className="truncate max-w-[100px] text-sm">
                    {selectedTeam === 'all' ? 'כל הצוות' : TEAM_MEMBERS.find(m => m.id === selectedTeam)?.name}
                 </span>
               </div>
               <ChevronDown className={`w-3.5 h-3.5 mr-2 opacity-50 transition-transform duration-200 ${isTeamOpen ? 'rotate-180' : ''}`} />
             </Button>
             
             {isTeamOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setIsTeamOpen(false)}></div>
                 <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <button 
                        onClick={() => { setSelectedTeam('all'); setIsTeamOpen(false); }}
                        className={`w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${selectedTeam === 'all' ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                        <span className="font-medium">כל הצוות</span>
                        {selectedTeam === 'all' && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {TEAM_MEMBERS.map(member => (
                          <button 
                              key={member.id}
                              onClick={() => { setSelectedTeam(member.id); setIsTeamOpen(false); }}
                              className={`w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group ${selectedTeam === member.id ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}
                          >
                              <div className="flex items-center gap-3">
                                  <img src={member.avatar} className="w-6 h-6 rounded-full border border-slate-100 dark:border-slate-700 object-cover" alt="" />
                                  <span className="truncate">{member.name}</span>
                              </div>
                              {selectedTeam === member.id && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                      ))}
                    </div>
                 </div>
               </>
             )}
           </div>

           {/* Time Dropdown */}
           <div className="relative">
             <Button 
               variant="secondary" 
               className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-w-[140px] justify-between items-center"
               onClick={() => { setIsTimeOpen(!isTimeOpen); setIsTeamOpen(false); }}
             >
               <div className="flex items-center">
                 <Calendar className="w-4 h-4 ml-2" />
                 <span className="text-sm">{dateRange}</span>
               </div>
               <ChevronDown className={`w-3.5 h-3.5 mr-2 opacity-50 transition-transform duration-200 ${isTimeOpen ? 'rotate-180' : ''}`} />
             </Button>

             {isTimeOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setIsTimeOpen(false)}></div>
                 <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                    {['היום', 'אתמול', '7 ימים אחרונים', '30 ימים אחרונים', 'חודש נוכחי', 'טווח מותאם…'].map(range => (
                        <button 
                            key={range}
                            onClick={() => { setDateRange(range); setIsTimeOpen(false); }}
                            className={`w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${dateRange === range ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/10 font-medium' : 'text-slate-700 dark:text-slate-200'}`}
                        >
                            <span>{range}</span>
                            {dateRange === range && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                    ))}
                 </div>
               </>
             )}
           </div>

        </div>
      </div>

      {/* 2. Hero KPI Strip (Team Level) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PIPELINE_MANAGER_KPIS.map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{kpi.label}</p>
             <div className="flex items-end justify-between">
               <span className="text-3xl font-bold text-slate-900 dark:text-white">{kpi.value}</span>
               <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
                 kpi.positive 
                   ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' 
                   : 'text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400'
               }`}>
                 {kpi.positive ? <ArrowUpRight className="w-3 h-3 ml-1"/> : <ArrowDownRight className="w-3 h-3 ml-1"/>}
                 {kpi.change}
               </span>
             </div>
          </div>
        ))}
      </div>

      {/* 3. Middle Area: Visual Pipeline & Sources */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        {/* Right Card: Funnel (Visual Right) */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">משפך המכירות</h2>
              <p className="text-xs text-slate-500 mt-1">מבוסס על לידים ב-30 הימים האחרונים</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8">צפה בדוח המרה</Button>
          </div>
          
          <div className="flex flex-col gap-6 flex-1 justify-center px-4">
            {PIPELINE_FUNNEL.map((stage, index) => {
              // Calculate conversion from previous stage
              const prevCount = index > 0 ? PIPELINE_FUNNEL[index - 1].count : stage.count;
              const conversionRate = index > 0 ? Math.round((stage.count / prevCount) * 100) : null;

              return (
                <div key={stage.id} className="group flex items-center gap-4">
                  {/* Label - Right Aligned */}
                  <div className="w-24 sm:w-32 flex-shrink-0 text-right font-medium text-sm text-slate-700 dark:text-slate-300">
                    {stage.label}
                  </div>
                  
                  {/* Bar Track - Middle */}
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute top-0 bottom-0 right-0 rounded-l-full transition-all duration-1000 ease-out group-hover:brightness-95"
                      style={{ 
                        width: `${stage.percentage}%`, 
                        backgroundColor: stage.color, // Using constant colors which are purples
                        opacity: isDarkMode ? 0.9 : 1
                      }}
                    >
                    </div>
                  </div>
                  
                  {/* Stats - Left Aligned (Visual Left) */}
                  <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-end gap-2 text-left">
                     <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">{stage.count}</span>
                     {conversionRate !== null && (
                       <span className="text-xs text-slate-400 font-normal tabular-nums">
                         {conversionRate}%
                       </span>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Card: Sources (Visual Left) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          
          {/* Header & Switcher */}
          <div className="px-6 py-5 border-b border-transparent flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-base">פילוח מקורות</h2>
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-xs font-medium">
               <button 
                 onClick={() => setSourceMetric('leads')}
                 className={`px-3 py-1.5 rounded-md transition-all ${sourceMetric === 'leads' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
               >
                 לידים
               </button>
               <button 
                 onClick={() => setSourceMetric('revenue')}
                 className={`px-3 py-1.5 rounded-md transition-all ${sourceMetric === 'revenue' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
               >
                 הכנסות
               </button>
            </div>
          </div>

          {/* Custom Chart List */}
          <div className="px-6 pb-2 flex flex-col gap-4 flex-1">
             {sortedSources.map((source, i) => {
               const value = source[sourceMetric];
               const percentage = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
               const widthPercentage = maxValue > 0 ? Math.max((value / maxValue) * 100, 5) : 0; // Ensure at least a little bit shows
               
               return (
                 <div key={i} className="flex items-center gap-4 group">
                    {/* Label (Right) */}
                    <span className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 text-right truncate" title={source.name}>
                      {source.name}
                    </span>
                    
                    {/* Bar (Middle) */}
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex justify-end">
                       <div 
                         className="h-full rounded-full transition-all duration-700 ease-out bg-brand-500 dark:bg-brand-400"
                         style={{ width: `${widthPercentage}%`, opacity: isDarkMode ? 0.9 : 1 }}
                       />
                    </div>

                    {/* Value (Left) */}
                    <div className="w-24 text-left flex items-center justify-end gap-2 text-sm">
                       <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                         {sourceMetric === 'revenue' ? `₪${(value/1000).toFixed(0)}k` : value}
                       </span>
                       <span className="text-xs text-slate-400 font-normal tabular-nums">
                         {percentage}%
                       </span>
                    </div>
                 </div>
               )
             })}
          </div>

          {/* Secondary Table */}
          <div className="mt-4 border-t border-slate-100 dark:border-slate-800">
             <table className="w-full text-right text-xs">
               <thead className="text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                 <tr>
                   <th className="px-6 py-3 font-medium text-right">מקור</th>
                   <th className="px-6 py-3 font-medium text-center">לידים</th>
                   <th className="px-6 py-3 font-medium text-center">הכנסות</th>
                   <th className="px-6 py-3 font-medium text-left">המרה</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-500 dark:text-slate-400">
                 {sortedSources.map((source, i) => (
                   <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                     <td className="px-6 py-2.5 font-medium text-right truncate max-w-[120px]">{source.name}</td>
                     <td className="px-6 py-2.5 text-center">{source.leads}</td>
                     <td className="px-6 py-2.5 text-center">₪{(source.revenue/1000).toFixed(0)}k</td>
                     <td className="px-6 py-2.5 text-left text-emerald-600 dark:text-emerald-400 font-medium">{source.conversionRate}%</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* 4. Bottom Area: Management Zone (Risk, Capacity, Unassigned) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Right Card: Leads at Risk (Visual Right) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
           <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <AlertOctagon className="w-4 h-4 text-rose-500" />
               <h2 className="font-bold text-slate-900 dark:text-white text-base">לידים בסיכון</h2>
             </div>
             <Badge variant="danger" className="px-2">3 לטיפול</Badge>
           </div>
           
           <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[400px]">
             {AT_RISK_LEADS.map(lead => (
               <div 
                 key={lead.id} 
                 onClick={() => setSelectedLead(lead)}
                 className="p-4 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors cursor-pointer group"
               >
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{lead.name}</h3>
                     <div className="flex items-center gap-1.5 mt-0.5">
                       {lead.owner?.avatar && <img src={lead.owner.avatar} className="w-4 h-4 rounded-full" />}
                       <p className="text-xs text-slate-500 dark:text-slate-400">{lead.owner?.name}</p>
                     </div>
                   </div>
                   <Badge variant="warning" className="text-[10px]">{lead.timeSinceActivity}</Badge>
                 </div>
                 
                 <div className="flex items-center justify-between mt-3">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">{lead.riskReason}</span>
                   </div>
                   <ArrowLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                 </div>
               </div>
             ))}
           </div>
           <button className="p-3 text-xs text-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
             כל הלידים בסיכון
           </button>
        </div>

        {/* Middle Card: Rep Capacity (Visual Middle) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
           <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Users className="w-4 h-4 text-brand-500" />
               <h2 className="font-bold text-slate-900 dark:text-white text-base">חלוקת לידים</h2>
             </div>
             <Badge variant="neutral" className="px-2">צוות פעיל</Badge>
           </div>
           
           <div className="p-4 grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[400px]">
              {REP_CAPACITY_STATS.map(rep => (
                <div key={rep.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <img src={rep.user.avatar} className="w-8 h-8 rounded-full border border-white dark:border-slate-700" alt={rep.user.name} />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{rep.user.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          rep.status === 'available' ? 'bg-emerald-500' :
                          rep.status === 'moderate' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {rep.status === 'available' ? 'פנוי' :
                           rep.status === 'moderate' ? 'עמוס חלקית' : 'עמוס'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div className="bg-white dark:bg-slate-900 rounded p-1.5 text-center">
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">{rep.activeLeads}</span>
                      <span className="text-[10px] text-slate-400">פעילים</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded p-1.5 text-center">
                      <span className="block text-xs font-bold text-brand-600 dark:text-brand-400">+{rep.newLeadsToday}</span>
                      <span className="text-[10px] text-slate-400">היום</span>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Left Card: Unassigned Leads (Visual Left) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
           <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Target className="w-4 h-4 text-amber-500" />
               <h2 className="font-bold text-slate-900 dark:text-white text-base">לידים לא מוקצים</h2>
             </div>
             <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
               {UNASSIGNED_LEADS.length}
             </span>
           </div>
           
           {/* Bulk Actions Bar (Mock) */}
           <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex gap-2">
             <Button variant="secondary" size="sm" className="text-xs h-7 px-2">
               <UserPlus className="w-3.5 h-3.5 ml-1.5" />
               הקצה לנציג
             </Button>
             <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-500">
               <Archive className="w-3.5 h-3.5 ml-1.5" />
               ארכיון
             </Button>
           </div>

           <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[400px]">
             {UNASSIGNED_LEADS.map(lead => (
               <div key={lead.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center gap-3 group">
                 <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer mt-0.5" />
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                     <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{lead.name}</h3>
                     <span className={`text-[10px] font-bold px-1.5 rounded ${
                       (lead.score || 0) > 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                     }`}>
                       {lead.score}
                     </span>
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-1.5 rounded">
                       {lead.source}
                     </span>
                     <span className="text-[10px] text-slate-400 flex items-center">
                       <Clock className="w-3 h-3 ml-1" />
                       {lead.createdAt}
                     </span>
                   </div>
                 </div>
                 <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-all">
                   <MoreHorizontal className="w-4 h-4 text-slate-400" />
                 </button>
               </div>
             ))}
           </div>
        </div>

      </div>

      {/* 5. Lead Details Drawer */}
      <LeadDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
      />

    </div>
  );
};
