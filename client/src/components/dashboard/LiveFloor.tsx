import React from 'react';
import { Phone, Users, Clock, ShieldAlert, ChevronDown } from 'lucide-react';
import { Badge } from '../Common/Badge';

interface Agent {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    status: 'available' | 'on_call' | 'offline';
    currentCall?: {
        duration: number; // seconds
    };
}

interface LiveFloorProps {
    agents: Agent[];
    loading?: boolean;
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export const LiveFloor: React.FC<LiveFloorProps> = ({ agents, loading, isCollapsed = false, onToggle }) => {
    // If loading, show skeleton (unless collapsed, maybe?)
    // But usually we want to see skeleton if we are waiting.
    if (loading && !isCollapsed) {
        return <div className="animate-pulse h-24 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6"></div>;
    }

    const onCallCount = agents.filter(a => a.status === 'on_call').length;
    const availableCount = agents.filter(a => a.status === 'available').length;

    // Helper to format duration mm:ss
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="mb-8 border border-transparent dark:border-transparent rounded-xl transition-all duration-200">
            <div
                className="flex items-center justify-between mb-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -mx-2 rounded-lg transition-colors group"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {onToggle && (
                        <div className={`p-1 rounded-md text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    )}
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        רצפת מכירות חיה
                    </h2>
                </div>

                <div className="flex gap-2 text-sm">
                    <Badge variant="success">{availableCount} פנויים</Badge>
                    <Badge variant={onCallCount > 0 ? 'danger' : 'neutral'}>{onCallCount} בשיחה</Badge>
                </div>
            </div>

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {agents.map(agent => (
                        <div
                            key={agent.id}
                            className={`
                                relative overflow-hidden rounded-xl border p-4 transition-all duration-200
                                ${agent.status === 'on_call'
                                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30'
                                    : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}
                            `}
                        >
                            {/* Status Bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1 ${agent.status === 'on_call' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>

                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                    <img
                                        src={agent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}`}
                                        alt={agent.name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                                    />
                                    <div className={`
                                        absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900
                                        ${agent.status === 'on_call' ? 'bg-rose-500' : 'bg-emerald-500'}
                                    `}></div>
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm">{agent.name}</h3>
                                    <p className="text-xs text-slate-500 truncate">{agent.role === 'manager' ? 'מנהל' : 'נציג'}</p>
                                </div>
                            </div>

                            {agent.status === 'on_call' ? (
                                <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-md">
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3 h-3" />
                                        בשיחה
                                    </span>
                                    <span className="tabular-nums">
                                        {agent.currentCall ? formatDuration(agent.currentCall.duration) : '00:00'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        פנוי
                                    </span>
                                    <span>--:--</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
