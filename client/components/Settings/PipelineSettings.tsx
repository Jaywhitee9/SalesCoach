import React, { useState, useEffect } from 'react';
import { useOrganizationSettings, PipelineStatus } from '../../src/hooks/useOrganizationSettings';
import { Plus, Trash2, GripVertical, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '../Common/Button';

export const PipelineSettings = ({ orgId }: { orgId?: string }) => {
    const { settings, loading, updateSettings } = useOrganizationSettings(orgId);
    const [statuses, setStatuses] = useState<PipelineStatus[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

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
    };

    const handleDeleteStatus = (idx: number) => {
        const newStatuses = statuses.filter((_, i) => i !== idx);
        setStatuses(newStatuses);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!settings || !updateSettings) return;
        setIsSaving(true);
        await updateSettings({ pipeline_statuses: statuses });
        setIsSaving(false);
        setHasChanges(false);
    };

    const colors = [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#F59E0B', // Amber
        '#10B981', // Emerald
        '#EF4444', // Rose
        '#6366F1', // Indigo
        '#14B8A6', // Teal
        '#F97316', // Orange
        '#64748B'  // Slate
    ];

    if (loading) return <div className="p-8 text-center text-slate-500">טוען הגדרות...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
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

                <div className="space-y-3">
                    {statuses.map((status, idx) => (
                        <div key={status.id || idx} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 group">
                            <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />

                            {/* Color Picker Popover (Simplified) */}
                            <div className="relative group/color">
                                <div
                                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-white dark:border-slate-800 shadow-sm"
                                    style={{ backgroundColor: status.color }}
                                ></div>
                                <div className="absolute top-full right-0 mt-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl grid grid-cols-5 gap-1 w-40 z-10 hidden group-hover/color:grid">
                                    {colors.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => handleUpdateStatus(idx, { color: c })}
                                            className="w-6 h-6 rounded-full border border-slate-100 dark:border-slate-700 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={status.label}
                                    onChange={(e) => handleUpdateStatus(idx, { label: e.target.value })}
                                    className="w-full bg-transparent border-none text-slate-900 dark:text-white font-medium focus:ring-0 p-0"
                                    placeholder="שם הסטטוס"
                                />
                                <input
                                    type="text"
                                    value={status.id}
                                    onChange={(e) => handleUpdateStatus(idx, { id: e.target.value })}
                                    className="w-full bg-transparent border-none text-xs text-slate-500 focus:ring-0 p-0"
                                    placeholder="מזהה מערכת (באנגלית)"
                                />
                            </div>

                            <button
                                onClick={() => handleDeleteStatus(idx)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="מחק סטטוס"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleAddStatus}
                        className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        הוסף סטטוס חדש
                    </button>
                </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-4 rounded-lg flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                    <p className="font-bold mb-1">טיפ חשוב</p>
                    <p>שינויים כאן ישפיעו על כל המשתמשים בארגון. הלידים הקיימים עם סטטוסים שנמחקו ימשיכו להופיע בטבלה אך לא בלוח (Kanban) עד שיעודכנו לסטטוס חדש.</p>
                </div>
            </div>
        </div>
    );
};
