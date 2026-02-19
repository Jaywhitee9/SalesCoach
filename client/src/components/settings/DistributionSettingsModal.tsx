import React, { useState, useEffect } from 'react';
import { Settings, X, RotateCcw, Users, Loader2, Check } from 'lucide-react';
import { Button } from '../Common/Button';

interface DistributionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
}

export const DistributionSettingsModal: React.FC<DistributionSettingsModalProps> = ({
    isOpen,
    onClose,
    organizationId
}) => {
    const [autoDistribute, setAutoDistribute] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch current settings
    useEffect(() => {
        if (!isOpen || !organizationId) return;

        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/org/distribution-settings?organizationId=${organizationId}`);
                const json = await res.json();
                if (json.success && json.settings) {
                    setAutoDistribute(json.settings.auto_distribute || false);
                }
            } catch (err) {
                console.error('Failed to fetch distribution settings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [isOpen, organizationId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/org/distribution-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    auto_distribute: autoDistribute,
                    distribution_method: 'round_robin'
                })
            });
            const json = await res.json();
            if (json.success) {
                onClose();
            } else {
                alert('שגיאה בשמירת הגדרות');
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('שגיאה בשמירת הגדרות');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                            <Settings className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">הגדרות חלוקת לידים</h3>
                            <p className="text-xs text-slate-500">ניהול הקצאה אוטומטית</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* Auto Distribution Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                        <RotateCcw className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white text-sm">חלוקה אוטומטית</p>
                                        <p className="text-xs text-slate-500 mt-0.5">לידים חדשים יוקצו אוטומטית לנציגים בסיבוב</p>
                                    </div>
                                </div>

                                {/* Toggle Switch */}
                                <button
                                    onClick={() => setAutoDistribute(!autoDistribute)}
                                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${autoDistribute ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 flex items-center justify-center ${autoDistribute ? 'left-0.5' : 'left-[22px]'
                                        }`}>
                                        {autoDistribute && <Check className="w-3 h-3 text-brand-500" />}
                                    </div>
                                </button>
                            </div>

                            {/* Explanation */}
                            {autoDistribute && (
                                <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800/50">
                                    <div className="flex items-start gap-3">
                                        <Users className="w-5 h-5 text-brand-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-brand-800 dark:text-brand-200 text-sm">Round Robin פעיל</p>
                                            <p className="text-xs text-brand-600 dark:text-brand-300 mt-1">
                                                כל ליד חדש שנוצר יוקצה אוטומטית לנציג הבא בתור. הנציגים מתחלפים בסיבוב כך שכולם מקבלים כמות שווה של לידים.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleSave}
                        disabled={loading || saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                        שמור
                    </Button>
                </div>

            </div>
        </div>
    );
};
