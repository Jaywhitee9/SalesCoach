import React, { useState } from 'react';
import { X, Mail, UserPlus, Loader2, Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../Common/Button';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
    organizationName: string;
    onSuccess?: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
    isOpen,
    onClose,
    organizationId,
    organizationName,
    onSuccess
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'rep' | 'manager'>('rep');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setInviteLink('');

        try {
            const { data: { session } } = await import('../../src/lib/supabaseClient').then(m => m.supabase.auth.getSession());
            const token = session?.access_token;

            if (!token) throw new Error('No session found');

            const res = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email,
                    organizationId,
                    role
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send invitation');
            }

            setInviteLink(data.invitation.inviteLink);
            setEmail('');
            onSuccess?.();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setEmail('');
        setRole('rep');
        setError('');
        setInviteLink('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">הזמן משתמש חדש</h2>
                            <p className="text-sm text-slate-500">{organizationName}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {inviteLink ? (
                        // Success State
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Check className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                ההזמנה נשלחה בהצלחה!
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                שתף את הלינק עם המשתמש החדש
                            </p>

                            {/* Link Box */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={inviteLink}
                                        readOnly
                                        className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-300 outline-none truncate"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setInviteLink('')}
                                >
                                    הזמן עוד
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleClose}
                                >
                                    סיום
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Form State
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    כתובת אימייל
                                </label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        required
                                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    תפקיד
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole('rep')}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium ${role === 'rep'
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                            }`}
                                    >
                                        נציג מכירות
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('manager')}
                                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium ${role === 'manager'
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                            }`}
                                    >
                                        מנהל
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || !email}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        שולח הזמנה...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4 ml-2" />
                                        שלח הזמנה
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
