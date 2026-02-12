import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  Calendar,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Users,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Download
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { supabase } from '../../src/lib/supabaseClient';
import { DashboardSettings } from './DashboardSettings';
import { DashboardCustomizationProvider, useDashboardCustomization } from './DashboardCustomizationProvider';
import { GoalProgressCard } from './GoalProgressCard';
import { AIInsightsCard } from './AIInsightsCard';
import { LiveActivityCard } from './LiveActivityCard';
import { NeedsAttentionCard } from './NeedsAttentionCard';
import { TeamPerformanceMember } from './types';

interface ManagerDashboardProps {
  isDarkMode: boolean;
  orgId?: string;
  onNavigate?: (page: string) => void;
  userName?: string;
  centerType?: 'sales' | 'support';
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = (props) => {
  return (
    <DashboardCustomizationProvider orgId={props.orgId}>
      <ManagerDashboardInner {...props} />
    </DashboardCustomizationProvider>
  );
};

const sanitizeUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return undefined;
};

const ManagerDashboardInner: React.FC<ManagerDashboardProps> = ({ isDarkMode, orgId, onNavigate, userName, centerType = 'sales' }) => {
  const { hiddenWidgets } = useDashboardCustomization();

  const [dateRange, setDateRange] = useState('היום');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceMember[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [attentionQueue, setAttentionQueue] = useState<any[]>([]);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [qualityTrend, setQualityTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [goalProgress, setGoalProgress] = useState<any>(null);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pipeline: false, team: false, attention: false
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    if (hour >= 18 && hour < 22) return 'ערב טוב';
    return 'לילה טוב';
  };
  const greeting = getGreeting();

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

  const getBarStyles = (index: number) => {
    const opacities = [0.4, 0.55, 0.7, 0.85, 1];
    return { backgroundColor: isDarkMode ? '#6366f1' : '#4f46e5', opacity: opacities[index] || 1 };
  };

  const maxPipelineValue = Math.max(...(funnelData.length ? funnelData.map(s => s.value) : [0])) * 1.1 || 1000;

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) { setLoading(false); return; }

      const hasCachedData = kpis.length > 0;
      if (!hasCachedData) setLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        };

        const rangeParam = getRangeValue(dateRange);
        const userParam = selectedTeam !== 'all' ? `&userId=${selectedTeam}` : '';
        const queryParams = `?range=${rangeParam}&organizationId=${orgId}${userParam}`;
        const days = getDaysForTrend(dateRange);

        const results = await Promise.allSettled([
          supabase.from('profiles').select('id, full_name, avatar_url, role').eq('organization_id', orgId),
          fetch(`/api/panel/stats${queryParams}`, { headers }),
          fetch(`/api/pipeline/funnel${queryParams}`, { headers }),
          fetch(`/api/panel/at-risk-leads?limit=5&organizationId=${orgId}${userParam}`, { headers }),
          fetch(`/api/panel/top-deals?limit=5&organizationId=${orgId}${userParam}`, { headers }),
          fetch(`/api/panel/quality-trend?days=${days}&organizationId=${orgId}${userParam}`, { headers }),
          fetch(`/api/panel/daily-insights?organizationId=${orgId}`, { headers }),
          fetch(`/api/panel/goal-progress?organizationId=${orgId}`, { headers }),
          fetch(`/api/panel/live-activity?limit=10&organizationId=${orgId}`, { headers }),
          fetch(`/api/analytics/team-performance?organizationId=${orgId}&range=${rangeParam}`, { headers })
        ]);

        const responses = results.map(r => r.status === 'fulfilled' ? r.value : null);
        const [usersResult, statsRes, funnelRes, attentionRes, dealsRes, trendRes, insightsRes, goalRes, activityRes, teamPerfRes] = responses;

        if (usersResult && 'data' in usersResult && usersResult.data) {
          const mappedUsers = (usersResult.data as any[]).map((u: any) => ({
            id: u.id, name: u.full_name, avatar: u.avatar_url, role: u.role
          }));
          setTeamMembers(mappedUsers);
        }

        if (statsRes && 'json' in statsRes) {
          const d = await (statsRes as Response).json();
          if (d.success) {
            const s = d.stats;
            if (centerType === 'support') {
              setKpis([
                { label: 'פניות שטופלו', value: s.leadsContacted?.current || 0, subtext: `יעד: ${s.leadsContacted?.target || 0}`, trend: '+0%', trendDirection: 'neutral', icon: CheckCircle2 },
                { label: 'ממתינים לנציג', value: s.appointments?.current || 0, subtext: 'זמן אמת', trend: '0', trendDirection: 'neutral', icon: Users },
                { label: 'עמידה ב-SLA', value: `${s.closedDeals?.percentage || 0}%`, subtext: 'היום', trend: '0%', trendDirection: 'neutral', icon: Award },
                { label: 'ציון שביעות רצון', value: s.qualityScore || 0, subtext: 'ממוצע', trend: '0', trendDirection: 'neutral', icon: Target },
              ]);
            } else {
              setKpis([
                { label: 'סה"כ שיחות', value: s.leadsContacted?.current || 0, subtext: `יעד: ${s.leadsContacted?.target || 0}`, trend: '+0%', trendDirection: 'neutral', icon: Phone },
                { label: 'פגישות שנקבעו', value: s.appointments?.current || 0, subtext: `יעד: ${s.appointments?.target || 0}`, trend: '+0%', trendDirection: 'neutral', icon: Calendar },
                { label: 'אחוז סגירה (צוות)', value: `${s.closedDeals?.percentage || 0}%`, subtext: '30 יום אחרונים', trend: '0%', trendDirection: 'neutral', icon: Target },
                { label: 'איכות שיחה ממוצעת', value: s.qualityScore || 0, subtext: 'ממוצע', trend: '0', trendDirection: 'neutral', icon: Award },
              ]);
            }
          }
        }

        if (funnelRes && 'json' in funnelRes) {
          const d = await (funnelRes as Response).json();
          if (d.success) {
            setFunnelData((d.funnel || []).map((stage: any) => ({ name: stage.label, value: stage.totalValue || 0, count: stage.count, color: stage.color })));
          }
        }

        if (attentionRes && 'json' in attentionRes) {
          const d = await (attentionRes as Response).json();
          if (d.success) setAttentionQueue(d.leads || []);
        }
        if (dealsRes && 'json' in dealsRes) {
          const d = await (dealsRes as Response).json();
          if (d.success) setTopDeals(d.deals || []);
        }
        if (trendRes && 'json' in trendRes) {
          const d = await (trendRes as Response).json();
          if (d.success) setQualityTrend(d.trend || []);
        }
        if (insightsRes && 'json' in insightsRes) {
          const d = await (insightsRes as Response).json();
          if (d.success) setInsights(d.insights || []);
        }
        if (goalRes && 'json' in goalRes) {
          const d = await (goalRes as Response).json();
          if (d.success) setGoalProgress(d.teamProgress);
        }
        if (activityRes && 'json' in activityRes) {
          const d = await (activityRes as Response).json();
          if (d.success) setLiveActivity(d.activities || []);
        }
        if (teamPerfRes && 'json' in teamPerfRes) {
          const d = await (teamPerfRes as Response).json();
          if (d.success) setTeamPerformance(d.performance || []);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, dateRange, selectedTeam]);

  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'דוח ביצועים - ' + dateRange + '\n\n';
    csvContent += 'מדדים ראשיים\nמדד,ערך,יעד,שינוי\n';
    kpis.forEach(kpi => { csvContent += `${kpi.label},${kpi.value},${kpi.goal || '-'},${kpi.change || '-'}%\n`; });
    csvContent += '\nפייפליין מכירות\nשלב,כמות\n';
    funnelData.forEach(stage => { csvContent += `${stage.name},${stage.value}\n`; });
    csvContent += '\nעסקאות מובילות\nעסקה,שווי,בעלים,שלב\n';
    topDeals.forEach(deal => { csvContent += `${deal.name},${deal.value},${deal.owner},${deal.stage}\n`; });
    csvContent += '\nצוות\nשם,תפקיד\n';
    teamMembers.forEach(member => { csvContent += `${member.name || member.full_name},${member.role}\n`; });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && kpis.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{greeting}, {userName || 'מנהל'}</h1>
            <Badge variant="brand">{centerType === 'support' ? 'מנהל שירות' : 'מנהל מכירות'}</Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {centerType === 'support' ? 'סקירה כוללת על ביצועי המוקד ואיכות השירות.' : 'סקירה כוללת על ביצועי הצוות והפייפליין.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-20">
          <DashboardSettings />

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
                <div className="fixed inset-0 z-10" onClick={() => setIsTeamOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden">
                  <button
                    onClick={() => { setSelectedTeam('all'); setIsTeamOpen(false); }}
                    className={`w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${selectedTeam === 'all' ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    <span className="font-medium">כל הצוות</span>
                    {selectedTeam === 'all' && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <div className="max-h-[240px] overflow-y-auto">
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => { setSelectedTeam(member.id); setIsTeamOpen(false); }}
                        className={`w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${selectedTeam === member.id ? 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={sanitizeUrl(member.avatar) || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} className="w-6 h-6 rounded-full border border-slate-100 dark:border-slate-700 object-cover" alt="" />
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
                <div className="fixed inset-0 z-10" onClick={() => setIsTimeOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5">
                  {['היום', 'אתמול', '7 ימים אחרונים', '30 ימים אחרונים', 'חודש נוכחי'].map(range => (
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

          <Button
            variant="secondary"
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            onClick={exportToCSV}
            title="ייצוא דוח"
          >
            <Download className="w-4 h-4 ml-2" />
            <span className="text-sm hidden sm:inline">ייצוא</span>
          </Button>
        </div>
      </div>

      {/* 1. Top KPIs Row */}
      {!hiddenWidgets.includes('kpis') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {kpis.map((kpi, index) => {
              const Icon = kpi.icon || TrendingUp;
              const iconColors = [
                'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
                'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
                'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
                'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
              ];
              return (
                <div key={index} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{kpi.label}</span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColors[index] || iconColors[0]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{kpi.value}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{kpi.subtext}</span>
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {/* 2. Middle Row: 3 columns - Live Activity | Goals | Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {!hiddenWidgets.includes('live-activity') && <LiveActivityCard activities={liveActivity} loading={loading} />}
        {!hiddenWidgets.includes('goal-progress') && (
          <GoalProgressCard
            teamProgress={goalProgress || { calls: { current: 0, target: 10, percentage: 0 }, meetings: { current: 0, target: 3, percentage: 0 }, deals: { current: 0, target: 1, percentage: 0 } }}
            loading={loading}
          />
        )}
        {!hiddenWidgets.includes('ai-insights') && <AIInsightsCard insights={insights} loading={loading} />}
      </div>

      {/* 3. Bottom Collapsible Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline & Revenue */}
        {!hiddenWidgets.includes('pipeline') && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button onClick={() => toggleSection('pipeline')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">פייפליין והכנסות</h3>
                  <span className="text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">החודש</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.pipeline ? 'rotate-180' : ''}`} />
              </button>
              {!expandedSections.pipeline && (
                <div className="px-5 pb-4">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white ltr">₪{funnelData.reduce((s, f) => s + (f.value || 0), 0).toLocaleString()}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">סה"כ בפייפליין</p>
                </div>
              )}
              {expandedSections.pipeline && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {funnelData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-3">אין נתוני פייפליין</p>
                  ) : (
                    funnelData.map((stage, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-20 text-xs font-medium text-slate-600 dark:text-slate-400 truncate text-right shrink-0">{stage.name}</span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stage.value / maxPipelineValue) * 100}%`, ...getBarStyles(index) }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-16 text-left shrink-0 ltr tabular-nums">₪{(stage.value / 1000).toLocaleString()}k</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
        )}

        {/* Team Performance */}
        {!hiddenWidgets.includes('team-performance') && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button onClick={() => toggleSection('team')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">ביצועי צוות</h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.team ? 'rotate-180' : ''}`} />
              </button>
              {!expandedSections.team && (
                <div className="px-5 pb-4">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{teamMembers.length}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">נציגים פעילים</p>
                </div>
              )}
              {expandedSections.team && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead className="text-[11px] text-slate-500 bg-slate-50/80 dark:bg-slate-800/50">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">נציג</th>
                          <th className="py-2.5 px-2 font-medium text-center">שיחות</th>
                          <th className="py-2.5 px-3 font-medium text-left">הכנסות</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {teamPerformance.length === 0 ? (
                          <tr><td colSpan={3} className="text-center py-6 text-slate-400 text-xs">אין נתוני ביצועים זמינים</td></tr>
                        ) : (
                          teamPerformance.slice(0, 5).map((member) => (
                            <tr key={member.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={sanitizeUrl(member.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=32`} 
                                    alt="" 
                                    className="w-6 h-6 rounded-full" 
                                  />
                                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[80px]">{member.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300">{member.calls || 0}</td>
                              <td className="py-2.5 px-3 text-left text-xs font-bold text-emerald-600 dark:text-emerald-400 ltr">₪{(member.revenue || 0).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
        )}

        {/* Attention Queue - Smart Real-Time Monitoring */}
        {!hiddenWidgets.includes('attention-queue') && (
          <NeedsAttentionCard orgId={orgId} />
        )}
      </div>
    </div>
  );
};
