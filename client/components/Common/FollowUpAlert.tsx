import React, { useState, useEffect } from 'react';
import { Bell, Clock, Phone, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface FollowUp {
    id: string;
    name: string;
    phone: string;
    follow_up_at: string;
    notes?: string;
    status: string;
}

interface FollowUpAlertProps {
    organizationId: string;
    onCallLead?: (lead: FollowUp) => void;
    className?: string;
}

export const FollowUpAlert: React.FC<FollowUpAlertProps> = ({
    organizationId,
    onCallLead,
    className = ''
}) => {
    const [dueFollowUps, setDueFollowUps] = useState<FollowUp[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch due follow-ups
    const fetchDueFollowUps = async () => {
        if (!organizationId) return;

        try {
            const response = await fetch(`/api/follow-ups/due?organizationId=${organizationId}`);
            const data = await response.json();
            if (data.success) {
                setDueFollowUps(data.followUps || []);
            }
        } catch (error) {
            console.error('[FollowUpAlert] Error fetching:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch and polling every 60 seconds
    useEffect(() => {
        fetchDueFollowUps();
        const interval = setInterval(fetchDueFollowUps, 60000);
        return () => clearInterval(interval);
    }, [organizationId]);

    // Format time ago
    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `לפני ${minutes} דקות`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `לפני ${hours} שעות`;
        const days = Math.floor(hours / 24);
        return `לפני ${days} ימים`;
    };

    // Don't show if no due follow-ups
    if (isLoading || dueFollowUps.length === 0) return null;

    return (
        <div className={`${className}`}>
            {/* Alert Banner */}
            <div
                className={`bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-xl ${isExpanded ? 'rounded-b-none' : ''
                    }`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="px-4 py-3 flex items-center gap-3">
                    <div className="relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-amber-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                            {dueFollowUps.length}
                        </span>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">
                            {dueFollowUps.length} פולואפים ממתינים
                        </p>
                        <p className="text-xs text-white/80">
                            לחץ לפרטים
                        </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </div>

            {/* Expanded List */}
            {isExpanded && (
                <div className="bg-white border border-t-0 border-amber-200 rounded-b-xl shadow-lg max-h-64 overflow-y-auto">
                    {dueFollowUps.map((followUp) => (
                        <div
                            key={followUp.id}
                            className="px-4 py-3 border-b border-slate-100 last:border-b-0 flex items-center gap-3 hover:bg-slate-50"
                        >
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-sm">
                                {followUp.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{followUp.name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {getTimeAgo(followUp.follow_up_at)}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCallLead?.(followUp);
                                }}
                                className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 flex items-center gap-1"
                            >
                                <Phone className="w-3 h-3" />
                                התקשר
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Badge component for sidebar/topbar
export const FollowUpBadge: React.FC<{ organizationId: string; onClick?: () => void }> = ({
    organizationId,
    onClick
}) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!organizationId) return;

        const fetchCount = async () => {
            try {
                const response = await fetch(`/api/follow-ups/count?organizationId=${organizationId}`);
                const data = await response.json();
                if (data.success) {
                    setCount(data.count || 0);
                }
            } catch (error) {
                console.error('[FollowUpBadge] Error:', error);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, [organizationId]);

    if (count === 0) return null;

    return (
        <button
            onClick={onClick}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={`${count} פולואפים ממתינים`}
        >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {count > 9 ? '9+' : count}
            </span>
        </button>
    );
};
