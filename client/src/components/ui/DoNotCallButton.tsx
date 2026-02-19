import React, { useState } from 'react';
import { PhoneOff, X, AlertCircle, CheckCircle } from 'lucide-react';

interface DoNotCallButtonProps {
    leadId: string;
    leadName: string;
    userId?: string;
    onSuccess?: () => void;
    variant?: 'button' | 'icon';
    className?: string;
}

export const DoNotCallButton: React.FC<DoNotCallButtonProps> = ({
    leadId,
    leadName,
    userId,
    onSuccess,
    variant = 'button',
    className = ''
}) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleDoNotCall = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/leads/${leadId}/do-not-call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: 'Customer request during call',
                    userId
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    setShowConfirm(false);
                    onSuccess?.();
                }, 1500);
            }
        } catch (err) {
            console.error('[DNC] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                נוסף לרשימת "אל תתקשרו"
            </div>
        );
    }

    if (showConfirm) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="bg-red-500 px-4 py-3 flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <PhoneOff className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white">סימון "אל תתקשרו"</h3>
                        </div>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>שים לב:</strong> פעולה זו תסמן את הליד <strong>{leadName}</strong> כ"אל תתקשרו" והוא לא יופיע יותר בחייגן.
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleDoNotCall}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <PhoneOff className="w-4 h-4" />
                                        כן, סמן כ"אל תתקשרו"
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render trigger button
    if (variant === 'icon') {
        return (
            <button
                onClick={() => setShowConfirm(true)}
                className={`p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${className}`}
                title="סמן כ'אל תתקשרו'"
            >
                <PhoneOff className="w-4 h-4" />
            </button>
        );
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            className={`flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors ${className}`}
        >
            <PhoneOff className="w-4 h-4" />
            אל תתקשרו יותר
        </button>
    );
};
