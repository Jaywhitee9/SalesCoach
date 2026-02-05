
import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Phone, 
  Calendar, 
  Target, 
  Award,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Filter,
  BarChart3,
  Users,
  FileText,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { MANAGER_KPIS, PIPELINE_STAGES, TOP_DEALS, TEAM_LEADERBOARD, MANAGER_ATTENTION_CALLS, TEAM_MEMBERS } from '../../constants';
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';

interface ManagerDashboardProps {
  isDarkMode: boolean;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ isDarkMode }) => {
  const [dateRange, setDateRange] = useState('היום');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  
  // Mock Quality Trend Data
  const qualityTrendData = [
    { day: 'א', score: 75 },
    { day: 'ב', score: 78 },
    { day: 'ג', score: 82 },
    { day: 'ד', score: 80 },
    { day: 'ה', score: 85 },
    { day: 'ו', score: 81 },
    { day: 'ש', score: 84 },
  ];

  // Helper for monochromatic bar colors (Indigo scale)
  const getBarStyles = (index: number) => {
    // Creating a gradient of opacity/lightness for a "calm" look
    // Index 0 (New Lead) -> Lightest
    // Index 4 (Closing) -> Darkest/Strongest
    const opacities = [0.4, 0.55, 0.7, 0.85, 1];
    const opacity = opacities[index] || 1;
    
    return {
      backgroundColor: isDarkMode ? '#6366f1' : '#4f46e5',
      opacity: opacity
    };
  };

  // Find max value for bar scaling (adding buffer)
  const maxPipelineValue = Math.max(...PIPELINE_STAGES.map(s => s.value)) * 1.1;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
           <div className="flex items-center gap-2">
             <h1 className="text-2xl font-bold text-slate-900 dark:text-white">לוח בקרה למנהל 🚀</h1>
             <Badge variant="brand">Admin View</Badge>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">סקירה כוללת על ביצועי הצוות והפייפליין.</p>
        </div>
        
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

      {/* 1. Top KPIs Row (Team Level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {MANAGER_KPIS.map((kpi, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.label}</span>
              {index === 0 && <Phone className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
              {index === 1 && <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
              {index === 2 && <Target className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
              {index === 3 && <Award className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{kpi.value}</span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{kpi.subtext}</span>
                {kpi.trendDirection !== 'neutral' && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${
                     kpi.trendDirection === 'up' 
                       ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' 
                       : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400'
                  }`}>
                    {kpi.trendDirection === 'up' ? <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 ml-0.5" />}
                    {kpi.trend}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Middle Analytics Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        
        {/* Left: Pipeline & Revenue (Redesigned) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden">
           
           {/* Card Header */}
           <div className="px-6 py-5 flex items-center justify-between border-b border-transparent dark:border-slate-800/50">
             <div className="flex items-center gap-3">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-500" />
                  פייפליין והכנסות
                </h2>
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  החודש
                </span>
             </div>
             <button className="group flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
               דוח מלא
               <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
             </button>
           </div>
           
           {/* Custom HTML Bar Chart Area */}
           <div className="px-6 py-2 flex flex-col gap-4 mb-6">
             {PIPELINE_STAGES.map((stage, index) => (
               <div key={index} className="flex items-center gap-4 group">
                 {/* Label (Right) */}
                 <span className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300 truncate text-right shrink-0" title={stage.name}>
                   {stage.name}
                 </span>
                 
                 {/* Bar Container */}
                 <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                   {/* Animated Bar - RTL: absolute right */}
                   <div 
                     className="absolute top-0 bottom-0 right-0 rounded-l-full transition-all duration-1000 ease-out group-hover:brightness-110"
                     style={{ 
                       width: `${(stage.value / maxPipelineValue) * 100}%`, 
                       ...getBarStyles(index)
                     }}
                   />
                 </div>

                 {/* Value (Left) */}
                 <span className="w-20 text-sm font-bold text-slate-900 dark:text-white text-left shrink-0 tabular-nums tracking-tight">
                   ₪{(stage.value / 1000).toLocaleString()}k
                 </span>
               </div>
             ))}
           </div>

           {/* Divider */}
           <div className="h-px bg-slate-100 dark:bg-slate-800 mx-6 mb-5"></div>

           {/* Top Deals Table */}
           <div className="px-6 pb-6 flex-1">
             <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">עסקאות מובילות החודש</h3>
             
             <div className="overflow-x-auto">
               <table className="w-full text-right border-collapse">
                 <thead className="text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                   <tr>
                     <th className="pb-2 font-medium pl-4">חברה</th>
                     <th className="pb-2 font-medium px-2">בעלים</th>
                     <th className="pb-2 font-medium px-2">שלב</th>
                     <th className="pb-2 font-medium text-left">ערך</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {TOP_DEALS.map(deal => (
                     <tr key={deal.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-transparent hover:border-slate-100 dark:hover:border-slate-800/50">
                       <td className="py-3 font-medium text-slate-900 dark:text-slate-100 pl-4">{deal.company}</td>
                       <td className="py-3 px-2">
                         <div className="flex items-center gap-2">
                           <img src={deal.ownerAvatar} alt="" className="w-6 h-6 rounded-full border border-white dark:border-slate-700 shadow-sm" />
                           <span className="text-slate-600 dark:text-slate-300 text-xs truncate max-w-[80px]">{deal.owner}</span>
                         </div>
                       </td>
                       <td className="py-3 px-2">
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                           {deal.stage}
                         </span>
                       </td>
                       <td className="py-3 font-bold text-slate-900 dark:text-white text-left tabular-nums">{deal.value}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>

        {/* Right: Quality & Coaching (Existing) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 flex flex-col">
           <div className="flex items-center justify-between mb-6">
             <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-emerald-500" />
               איכות שיחה ואימון
             </h2>
           </div>

           {/* Quality Trend Chart - RTL Adjusted */}
           <div className="h-48 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityTrendData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                  {/* Reversed XAxis for RTL time direction */}
                  <XAxis 
                    dataKey="day" 
                    reversed={true}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDarkMode ? '#94a3b8' : '#64748b' }} 
                  />
                  <YAxis 
                    orientation="right" 
                    hide 
                    domain={['dataMin - 10', 'dataMax + 5']} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      direction: 'rtl'
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>

           {/* Insights */}
           <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-lg p-4 mb-4">
             <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2">תובנות מערכת</h3>
             <ul className="space-y-2">
               <li className="flex items-start gap-2 text-sm text-indigo-800 dark:text-indigo-200">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5"></div>
                 <span>שלב "גילוי צרכים" חלש ב-32% מהשיחות השבוע.</span>
               </li>
               <li className="flex items-start gap-2 text-sm text-indigo-800 dark:text-indigo-200">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5"></div>
                 <span>טיפול בהתנגדויות השתפר ב-8% בהשוואה לחודש שעבר.</span>
               </li>
             </ul>
           </div>

           {/* Coverage Stats */}
           <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                 <span className="block text-2xl font-bold text-slate-900 dark:text-white">85%</span>
                 <span className="text-xs text-slate-500 dark:text-slate-400">כיסוי אימון חי</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                 <span className="block text-2xl font-bold text-slate-900 dark:text-white">100%</span>
                 <span className="text-xs text-slate-500 dark:text-slate-400">נותחו ע"י AI</span>
              </div>
           </div>
        </div>

      </div>

      {/* 3. Bottom Section: Actions & Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel A: Team Leaderboard (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
           <div className="flex items-center justify-between mb-4">
             <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Users className="w-4 h-4 text-brand-500" />
               טבלת מובילים
             </h2>
             <Button variant="ghost" size="sm" className="text-xs h-7">צפה בכולם</Button>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-right">
               <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 uppercase">
                 <tr>
                   <th className="px-3 py-2 rounded-tr-lg">נציג</th>
                   <th className="px-3 py-2">שיחות</th>
                   <th className="px-3 py-2">פגישות</th>
                   <th className="px-3 py-2">סגירה %</th>
                   <th className="px-3 py-2 rounded-tl-lg">איכות</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {TEAM_LEADERBOARD.map((member) => (
                   <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                     <td className="px-3 py-3 flex items-center gap-3">
                       <img src={member.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                       <span className="font-medium text-sm text-slate-900 dark:text-white">{member.name}</span>
                     </td>
                     <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{member.calls}</td>
                     <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{member.meetings}</td>
                     <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{member.winRate}%</td>
                     <td className="px-3 py-3">
                       <Badge variant={member.qualityScore > 85 ? 'success' : member.qualityScore > 75 ? 'warning' : 'danger'}>
                         {member.qualityScore}
                       </Badge>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* Panel B: Attention Needed (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
             <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
               דורש תשומת לב
               <span className="flex h-2 w-2 rounded-full bg-rose-500"></span>
             </h2>
           </div>

           <div className="space-y-3">
             {MANAGER_ATTENTION_CALLS.map(call => (
               <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow group cursor-pointer">
                 <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={call.repAvatar} alt="" className="w-9 h-9 rounded-full border border-slate-100 dark:border-slate-800" />
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{call.leadName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                         <span className="text-xs text-slate-500 dark:text-slate-400">{call.repName} • </span>
                         <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{call.issueTag}</span>
                      </div>
                    </div>
                 </div>
                 
                 <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
               </div>
             ))}
           </div>
           
           <Button variant="ghost" size="sm" className="w-full mt-4 text-xs font-medium text-slate-500">
             צפה בכל ההתראות
           </Button>
        </div>

      </div>

    </div>
  );
};
