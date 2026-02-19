import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Building2, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../Common/Button';

export const AcceptInvitationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [invitation, setInvitation] = useState<{
        email: string;
        role: string;
        organizationName: string;
        expiresAt: string;
    } | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        password: '',
        confirmPassword: ''
    });

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError('לינק הזמנה לא תקין');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/invitations/${token}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'ההזמנה לא תקינה');
                }

                setInvitation(data.invitation);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('הסיסמאות לא תואמות');
            return;
        }

        if (formData.password.length < 6) {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/invitations/${token}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    password: formData.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'שגיאה ביצירת החשבון');
            }

            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/70">מאמת הזמנה...</p>
                </div>
            </div>
        );
    }

    // Error State (invalid/expired invitation)
    if (error && !invitation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">הזמנה לא תקינה</h1>
                    <p className="text-white/70 mb-6">{error}</p>
                    <Button onClick={() => navigate('/login')} variant="secondary">
                        חזור לדף ההתחברות
                    </Button>
                </div>
            </div>
        );
    }

    // Success State
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">ברוך הבא!</h1>
                    <p className="text-white/70 mb-2">החשבון נוצר בהצלחה</p>
                    <p className="text-white/50 text-sm">מעביר אותך לדף ההתחברות...</p>
                </div>
            </div>
        );
    }

    // Form State
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/20">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        הצטרף ל-{invitation?.organizationName}
                    </h1>
                    <p className="text-white/70">
                        הוזמנת כ-{invitation?.role === 'manager' ? 'מנהל' : 'נציג מכירות'}
                    </p>
                    <p className="text-white/50 text-sm mt-1" dir="ltr">
                        {invitation?.email}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            שם מלא
                        </label>
                        <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="הכנס את שמך"
                                required
                                className="w-full pr-11 pl-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            סיסמה
                        </label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="לפחות 6 תווים"
                                required
                                minLength={6}
                                className="w-full pr-11 pl-11 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            אימות סיסמה
                        </label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="הקלד סיסמה שוב"
                                required
                                className="w-full pr-11 pl-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-600 hover:to-purple-700"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                יוצר חשבון...
                            </>
                        ) : (
                            'צור חשבון והתחבר'
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-white/50 text-sm mt-6">
                    כבר יש לך חשבון?{' '}
                    <a href="/login" className="text-brand-400 hover:text-brand-300">
                        התחבר
                    </a>
                </p>
            </div>
        </div>
    );
};
