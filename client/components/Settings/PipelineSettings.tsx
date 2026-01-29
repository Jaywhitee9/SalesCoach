import React, { useState, useEffect, useRef } from 'react';
import { useOrganizationSettings, PipelineStatus } from '../../src/hooks/useOrganizationSettings';
import { Plus, Trash2, GripVertical, Save, RefreshCw, CheckCircle2, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Button } from '../Common/Button';

export const PipelineSettings = ({ orgId }: { orgId?: string }) => {
    const { settings, loading, updateSettings } = useOrganizationSettings(orgId);
    const [statuses, setStatuses] = useState<PipelineStatus[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const pickerRef = useRef<HTMLDivElement>(null);

    // Click outside to close color picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setColorPickerIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (settings?.pipeline_statuses) {
            setStatuses(settings.pipeline_statuses);
        }
    }, [settings]);

    const handleAddStatus = () => {
        const newStatus: PipelineStatus = {
            id: `status_${Date.now()}`,
            label: 'סטטוס חדש',
            color: '#94a3b8' // Default slate-400
        };
        setStatuses([...statuses, newStatus]);
        setHasChanges(true);
    };

    const handleUpdateStatus = (idx: number, updates: Partial<PipelineStatus>) => {
        const newStatuses = [...statuses];
        newStatuses[idx] = { ...newStatuses[idx], ...updates };
        setStatuses(newStatuses);
        setHasChanges(true);
        if (updates.color) setColorPickerIndex(null); // Close picker on selection
    };

    const handleDeleteStatus = (idx: number) => {
        if (statuses.length <= 1) {
            alert('חייב להישאר לפחות סטטוס אחד בתהליך.');
            return;
        }
        if (confirm('האם אתה בטוח? מחיקת הסטטוס לא תמחק לידים קיימים אך הם לא יופיעו בלוח עד שישויכו מחדש.')) {
            const newStatuses = statuses.filter((_, i) => i !== idx);
            setStatuses(newStatuses);
            setHasChanges(true);
        }
    };

    const moveStatus = (idx: number, direction: 'up' | 'down') => {
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === statuses.length - 1) return;

        const newStatuses = [...statuses];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

        [newStatuses[idx], newStatuses[swapIdx]] = [newStatuses[swapIdx], newStatuses[idx]];

        setStatuses(newStatuses);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!settings || !updateSettings) return;

        if (!orgId) {
            setErrorMsg('שגיאה: מספר ארגון חסר (OrgID is missing).');
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);

        const res = await updateSettings({ pipeline_statuses: statuses });

        setIsSaving(false);
        if (res?.success) {
            setHasChanges(false);
        } else {
            setErrorMsg('שגיאה בשמירת הנתונים. נסה שוב.');
            console.error(res?.error);
        }
    };

    const colors = [
        '#64748B', '#94A3B8', // Slate
        '#EF4444', '#F87171', // Red
        '#F97316', '#FB923C', // Orange
        '#F59E0B', '#FBBF24', // Amber
        '#84CC16', '#A3E635', // Lime
        '#10B981', '#34D399', // Emerald
        '#06B6D4', '#22D3EE', // Cyan
        '#3B82F6', '#60A5FA', // Blue
        '#6366F1', '#818CF8', // Indigo
        '#8B5CF6', '#A78BFA', // Violet
        '#D946EF', '#E879F9', // Fuchsia
        '#EC4899', '#F472B6', // Pink
        '#F43F5E', '#FB7185'  // Rose
    ];

    if (loading) return <div className="p-8 text-center text-slate-500">טוען הגדרות...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">שלבי תהליך המכירה</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            הגדר את הסטטוסים שיופיעו בלוח הלידים שלך. סדר הסטטוסים קובע את סדר העמודות בלוח.
                        </p>
                    </div>
                    {hasChanges && (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">יש שינויים שלא נשמרו</span>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                                שמור שינויים
                            </Button>
                        </div>
                    )}
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm">
                        {errorMsg}
                    </div>
                )}

                <div className="space-y-3">
                    {statuses.map((status, idx) => (
                        <div key={status.id || idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 group hover:border-brand-200 dark:hover:border-brand-800 transition-colors">

                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-0.5">
                                <button
                                    onClick={() => moveStatus(idx, 'up')}
                                    disabled={idx === 0}
                                    className="text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => moveStatus(idx, 'down')}
                                    disabled={idx === statuses.length - 1}
                                    className="text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>

                            <GripVertical className="w-5 h-5 text-slate-300 dark:text-slate-600" />

                            {/* Color Picker */}
                            <div className="relative">
                                <div
                                    onClick={() => setColorPickerIndex(colorPickerIndex === idx ? null : idx)}
                                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 hover:scale-105 transition-transform"
                                    style={{ backgroundColor: status.color }}
                                ></div>

                                {colorPickerIndex === idx && (
                                    <div ref={pickerRef} className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 w-64 animate-in fade-in zoom-in-95 duration-200">
                                        <p className="text-xs font-bold text-slate-500 mb-2">בחר צבע לסטטוס/עמודה</p>
                                        <div className="grid grid-cols-6 gap-2">
                                            {colors.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleUpdateStatus(idx, { color: c })}
                                                    className="w-7 h-7 rounded-full border border-slate-100 dark:border-slate-700 hover:scale-110 transition-transform relative"
                                                    style={{ backgroundColor: c }}
                                                >
                                                    {status.color === c && (
                                                        <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Inputs */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={status.label}
                                    onChange={(e) => handleUpdateStatus(idx, { label: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="שם הסטטוס (בעברית)"
                                />
                                <input
                                    type="text"
                                    value={status.id}
                                    readOnly={true} // ID should ideally be immutable or carefully edited. Let's make it readonly for now or editable with caution. User didn't ask to lock it, but changing ID breaks existing leads.
                                    // Actually, if they add new status, they need to set ID. Let's enable editing but maybe warn?
                                    // For now, let's keep it editable but style it as technical. 
                                    // Wait, if I change ID, all leads with that status will be lost (UI wise). 
                                    // Better to keep ID auto-generated for new ones, and allow edit only if really needed. 
                                    // Let's allow edit for flexibility as requested "Manager wants to change".
                                    onChange={(e) => handleUpdateStatus(idx, { id: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono text-slate-500 focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Technical ID (English)"
                                />
                            </div>

                            <button
                                onClick={() => handleDeleteStatus(idx)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                title="מחק סטטוס"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleAddStatus}
                        className="w-full py-4 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-brand-600 hover:border-brand-200 dark:hover:border-brand-800/50 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="font-medium">הוסף סטטוס חדש</span>
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-lg flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-bold mb-1">טיפ לניהול נכון</p>
                    <p>מומלץ לשמור על מספר סטטוסים הגיוני (5-8) כדי שהלוח יישאר קריא. סדר הסטטוסים משפיע על זרימת העבודה משמאל לימין (או מימין לשמאל בעברית).</p>
                </div>
            </div>
        </div>
    );
};
