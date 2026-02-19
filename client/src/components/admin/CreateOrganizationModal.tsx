import React, { useState } from 'react';
import { X, Building2, Loader2, Check, Mail, Crown } from 'lucide-react';
import { Button } from '../Common/Button';

interface CreateOrganizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (orgId: string) => void;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [step, setStep] = useState<'details' | 'admin' | 'success'>('details');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        plan: 'pro' as 'free' | 'pro' | 'enterprise',
        adminEmail: ''
    });

    const [createdOrg, setCreatedOrg] = useState<{ id: string; name: string } | null>(null);
    const [inviteLink, setInviteLink] = useState('');

    const handleCreateOrg = async () => {
        if (!formData.name.trim()) {
            setError('יש להזין שם ארגון');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('auth_token');

            // Create organization
            const orgRes = await fetch('/api/admin/organizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: formData.name.trim() })
            });

            const orgData = await orgRes.json();

            if (!orgRes.ok) {
                throw new Error(orgData.error || 'שגיאה ביצירת הארגון');
            }

            // Update plan if not default
            if (formData.plan !== 'free') {
                await fetch(`/api/admin/organizations/${orgData.organizationId}/plan`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ plan: formData.plan })
                });
            }

            setCreatedOrg({ id: orgData.organizationId, name: formData.name.trim() });
            setStep('admin');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteAdmin = async () => {
        if (!formData.adminEmail.trim()) {
            setStep('success');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('auth_token');

            const res = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: formData.adminEmail.trim(),
                    organizationId: createdOrg?.id,
                    role: 'manager'
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'שגיאה בשליחת ההזמנה');
            }

            setInviteLink(data.invitation.inviteLink);
            setStep('success');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (createdOrg) {
            onSuccess?.(createdOrg.id);
        }
        setFormData({ name: '', plan: 'pro', adminEmail: '' });
        setCreatedOrg(null);
        setInviteLink('');
        setStep('details');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">יצירת ארגון חדש</h2>
                            <p className="text-sm text-slate-500">
                                {step === 'details' && 'שלב 1: פרטי הארגון'}
                                {step === 'admin' && 'שלב 2: הזמנת מנהל'}
                                {step === 'success' && 'הושלם!'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Organization Details */}
                    {step === 'details' && (
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    שם הארגון
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="לדוגמה: מוקד מכירות צפון"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            {/* Plan */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    תוכנית
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'free', name: 'Free', price: 'חינם', color: 'slate' },
                                        { id: 'pro', name: 'Pro', price: '₪299/חודש', color: 'brand' },
                                        { id: 'enterprise', name: 'Enterprise', price: 'בהתאמה', color: 'purple' }
                                    ].map(plan => (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, plan: plan.id as any })}
                                            className={`p-4 rounded-xl border-2 transition-all text-center ${formData.plan === plan.id
                                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                        >
                                            <Crown className={`w-5 h-5 mx-auto mb-1 ${formData.plan === plan.id ? 'text-brand-500' : 'text-slate-400'
                                                }`} />
                                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{plan.name}</p>
                                            <p className="text-xs text-slate-500">{plan.price}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            <Button onClick={handleCreateOrg} className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                {loading ? 'יוצר ארגון...' : 'המשך'}
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Invite Admin */}
                    {step === 'admin' && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <Check className="w-6 h-6 text-emerald-500" />
                                </div>
                                <p className="text-slate-600 dark:text-slate-400">
                                    הארגון <span className="font-bold text-slate-900 dark:text-white">"{createdOrg?.name}"</span> נוצר בהצלחה!
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    אימייל מנהל הארגון (אופציונלי)
                                </label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.adminEmail}
                                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                        placeholder="admin@company.com"
                                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                        dir="ltr"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">נשלח הזמנה למנהל הארגון</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button variant="secondary" className="flex-1" onClick={() => setStep('success')}>
                                    דלג
                                </Button>
                                <Button className="flex-1" onClick={handleInviteAdmin} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Mail className="w-4 h-4 ml-2" />}
                                    {loading ? 'שולח...' : 'שלח הזמנה'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {step === 'success' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Check className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">הארגון נוצר בהצלחה!</h3>
                            <p className="text-slate-500 mb-4">"{createdOrg?.name}" מוכן לשימוש</p>

                            {inviteLink && (
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-4 text-left" dir="ltr">
                                    <p className="text-xs text-slate-500 mb-1">לינק הזמנה למנהל:</p>
                                    <p className="text-sm text-brand-600 break-all">{inviteLink}</p>
                                </div>
                            )}

                            <Button onClick={handleClose} className="w-full">
                                סגור
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
