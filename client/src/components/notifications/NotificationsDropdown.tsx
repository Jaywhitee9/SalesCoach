import React, { useState, useEffect, useRef } from 'react';
import {
    Bell,
    X,
    Clock,
    Trophy,
    AlertTriangle,
    Target,
    Phone,
    CheckCircle2,
    Loader2,
    Settings
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface Notification {
    id: string;
    type: 'reminder' | 'achievement' | 'alert' | 'mission' | 'lead' | 'system' | 'manager_message' | 'followup' | 'urgent_task';
    title: string;
    message?: string;
    lead_id?: string;
    is_read: boolean;
    priority?: 'high' | 'medium' | 'low';
    scheduled_at?: string;
    created_at: string;
}

interface NotificationsDropdownProps {
    userId?: string;
    orgId?: string;
    onNavigateToLead?: (leadId: string) => void;
    onOpenReminders?: () => void;
}

// Type configuration for important notification types
const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    urgent_task: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50', label: 'משימה דחופה' },
    alert: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50', label: 'התראה דחופה' },
    manager_message: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50', label: 'הודעה מהמנהל' },
    followup: { icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'פולואפ' },
    reminder: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'תזכורת' },
    lead: { icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'ליד' },
    system: { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-50', label: 'מערכת' },
};

// Important notification types to show
const IMPORTANT_TYPES = ['urgent_task', 'alert', 'manager_message', 'followup', 'reminder'];

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
    userId,
    orgId,
    onNavigateToLead,
    onOpenReminders
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'all'>('today');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!userId || !isOpen) return;

            setLoading(true);
            try {
                let query = supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                // Filter by date range
                if (activeTab === 'today') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    query = query.gte('created_at', today.toISOString());
                } else if (activeTab === 'week') {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    query = query.gte('created_at', weekAgo.toISOString());
                }

                // Only show important notification types
                query = query.in('type', IMPORTANT_TYPES);

                const { data, error } = await query;

                if (error) throw error;
                setNotifications(data || []);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [userId, isOpen, activeTab]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mark notification as read
    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    };

    // Mark all as read
    const markAllAsRead = async () => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        setNotifications(prev =>
            prev.map(n => ({ ...n, is_read: true }))
        );
    };

    // Handle notification click
    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        // For reminder-type notifications, open the RemindersModal
        const reminderTypes = ['reminder', 'followup', 'urgent_task', 'alert'];
        if (reminderTypes.includes(notification.type)) {
            onOpenReminders?.();
            setIsOpen(false);
            return;
        }

        // For lead-related notifications, navigate to lead
        if (notification.lead_id && onNavigateToLead) {
            onNavigateToLead(notification.lead_id);
            setIsOpen(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Format time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'עכשיו';
        if (diffMins < 60) return `לפני ${diffMins} דק'`;
        if (diffHours < 24) return `לפני ${diffHours} שעות`;
        return date.toLocaleDateString('he-IL');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">דורש תשומת לב</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-brand-600 hover:underline"
                                >
                                    סמן הכל כנקרא
                                </button>
                            )}
                            <span className="text-xs text-slate-400">{unreadCount} פעילים</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100">
                        {[
                            { key: 'today', label: 'היום' },
                            { key: 'week', label: 'השבוע' },
                            { key: 'all', label: 'הכול' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? 'text-brand-600 border-b-2 border-brand-500'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>אין התראות</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notification) => {
                                    const config = TYPE_CONFIG[notification.type];
                                    const Icon = config.icon;

                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.is_read ? 'bg-brand-50/30' : ''
                                                }`}
                                        >
                                            {/* Icon */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                                                <Icon className={`w-4 h-4 ${config.color}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                        {!notification.is_read && (
                                                            <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                                                        )}
                                                    </div>
                                                </div>
                                                <p className={`text-sm font-medium mt-1 ${!notification.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-slate-100">
                        <button
                            onClick={() => {
                                onOpenReminders?.();
                                setIsOpen(false);
                            }}
                            className="w-full py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                            נהל תזכורות
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsDropdown;
