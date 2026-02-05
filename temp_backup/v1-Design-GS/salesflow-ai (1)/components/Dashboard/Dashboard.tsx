
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Play, 
  Phone, 
  Calendar, 
  CheckCircle2,
  Clock, 
  TrendingUp, 
  Award, 
  Radio, 
  Target, 
  FileText, 
  Lightbulb, 
  ChevronDown, 
  BarChart3, 
  Eye, 
  MoreHorizontal, 
  Check 
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { DASHBOARD_KPIS, TODAYS_CALLS, DASHBOARD_TASKS, COACHING_TIPS, MOCK_LEADS, CURRENT_LEAD } from '../../constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LeadDrawer } from '../Leads/LeadDrawer';
import { Lead } from '../../types';

interface DashboardProps {
  onStartCall: () => void;
  isDarkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartCall, isDarkMode }) => {
  // Filters State
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [activityFilter, setActivityFilter] = useState('שיחות טלפון');
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Ref for dropdown click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsActivityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handlers
  const handleTimeRangeChange = (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
    // TODO: use timeRange to refetch dashboard stats from backend
  };

  const handleFilterChange = (filter: string) => {
    setActivityFilter(filter);
    setIsActivityOpen(false);
    // TODO: fetch dashboard data based on activityFilter
  };

  const handleViewDetails = (leadName: string) => {
    const foundLead = MOCK_LEADS.find(l => l.name === leadName);
    if (foundLead) {
      setSelectedLead(foundLead);
    } else {
      // Fallback mock if lead not found in main list
      setSelectedLead({
        ...CURRENT_LEAD,
        id: `temp-${Date.now()}`,
        name: leadName,
        company: 'לקוח מזדמן',
        status: 'New'
      });
    }
  };

  // Weekly Performance Data (Mock filterable)
  const performanceData = [
    { day: 'א', calls: 12 },
    { day: 'ב', calls: 15 },
    { day: 'ג', calls: 8 }, // Today
    { day: 'ד', calls: 0 },
    { day: 'ה', calls: 0 },
  ];
  
  const barColors = isDarkMode ? '#6366f1' : '#4f46e5';

  const getProgress = (value: string) => {
    const val = parseInt(value) || 0;
    const goal = 10; 
    return Math.min((val / goal) * 100, 100);
  };

  const activityOptions = [
    'כל הפעילויות',
    'שיחות טלפון',
    'פגישות',
    'משימות'
  ];

  // Helper to assign icons based on content since we are reordering
  const getKpiIcon = (label: string) => {
    if (label.includes('איכות')) return <Award className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    if (label.includes('פגישות')) return <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    if (label.includes('הושלמו')) return <CheckCircle2 className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
    return <Phone className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
  };

  // Reorder KPIs: Right to Left -> Quality, Appointments, Completed, Planned
  // Original DASHBOARD_KPIS order: Planned, Completed, Appointments, Quality
  const orderedKPIs = [...DASHBOARD_KPIS].reverse();

  // Mock filtering for display
  const filteredCalls = activityFilter === 'כל הפעילויות' || activityFilter === 'שיחות טלפון' 
    ? TODAYS_CALLS 
    : TODAYS_CALLS.slice(0, 2); 

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-transparent" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-slide-up">
        
        {/* Right Side: Title & Greeting */}
        <div className="text-right">
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
             בוקר טוב, שרה ☀️
           </h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">מוכנה לכבוש את היעדים של היום?</p>
        </div>

        {/* Left Side: Actions & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-20">
           
           {/* 1. Time Range Toggle */}
           <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
              {[
                { id: 'day', label: 'היום' },
                { id: 'week', label: 'שבוע' },
                { id: 'month', label: 'חודש' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => handleTimeRangeChange(range.id as any)}
                  className={`
                    flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all
                    ${timeRange === range.id 
                      ? 'bg-brand-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                  `}
                >
                  {range.label}
                </button>
              ))}
           </div>

           {/* 2. Activity Dropdown */}
           <div className="relative w-full sm:w-auto" ref={dropdownRef}>
             <button 
               onClick={() => setIsActivityOpen(!isActivityOpen)}
               className="w-full sm:w-40 flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-brand-300 dark:hover:border-brand-700 transition-colors shadow-sm"
             >
               <span className="truncate">{activityFilter}</span>
               <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isActivityOpen ? 'rotate-180' : ''}`} />
             </button>

             {isActivityOpen && (
               <div className="absolute top-full right-0 mt-2 w-full sm:w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                  {activityOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => handleFilterChange(option)}
                      className={`
                        w-full text-right px-4 py-2 text-sm flex items-center justify-between transition-colors
                        ${activityFilter === option 
                          ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400 font-medium' 
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}
                      `}
                    >
                      {option}
                      {activityFilter === option && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
               </div>
             )}
           </div>

           <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

           {/* 3. CTA Button (Primary Action on Left) */}
           <Button 
             onClick={onStartCall} 
             className="w-full sm:w-auto shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all py-2.5 px-5"
           >
             <Phone className="w-4 h-4 ml-2" />
             התחל שיחה עכשיו
           </Button>

        </div>
      </div>

      {/* 1. KPI Cards - Ordered Right to Left */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {orderedKPIs.map((kpi, index) => (
          <div key={index} className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-200 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
            {/* Subtle Gradient Blob on Hover */}
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors"></div>
            
            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="flex justify-between items-start mb-3">
                 <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.label}</span>
                 {getKpiIcon(kpi.label)}
              </div>
              
              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">{kpi.value}</span>
              </div>

              <div className="space-y-3">
                 <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${getProgress(kpi.value)}%` }}></div>
                 </div>
                 
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">{kpi.subtext}</span>
                    {kpi.trendDirection !== 'neutral' && (
                      <span className={`text-[11px] font-bold flex items-center ${
                         kpi.trendDirection === 'up' 
                           ? 'text-emerald-600 dark:text-emerald-400' 
                           : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {kpi.trendDirection === 'up' ? <ArrowUpRight className="w-3 h-3 ml-0.5" /> : <ArrowDownRight className="w-3 h-3 ml-0.5" />}
                        {kpi.trend}
                      </span>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Middle Section: Calls & Coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-10">
        
        {/* Left: Today's Schedule (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-slate-100 dark:border-slate-800 flex flex-col min-h-[420px] overflow-hidden">
           <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
             <div className="flex items-center gap-3">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                  הלו"ז להיום
                </h2>
                <Badge variant="neutral" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">{filteredCalls.length} שיחות</Badge>
             </div>
             <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-600 transition-all">
                <MoreHorizontal className="w-4 h-4" />
             </button>
           </div>
           
           <div className="overflow-x-auto flex-1">
             <table className="w-full text-right border-collapse">
               <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
                 <tr>
                   <th className="px-6 py-3 font-semibold w-24">שעה</th>
                   <th className="px-6 py-3 font-semibold">ליד</th>
                   <th className="px-6 py-3 font-semibold">סוג / תוצאה</th>
                   <th className="px-6 py-3 font-semibold">סטטוס</th>
                   <th className="px-6 py-3 font-semibold w-24">פעולה</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                 {filteredCalls.map((call, idx) => (
                   <tr key={call.id} className="group hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors">
                     <td className="px-6 py-4 align-middle">
                       <span className="font-mono text-sm text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                         {call.time}
                       </span>
                     </td>
                     <td className="px-6 py-4 align-middle">
                       <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand-700 transition-colors">{call.leadName}</div>
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
                          <Button size="sm" onClick={onStartCall} className="h-8 px-4 shadow-lg shadow-brand-500/20 text-xs">חזור לשיחה</Button>
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

        {/* Right: Live Coaching Focus (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           
           {/* Focus Card - Modern Glass Gradient */}
           <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl shadow-xl shadow-indigo-900/20 p-6 text-white relative overflow-hidden min-h-[260px] flex flex-col border border-white/5">
              {/* Abstract decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-20 -mt-20 blur-3xl mix-blend-overlay"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full -ml-10 -mb-10 blur-3xl mix-blend-overlay"></div>
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                    <Lightbulb className="w-5 h-5 text-yellow-300 fill-yellow-300/20" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">המיקוד להיום</h3>
                    <p className="text-xs text-indigo-200 opacity-80">מבוסס על ביצועי אתמול</p>
                  </div>
                </div>
                
                <div className="space-y-3 flex-1">
                  {COACHING_TIPS.filter(t => t.category === 'Focus').map(tip => (
                    <div key={tip.id} className="group flex items-start gap-3 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm rounded-xl p-3.5 border border-white/5 hover:border-white/20 cursor-default hover:translate-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                      <p className="text-sm leading-relaxed font-medium text-indigo-50/90 group-hover:text-white">{tip.text}</p>
                    </div>
                  ))}
                </div>
              </div>
           </div>

           {/* Quick Tips Carousel - Clean Style */}
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-200"></div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                טיפ זהב
              </h3>
              <div className="relative z-10">
                 <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">
                   "לקוחות ששואלים על מחיר בתחילת השיחה הם לרוב בשלים יותר. אל תחששי לדבר על ROI מוקדם."
                 </p>
                 <div className="mt-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
                    <span className="text-xs text-slate-400">AI Coach Analysis</span>
                 </div>
              </div>
           </div>

        </div>

      </div>

      {/* 3. Bottom Section: Tasks & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Panel A: Tasks (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 flex flex-col">
           <div className="flex items-center justify-between mb-5">
             <h2 className="font-bold text-slate-900 dark:text-white text-base">משימות דחופות</h2>
             <Button variant="ghost" size="sm" className="text-xs h-7 text-brand-600">הכל</Button>
           </div>
           
           <div className="space-y-2 flex-1">
             {DASHBOARD_TASKS.map(task => (
               <div key={task.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                 <div className="mt-0.5">
                   <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 group-hover:border-brand-500 transition-colors"></div>
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 transition-colors">{task.title}</p>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-slate-500 dark:text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{task.leadName}</span>
                     <span className="text-[10px] text-slate-400 flex items-center">
                       {task.dueDate}
                     </span>
                   </div>
                 </div>
               </div>
             ))}
           </div>
           <Button variant="secondary" size="sm" className="w-full mt-4 border-dashed text-slate-500 hover:text-brand-600 hover:border-brand-300">
             + הוסף משימה חדשה
           </Button>
        </div>

        {/* Panel B: Weekly Performance (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
             <div>
               <h2 className="font-bold text-slate-900 dark:text-white text-base">ביצועים שבועיים</h2>
               <p className="text-xs text-slate-500 mt-0.5">כמות שיחות מול יעד</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs">
                   <span className="w-2.5 h-2.5 bg-brand-500 rounded-full"></span>
                   <span className="text-slate-600 dark:text-slate-300">ביצוע בפועל</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                   <span className="w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                   <span className="text-slate-400">יעד יומי</span>
                </div>
             </div>
           </div>
           
           <div className="flex-1 min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} barGap={4}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }} 
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                  />
                  <Bar dataKey="calls" radius={[6, 6, 6, 6]} barSize={40}>
                    {performanceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 2 ? barColors : (isDarkMode ? '#1e293b' : '#f1f5f9')} 
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />

    </div>
  );
};
