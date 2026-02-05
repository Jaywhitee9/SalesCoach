import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../src/lib/supabaseClient';
import { Lead, User } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineDashboardProps {
  isDarkMode: boolean;
  currentUser?: User;
}

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({ isDarkMode, currentUser }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState('month');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [sourceMetric, setSourceMetric] = useState<'leads' | 'revenue'>('leads');

  // Data State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [sourcesData, setSourcesData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [atRiskLeads, setAtRiskLeads] = useState<Lead[]>([]);
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const userType = currentUser?.type || 'manager';
  const isRep = userType === 'rep';

  // Fetch Team Members (Once)
  useEffect(() => {
    const fetchTeam = async () => {
      if (isRep || !currentUser?.organization_id) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('organization_id', currentUser.organization_id);

      if (data) {
        setTeamMembers(data.map((u: any) => ({
          id: u.id,
          name: u.full_name,
          avatar: u.avatar_url,
          role: u.role
        })));
      }
    };
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.organization_id, isRep]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.organization_id) {
        // console.log('Skipping fetch: No organization_id', currentUser);
        setLoading(false);
        return;
      }

      // console.log('Fetching Pipeline Data. Org:', currentUser.organization_id);

      setLoading(true);
      try {
        // Determine effective User ID for filtering
        // If Rep: Always their own ID
        // If Manager: 'all' (empty) or specific filtered ID
        let targetUserId = '';
        if (isRep && currentUser?.id) {
          targetUserId = currentUser.id;
        } else if (!isRep && selectedTeam !== 'all') {
          targetUserId = selectedTeam;
        }

        const userIdParam = targetUserId ? `&userId=${targetUserId}` : '';
        const rangeParam = `&range=${dateRange === 'היום' ? 'day' : dateRange === 'שבוע' ? 'week' : 'month'}`; // Simplified range mapping
        const orgParam = currentUser?.organization_id ? `&organizationId=${currentUser.organization_id}` : '';

        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
          'Authorization': `Bearer ${session?.access_token}`
        };

        const [funnelRes, sourcesRes, statsRes, riskRes, unassignedRes] = await Promise.all([
          fetch(`/api/pipeline/funnel?${rangeParam.substring(1)}${userIdParam}${orgParam}`, { headers }),
          fetch(`/api/pipeline/sources?${rangeParam.substring(1)}${userIdParam}${orgParam}`, { headers }),
          fetch(`/api/panel/stats?${rangeParam.substring(1)}${userIdParam}${orgParam}`, { headers }),
          fetch(`/api/panel/at-risk-leads?limit=5${userIdParam}${orgParam}`, { headers }),
          !isRep ? fetch(`/api/pipeline/unassigned?limit=5${orgParam}`, { headers }) : Promise.resolve({ json: () => ({ success: true, leads: [] }) })
        ]);

        const [funnel, sources, statsData, risk, unassigned] = await Promise.all([
          funnelRes.json(),
          sourcesRes.json(),
          statsRes.json(),
          riskRes.json(),
          unassignedRes.json()
        ]);

        if (funnel.success) setFunnelData(funnel.funnel);
        if (sources.success) setSourcesData(sources.sources);
        if (statsData.success) setStats(statsData.stats);
        if (risk.success) setAtRiskLeads(risk.leads);
        if (unassigned.success) setUnassignedLeads(unassigned.leads);

      } catch (err) {
        console.error('Error fetching pipeline data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedTeam, currentUser?.organization_id, currentUser?.id, isRep]);

  // Derived Values
  const totalSourcesValue = sourcesData.reduce((acc, curr) => acc + curr[sourceMetric], 0);
  const maxSourceValue = sourcesData.length > 0 ? Math.max(...sourcesData.map(s => s[sourceMetric])) : 1;

  // KPI Calculations (Map from Panel Stats to Manager KPIs)
  const kpis = [
    { label: 'סה"כ שיחות', value: stats?.leadsContacted?.current || 0, change: '+0%', positive: true, subtext: 'מספר שיחות' },
    { label: 'לידים חדשים', value: stats?.newLeads?.current || 0, change: '+0%', positive: true, subtext: 'כמות לידים' },
    { label: 'פגישות', value: stats?.appointments?.current || 0, change: '+0%', positive: true, subtext: 'פגישות שנקבעו' },
    { label: 'סגירות', value: stats?.closedDeals?.current || 0, change: '+0%', positive: true, subtext: 'עסקאות שנסגרו' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 font-sans relative">

      {/* Loading Overlay or Opacity Transition */}
      <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

        {/* 1. Top Bar: Title & Global Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isRep ? 'הפאנל שלי' : 'לידים & פאנל'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {isRep ? 'ביצועים אישיים בזמן אמת' : 'סקירת משפך המכירות וניהול לידים'}
              </span>
              <Badge variant="success" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                נתוני אמת ⚡
              </Badge>
            </div>
          </div>

          {/* Filters Group */}
          <div className="flex items-center gap-3 relative z-20">

            {/* Team Dropdown (Managers Only) */}
            {!isRep && (
              <div className="relative">
                <Button
                  variant="secondary"
                  className="hidden sm:flex bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-w-[140px] justify-between items-center"
                  onClick={() => { setIsTeamOpen(!isTeamOpen); setIsTimeOpen(false); }}
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 ml-2" />
                    <span className="truncate max-w-[100px] text-sm">
                      {selectedTeam === 'all' ? 'כל הצוות' : teamMembers.find(m => m.id === selectedTeam)?.name || 'כל הצוות'}
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
                              <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`} className="w-6 h-6 rounded-full border border-slate-100 dark:border-slate-700 object-cover" alt="" />
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
            )}

            {/* Time Dropdown */}
            <div className="relative">
              <Button
                variant="secondary"
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-w-[140px] justify-between items-center"
                onClick={() => { setIsTimeOpen(!isTimeOpen); setIsTeamOpen(false); }}
              >
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 ml-2" />
                  <span className="text-sm">{dateRange === 'month' ? 'החודש' : dateRange === 'week' ? 'השבוע' : dateRange}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 mr-2 opacity-50 transition-transform duration-200 ${isTimeOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isTimeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTimeOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                    {['היום', 'שבוע', 'חודש'].map(range => (
                      <button
                        key={range}
                        onClick={() => { setDateRange(range); setIsTimeOpen(false); }}
                        className={`w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${dateRange === range ? 'text-brand-600 bg-brand-50/50 dark:bg-brand-900/10 font-medium' : 'text-slate-700 dark:text-slate-200'}`}
                      >
                        <span>{range === 'month' ? 'החודש' : range === 'week' ? 'השבוע' : range}</span>
                        {dateRange === range && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* 2. KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{kpi.label}</p>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{kpi.value}</span>
                <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${kpi.positive
                  ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400'
                  }`}>
                  {kpi.positive ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
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
                <p className="text-xs text-slate-500 mt-1">נתונים בזמן אמת מתוך {isRep ? 'הפעילות שלי' : 'כלל הארגון'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-6 flex-1 justify-center px-4">
              {funnelData.map((stage, index) => {
                // Calculate conversion from previous stage
                const prevCount = index > 0 ? funnelData[index - 1].count : stage.count;
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
                          backgroundColor: stage.color,
                          opacity: isDarkMode ? 0.9 : 1
                        }}
                      >
                      </div>
                    </div>

                    {/* Stats - Left Aligned (Visual Left) */}
                    <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-end gap-2 text-left">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">{stage.count}</span>
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
              {sourcesData.slice(0, 5).map((source, i) => {
                const value = source[sourceMetric];
                const percentage = totalSourcesValue > 0 ? Math.round((value / totalSourcesValue) * 100) : 0;
                const widthPercentage = maxSourceValue > 0 ? Math.max((value / maxSourceValue) * 100, 5) : 0;

                return (
                  <div key={i} className="flex items-center gap-4 group">
                    {/* Label (Right) */}
                    <span className="w-32 text-sm font-medium text-slate-700 dark:text-slate-300 text-right truncate" title={source.name}>
                      {{
                        'Website': 'אתר אינטרנט',
                        'Unknown': 'לא ידוע',
                        'Webinar': 'וובינר',
                        'LinkedIn': 'לינקדאין',
                        'Facebook': 'פייסבוק',
                        'Referral': 'הפניה',
                        'Instagram': 'אינסטגרם'
                      }[source.name] || source.name}
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
                        {sourceMetric === 'revenue' ? `₪${(value / 1000).toFixed(0)}k` : value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 4. Bottom Area: Unassigned/Risk */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Right Card: Leads at Risk */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">לידים בסיכון</h2>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {atRiskLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="p-3 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors cursor-pointer rounded-lg border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{lead.name}</h3>
                      <p className="text-xs text-rose-600">אין פעילות זמן רב</p>
                    </div>
                    <Badge variant="warning" className="text-[10px]">{typeof lead.timeSinceActivity === 'string' ? lead.timeSinceActivity : 'זמן רב'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left Card: Unassigned Leads (Manager Only) */}
          {!isRep && (
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">לידים לא מוקצים</h2>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {unassignedLeads.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">אין לידים חדשים להקצאה</div>
                ) : (
                  unassignedLeads.map(lead => (
                    <div key={lead.id} className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">{lead.name}</span>
                      <Badge variant="neutral">
                        {{
                          'website': 'אתר אינטרנט',
                          'unknown': 'לא ידוע',
                          'webinar': 'וובינר',
                          'linkedin': 'לינקדאין',
                          'facebook': 'פייסבוק',
                          'referral': 'הפניה',
                          'instagram': 'אינסטגרם'
                        }[lead.source?.toLowerCase()?.trim()] || lead.source}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* 5. Lead Details Drawer */}
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />

      </div>
    </div>
  );
};
