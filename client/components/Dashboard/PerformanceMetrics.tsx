import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Phone,
    Clock,
    Target,
    Users,
    RefreshCw,
    ArrowUp,
    ArrowDown,
    BarChart3
} from 'lucide-react';

interface PerformanceMetricsProps {
    organizationId: string;
    userId?: string;
    range?: 'day' | 'week' | 'month';
    isDarkMode?: boolean;
    compact?: boolean;
}

interface Metrics {
    totalCalls: number;
    answeredCalls: number;
    connectRate: number;
    avgDuration: number;
    callsPerHour: number;
    uniqueLeads: number;
    attemptsPerLead: number;
    dispositions: Record<string, number>;
}

const dispositionLabels: Record<string, string> = {
    answered: 'ענו',
    no_answer: 'לא ענה',
    busy: 'תפוס',
    rejected: 'דחה',
    voicemail: 'תא קולי',
    failed: 'נכשל',
    wrong_number: 'מספר שגוי',
    unknown: 'לא ידוע'
};

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
    organizationId,
    userId,
    range = 'day',
    isDarkMode = false,
    compact = false
}) => {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                organizationId,
                range,
                ...(userId && { userId })
            });

            const res = await fetch(`/api/metrics/performance?${params}`);
            const data = await res.json();

            if (data.success) {
                setMetrics(data.metrics);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error('[Metrics] Error fetching:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Refresh every 2 minutes
        const interval = setInterval(fetchMetrics, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [organizationId, userId, range]);

    const rangeLabels: Record<string, string> = {
        day: 'היום',
        week: 'שבוע אחרון',
        month: 'חודש אחרון'
    };

    if (loading && !metrics) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500">
                לא נמצאו נתונים
            </div>
        );
    }

    // Calculate disposition percentages
    const totalDispositions = (Object.values(metrics.dispositions) as number[]).reduce((a, b) => a + b, 0);
    const dispositionPercentages = Object.entries(metrics.dispositions).map(([key, val]) => {
        const numVal = val as number;
        return {
            key,
            label: dispositionLabels[key] || key,
            value: numVal,
            percentage: totalDispositions > 0 ? Math.round((numVal / totalDispositions) * 100) : 0
        };
    }).sort((a, b) => b.value - a.value);

    if (compact) {
        return (
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-brand-500" />
                    <span className="font-bold">{metrics.totalCalls}</span>
                    <span className="text-slate-500">שיחות</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-green-500" />
                    <span className="font-bold">{metrics.connectRate}%</span>
                    <span className="text-slate-500">מענה</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-bold">{Math.floor(metrics.avgDuration / 60)}:{(metrics.avgDuration % 60).toString().padStart(2, '0')}</span>
                    <span className="text-slate-500">ממוצע</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">ביצועים</h3>
                        <p className="text-xs text-slate-500">{rangeLabels[range]}</p>
                    </div>
                </div>
                <button
                    onClick={fetchMetrics}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="רענן נתונים"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                {/* Calls/Hour */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                        <TrendingUp className="w-4 h-4" />
                        שיחות לשעה
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {metrics.callsPerHour}
                    </div>
                </div>

                {/* Connect Rate */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                        <Target className="w-4 h-4" />
                        אחוז מענה
                    </div>
                    <div className={`text-2xl font-bold ${metrics.connectRate >= 50 ? 'text-green-600' :
                        metrics.connectRate >= 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {metrics.connectRate}%
                    </div>
                </div>

                {/* Attempts/Lead */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                        <Users className="w-4 h-4" />
                        ניסיונות לליד
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {metrics.attemptsPerLead}
                    </div>
                </div>

                {/* Avg Duration */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                        <Clock className="w-4 h-4" />
                        זמן שיחה ממוצע
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {Math.floor(metrics.avgDuration / 60)}:{(metrics.avgDuration % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            </div>

            {/* Disposition Breakdown */}
            <div className="px-5 pb-5">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">התפלגות תוצאות</h4>
                <div className="space-y-2">
                    {dispositionPercentages.slice(0, 5).map((disp) => (
                        <div key={disp.key} className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-20 truncate">{disp.label}</span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${disp.key === 'answered' ? 'bg-green-500' :
                                        disp.key === 'no_answer' ? 'bg-yellow-500' :
                                            disp.key === 'rejected' ? 'bg-red-500' : 'bg-slate-400'
                                        }`}
                                    style={{ width: `${disp.percentage}%` }}
                                />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-12 text-left">
                                {disp.value} ({disp.percentage}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>סה"כ: {metrics.totalCalls} שיחות | {metrics.uniqueLeads} לידים</span>
                {lastUpdated && (
                    <span>עודכן: {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
            </div>
        </div>
    );
};
