import React, { useState, useEffect } from 'react';
import {
    X,
    Plus,
    Clock,
    Calendar,
    Trash2,
    Loader2,
    Bell,
    User,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';
import { DatePicker } from '../Common/DatePicker';
import { TimePicker } from '../Common/TimePicker';

interface Reminder {
    id: string;
    title: string;
    message?: string;
    lead_id?: string;
    lead_name?: string;
    scheduled_at: string;
    is_read: boolean;
}

interface Lead {
    id: string;
    name: string;
}

interface RemindersModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
    orgId?: string;
    leads?: Lead[];
}

export const RemindersModal: React.FC<RemindersModalProps> = ({
    isOpen,
    onClose,
    userId,
    orgId,
    leads = []
}) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // New reminder form state
    const [newTitle, setNewTitle] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [newLeadId, setNewLeadId] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('10:00');
    const [newType, setNewType] = useState<'urgent_task' | 'followup' | 'reminder'>('reminder');
    const [saving, setSaving] = useState(false);

    // Fetch reminders
    useEffect(() => {
        const fetchReminders = async () => {
            if (!userId || !isOpen) return;

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select(`
            id,
            title,
            message,
            lead_id,
            scheduled_at,
            is_read,
            leads(name)
          `)
                    .eq('user_id', userId)
                    .eq('type', 'reminder')
                    .not('scheduled_at', 'is', null)
                    .order('scheduled_at', { ascending: true });

                if (error) throw error;

                setReminders((data || []).map((r: any) => ({
                    ...r,
                    lead_name: r.leads?.name
                })));
            } catch (err) {
                console.error('Failed to fetch reminders:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchReminders();
    }, [userId, isOpen]);

    // Reset form
    const resetForm = () => {
        setNewTitle('');
        setNewMessage('');
        setNewLeadId('');
        setNewDate('');
        setNewTime('10:00');
        setNewType('reminder');
        setShowAddForm(false);
    };

    // Add new reminder
    const handleAddReminder = async () => {
        if (!newTitle || !newDate || !userId || !orgId) return;

        setSaving(true);
        try {
            const scheduledAt = new Date(`${newDate}T${newTime}`).toISOString();

            const { data, error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    organization_id: orgId,
                    type: newType,
                    title: newTitle,
                    message: newMessage || null,
                    lead_id: newLeadId || null,
                    scheduled_at: scheduledAt,
                    is_read: false
                })
                .select()
                .single();

            if (error) throw error;

            // Add lead name if applicable
            const leadName = leads.find(l => l.id === newLeadId)?.name;
            setReminders(prev => [...prev, { ...data, lead_name: leadName }].sort(
                (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            ));

            resetForm();
        } catch (err) {
            console.error('Failed to add reminder:', err);
        } finally {
            setSaving(false);
        }
    };

    // Delete reminder
    const handleDeleteReminder = async (id: string) => {
        try {
            await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            setReminders(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error('Failed to delete reminder:', err);
        }
    };

    // Mark as complete
    const handleComplete = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        setReminders(prev => prev.filter(r => r.id !== id));
    };

    // Format date/time
    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

        const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `היום • ${timeStr}`;
        if (isTomorrow) return `מחר • ${timeStr}`;
        return `${date.toLocaleDateString('he-IL')} • ${timeStr}`;
    };

    // Check if overdue
    const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">פריטים חשובים</h3>
                            <p className="text-sm text-white/80">{reminders.length} פריטים פעילים</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        </div>
                    ) : (
                        <>
                            {/* Add New Button / Form */}
                            {!showAddForm ? (
                                <div className="p-4 border-b border-slate-100">
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        הוסף פריט חדש
                                    </button>
                                </div>
                            ) : (
                                <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white space-y-4">
                                    {/* Type Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">סוג הפריט</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNewType?.('urgent_task')}
                                                className={`p-3 rounded-xl border-2 text-center transition-all ${newType === 'urgent_task'
                                                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                                                    : 'border-slate-200 hover:border-rose-200 text-slate-600'
                                                    }`}
                                            >
                                                <span className="text-lg mb-1 block">🔴</span>
                                                <span className="text-xs font-medium">משימה דחופה</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewType?.('followup')}
                                                className={`p-3 rounded-xl border-2 text-center transition-all ${newType === 'followup'
                                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-200 hover:border-emerald-200 text-slate-600'
                                                    }`}
                                            >
                                                <span className="text-lg mb-1 block">📞</span>
                                                <span className="text-xs font-medium">פולואפ</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewType?.('reminder')}
                                                className={`p-3 rounded-xl border-2 text-center transition-all ${newType === 'reminder'
                                                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                    : 'border-slate-200 hover:border-amber-200 text-slate-600'
                                                    }`}
                                            >
                                                <span className="text-lg mb-1 block">⏰</span>
                                                <span className="text-xs font-medium">תזכורת</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">כותרת</label>
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="מה צריך לעשות?"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">הערות (אופציונלי)</label>
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="פרטים נוספים..."
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* Date & Time - Custom Pickers */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Date Picker */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                                                מתי?
                                            </label>
                                            <DatePicker
                                                value={newDate}
                                                onChange={setNewDate}
                                                minDate={new Date().toISOString().split('T')[0]}
                                                placeholder="בחר תאריך"
                                            />
                                        </div>

                                        {/* Time Picker */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                                באיזו שעה?
                                            </label>
                                            <TimePicker
                                                value={newTime}
                                                onChange={setNewTime}
                                                placeholder="בחר שעה"
                                            />
                                        </div>
                                    </div>

                                    {/* Lead Selector */}
                                    {leads.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                קשר לליד (אופציונלי)
                                            </label>
                                            <select
                                                value={newLeadId}
                                                onChange={(e) => setNewLeadId(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-800 cursor-pointer hover:border-brand-300 transition-colors"
                                            >
                                                <option value="">ללא</option>
                                                {leads.map(lead => (
                                                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={resetForm}
                                            className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            ביטול
                                        </button>
                                        <button
                                            onClick={handleAddReminder}
                                            disabled={!newTitle || !newDate || saving}
                                            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold hover:from-brand-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            הוסף
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reminders List */}
                            {reminders.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">
                                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>אין פריטים חשובים</p>
                                    <p className="text-sm mt-1">הוסף משימה דחופה, פולואפ או תזכורת</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {reminders.map((reminder) => (
                                        <div
                                            key={reminder.id}
                                            className={`p-4 flex items-start gap-3 ${isOverdue(reminder.scheduled_at) ? 'bg-rose-50' : ''}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue(reminder.scheduled_at) ? 'bg-rose-100' : 'bg-brand-100'
                                                }`}>
                                                <Clock className={`w-5 h-5 ${isOverdue(reminder.scheduled_at) ? 'text-rose-600' : 'text-brand-600'}`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800">{reminder.title}</p>
                                                {reminder.message && (
                                                    <p className="text-sm text-slate-500 mt-0.5">{reminder.message}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                                    <span className={isOverdue(reminder.scheduled_at) ? 'text-rose-500 font-medium' : ''}>
                                                        {formatDateTime(reminder.scheduled_at)}
                                                    </span>
                                                    {reminder.lead_name && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {reminder.lead_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleComplete(reminder.id)}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="סיים"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReminder(reminder.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="מחק"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-white font-medium transition-colors"
                    >
                        סגור
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemindersModal;
