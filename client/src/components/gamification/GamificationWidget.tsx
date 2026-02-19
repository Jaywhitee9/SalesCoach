import React, { useState, useEffect } from 'react';
import {
    Trophy,
    Zap,
    Target,
    Flame,
    Star,
    Award,
    ChevronRight,
    Loader2,
    Phone,
    CheckCircle2,
    TrendingUp,
    Shield,
    Medal,
    Crown
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface GamificationData {
    xp_total: number;
    level: number;
    current_streak: number;
    achievements: string[];
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

// Prestige Frames Configuration (Shared with Dashboard)
const PRESTIGE_FRAMES = [
    { level: 1, name: 'Rookie', color: 'border-slate-300', ring: 'ring-slate-200', icon: Shield, bg: 'bg-white' },
    { level: 5, name: 'Pro', color: 'border-emerald-400', ring: 'ring-emerald-200', icon: CheckCircle2, bg: 'bg-emerald-50' },
    { level: 10, name: 'Elite', color: 'border-blue-500', ring: 'ring-blue-300', icon: Medal, bg: 'bg-blue-50' },
    { level: 20, name: 'Master', color: 'border-purple-500', ring: 'ring-purple-300', icon: Crown, bg: 'bg-purple-50' },
    { level: 50, name: 'Legend', color: 'border-amber-400', ring: 'ring-amber-200', icon: Trophy, bg: 'bg-amber-50' },
];

const LEVEL_CONFIG = [
    { level: 1, name: 'מתחיל', minXp: 0, maxXp: 100 },
    { level: 2, name: 'פעיל', minXp: 100, maxXp: 300 },
    { level: 3, name: 'מתקדם', minXp: 300, maxXp: 600 },
    { level: 4, name: 'מומחה', minXp: 600, maxXp: 1000 },
    { level: 5, name: 'אלוף', minXp: 1000, maxXp: 2000 },
];

interface GamificationWidgetProps {
    userId?: string;
    orgId?: string;
    compact?: boolean;
}

export const GamificationWidget: React.FC<GamificationWidgetProps> = ({
    userId,
    orgId,
    compact = false
}) => {
    const [data, setData] = useState<GamificationData | null>(null);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGamificationData = async () => {
            if (!userId || !orgId) return;

            try {
                // Fetch gamification data
                const { data: gamData, error: gamError } = await supabase
                    .from('user_gamification')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (gamError && gamError.code !== 'PGRST116') {
                    console.error('Gamification fetch error:', gamError);
                }

                // If no record exists, create one with defaults
                if (!gamData) {
                    const { data: newData } = await supabase
                        .from('user_gamification')
                        .insert({ user_id: userId, organization_id: orgId })
                        .select()
                        .single();
                    setData(newData || { xp_total: 0, level: 1, current_streak: 0, achievements: [] });
                } else {
                    setData(gamData);
                }

                // Fetch today's missions
                const today = new Date().toISOString().split('T')[0];
                const { data: missionsData, error: missionsError } = await supabase
                    .from('daily_missions')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('date', today);

                if (missionsError) {
                    console.error('Missions fetch error:', missionsError);
                }

                // If no missions for today, create them
                if (!missionsData || missionsData.length === 0) {
                    await supabase.rpc('create_daily_missions', {
                        p_user_id: userId,
                        p_org_id: orgId
                    });

                    // Fetch again
                    const { data: newMissions } = await supabase
                        .from('daily_missions')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('date', today);

                    setMissions(newMissions || []);
                } else {
                    setMissions(missionsData);
                }

            } catch (err) {
                console.error('Gamification error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchGamificationData();
    }, [userId, orgId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            </div>
        );
    }

    const currentLevel = LEVEL_CONFIG.find(l => l.level === (data?.level || 1)) || LEVEL_CONFIG[0];
    const nextLevel = LEVEL_CONFIG.find(l => l.level === (data?.level || 1) + 1);

    // Logic to determine Prestige Frame
    const levelNum = data?.level || 1;
    const prestigeFrame = PRESTIGE_FRAMES.reduce((prev, curr) => curr.level <= levelNum ? curr : prev, PRESTIGE_FRAMES[0]);

    const xpInCurrentLevel = (data?.xp_total || 0) - currentLevel.minXp;
    const xpNeededForLevel = (currentLevel.maxXp || 2000) - currentLevel.minXp;
    /* Fixed progress calc to avoid division by zero or negative */
    const progressPercent = Math.max(0, Math.min((xpInCurrentLevel / (xpNeededForLevel || 100)) * 100, 100));

    const completedMissions = missions.filter(m => m.completed).length;

    if (compact) {
        // Compact version for Sidebar Call Screen (Prestige Style)
        return (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors cursor-default">
                {/* Compact Prestige Frame */}
                <div className={`relative w-10 h-10 shrink-0 rounded-full border-2 ${prestigeFrame.color} ${prestigeFrame.ring} flex items-center justify-center bg-white z-10`}>
                    <prestigeFrame.icon className={`w-4 h-4 ${prestigeFrame.color.replace('border', 'text')}`} />
                </div>

                <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 truncate">LVL {data?.level} • {currentLevel.name}</span>
                        {(data?.current_streak || 0) > 0 && (
                            <div className="flex items-center gap-0.5 text-orange-500">
                                <Flame className="w-3 h-3 fill-orange-500 animate-pulse" />
                                <span className="text-[10px] font-bold">{data?.current_streak}</span>
                            </div>
                        )}
                    </div>

                    {/* Compact Animated Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 opacity-20 w-full animate-pulse" />
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full transition-all duration-700"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Full version (Backup / Alternative View)
    return (
        <div className="space-y-4">
            {/* Not primarily used as user has full Dashboard, but keeping aligned layout */}
            <div className={`relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-200 shadow-sm`}>
                <div className="relative flex items-center gap-4">
                    {/* Prestige Frame */}
                    <div className={`relative w-16 h-16 rounded-full border-4 ${prestigeFrame.color} ${prestigeFrame.ring} flex items-center justify-center bg-white z-10 shadow-lg`}>
                        <div className={`w-full h-full rounded-full ${prestigeFrame.bg} flex items-center justify-center`}>
                            <prestigeFrame.icon className={`w-8 h-8 ${prestigeFrame.color.replace('border', 'text')}`} />
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-slate-900">Level {data?.level}</span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                                {currentLevel.name}
                            </span>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1 text-slate-400 font-medium">
                                <span>{data?.xp_total} XP</span>
                                <span>{currentLevel.maxXp} XP</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Missions Compact List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-sm text-slate-700">משימות</span>
                    </div>
                    <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                        {completedMissions}/{missions.length}
                    </span>
                </div>

                <div className="divide-y divide-slate-50">
                    {missions.map((mission) => (
                        <div
                            key={mission.id}
                            className={`p-3 flex items-center gap-3 ${mission.completed ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50'}`}
                        >
                            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${mission.completed
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                                }`}>
                                {mission.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={`text-xs font-bold truncate ${mission.completed ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                    {mission.title}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${mission.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {mission.progress}/{mission.target}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GamificationWidget;
