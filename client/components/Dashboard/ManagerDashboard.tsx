
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { PIPELINE_STAGES as DEFAULT_PIPELINE_STAGES, TOP_DEALS as DEFAULT_TOP_DEALS } from '../../constants';
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../../src/lib/supabaseClient';

interface ManagerDashboardProps {
  isDarkMode: boolean;
  orgId?: string;
  onNavigate?: (page: string) => void;
  userName?: string;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ isDarkMode, orgId, onNavigate, userName }) => {
  // const navigate = useNavigate(); // Using prop instead
  const [dateRange, setDateRange] = useState('היום');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  // Data State
  const [kpis, setKpis] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [attentionQueue, setAttentionQueue] = useState<any[]>([]);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [qualityTrend, setQualityTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper for greeting based on Israel time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    if (hour >= 18 && hour < 22) return 'ערב טוב';
    return 'לילה טוב';
  };
  const greeting = getGreeting();

  // Helper to convert UI range label to API param
  const getRangeValue = (rangeLabel: string) => {
    switch (rangeLabel) {
      case 'היום': return 'day';
      case 'אתמול': return 'day';
      case 'שבוע':
      case '7 ימים אחרונים': return 'week';
      case '30 ימים אחרונים': return 'month';
      case 'חודש נוכחי': return 'month';
      default: return 'day';
    }
  };

  const getDaysForTrend = (rangeLabel: string) => {
    switch (rangeLabel) {
      case 'היום': return 1;
      case 'אתמול': return 2;
      case 'שבוע':
      case '7 ימים אחרונים': return 7;
      case '30 ימים אחרונים':
      case 'חודש נוכחי': return 30;
      default: return 7;
    }
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        };

        // 0. Fetch Team Members
        // We fetch this every time to be safe, or we could separate it.
        // It's fast enough.
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, avatar, role')
          .eq('organization_id', orgId);

        if (usersData) {
          setTeamMembers(usersData);
        }

        const rangeParam = getRangeValue(dateRange);
        const userParam = selectedTeam !== 'all' ? `&userId=${selectedTeam}` : '';
        const queryParams = `?range=${rangeParam}&organizationId=${orgId}${userParam}`;

        // 1. Fetch KPIs
        const statsRes = await fetch(`/api/panel/stats${queryParams}`, { headers });
        const statsData = await statsRes.json();

        if (statsData.success) {
          const s = statsData.stats;
          setKpis([
            { label: 'סה"כ שיחות', value: s.calls && s.calls.total ? s.calls.total : 0, subtext: dateRange, trend: '+0%', trendDirection: 'neutral', icon: Phone },
            { label: 'פגישות שנקבעו', value: s.appointments || 0, subtext: 'יעד: 40', trend: '+0%', trendDirection: 'neutral', icon: Calendar },
            { label: 'אחוז סגירה (צוות)', value: `${s.closedDeals && s.closedDeals.percentage ? s.closedDeals.percentage : 0}%`, subtext: '30 יום אחרונים', trend: '0%', trendDirection: 'neutral', icon: Target },
            { label: 'איכות שיחה ממוצעת', value: s.qualityScore || 0, subtext: 'ממוצע', trend: '0', trendDirection: 'neutral', icon: Award },
          ]);
        }

        // 2. Fetch Funnel
        const funnelRes = await fetch(`/api/pipeline/funnel${queryParams}`, { headers });
        const funnelResData = await funnelRes.json();
        if (funnelResData.success) {
          const mappedFunnel = (funnelResData.funnel || []).map((stage: any) => ({
            name: stage.label,
            value: stage.totalValue || 0,
            count: stage.count,
            color: stage.color
          }));

          setFunnelData(mappedFunnel);
        }

        // 3. Fetch Attention Queue
        // Usually filtering At Risk by date isn't standard (it's "current status"), but filtering by User IS important.
        const attentionRes = await fetch(`/api/panel/at-risk-leads?limit=5&organizationId=${orgId}${userParam}`, { headers });
        const attentionData = await attentionRes.json();
        if (attentionData.success) {
          setAttentionQueue(attentionData.leads || []);
        }

        // 4. Fetch Top Deals
        const dealsRes = await fetch(`/api/panel/top-deals?limit=5&organizationId=${orgId}${userParam}`, { headers });
        const dealsData = await dealsRes.json();
        if (dealsData.success) {
          setTopDeals(dealsData.deals || []);
        }

        // 5. Fetch Quality Trend
        // Should respect team filter too
        const days = getDaysForTrend(dateRange);
        const trendRes = await fetch(`/api/panel/quality-trend?days=${days}&organizationId=${orgId}${userParam}`, { headers });
        const trendData = await trendRes.json();
        if (trendData.success) {
          setQualityTrend(trendData.trend || []);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, dateRange, selectedTeam]);


  // Helper for monochromatic bar colors (Indigo scale)
  const getBarStyles = (index: number) => {
    const opacities = [0.4, 0.55, 0.7, 0.85, 1];
    const opacity = opacities[index] || 1;

    return {
      backgroundColor: isDarkMode ? '#6366f1' : '#4f46e5',
      opacity: opacity
    };
  };

  // Find max value for bar scaling (adding buffer)
  const maxPipelineValue = Math.max(...(funnelData.length ? funnelData.map(s => s.value) : [0])) * 1.1 || 1000;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{greeting}, {userName || 'מנהל'} 🚀</h1>
            <Badge variant="brand">מנהל מכירות</Badge>
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
                  {selectedTeam === 'all' ? 'כל הצוות' : teamMembers.find(m => m.id === selectedTeam)?.name}
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
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => { setSelectedTeam(member.id); setIsTeamOpen(false); }}
                        className={`w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group ${selectedTeam === member.id ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={member.avatar || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} className="w-6 h-6 rounded-full border border-slate-100 dark:border-slate-700 object-cover" alt="" />
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
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon || TrendingUp;
          return (
            <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.label}</span>
                <Icon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{kpi.value}</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{kpi.subtext}</span>
                  {kpi.trendDirection !== 'neutral' && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${kpi.trendDirection === 'up'
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
          )
        })}
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
            <button
              onClick={() => onNavigate && onNavigate('pipeline')}
              className="group flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              דוח מלא
              <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </div>

          {/* Custom HTML Bar Chart Area */}
          <div className="px-6 py-2 flex flex-col gap-4 mb-6">
            {funnelData.map((stage, index) => (
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
                  {topDeals.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-400 text-xs">אין עסקאות להצגה</td></tr>
                  ) : (
                    topDeals.map(deal => (
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
                    )))}
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
              <AreaChart data={qualityTrend} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
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
        {/* Keeping mock data here for simplicity unless requested to map */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          {/* ... existing code ... */}
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
            {attentionQueue.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">אין התראות חדשות 🎉</div>
            ) : (
              attentionQueue.map(call => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {/* Using generic avatar if missing */}
                      <img src={'https://api.dicebear.com/7.x/avataaars/svg?seed=' + call.id} alt="" className="w-9 h-9 rounded-full border border-slate-100 dark:border-slate-800" />
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{call.name || '(ליד נמחק)'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(call.last_interaction_at).toLocaleDateString()} • </span>
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">No Contact ({call.hours_since}h)</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
              )))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4 text-xs font-medium text-slate-500"
            onClick={() => onNavigate && onNavigate('leads')}
          >
            צפה בכל ההתראות
          </Button>
        </div>

      </div>

    </div>
  );
};
