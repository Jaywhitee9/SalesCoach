import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
  Users,
  AlertOctagon,
  Phone,
  Target,
  CheckCircle2,
  BarChart3,
  UserPlus,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { LeadDrawer } from '../Leads/LeadDrawer';
import { supabase } from '../../src/lib/supabaseClient';
import { Lead, User } from '../../types';

interface PipelineDashboardProps {
  isDarkMode: boolean;
  currentUser?: User;
}

// Gradient colors for pipeline stages
const STAGE_GRADIENTS = [
  'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
  'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
  'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)',
  'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(90deg, #10b981 0%, #059669 100%)',
];

// ─── SessionStorage Cache Helpers ───
const CACHE_KEY = 'pipeline_cache';
const CACHE_TTL = 60_000; // 1 minute

const getCachedData = (orgId: string) => {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${orgId}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setCachedData = (orgId: string, data: any) => {
  try {
    sessionStorage.setItem(`${CACHE_KEY}_${orgId}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full, ignore */ }
};

// ─── Skeleton Components ───
const SkeletonPulse: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`animate-pulse rounded ${className}`} style={{ background: '#e5e7eb', ...style }} />
);

const KPISkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="bg-white rounded-lg p-5" style={{ border: '1px solid #e5e7eb' }}>
        <SkeletonPulse className="w-5 h-5 rounded mb-4" />
        <SkeletonPulse className="w-20 h-12 rounded mb-2" />
        <SkeletonPulse className="w-24 h-4 rounded" />
      </div>
    ))}
  </div>
);

const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 4 }) => (
  <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
    <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <SkeletonPulse className="w-4 h-4 rounded" />
      <SkeletonPulse className="w-28 h-4 rounded" />
    </div>
    <div className="p-5 space-y-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i}>
          <div className="flex justify-between mb-2">
            <SkeletonPulse className="w-20 h-3 rounded" />
            <SkeletonPulse className="w-12 h-3 rounded" />
          </div>
          <SkeletonPulse className="w-full h-7 rounded-md" style={{ opacity: 1 - i * 0.12 }} />
        </div>
      ))}
    </div>
  </div>
);

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

  // Progressive loading flags
  const [tier1Loaded, setTier1Loaded] = useState(false);
  const [tier2Loaded, setTier2Loaded] = useState(false);
  const [tier3Loaded, setTier3Loaded] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

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

  // Progressive Data Fetching
  useEffect(() => {
    if (!currentUser?.organization_id) {
      setInitialLoad(false);
      setTier1Loaded(true);
      setTier2Loaded(true);
      setTier3Loaded(true);
      return;
    }

    // Try cache first
    const cached = getCachedData(currentUser.organization_id);
    if (cached) {
      if (cached.stats) setStats(cached.stats);
      if (cached.funnelData) setFunnelData(cached.funnelData);
      if (cached.sourcesData) setSourcesData(cached.sourcesData);
      if (cached.atRiskLeads) setAtRiskLeads(cached.atRiskLeads);
      if (cached.unassignedLeads) setUnassignedLeads(cached.unassignedLeads);
      setTier1Loaded(true);
      setTier2Loaded(true);
      setTier3Loaded(true);
      setInitialLoad(false);
    }

    const fetchData = async () => {
      try {
        let targetUserId = '';
        if (isRep && currentUser?.id) {
          targetUserId = currentUser.id;
        } else if (!isRep && selectedTeam !== 'all') {
          targetUserId = selectedTeam;
        }

        const userIdParam = targetUserId ? `&userId=${targetUserId}` : '';
        const rangeParam = `&range=${dateRange === 'היום' ? 'day' : dateRange === 'שבוע' ? 'week' : 'month'}`;
        const orgParam = currentUser?.organization_id ? `&organizationId=${currentUser.organization_id}` : '';

        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
          'Authorization': `Bearer ${session?.access_token}`
        };

        // ── TIER 1: KPIs (fastest, most important) ──
        const statsRes = await fetch(`/api/panel/stats?${rangeParam.substring(1)}${userIdParam}${orgParam}`, { headers });
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.stats);
        setTier1Loaded(true);
        setInitialLoad(false);

        // ── TIER 2: Charts (visualizations) ──
        const [funnelRes, sourcesRes] = await Promise.all([
          fetch(`/api/pipeline/funnel?${rangeParam.substring(1)}${userIdParam}${orgParam}`, { headers }),
          fetch(`/api/pipeline/sources?${rangeParam.substring(1)}${userIdParam}${orgParam}`, { headers }),
        ]);

        const [funnel, sources] = await Promise.all([funnelRes.json(), sourcesRes.json()]);
        if (funnel.success) setFunnelData(funnel.funnel);
        if (sources.success) setSourcesData(sources.sources);
        setTier2Loaded(true);

        // ── TIER 3: Lead lists (least important) ──
        const [riskRes, unassignedRes] = await Promise.all([
          fetch(`/api/panel/at-risk-leads?limit=5${userIdParam}${orgParam}`, { headers }),
          !isRep ? fetch(`/api/pipeline/unassigned?limit=5${orgParam}`, { headers }) : Promise.resolve({ json: () => ({ success: true, leads: [] }) })
        ]);

        const [risk, unassigned] = await Promise.all([riskRes.json(), unassignedRes.json()]);
        if (risk.success) setAtRiskLeads(risk.leads);
        if (unassigned.success) setUnassignedLeads(unassigned.leads);
        setTier3Loaded(true);

        // Save to cache
        setCachedData(currentUser!.organization_id!, {
          stats: statsData.success ? statsData.stats : null,
          funnelData: funnel.success ? funnel.funnel : [],
          sourcesData: sources.success ? sources.sources : [],
          atRiskLeads: risk.success ? risk.leads : [],
          unassignedLeads: unassigned.success ? unassigned.leads : [],
        });

      } catch (err) {
        console.error('Error fetching pipeline data:', err);
        setInitialLoad(false);
        setTier1Loaded(true);
        setTier2Loaded(true);
        setTier3Loaded(true);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedTeam, currentUser?.organization_id, currentUser?.id, isRep]);

  // Derived Values
  const totalSourcesValue = sourcesData.reduce((acc, curr) => acc + curr[sourceMetric], 0);
  const maxSourceValue = sourcesData.length > 0 ? Math.max(...sourcesData.map(s => s[sourceMetric])) : 1;
  const maxFunnelCount = funnelData.length > 0 ? Math.max(...funnelData.map(s => s.count), 1) : 1;

  // KPI config
  const kpiIconConfigs = [
    { icon: Phone, color: '#6366f1' },
    { icon: UserPlus, color: '#059669' },
    { icon: Calendar, color: '#2563eb' },
    { icon: TrendingUp, color: '#d97706' },
  ];

  const kpis = [
    { label: 'סה"כ שיחות', value: stats?.leadsContacted?.current || 0, change: stats?.leadsContacted?.change, positive: true },
    { label: 'לידים חדשים', value: stats?.newLeads?.current || 0, change: stats?.newLeads?.change, positive: true },
    { label: 'פגישות', value: stats?.appointments?.current || 0, change: stats?.appointments?.change, positive: true },
    { label: 'סגירות', value: stats?.closedDeals?.current || 0, change: stats?.closedDeals?.change, positive: true },
  ];

  const hasMeaningfulChange = (change?: string) => {
    if (!change) return false;
    const cleaned = change.replace(/[+\-%]/g, '').trim();
    return cleaned !== '0' && cleaned !== '';
  };

  const sourceNameMap: Record<string, string> = {
    'Website': 'אתר אינטרנט',
    'Unknown': 'לא ידוע',
    'Webinar': 'וובינר',
    'LinkedIn': 'לינקדאין',
    'Facebook': 'פייסבוק',
    'Referral': 'הפניה',
    'Instagram': 'אינסטגרם',
  };

  // ── Skeleton full-page for initial load ──
  if (initialLoad && !stats) {
    return (
      <div className="flex-1 overflow-y-auto font-sans" style={{ background: '#fafbfc' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 40px' }}>
          {/* Header skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <SkeletonPulse className="w-40 h-7 rounded mb-2" />
              <SkeletonPulse className="w-56 h-4 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonPulse className="w-[140px] h-9 rounded" />
              <SkeletonPulse className="w-[130px] h-9 rounded" />
            </div>
          </div>
          <KPISkeleton />
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 mb-8">
            <div className="xl:col-span-7"><CardSkeleton lines={5} /></div>
            <div className="xl:col-span-3"><CardSkeleton lines={4} /></div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto font-sans" style={{ background: '#fafbfc' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 40px' }}>

        {/* ═══════════════════════ HEADER ═══════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[24px] font-bold" style={{ color: '#0f172a', letterSpacing: '-0.5px' }}>
              {isRep ? 'הפאנל שלי' : 'לידים & פאנל'}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: '#64748b' }}>
              {isRep ? 'ביצועים אישיים בזמן אמת' : 'סקירת משפך המכירות וניהול לידים'}
            </p>
          </div>

          {/* Filter Group */}
          <div className="flex items-center gap-2 relative z-20">
            {/* Team Dropdown (Managers Only) */}
            {!isRep && (
              <div className="relative">
                <button
                  onClick={() => { setIsTeamOpen(!isTeamOpen); setIsTimeOpen(false); }}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors hover:bg-white"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#334155', minWidth: 140 }}
                >
                  <Users className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                  <span className="truncate max-w-[100px]">
                    {selectedTeam === 'all' ? 'כל הצוות' : teamMembers.find(m => m.id === selectedTeam)?.name || 'כל הצוות'}
                  </span>
                  <ChevronDown className={`w-3 h-3 mr-auto transition-transform ${isTeamOpen ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
                </button>

                {isTeamOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsTeamOpen(false)} />
                    <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-lg z-20 py-1 overflow-hidden"
                      style={{ border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                      <button
                        onClick={() => { setSelectedTeam('all'); setIsTeamOpen(false); }}
                        className="w-full text-right px-3.5 py-2 text-[13px] hover:bg-[#f8fafc] transition-colors flex items-center justify-between"
                        style={{ color: selectedTeam === 'all' ? '#2563eb' : '#334155', fontWeight: selectedTeam === 'all' ? 600 : 400 }}
                      >
                        <span>כל הצוות</span>
                        {selectedTeam === 'all' && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />}
                      </button>
                      <div style={{ height: 1, background: '#f1f5f9', margin: '2px 0' }} />
                      <div className="max-h-[240px] overflow-y-auto">
                        {teamMembers.map(member => (
                          <button
                            key={member.id}
                            onClick={() => { setSelectedTeam(member.id); setIsTeamOpen(false); }}
                            className="w-full text-right px-3.5 py-2 text-[13px] hover:bg-[#f8fafc] transition-colors flex items-center justify-between"
                            style={{ color: selectedTeam === member.id ? '#2563eb' : '#334155', fontWeight: selectedTeam === member.id ? 600 : 400 }}
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=24`} className="w-5 h-5 rounded-full" alt="" />
                              <span className="truncate">{member.name}</span>
                            </div>
                            {selectedTeam === member.id && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />}
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
              <button
                onClick={() => { setIsTimeOpen(!isTimeOpen); setIsTeamOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors hover:bg-white"
                style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#334155', minWidth: 130 }}
              >
                <Calendar className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                <span>{dateRange === 'month' ? 'החודש' : dateRange === 'week' ? 'השבוע' : dateRange === 'היום' ? 'היום' : dateRange}</span>
                <ChevronDown className={`w-3 h-3 mr-auto transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
              </button>

              {isTimeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTimeOpen(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-lg z-20 py-1"
                    style={{ border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                    {[{ key: 'היום', label: 'היום' }, { key: 'week', label: 'השבוע' }, { key: 'month', label: 'החודש' }].map(range => (
                      <button
                        key={range.key}
                        onClick={() => { setDateRange(range.key); setIsTimeOpen(false); }}
                        className="w-full text-right px-3.5 py-2 text-[13px] hover:bg-[#f8fafc] transition-colors flex items-center justify-between"
                        style={{ color: dateRange === range.key ? '#2563eb' : '#334155', fontWeight: dateRange === range.key ? 600 : 400 }}
                      >
                        <span>{range.label}</span>
                        {dateRange === range.key && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════ KPI STRIP ═══════════════════════ */}
        {tier1Loaded ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {kpis.map((kpi, index) => {
              const config = kpiIconConfigs[index] || kpiIconConfigs[0];
              const KpiIcon = config.icon;

              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-default"
                  style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <KpiIcon className="w-[18px] h-[18px]" style={{ color: config.color, opacity: 0.6 }} strokeWidth={1.5} />
                    {hasMeaningfulChange(kpi.change) && (
                      <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: kpi.positive ? '#059669' : '#dc2626' }}>
                        {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.change}
                      </span>
                    )}
                  </div>
                  <div className="text-[48px] font-bold leading-none" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' }}>
                    {kpi.value}
                  </div>
                  <div className="text-[13px] font-medium mt-2" style={{ color: '#64748b' }}>{kpi.label}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <KPISkeleton />
        )}

        {/* ═══════════════════════ MIDDLE: PIPELINE + SOURCES ═══════════════════════ */}
        {tier2Loaded ? (
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 mb-8">

            {/* LEFT: Pipeline Funnel (70%) */}
            <div className="xl:col-span-7 bg-white rounded-lg overflow-hidden"
              style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" style={{ color: '#6366f1' }} strokeWidth={1.5} />
                  <div>
                    <h2 className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>משפך המכירות</h2>
                    <p className="text-[12px]" style={{ color: '#94a3b8' }}>נתונים בזמן אמת • {isRep ? 'הפעילות שלי' : 'כלל הארגון'}</p>
                  </div>
                </div>
              </div>

              {/* Funnel Bars */}
              <div className="px-6 py-6 space-y-6">
                {funnelData.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: '#d1d5db' }} strokeWidth={1.5} />
                    <p className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>אין נתוני משפך</p>
                    <p className="text-[13px] mt-1" style={{ color: '#94a3b8' }}>הנתונים יופיעו כאן כשיהיו לידים</p>
                  </div>
                ) : (
                  funnelData.map((stage, index) => {
                    const barWidth = maxFunnelCount > 0 ? Math.max((stage.count / maxFunnelCount) * 100, 3) : 3;
                    const gradient = STAGE_GRADIENTS[index % STAGE_GRADIENTS.length];

                    return (
                      <div key={stage.id} className="group">
                        <div className="flex items-baseline justify-between mb-2.5">
                          <span className="text-[14px] font-medium" style={{ color: '#1e293b' }}>{stage.label}</span>
                          <div className="flex items-baseline gap-3">
                            <span className="text-[18px] font-bold" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' }}>
                              {stage.count}
                            </span>
                            <span className="text-[12px] font-semibold" style={{ color: '#64748b' }}>
                              {stage.percentage || Math.round((stage.count / (maxFunnelCount || 1)) * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="h-7 rounded-md overflow-hidden" style={{ background: '#f1f5f9' }}>
                          <div
                            className="h-full rounded-md transition-all duration-700 group-hover:brightness-110"
                            style={{ width: `${barWidth}%`, background: gradient }}
                          />
                        </div>

                        {index < funnelData.length - 1 && (
                          <div className="mt-4" style={{ height: 1, background: '#e5e7eb', opacity: 0.5 }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: Source Breakdown (30%) */}
            <div className="xl:col-span-3 bg-white rounded-lg overflow-hidden flex flex-col"
              style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4" style={{ color: '#2563eb' }} strokeWidth={1.5} />
                  <h2 className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>פילוח מקורות</h2>
                </div>
              </div>

              <div className="px-5 pt-3 flex gap-1" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setSourceMetric('leads')}
                  className="px-4 py-2 text-[13px] font-medium transition-colors"
                  style={{
                    color: sourceMetric === 'leads' ? '#2563eb' : '#64748b',
                    borderBottom: sourceMetric === 'leads' ? '2px solid #2563eb' : '2px solid transparent',
                    fontWeight: sourceMetric === 'leads' ? 600 : 500,
                    marginBottom: -1,
                  }}
                >
                  לידים
                </button>
                <button
                  onClick={() => setSourceMetric('revenue')}
                  className="px-4 py-2 text-[13px] font-medium transition-colors"
                  style={{
                    color: sourceMetric === 'revenue' ? '#2563eb' : '#64748b',
                    borderBottom: sourceMetric === 'revenue' ? '2px solid #2563eb' : '2px solid transparent',
                    fontWeight: sourceMetric === 'revenue' ? 600 : 500,
                    marginBottom: -1,
                  }}
                >
                  הכנסות
                </button>
              </div>

              <div className="px-5 py-5 flex-1 space-y-5">
                {sourcesData.length === 0 ? (
                  <div className="text-center py-10">
                    <Target className="w-6 h-6 mx-auto mb-2" style={{ color: '#d1d5db' }} strokeWidth={1.5} />
                    <p className="text-[13px] font-medium" style={{ color: '#64748b' }}>אין נתוני מקורות</p>
                  </div>
                ) : (
                  sourcesData.slice(0, 5).map((source, i) => {
                    const value = source[sourceMetric];
                    const percentage = totalSourcesValue > 0 ? Math.round((value / totalSourcesValue) * 100) : 0;
                    const widthPercentage = maxSourceValue > 0 ? Math.max((value / maxSourceValue) * 100, 5) : 0;

                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-medium" style={{ color: '#1e293b' }}>
                            {sourceNameMap[source.name] || source.name}
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[16px] font-bold" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {sourceMetric === 'revenue' ? `₪${value.toLocaleString('he-IL')}` : value}
                            </span>
                            <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>({percentage}%)</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${widthPercentage}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {sourcesData.length > 0 && (
                <div className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p className="text-[12px] text-center" style={{ color: '#64748b' }}>
                    סה"כ: <span className="font-bold" style={{ color: '#0f172a' }}>
                      {sourceMetric === 'revenue' ? `₪${totalSourcesValue.toLocaleString('he-IL')}` : totalSourcesValue}
                    </span> {sourceMetric === 'leads' ? 'לידים' : 'הכנסות'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 mb-8">
            <div className="xl:col-span-7"><CardSkeleton lines={5} /></div>
            <div className="xl:col-span-3"><CardSkeleton lines={4} /></div>
          </div>
        )}

        {/* ═══════════════════════ BOTTOM: AT-RISK + UNASSIGNED ═══════════════════════ */}
        {tier3Loaded ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* LEFT: Leads at Risk */}
            <div className="bg-white rounded-lg overflow-hidden"
              style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-4 h-4" style={{ color: '#d97706' }} strokeWidth={1.5} />
                  <div>
                    <h2 className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>לידים בסיכון</h2>
                    {atRiskLeads.length > 0 && (
                      <p className="text-[12px]" style={{ color: '#d97706' }}>דורש תשומת לב • {atRiskLeads.length} לידים</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6">
                {atRiskLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#d1fae5' }}>
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#059669' }} />
                    </div>
                    <p className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>אין לידים בסיכון</p>
                    <p className="text-[13px] mt-1" style={{ color: '#94a3b8' }}>כל הלידים פעילים ומטופלים</p>
                  </div>
                ) : (
                  atRiskLeads.map((lead, idx) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="py-4 cursor-pointer group hover:bg-[#fafbfc] -mx-6 px-6 transition-colors"
                      style={{ borderBottom: idx < atRiskLeads.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <h3 className="text-[14px] font-semibold" style={{ color: '#0f172a' }}>{lead.name}</h3>
                        <span
                          className="text-[11px] font-semibold uppercase px-2 py-1 rounded"
                          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', letterSpacing: '0.3px' }}
                        >
                          {typeof lead.timeSinceActivity === 'string' ? lead.timeSinceActivity : 'זמן רב'}
                        </span>
                      </div>
                      <p className="text-[12px] flex items-center gap-1" style={{ color: '#64748b' }}>
                        <Clock className="w-3 h-3" /> אין פעילות זמן רב
                      </p>
                      <span
                        className="text-[12px] font-medium flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#2563eb' }}
                      >
                        פרטים <ArrowRight className="w-3 h-3" style={{ transform: 'rotate(180deg)' }} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Unassigned Leads (Manager Only) or Quick Stats (Rep) */}
            {!isRep ? (
              <div className="bg-white rounded-lg overflow-hidden"
                style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>

                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4" style={{ color: '#d97706' }} strokeWidth={1.5} />
                    <div>
                      <h2 className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>לידים לא מוקצים</h2>
                      {unassignedLeads.length > 0 && (
                        <p className="text-[12px]" style={{ color: '#d97706' }}>דורש הקצאה • {unassignedLeads.length} לידים</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6">
                  {unassignedLeads.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#d1fae5' }}>
                        <CheckCircle2 className="w-5 h-5" style={{ color: '#059669' }} />
                      </div>
                      <p className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>הכל מוקצה</p>
                      <p className="text-[13px] mt-1" style={{ color: '#94a3b8' }}>אין לידים חדשים להקצאה</p>
                    </div>
                  ) : (
                    unassignedLeads.map((lead, idx) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="py-4 cursor-pointer group hover:bg-[#fafbfc] -mx-6 px-6 transition-colors flex items-center justify-between"
                        style={{ borderBottom: idx < unassignedLeads.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                      >
                        <h3 className="text-[14px] font-semibold" style={{ color: '#0f172a' }}>{lead.name}</h3>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded"
                            style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                          >
                            {sourceNameMap[lead.source || ''] || lead.source || 'לא ידוע'}
                          </span>
                          <span
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[12px] font-medium flex items-center gap-1"
                            style={{ color: '#2563eb' }}
                          >
                            הקצה <ArrowRight className="w-3 h-3" style={{ transform: 'rotate(180deg)' }} />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg overflow-hidden"
                style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <BarChart3 className="w-4 h-4" style={{ color: '#2563eb' }} strokeWidth={1.5} />
                  <h2 className="text-[15px] font-semibold" style={{ color: '#0f172a' }}>סטטיסטיקות מהירות</h2>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { label: 'נוצרו היום', value: stats?.newLeads?.current || 0 },
                    { label: 'סגירה צפויה', value: stats?.closedDeals?.current || 0 },
                    { label: 'בטיפול', value: stats?.leadsContacted?.current || 0 },
                    { label: 'ממתינים', value: stats?.appointments?.current || 0 },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-md p-4 text-center hover:bg-white transition-all"
                      style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                      <div className="text-[12px] font-medium mb-2" style={{ color: '#64748b' }}>{stat.label}</div>
                      <div className="text-[28px] font-bold" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </div>
        )}

        {/* ═══════════════════════ LEAD DRAWER ═══════════════════════ */}
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />

      </div>
    </div>
  );
};
