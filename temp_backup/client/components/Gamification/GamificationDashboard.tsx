import React, { useState, useEffect } from 'react';
import {
    Target,
    Zap,
    CheckCircle2,
    Loader2,
    Activity,
    Brain,
    Flame,
    Phone,
    Sparkles,
    Play,
    TrendingUp,
    TrendingDown,
    Clock,
    MessageSquare,
    BarChart3,
    ChevronLeft,
    Lock,
    ArrowUpRight,
    Shield,
    Crown,
    Medal,
    Trophy
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface GamificationDashboardProps {
    userId?: string;
    orgId?: string;
}

interface GamificationData {
    xp_total: number;
    level: number;
    current_streak: number;
}

interface Mission {
    id: string;
    mission_type: string;
    title: string;
    target: number;
    progress: number;
    completed: boolean;
    xp_reward: number;
}

// Prestige Frames Configuration
const PRESTIGE_FRAMES = [
    { level: 1, name: 'Rookie', color: 'border-slate-300', ring: 'ring-slate-200', icon: Shield, bg: 'bg-slate-100 dark:bg-slate-800' },
    { level: 5, name: 'Pro', color: 'border-emerald-400', ring: 'ring-emerald-200', icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { level: 10, name: 'Elite', color: 'border-blue-500', ring: 'ring-blue-300', icon: Medal, bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { level: 20, name: 'Master', color: 'border-purple-500', ring: 'ring-purple-300', icon: Crown, bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { level: 50, name: 'Legend', color: 'border-amber-400', ring: 'ring-amber-200', icon: Trophy, bg: 'bg-amber-50 dark:bg-amber-900/20' },
];

const LEVEL_UNLOCKS = [
    { level: 2, name: 'Objection Pack: מחיר', icon: '💰', locked: true },
    { level: 3, name: 'תבניות פולואפ', icon: '📝', locked: true },
    { level: 4, name: 'AI Boost', icon: '🤖', locked: true },
    { level: 5, name: 'Shadow Mode', icon: '👻', locked: true },
];

const MISSION_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
    calls: { label: 'שיחות', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    followup: { label: 'פולואפ', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    quality: { label: 'איכות', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
};

const generateSparklineData = (base: number) => {
    return Array.from({ length: 14 }, (_, i) =>
        Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 40))
    );
};

const calculateReadiness = (streak: number, questsCompleted: number, totalQuests: number): number => {
    const streakScore = Math.min(streak * 12, 40);
    const questScore = totalQuests > 0 ? (questsCompleted / totalQuests) * 40 : 20;
    const baseScore = 20;
    return Math.round(streakScore + questScore + baseScore);
};

const calculateLoad = (questsCompleted: number): number => {
    return Math.min(questsCompleted * 4 + 3, 21);
};

const getReadinessConfig = (score: number) => {
    if (score >= 70) return {
        color: '#059669', // Emerald 600
        ringColor: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-100 dark:border-emerald-800/30',
        label: 'מוכנות גבוהה',
        plan: 'יום חזק! לך על לידים חמים ודחוף לסגירה.',
        cta: 'התחל סשן חיוג',
        ctaIcon: Phone,
        accent: 'emerald',
        gradientFrom: 'from-emerald-50 dark:from-emerald-900/30'
    };
    if (score >= 40) return {
        color: '#d97706', // Amber 600
        ringColor: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-100 dark:border-amber-800/30',
        label: 'מוכנות בינונית',
        plan: 'שמור כוחות. תרגל התנגדויות ובצע פולואפים.',
        cta: 'סשן פולואפים',
        ctaIcon: MessageSquare,
        accent: 'amber',
        gradientFrom: 'from-amber-50 dark:from-amber-900/30'
    };
    return {
        color: '#e11d48', // Rose 600
        ringColor: 'text-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-100 dark:border-rose-800/30',
        label: 'מוכנות נמוכה',
        plan: 'קח את הזמן. האזן לשיחות עבר ובצע רפלקציה.',
        cta: 'תרגול ומנוחה',
        ctaIcon: Play,
        accent: 'rose',
        gradientFrom: 'from-rose-50 dark:from-rose-900/30'
    };
};

const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 32 }) => {
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const width = 100;

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * height; // Invert Y
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative w-full overflow-hidden" style={{ height }}>
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.1" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`M0,${height} ${points} L${width},${height} Z`}
                    fill={`url(#gradient-${color})`}
                />
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    points={points}
                />
            </svg>
        </div>
    );
};

// Compact Driver Bar
const DriverCompact: React.FC<{ label: string; cause: string; value: number }> = ({ label, cause, value }) => {
    const getColor = (v: number) => {
        if (v >= 70) return 'bg-emerald-500';
        if (v >= 40) return 'bg-amber-400';
        return 'bg-rose-400';
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{label}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{cause}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getColor(value)}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

const LEVEL_NAMES = ['מתחיל', 'פעיל', 'מתקדם', 'מומחה', 'אלוף'];

export const GamificationDashboard: React.FC<GamificationDashboardProps> = ({
    userId,
    orgId
}) => {
    const [data, setData] = useState<GamificationData | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [readinessHistory] = useState(() => generateSparklineData(75));

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !orgId) return;

            try {
                let { data: gamData } = await supabase
                    .from('user_gamification')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (!gamData) {
                    const { data: newData } = await supabase
                        .from('user_gamification')
                        .insert({ user_id: userId, organization_id: orgId })
                        .select()
                        .single();
                    gamData = newData;
                }

                setData(gamData || { xp_total: 0, level: 1, current_streak: 0 });

                const today = new Date().toISOString().split('T')[0];
                let { data: missionsData } = await supabase
                    .from('daily_missions')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('date', today);

                if (!missionsData || missionsData.length === 0) {
                    await supabase.rpc('create_daily_missions', {
                        p_user_id: userId,
                        p_org_id: orgId
                    });
                    const { data: newMissions } = await supabase
                        .from('daily_missions')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('date', today);
                    missionsData = newMissions;
                }
                setMissions(missionsData || []);

            } catch (err) {
                console.error('Gamification fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, orgId]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const completedMissions = missions.filter(m => m.completed).length;
    const readiness = calculateReadiness(data?.current_streak || 0, completedMissions, missions.length);
    const salesLoad = calculateLoad(completedMissions);
    const config = getReadinessConfig(readiness);

    const levelThresholds = [0, 100, 300, 600, 1000, 2000];
    const currentLevelMin = levelThresholds[(data?.level || 1) - 1] || 0;
    const nextLevelMin = levelThresholds[data?.level || 1] || 2000;
    const xpProgress = ((data?.xp_total || 0) - currentLevelMin) / (nextLevelMin - currentLevelMin) * 100;
    const xpRemaining = nextLevelMin - (data?.xp_total || 0);

    const drivers = [
        { label: 'איכות שיחות', cause: (data?.current_streak || 0) > 2 ? 'הקשבה מצוינת' : 'חיתוך דיבור', value: (data?.current_streak || 0) > 2 ? 85 : 45 },
        { label: 'עקביות', cause: completedMissions >= 2 ? 'SLA תקין' : 'זמן תגובה ארוך', value: completedMissions >= 2 ? 92 : 35 },
        { label: 'עומס מנטלי', cause: salesLoad > 14 ? 'גבוה מהרגיל' : 'בנורמה', value: (salesLoad / 21) * 100 },
    ];

    // Logic to determine Prestige Frame
    const currentLevel = data?.level || 1;
    const prestigeFrame = PRESTIGE_FRAMES.reduce((prev, curr) => curr.level <= currentLevel ? curr : prev, PRESTIGE_FRAMES[0]);

    return (
        <div className="w-full h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 transition-colors" dir="rtl">
            <div className="max-w-[1240px] mx-auto p-5 md:p-6 space-y-5">

                {/* Header Grid */}
                <div className="grid grid-cols-12 gap-5">
                    {/* User Profile / Level Card */}
                    <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 opacity-80" />

                        <div className="flex items-center gap-4">
                            {/* Avatar with Prestige Frame */}
                            <div className={`relative w-20 h-20 rounded-full border-4 ${prestigeFrame.color} ${prestigeFrame.ring} shadow-lg p-0.5 flex items-center justify-center bg-white dark:bg-slate-800 z-10 hover:scale-105 transition-transform duration-300`}>
                                <div className={`w-full h-full rounded-full ${prestigeFrame.bg} flex items-center justify-center`}>
                                    <prestigeFrame.icon className={`w-8 h-8 ${prestigeFrame.color.replace('border', 'text')}`} />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white">
                                    LVL {currentLevel}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{LEVEL_NAMES[currentLevel - 1]}</h2>
                                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{xpRemaining} XP לרמה הבאה (פותח {LEVEL_UNLOCKS[currentLevel]?.name})</p>

                                {/* XP Bar */}
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700/50 relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 opacity-20 bg-[length:20px_20px] animate-[pulse_2s_ease-in-out_infinite]" />
                                    <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(168,85,247,0.4)]" style={{ width: `${xpProgress}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Hype Header */}
                    <div className="col-span-12 md:col-span-8 flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-6 py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">בוקר טוב, תותח! 🔥</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">היום אנחנו שוברים את השיאים של אתמול. בוא נתחיל.</p>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- GRID LAYOUT --- */}
                <div className="grid grid-cols-12 gap-5">

                    {/* MAIN HERO CARD (Span 8) */}
                    <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
                        {/* Background glow based on readiness */}
                        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${config.gradientFrom || config.bg.replace('bg-', 'from-')} to-transparent opacity-30 blur-3xl rounded-full pointer-events-none -mr-20 -mt-20`} />

                        {/* Top Section: Score & Drivers */}
                        <div className="p-6 grid md:grid-cols-2 gap-8 items-center border-b border-slate-100 dark:border-slate-800 relative z-10">

                            {/* Left: Score Ring */}
                            <div className="flex items-center gap-6">
                                <div className="relative w-32 h-32 shrink-0 group cursor-pointer hover:scale-105 transition-transform duration-300">
                                    <svg className="w-full h-full -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" />
                                        <circle
                                            cx="50" cy="50" r="42"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${readiness * 2.64} 264`}
                                            className={`transition-all duration-1000 ${config.ringColor}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">{readiness}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${config.ringColor}`}>Readiness</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.ringColor} border ${config.border} shadow-sm`}>
                                        <Activity className="w-3.5 h-3.5" />
                                        {config.label}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">עומס מכירתי:</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{salesLoad}</span>
                                            <span className="text-xs text-slate-400">/ 21</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">רצף ימים:</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{data?.current_streak || 0}</span>
                                            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Drivers */}
                            <div className="space-y-4 pl-4 border-r border-slate-100/50 dark:border-slate-800/50">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    גורמים משפיעים
                                </p>
                                <div className="space-y-4">
                                    {drivers.map((d, i) => (
                                        <DriverCompact key={i} {...d} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Plan & Sparkline */}
                        <div className={`px-6 py-5 bg-gradient-to-b ${config.bg} relative overflow-hidden flex-1 flex flex-col justify-center`}>
                            <div className="relative z-10 flex items-center justify-between gap-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" />
                                        המלצה יומית
                                    </p>
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white leading-snug max-w-sm">{config.plan}</h3>
                                </div>
                                <button className="hidden md:flex shrink-0 items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 duration-200 group border border-slate-700 dark:border-slate-600">
                                    <config.ctaIcon className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                                    {config.cta}
                                </button>
                            </div>

                            {/* Subtle Sparkline Background */}
                            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-15 pointer-events-none mix-blend-multiply">
                                <Sparkline data={readinessHistory} color={config.color} height={64} />
                            </div>
                        </div>
                    </div>

                    {/* SIDEBAR STATS (Span 4) */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">

                        {/* Missions List Wrapper */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30">
                                        <Target className="w-4.5 h-4.5" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">משימות היום</h3>
                                </div>
                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{completedMissions}/{missions.length}</span>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                                {missions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-400">הכול הושלם! כל הכבוד 👑</p>
                                    </div>
                                ) : (
                                    missions.map((mission, idx) => {
                                        const isFocus = idx === 0 && !mission.completed;
                                        const cat = MISSION_CATEGORIES[mission.mission_type] || MISSION_CATEGORIES.calls;

                                        return (
                                            <div key={mission.id} className={`group relative p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${mission.completed ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60' : isFocus ? 'bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-900/20 dark:to-slate-800 border-blue-200 dark:border-blue-800/50 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-700'
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {isFocus && <span className="text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 px-1.5 py-0.5 rounded tracking-wide shadow-sm">FOCUS</span>}
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cat.bg} ${cat.color}`}>{cat.label}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-black ${mission.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors'}`}>+{mission.xp_reward} XP</span>
                                                </div>

                                                <h4 className={`text-sm font-bold mb-2 ${mission.completed ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{mission.title}</h4>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${mission.completed ? 'bg-emerald-500' : isFocus ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-400 transition-colors'}`} style={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{mission.progress}/{mission.target}</span>
                                                </div>

                                                {!mission.completed && (
                                                    <button className="absolute bottom-3 left-3 px-3 py-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95">
                                                        התחל
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Unlock Preview - Mini Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg p-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Lock className="w-16 h-16" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">נפתח בקרוב</span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
                                </div>
                                <div className="flex gap-2">
                                    {LEVEL_UNLOCKS.slice(0, 3).map((u, i) => (
                                        <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border border-white/10 bg-white/5 backdrop-blur-sm ${u.locked ? 'text-slate-500 grayscale' : 'text-white shadow-lg shadow-white/10'}`} title={u.name}>
                                            {u.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default GamificationDashboard;
