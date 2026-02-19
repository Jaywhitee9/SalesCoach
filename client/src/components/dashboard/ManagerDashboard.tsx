import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Settings
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

// ─── SessionStorage Cache ───
const CACHE_KEY = 'mgr_dash';
const CACHE_TTL = 5 * 60_000; // 5 minutes — show stale data while fetching fresh

const getCachedData = (orgId: string) => {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${orgId}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(`${CACHE_KEY}_${orgId}`);
      return null;
    }
    return data;
  } catch { return null; }
};

const setCachedData = (orgId: string, data: any) => {
  try {
    sessionStorage.setItem(`${CACHE_KEY}_${orgId}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full */ }
};

// ─── Skeleton (only for very first visit) ───
const SkeletonPulse: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ background: '#e5e7eb', ...style }} />
);

const KPISkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="bg-white rounded-lg p-5" style={{ border: '1px solid #e5e7eb' }}>
        <SkeletonPulse className="w-5 h-5 rounded mb-4" />
        <SkeletonPulse className="w-20 h-12 rounded mb-2" />
        <SkeletonPulse className="w-24 h-4 rounded" />
      </div>
    ))}
  </div>
);

const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
    <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <SkeletonPulse className="w-4 h-4 rounded" />
      <SkeletonPulse className="w-28 h-4 rounded" />
    </div>
    <div className="p-5 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse key={i} className="w-full h-4 rounded" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  </div>
);

const ManagerDashboardInner: React.FC<ManagerDashboardProps> = ({ isDarkMode, orgId, onNavigate, userName, centerType = 'sales' }) => {
  const { hiddenWidgets } = useDashboardCustomization();

  const [dateRange, setDateRange] = useState('היום');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceMember[]>([]);
  // KPIs stored as plain data (no component refs!) — icon resolved at render time
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [attentionQueue, setAttentionQueue] = useState<any[]>([]);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [qualityTrend, setQualityTrend] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [goalProgress, setGoalProgress] = useState<any>(null);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pipeline: false, team: false, attention: false
  });
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Has ANY data been loaded (from cache or API)?
  const [hasData, setHasData] = useState(false);
  // Is fresh data currently being fetched?
  const [isFetching, setIsFetching] = useState(false);

  const fetchRef = useRef(0); // prevent stale closures

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

  const maxPipelineValue = Math.max(...(funnelData.length ? funnelData.map(s => s.value) : [0])) * 1.1 || 1000;

  // ─── Icon config (resolved by index, never stored in state) ───
  const salesIcons = [Phone, Calendar, Target, Award];
  const supportIcons = [CheckCircle2, Users, Award, Target];
  const kpiColors = ['#6366f1', '#2563eb', '#059669', '#94a3b8'];

  // ─── Build KPIs from stats (plain data only, no component refs) ───
  const buildKpis = (s: any) => {
    if (centerType === 'support') {
      return [
        { label: 'פניות שטופלו', value: s.leadsContacted?.current || 0, subtext: `יעד: ${s.leadsContacted?.target || 0}`, trend: '+0%', trendDirection: 'neutral' },
        { label: 'ממתינים לנציג', value: s.appointments?.current || 0, subtext: 'זמן אמת', trend: '0', trendDirection: 'neutral' },
        { label: 'עמידה ב-SLA', value: `${s.closedDeals?.percentage || 0}%`, subtext: 'היום', trend: '0%', trendDirection: 'neutral' },
        { label: 'ציון שביעות רצון', value: s.qualityScore || 0, subtext: 'ממוצע', trend: '0', trendDirection: 'neutral' },
      ];
    }
    return [
      { label: 'סה"כ שיחות', value: s.leadsContacted?.current || 0, subtext: `יעד: ${s.leadsContacted?.target || 0}`, trend: '+0%', trendDirection: 'neutral' },
      { label: 'פגישות שנקבעו', value: s.appointments?.current || 0, subtext: `יעד: ${s.appointments?.target || 0}`, trend: '+0%', trendDirection: 'neutral' },
      { label: 'אחוז סגירה (צוות)', value: `${s.closedDeals?.percentage || 0}%`, subtext: '30 יום אחרונים', trend: '0%', trendDirection: 'neutral' },
      { label: 'איכות שיחה ממוצעת', value: s.qualityScore || 0, subtext: 'ממוצע', trend: '0', trendDirection: 'neutral' },
    ];
  };

  // ─── Data Fetching ───
  useEffect(() => {
    if (!orgId) { setHasData(true); return; }

    const fetchId = ++fetchRef.current;

    // 1. Restore from cache INSTANTLY
    const cached = getCachedData(orgId);
    if (cached) {
      if (cached.teamMembers) setTeamMembers(cached.teamMembers);
      if (cached.kpiData) setKpiData(cached.kpiData);
      if (cached.insights) setInsights(cached.insights);
      if (cached.goalProgress) setGoalProgress(cached.goalProgress);
      if (cached.liveActivity) setLiveActivity(cached.liveActivity);
      if (cached.funnelData) setFunnelData(cached.funnelData);
      if (cached.teamPerformance) setTeamPerformance(cached.teamPerformance);
      if (cached.attentionQueue) setAttentionQueue(cached.attentionQueue);
      if (cached.topDeals) setTopDeals(cached.topDeals);
      setHasData(true);
      // Don't return — still fetch fresh data below
    }

    // 2. Fetch fresh data in background
    const fetchData = async () => {
      setIsFetching(true);
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

        // Fire ALL requests in parallel (fastest overall)
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

        if (fetchId !== fetchRef.current) return; // stale

        const responses = results.map(r => r.status === 'fulfilled' ? r.value : null);
        const [usersResult, statsRes, funnelRes, attentionRes, dealsRes, trendRes, insightsRes, goalRes, activityRes, teamPerfRes] = responses;

        const cachePayload: any = {};

        if (usersResult && 'data' in usersResult && usersResult.data) {
          const mapped = (usersResult.data as any[]).map((u: any) => ({
            id: u.id, name: u.full_name, avatar: u.avatar_url, role: u.role
          }));
          setTeamMembers(mapped);
          cachePayload.teamMembers = mapped;
        }

        if (statsRes && 'json' in statsRes) {
          const d = await (statsRes as Response).json();
          if (d.success) {
            const kpis = buildKpis(d.stats);
            setKpiData(kpis);
            cachePayload.kpiData = kpis;
          }
        }

        if (funnelRes && 'json' in funnelRes) {
          const d = await (funnelRes as Response).json();
          if (d.success) {
            const mapped = (d.funnel || []).map((stage: any) => ({ name: stage.label, value: stage.totalValue || 0, count: stage.count, color: stage.color }));
            setFunnelData(mapped);
            cachePayload.funnelData = mapped;
          }
        }

        if (attentionRes && 'json' in attentionRes) {
          const d = await (attentionRes as Response).json();
          if (d.success) { setAttentionQueue(d.leads || []); cachePayload.attentionQueue = d.leads || []; }
        }
        if (dealsRes && 'json' in dealsRes) {
          const d = await (dealsRes as Response).json();
          if (d.success) { setTopDeals(d.deals || []); cachePayload.topDeals = d.deals || []; }
        }
        if (trendRes && 'json' in trendRes) {
          const d = await (trendRes as Response).json();
          if (d.success) setQualityTrend(d.trend || []);
        }
        if (insightsRes && 'json' in insightsRes) {
          const d = await (insightsRes as Response).json();
          if (d.success) { setInsights(d.insights || []); cachePayload.insights = d.insights || []; }
        }
        if (goalRes && 'json' in goalRes) {
          const d = await (goalRes as Response).json();
          if (d.success) { setGoalProgress(d.teamProgress); cachePayload.goalProgress = d.teamProgress; }
        }
        if (activityRes && 'json' in activityRes) {
          const d = await (activityRes as Response).json();
          if (d.success) { setLiveActivity(d.activities || []); cachePayload.liveActivity = d.activities || []; }
        }
        if (teamPerfRes && 'json' in teamPerfRes) {
          const d = await (teamPerfRes as Response).json();
          if (d.success) {
            const perf = Array.isArray(d.performance) ? d.performance : (d.performance?.performance || []);
            setTeamPerformance(perf);
            cachePayload.teamPerformance = perf;
          }
        }

        // Save to cache (plain data only — no component refs!)
        setCachedData(orgId!, cachePayload);
        setHasData(true);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setHasData(true);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [orgId, dateRange, selectedTeam]);

  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'דוח ביצועים - ' + dateRange + '\n\n';
    csvContent += 'מדדים ראשיים\nמדד,ערך,יעד,שינוי\n';
    kpiData.forEach(kpi => { csvContent += `${kpi.label},${kpi.value},${kpi.goal || '-'},${kpi.change || '-'}%\n`; });
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

  // ── First visit ever (no cache, no data): show skeleton ──
  if (!hasData) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: '#fafbfc' }}>
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <SkeletonPulse className="w-48 h-7 rounded mb-2" />
              <SkeletonPulse className="w-64 h-4 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonPulse className="w-[130px] h-9 rounded" />
              <SkeletonPulse className="w-[130px] h-9 rounded" />
            </div>
          </div>
          <KPISkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 mb-8">
            <div className="lg:col-span-7"><CardSkeleton lines={4} /></div>
            <div className="lg:col-span-3"><CardSkeleton lines={3} /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        </div>
      </div>
    );
  }

  // ── Helpers ──
  const hasMeaningfulTrend = (trend?: string) => {
    if (!trend) return false;
    const cleaned = trend.replace(/[+\-%]/g, '').trim();
    return cleaned !== '0' && cleaned !== '';
  };

  const getTrendIcon = (dir: string) => {
    if (dir === 'up') return <ArrowUpRight className="w-3 h-3" />;
    if (dir === 'down') return <ArrowDownRight className="w-3 h-3" />;
    return <ArrowRight className="w-3 h-3" />;
  };
  const getTrendColor = (dir: string) => {
    if (dir === 'up') return '#059669';
    if (dir === 'down') return '#dc2626';
    return '#94a3b8';
  };

  // Resolve icon by index at render time (never from state)
  const iconSet = centerType === 'support' ? supportIcons : salesIcons;

  // ── RENDER (always shows full layout — numbers update in place) ──
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#fafbfc' }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight" style={{ color: '#0f172a' }}>
              {greeting}, {userName || 'מנהל'}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: '#64748b' }}>
              {centerType === 'support' ? 'סקירה כוללת על ביצועי המוקד ואיכות השירות' : 'סקירה כוללת על ביצועי הצוות והפייפליין'}
            </p>
          </div>

          {/* ─── TOOLBAR ─── */}
          <div className="flex items-center gap-2 relative z-20">
            {/* Subtle refresh indicator */}
            {isFetching && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#94a3b8' }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>מעדכן...</span>
              </div>
            )}

            <DashboardSettings />

            {/* Team Filter */}
            <div className="relative">
              <button
                className="hidden sm:inline-flex items-center justify-between gap-2 h-9 px-3 bg-white rounded-md text-[13px] font-medium hover:bg-[#f8fafc] transition-all min-w-[130px]"
                style={{ border: '1px solid #e2e8f0', color: '#475569' }}
                onClick={() => { setIsTeamOpen(!isTeamOpen); setIsTimeOpen(false); }}
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-[14px] h-[14px]" style={{ color: '#94a3b8' }} />
                  <span className="truncate max-w-[80px]">
                    {selectedTeam === 'all' ? 'כל הצוות' : teamMembers.find(m => m.id === selectedTeam)?.name}
                  </span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform ${isTeamOpen ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
              </button>
              {isTeamOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTeamOpen(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-lg z-20 py-1 overflow-hidden" style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    <button
                      onClick={() => { setSelectedTeam('all'); setIsTeamOpen(false); }}
                      className="w-full text-right px-3.5 py-2 text-[13px] transition-colors flex items-center justify-between"
                      style={{ background: selectedTeam === 'all' ? '#e0f2fe' : 'transparent', color: selectedTeam === 'all' ? '#0284c7' : '#475569' }}
                    >
                      <span>כל הצוות</span>
                      {selectedTeam === 'all' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }} />
                    <div className="max-h-[200px] overflow-y-auto">
                      {teamMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => { setSelectedTeam(member.id); setIsTeamOpen(false); }}
                          className="w-full text-right px-3.5 py-2 text-[13px] transition-colors flex items-center justify-between hover:bg-[#f1f5f9]"
                          style={{ background: selectedTeam === member.id ? '#e0f2fe' : 'transparent', color: selectedTeam === member.id ? '#0284c7' : '#475569' }}
                        >
                          <div className="flex items-center gap-2">
                            <img src={sanitizeUrl(member.avatar) || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} className="w-5 h-5 rounded-full object-cover" alt="" />
                            <span className="truncate">{member.name}</span>
                          </div>
                          {selectedTeam === member.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <button
                className="inline-flex items-center justify-between gap-2 h-9 px-3 bg-white rounded-md text-[13px] font-medium hover:bg-[#f8fafc] transition-all min-w-[130px]"
                style={{ border: '1px solid #e2e8f0', color: '#475569' }}
                onClick={() => { setIsTimeOpen(!isTimeOpen); setIsTeamOpen(false); }}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-[14px] h-[14px]" style={{ color: '#94a3b8' }} />
                  <span>{dateRange}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
              </button>
              {isTimeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTimeOpen(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-lg z-20 py-1" style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                    {['היום', 'אתמול', '7 ימים אחרונים', '30 ימים אחרונים', 'חודש נוכחי'].map(range => (
                      <button
                        key={range}
                        onClick={() => { setDateRange(range); setIsTimeOpen(false); }}
                        className="w-full text-right px-3.5 py-2 text-[13px] transition-colors flex items-center justify-between hover:bg-[#f1f5f9]"
                        style={{ background: dateRange === range ? '#e0f2fe' : 'transparent', color: dateRange === range ? '#0284c7' : '#475569', fontWeight: dateRange === range ? 500 : 400 }}
                      >
                        <span>{range}</span>
                        {dateRange === range && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export */}
            <button
              onClick={exportToCSV}
              className="h-9 px-3 bg-white rounded-md text-[13px] font-medium hover:bg-[#f8fafc] transition-all inline-flex items-center gap-1.5"
              style={{ border: '1px solid #e2e8f0', color: '#475569' }}
              title="ייצוא דוח"
            >
              <Download className="w-[14px] h-[14px]" />
              <span className="hidden sm:inline">ייצוא</span>
            </button>
          </div>
        </div>

        {/* ─── KPI CARDS ─── */}
        {!hiddenWidgets.includes('kpis') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {(kpiData.length > 0 ? kpiData : [
              { label: 'סה"כ שיחות', value: 0, trend: '', trendDirection: 'neutral' },
              { label: 'פגישות שנקבעו', value: 0, trend: '', trendDirection: 'neutral' },
              { label: 'אחוז סגירה (צוות)', value: '0%', trend: '', trendDirection: 'neutral' },
              { label: 'איכות שיחה ממוצעת', value: 0, trend: '', trendDirection: 'neutral' },
            ]).map((kpi, index) => {
              const KpiIcon = iconSet[index] || salesIcons[0];
              const color = kpiColors[index] || kpiColors[0];
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-default"
                  style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <KpiIcon className="w-[18px] h-[18px]" style={{ color, opacity: 0.6 }} strokeWidth={1.5} />
                    {hasMeaningfulTrend(kpi.trend) && (
                      <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: getTrendColor(kpi.trendDirection || 'neutral') }}>
                        {getTrendIcon(kpi.trendDirection || 'neutral')}
                        {kpi.trend}
                      </span>
                    )}
                  </div>
                  <div className="text-[48px] font-bold leading-none transition-all duration-300" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' }}>
                    {kpi.value}
                  </div>
                  <div className="text-[13px] font-medium mt-2" style={{ color: '#64748b' }}>{kpi.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MIDDLE SECTION: Insights (70%) + Goals (30%) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 mb-8">
          <div className="lg:col-span-7 space-y-5">
            {!hiddenWidgets.includes('ai-insights') && <AIInsightsCard insights={insights} loading={false} />}
            {!hiddenWidgets.includes('live-activity') && <LiveActivityCard activities={liveActivity} loading={false} />}
          </div>
          <div className="lg:col-span-3">
            {!hiddenWidgets.includes('goal-progress') && (
              <GoalProgressCard
                teamProgress={goalProgress || { calls: { current: 0, target: 10, percentage: 0 }, meetings: { current: 0, target: 3, percentage: 0 }, deals: { current: 0, target: 1, percentage: 0 } }}
                loading={false}
              />
            )}
          </div>
        </div>

        {/* ─── BOTTOM SECTION: 3 Columns ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Column 1: Pipeline & Revenue */}
          {!hiddenWidgets.includes('pipeline') && (
            <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <button onClick={() => toggleSection('pipeline')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" style={{ color: '#6366f1' }} strokeWidth={1.5} />
                  <h3 className="text-[14px] font-semibold" style={{ color: '#1e293b' }}>פייפליין והכנסות</h3>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.pipeline ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
              </button>
              {!expandedSections.pipeline && (
                <div className="px-5 pb-4">
                  <span className="text-[36px] font-bold ltr transition-all duration-300" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' }}>₪{funnelData.reduce((s, f) => s + (f.value || 0), 0).toLocaleString()}</span>
                  <p className="text-[12px] mt-0.5" style={{ color: '#94a3b8' }}>סה"כ בפייפליין</p>
                </div>
              )}
              {expandedSections.pipeline && (
                <div className="px-5 pb-5 space-y-3 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                  {funnelData.length === 0 ? (
                    <p className="text-[13px] text-center py-4" style={{ color: '#94a3b8' }}>אין נתוני פייפליין</p>
                  ) : (
                    funnelData.map((stage, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-16 text-[12px] font-medium truncate text-right shrink-0" style={{ color: '#64748b' }}>{stage.name}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stage.value / maxPipelineValue) * 100}%`, backgroundColor: stage.color || '#6366f1', opacity: stage.color ? 1 : 0.6 + (index * 0.1) }} />
                        </div>
                        <span className="text-[12px] font-semibold w-14 text-left shrink-0 ltr" style={{ color: '#334155', fontVariantNumeric: 'tabular-nums' }}>₪{(stage.value / 1000).toLocaleString()}k</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Column 2: Team Performance */}
          {!hiddenWidgets.includes('team-performance') && (
            <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <button onClick={() => toggleSection('team')} className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" style={{ color: '#059669' }} strokeWidth={1.5} />
                  <h3 className="text-[14px] font-semibold" style={{ color: '#1e293b' }}>ביצועי צוות</h3>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.team ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
              </button>
              {!expandedSections.team && (
                <div className="px-5 pb-4">
                  <span className="text-[36px] font-bold transition-all duration-300" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' }}>{teamMembers.length}</span>
                  <p className="text-[12px] mt-0.5" style={{ color: '#94a3b8' }}>נציגים פעילים</p>
                </div>
              )}
              {expandedSections.team && (
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th className="py-2 px-3 text-[11px] font-medium uppercase" style={{ color: '#64748b', letterSpacing: '0.05em' }}>נציג</th>
                          <th className="py-2 px-2 text-[11px] font-medium uppercase text-center" style={{ color: '#64748b', letterSpacing: '0.05em' }}>שיחות</th>
                          <th className="py-2 px-3 text-[11px] font-medium uppercase text-left" style={{ color: '#64748b', letterSpacing: '0.05em' }}>הכנסות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPerformance.length === 0 ? (
                          <tr><td colSpan={3} className="text-center py-8 text-[13px]" style={{ color: '#94a3b8' }}>אין נתוני ביצועים</td></tr>
                        ) : (
                          teamPerformance.slice(0, 5).map((member) => (
                            <tr key={member.id} className="hover:bg-[#fafbfc] transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={sanitizeUrl(member.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&size=24`}
                                    alt=""
                                    className="w-6 h-6 rounded-full"
                                  />
                                  <span className="text-[13px] font-medium truncate max-w-[80px]" style={{ color: '#334155' }}>{member.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center text-[13px] font-semibold" style={{ color: '#334155', fontVariantNumeric: 'tabular-nums' }}>{member.calls || 0}</td>
                              <td className="py-2.5 px-3 text-left text-[13px] font-semibold ltr" style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>₪{(member.revenue || 0).toLocaleString()}</td>
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

          {/* Column 3: Attention Queue */}
          {!hiddenWidgets.includes('attention-queue') && (
            <NeedsAttentionCard orgId={orgId} />
          )}
        </div>
      </div>
    </div>
  );
};
