import React, { useState, useEffect } from 'react';
import {
    Phone,
    Users,
    Calendar,
    Target,
    Flame,
    AlertTriangle,
    Clock,
    ChevronLeft,
    TrendingUp,
    Play
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { User } from '../../types';

interface PanelDashboardProps {
    isDarkMode: boolean;
    onStartCall?: (phone: string, leadId: string) => void;
    currentUser?: User;
}

interface PanelStats {
    leadsContacted: { current: number; target: number; percentage: number };
    newLeads: { current: number; target: number; percentage: number };
    appointments: { current: number; target: number; percentage: number };
    closedDeals: { current: number; target: number; percentage: number };
}

interface HotLead {
    id: string;
    name: string;
    company: string;
    phone: string;
    score: number;
    daysSinceCreated: number;
    status: string;
}

interface AtRiskLead {
    id: string;
    name: string;
    company: string;
    phone: string;
    timeSinceActivity: string;
    hoursSinceActivity: number;
    status: string;
}

interface QueueLead {
    id: string;
    name: string;
    company: string;
    phone: string;
    status: string;
    priority: string;
    lastActivity: string;
    nextStep: string;
    source: string;
}

export const PanelDashboard: React.FC<PanelDashboardProps> = ({ isDarkMode, onStartCall, currentUser }) => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [stats, setStats] = useState<PanelStats | null>(null);
    const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
    const [atRiskLeads, setAtRiskLeads] = useState<AtRiskLead[]>([]);
    const [leadQueue, setLeadQueue] = useState<QueueLead[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all panel data
    useEffect(() => {
        const fetchPanelData = async () => {
            setLoading(true);
            try {
                const userIdParam = currentUser?.id ? `&userId=${currentUser.id}` : '';
                const orgParam = currentUser?.organization_id ? `&organizationId=${currentUser.organization_id}` : '';

                const [statsRes, hotRes, riskRes, queueRes] = await Promise.all([
                    fetch(`/api/panel/stats?range=${period}${userIdParam}${orgParam}`),
                    fetch(`/api/panel/hot-leads?limit=5${userIdParam}${orgParam}`),
                    fetch(`/api/panel/at-risk-leads?hours=48&limit=5${userIdParam}${orgParam}`),
                    fetch(`/api/panel/lead-queue?limit=10${userIdParam}${orgParam}`)
                ]);

                const [statsData, hotData, riskData, queueData] = await Promise.all([
                    statsRes.json(),
                    hotRes.json(),
                    riskRes.json(),
                    queueRes.json()
                ]);

                if (statsData.success) setStats(statsData.stats);
                if (hotData.success) setHotLeads(hotData.leads);
                if (riskData.success) setAtRiskLeads(riskData.leads);
                if (queueData.success) setLeadQueue(queueData.leads);
            } catch (err) {
                console.error('[Panel] Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPanelData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, currentUser?.id, currentUser?.organization_id]);

    // KPI Card Component
    const KPICard = ({
        title,
        current,
        target,
        percentage,
        icon: Icon,
        color
    }: {
        title: string;
        current: number;
        target: number;
        percentage: number;
        icon: any;
        color: string;
    }) => (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">{current}</span>
                <span className="text-sm text-slate-400">/ {target}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-xs text-slate-400 mt-1 block">{percentage}%</span>
        </div>
    );

    // Performance chart data
    const chartData = [
        { name: 'שיחות', value: stats?.leadsContacted.current || 0, fill: '#6366f1' },
        { name: 'לידים חדשים', value: stats?.newLeads.current || 0, fill: '#8b5cf6' },
        { name: 'פגישות', value: stats?.appointments.current || 0, fill: '#06b6d4' },
        { name: 'עסקאות', value: stats?.closedDeals.current || 0, fill: '#10b981' }
    ];

    const handleCall = (lead: HotLead | AtRiskLead | QueueLead) => {
        if (onStartCall) {
            onStartCall(lead.phone, lead.id);
        }
    };

    return (
        <div className="flex-1 overflow-auto h-full bg-slate-50 dark:bg-slate-950 p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">היעדים שלי</h1>
                        <span className="text-2xl">🎯</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">הצגה לפי {period === 'day' ? 'יום' : period === 'week' ? 'שבוע' : 'חודש'}</p>
                </div>

                {/* Period Switcher */}
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${period === p
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            {p === 'day' ? 'יום' : p === 'week' ? 'שבוע' : 'חודש'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-32 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KPICard
                        title="לידים שהתקשרתי היום"
                        current={stats?.leadsContacted.current || 0}
                        target={stats?.leadsContacted.target || 15}
                        percentage={stats?.leadsContacted.percentage || 0}
                        icon={Phone}
                        color="bg-gradient-to-br from-indigo-500 to-purple-600"
                    />
                    <KPICard
                        title="לידים חדשים היום"
                        current={stats?.newLeads.current || 0}
                        target={stats?.newLeads.target || 12}
                        percentage={stats?.newLeads.percentage || 0}
                        icon={Users}
                        color="bg-gradient-to-br from-purple-500 to-pink-600"
                    />
                    <KPICard
                        title="פגישות שנקבעו"
                        current={stats?.appointments.current || 0}
                        target={stats?.appointments.target || 5}
                        percentage={stats?.appointments.percentage || 0}
                        icon={Calendar}
                        color="bg-gradient-to-br from-cyan-500 to-blue-600"
                    />
                    <KPICard
                        title="עסקאות שנסגרו"
                        current={stats?.closedDeals.current || 0}
                        target={stats?.closedDeals.target || 2}
                        percentage={stats?.closedDeals.percentage || 0}
                        icon={Target}
                        color="bg-gradient-to-br from-emerald-500 to-green-600"
                    />
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column - Hot Leads & At Risk */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Hot Leads */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Flame className="w-5 h-5 text-orange-500" />
                            <h2 className="font-bold text-slate-900 dark:text-white">לידים חמים שלי</h2>
                        </div>

                        <div className="space-y-3">
                            {hotLeads.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">אין לידים חמים כרגע</p>
                            ) : (
                                hotLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors cursor-pointer group"
                                        onClick={() => handleCall(lead)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{lead.name}</p>
                                                <p className="text-xs text-slate-500">{lead.company}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="warning" className="text-xs">
                                                {lead.score} נק׳
                                            </Badge>
                                            <Button
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600"
                                                onClick={(e) => { e.stopPropagation(); handleCall(lead); }}
                                            >
                                                <Phone className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* At Risk Leads */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h2 className="font-bold text-slate-900 dark:text-white">לידים בסיכון שלי</h2>
                            {atRiskLeads.length > 0 && (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full font-bold">
                                    {atRiskLeads.length}
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {atRiskLeads.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">אין לידים בסיכון 🎉</p>
                            ) : (
                                atRiskLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors cursor-pointer group"
                                        onClick={() => handleCall(lead)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{lead.name}</p>
                                                <p className="text-xs text-red-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    לא שוחח כבר {lead.timeSinceActivity}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 hover:bg-orange-600"
                                            onClick={(e) => { e.stopPropagation(); handleCall(lead); }}
                                        >
                                            <Phone className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle Column - Lead Queue */}
                <div className="lg:col-span-5">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-brand-500" />
                                <h2 className="font-bold text-slate-900 dark:text-white">תור הלידים שלי</h2>
                                <span className="text-xs text-slate-400">{leadQueue.length}</span>
                            </div>
                            {leadQueue.length > 0 && (
                                <Button
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                    onClick={() => handleCall(leadQueue[0])}
                                >
                                    <Play className="w-4 h-4 ml-2" />
                                    התחל שיחה הבאה
                                </Button>
                            )}
                        </div>

                        {/* Queue Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="text-xs text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="pb-3 font-semibold">שם ליד</th>
                                        <th className="pb-3 font-semibold">סטטוס</th>
                                        <th className="pb-3 font-semibold">פעולה אחרונה</th>
                                        <th className="pb-3 font-semibold">צעד הבא</th>
                                        <th className="pb-3 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {leadQueue.map((lead, idx) => (
                                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${lead.priority === 'Hot' ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                                                        lead.priority === 'Warm' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                            'bg-gradient-to-br from-blue-400 to-indigo-500'
                                                        }`}>
                                                        {lead.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{lead.name}</p>
                                                        <p className="text-xs text-slate-500">{lead.company}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <Badge variant={
                                                    lead.status === 'New' ? 'success' :
                                                        lead.status === 'Discovery' ? 'brand' :
                                                            lead.status === 'Proposal' ? 'warning' :
                                                                'secondary'
                                                }>
                                                    {lead.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3 text-sm text-slate-500">
                                                {lead.lastActivity ? new Date(lead.lastActivity).toLocaleDateString('he-IL') : '—'}
                                            </td>
                                            <td className="py-3">
                                                <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {lead.nextStep}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30"
                                                    onClick={() => handleCall(lead)}
                                                >
                                                    <Phone className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Performance Chart */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h2 className="font-bold text-slate-900 dark:text-white">הביצועים שלי היום</h2>
                        </div>

                        {/* Stats Summary */}
                        <div className="flex gap-4 mb-4">
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats?.leadsContacted.current || 0}
                                </p>
                                <p className="text-xs text-slate-500">שיחות יוצאות</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-500">
                                    {stats?.closedDeals.current || 0 > 0 && stats?.leadsContacted.current
                                        ? Math.round((stats?.closedDeals.current / stats?.leadsContacted.current) * 100)
                                        : 0}%
                                </p>
                                <p className="text-xs text-slate-500">אחוז המרה</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                                <BarChart data={chartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                                    <XAxis type="number" tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10 }}
                                        width={70}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
