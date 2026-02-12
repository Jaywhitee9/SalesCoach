
import React, { useState, useEffect } from 'react';
import { X, Phone, Plus, Trash2, Save, Loader2, User as UserIcon, Building2, Smartphone } from 'lucide-react';
import { Button } from '../Common/Button';
import { supabase } from '../../src/lib/supabaseClient';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    orgName: string;
}

interface UserPhoneConfig {
    id: string;
    full_name: string;
    email: string;
    role: string;
    twilio_phone_number?: string;
    phone_rotator_config?: {
        numbers: Array<{ number: string; label: string; last_used?: string }>;
        active_index: number;
        auto_rotate: boolean;
    };
}

interface OrgPhoneConfig {
    business_line: string;
    users: UserPhoneConfig[];
}

export const AdminPhoneManagerModal: React.FC<Props> = ({ isOpen, onClose, orgId, orgName }) => {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<OrgPhoneConfig | null>(null);
    const [businessLine, setBusinessLine] = useState('');
    const [saving, setSaving] = useState(false);

    // Editing User State
    const [editingUser, setEditingUser] = useState<UserPhoneConfig | null>(null);
    const [userFormNumber, setUserFormNumber] = useState('');
    const [userFormRotator, setUserFormRotator] = useState<any>(null); // Quick rotator editor

    useEffect(() => {
        if (isOpen && orgId) fetchConfig();
    }, [isOpen, orgId]);

    const fetchConfig = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch(`/api/admin/organizations/${orgId}/phone-config`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.config);
                setBusinessLine(data.config.business_line || '');
            }
        } catch (err) {
            console.error('Failed to load phone config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBusinessLine = async () => {
        setSaving(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await fetch(`/api/admin/organizations/${orgId}/phone-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ twilio_phone_number: businessLine })
            });
            const data = await res.json();
            if (data.success) {
                alert('Business Line Saved');
            }
        } catch (err) {
            console.error('Failed to save business line:', err);
            alert('Error saving');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveUserConfig = async () => {
        if (!editingUser) return;
        setSaving(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            // Construct payload: support both legacy single number and rotator
            // For now, simpler admin UI: just edit the single number or primary rotator number
            // Expanding: Let's assume we just edit the primary number for now to keep it simple,
            // or push a basic rotator config if none exists.

            const payload = {
                twilio_phone_number: userFormNumber
                // We keep rotator config as is, or update it if we built a UI for it.
                // For MVP, we update the legacy field which is used as fallback/primary.
            };

            const res = await fetch(`/api/admin/users/${editingUser.id}/phone-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ config: payload })
            });

            if (res.ok) {
                // Update local state
                setConfig(prev => prev ? ({
                    ...prev,
                    users: prev.users.map(u => u.id === editingUser.id ? { ...u, twilio_phone_number: userFormNumber } : u)
                }) : null);
                setEditingUser(null);
            }
        } catch (err) {
            console.error('Failed to save user config:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Phone className="w-5 h-5 text-indigo-500" />
                            ניהול טלפוניה
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">עבור ארגון: <span className="font-semibold text-slate-700 dark:text-slate-300">{orgName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[400px]">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* 1. Organization Business Line */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                מספר ראשי (Business Line)
                            </h4>
                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="+97250..."
                                        value={businessLine}
                                        onChange={(e) => setBusinessLine(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white ltr"
                                        dir="ltr"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">משמש כ-Caller ID ברירת מחדל אם לנציג אין מספר אישי.</p>
                                </div>
                                <Button onClick={handleSaveBusinessLine} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                                    שמור
                                </Button>
                            </div>
                        </div>

                        {/* 2. User Numbers Table */}
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                <UserIcon className="w-4 h-4 text-indigo-500" />
                                מספרים למשתמשים ({config?.users.length || 0})
                            </h4>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">שם מלא</th>
                                            <th className="px-4 py-3">אימייל</th>
                                            <th className="px-4 py-3">תפקיד</th>
                                            <th className="px-4 py-3">מספר משויך</th>
                                            <th className="px-4 py-3">פעולות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {config?.users.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.full_name}</td>
                                                <td className="px-4 py-3 text-slate-500">{user.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${user.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono ltr text-left">
                                                    {user.twilio_phone_number || (
                                                        <span className="text-slate-400 italic">ללא מספר</span>
                                                    )}
                                                    {user.phone_rotator_config?.numbers?.length ? (
                                                        <span className="mr-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                                            {user.phone_rotator_config.numbers.length} מספרים
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(user);
                                                            setUserFormNumber(user.twilio_phone_number || '');
                                                        }}
                                                        className="text-indigo-600 hover:text-indigo-700 font-medium text-xs"
                                                    >
                                                        ערוך
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Edit User Modal Overlay */}
            {editingUser && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">עריכת מספר עבור {editingUser.full_name}</h4>
                        <input
                            type="text"
                            value={userFormNumber}
                            onChange={(e) => setUserFormNumber(e.target.value)}
                            placeholder="+97250..."
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 mb-4 ltr"
                            dir="ltr"
                        />
                        <div className="flex gap-2">
                            <Button variant="secondary" className="flex-1" onClick={() => setEditingUser(null)}>ביטול</Button>
                            <Button className="flex-1" onClick={handleSaveUserConfig} disabled={saving}>שמור</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
