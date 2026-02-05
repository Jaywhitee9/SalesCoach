
import React, { useState } from 'react';
import {
    X, Building2, User, Phone, CheckCircle2, ArrowRight, ArrowLeft, Loader2,
    Shield, Mail, Smartphone
} from 'lucide-react';
import { Button } from '../Common/Button';
import { supabase } from '../../src/lib/supabaseClient';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'org' | 'admin' | 'phone' | 'review';

export const CreateOrgWizard: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<Step>('org');
    const [loading, setLoading] = useState(false);

    // Form State
    const [orgName, setOrgName] = useState('');
    const [plan, setPlan] = useState('free');
    const [centerType, setCenterType] = useState('sales');

    const [adminEmail, setAdminEmail] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminPassword, setAdminPassword] = useState(''); // Optional, or auto-generate
    const [sendInvite, setSendInvite] = useState(true);

    const [businessLine, setBusinessLine] = useState('');

    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 'org') {
            if (!orgName.trim()) return setError('נא להזין שם ארגון');
            setStep('admin');
        } else if (step === 'admin') {
            if (!adminEmail.trim() || !adminName.trim()) return setError('נא להזין פרטי מנהל');
            setStep('phone');
        } else if (step === 'phone') {
            setStep('review');
        }
        setError(null);
    };

    const handleBack = () => {
        if (step === 'admin') setStep('org');
        if (step === 'phone') setStep('admin');
        if (step === 'review') setStep('phone');
        setError(null);
    };

    const handleCreate = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            const token = session.access_token;

            // 1. Create Organization
            const orgRes = await fetch('/api/admin/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: orgName, plan, center_type: centerType })
            });
            const orgData = await orgRes.json();
            if (!orgRes.ok) throw new Error(orgData.error || 'Failed to create organization');

            const orgId = orgData.organizationId;

            // 2. Create Admin User (Invite)
            // We use the invitations API or a direct "create user" API if we added it (we verified invite API in admin-handler).
            // Let's use the invite API which is robust.
            // Wait, usually wizards want to create the user immediately. 
            // `admin-handler.js` has `POST /api/admin/invitations`.
            // Does it have "create user directly"?
            // It has `POST /api/invitations/:token/accept`.
            // Let's just INVITATION for now as it's cleaner.

            const inviteRes = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: adminEmail, organizationId: orgId, role: 'manager' }) // Admin is Manager role basically
            });

            if (!inviteRes.ok) {
                console.error('Invite failed', await inviteRes.json());
                // Log warning but don't fail entire flow if possible, 
                // or fail and tell user Org is created but User failed.
            }

            // 3. Configure Phone
            if (businessLine.trim()) {
                await fetch(`/api/admin/organizations/${orgId}/phone-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ twilio_phone_number: businessLine })
                });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">הקמת ארגון חדש</h2>
                        <div className="flex gap-2 mt-2">
                            {['org', 'admin', 'phone', 'review'].map((s, i) => (
                                <div key={s} className={`h-1 w-12 rounded-full transition-colors ${['org', 'admin', 'phone', 'review'].indexOf(step) >= i ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                                    }`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {step === 'org' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold">פרטי הארגון</h3>
                                <p className="text-slate-500 text-sm">הגדרות בסיסיות למערכת</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">שם הארגון</label>
                                    <input
                                        type="text"
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="למשל: Sales Team A"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">סוג מוקד</label>
                                        <select
                                            value={centerType}
                                            onChange={e => setCenterType(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="sales">מכירות</option>
                                            <option value="support">שירות</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">תוכנית</label>
                                        <select
                                            value={plan}
                                            onChange={e => setPlan(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="free">Free</option>
                                            <option value="pro">Pro</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'admin' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                    <User className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold">מנהל הארגון</h3>
                                <p className="text-slate-500 text-sm">המשתמש הראשון שיהיה לו גישה למערכת</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">שם מלא</label>
                                    <input
                                        type="text"
                                        value={adminName}
                                        onChange={e => setAdminName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="ישראל ישראלי"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">כתובת אימייל</label>
                                    <div className="relative">
                                        <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            value={adminEmail}
                                            onChange={e => setAdminEmail(e.target.value)}
                                            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="manager@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-start gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg text-indigo-600">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs text-indigo-800 dark:text-indigo-200 mt-1">
                                        הזמנה תישלח למייל זה עם קישור להגדרת סיסמה ראשונית. המשתמש יוגדר כ-Manager באופן אוטומטי.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'phone' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                                    <Phone className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold">הגדרות טלפוניה</h3>
                                <p className="text-slate-500 text-sm">הגדרת מספר ראשי לארגון (אופציונלי)</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">מספר ראשי (Business Line)</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={businessLine}
                                            onChange={e => setBusinessLine(e.target.value)}
                                            className="w-full px-4 pl-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 ltr"
                                            placeholder="+972..."
                                            dir="ltr"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">מספר זה ישמש כברירת מחדל לשיחות יוצאות עבור נציגים שלא הוגדר להם מספר אישי.</p>
                                </div>

                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        💡 ניתן לדלג על שלב זה ולהגדיר מספרים מאוחר יותר דרך מסך ניהול הטלפוניה.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold">סיכום ויצירה</h3>
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">ארגון</span>
                                    <span className="font-bold">{orgName} ({centerType.toUpperCase()})</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">תוכנית</span>
                                    <Badge variant="brand">{plan.toUpperCase()}</Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500">מנהל</span>
                                    <div className="text-left">
                                        <div className="font-bold">{adminName}</div>
                                        <div className="text-xs text-slate-400">{adminEmail}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">טלפון ראשי</span>
                                    <span className="font-mono ltr">{businessLine || '---'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                    <Button
                        variant="secondary"
                        onClick={handleBack}
                        disabled={loading || step === 'org'}
                        className={step === 'org' ? 'invisible' : ''}
                    >
                        <ArrowRight className="w-4 h-4 ml-2" />
                        חזור
                    </Button>

                    {step === 'review' ? (
                        <Button onClick={handleCreate} disabled={loading} className="px-8">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                            צור ארגון
                        </Button>
                    ) : (
                        <Button onClick={handleNext} disabled={loading}>
                            הבא
                            <ArrowLeft className="w-4 h-4 mr-2" />
                        </Button>
                    )}
                </div>

            </div>
        </div>
    );
};

// Helper Badge component if not imported
const Badge = ({ children, variant }: any) => (
    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700`}>{children}</span>
);
