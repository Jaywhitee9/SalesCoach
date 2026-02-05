import React, { useState, useEffect } from 'react';
import { Activity, Sliders, GripVertical, Plus, Edit2, Trash2, Check, Save, Loader2 } from 'lucide-react';
import { Button } from '../Common/Button';
import { User } from '../../types';

interface SettingsCallsProps {
    user: User;
}

interface CallsConfig {
    transcription: boolean;
    aiInsights: boolean;
    language: string;
    aiModel: string;
    shortTips: boolean;
    coachingWeights: {
        discovery: number;
        objections: number;
        closing: number;
    };
}

export const SettingsCalls: React.FC<SettingsCallsProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config State
    const [config, setConfig] = useState<CallsConfig>({
        transcription: true,
        aiInsights: true,
        language: 'auto',
        aiModel: 'standard',
        shortTips: false,
        coachingWeights: { discovery: 70, objections: 50, closing: 85 }
    });

    // Stages State
    const [stages, setStages] = useState<string[]>([]);
    const [isEditingStage, setIsEditingStage] = useState<number | null>(null);
    const [stageEditText, setStageEditText] = useState('');

    // Fetch Settings on Mount
    useEffect(() => {
        // Determine Organization ID (Fallback for dev)
        const orgId = user.organization_id || 'org1';

        fetch(`/api/settings/calls?organizationId=${orgId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings) {
                    if (data.settings.calls_config) setConfig(data.settings.calls_config);
                    if (data.settings.stages_config) setStages(data.settings.stages_config);
                }
            })
            .catch(err => console.error('Failed to load settings:', err))
            .finally(() => setLoading(false));
    }, [user.organization_id]);

    const handleSave = async () => {
        setSaving(true);
        const orgId = user.organization_id || 'org1';

        try {
            const payload = {
                organizationId: orgId,
                settings: {
                    calls_config: config,
                    stages_config: stages
                }
            };

            const res = await fetch('/api/settings/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                // Optional: Show toast
                console.log('Settings Saved!');
            }
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setTimeout(() => setSaving(false), 500);
        }
    };

    // Stage Management
    const addStage = () => {
        setStages([...stages, 'שלב חדש']);
    };

    const removeStage = (index: number) => {
        const newStages = [...stages];
        newStages.splice(index, 1);
        setStages(newStages);
    };

    const startEditStage = (index: number) => {
        setIsEditingStage(index);
        setStageEditText(stages[index]);
    };

    const saveEditStage = (index: number) => {
        const newStages = [...stages];
        newStages[index] = stageEditText;
        setStages(newStages);
        setIsEditingStage(null);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">טוען הגדרות...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-300 relative pb-16">

            {/* Live Call Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-500" /> מצב שיחות חי
                </h3>
                <div className="space-y-4">

                    {/* Toggle: Transcription */}
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white block">תמלול שיחות בזמן אמת</span>
                            <span className="text-xs text-slate-500">הצגת טקסט השיחה על המסך בזמן אמת</span>
                        </div>
                        <div
                            onClick={() => setConfig({ ...config, transcription: !config.transcription })}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${config.transcription ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${config.transcription ? 'right-1' : 'left-1'}`}></div>
                        </div>
                    </div>

                    {/* Toggle: AI Insights */}
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white block">הצגת תובנות AI בזמן שיחה</span>
                            <span className="text-xs text-slate-500">הצגת טיפים, התנגדויות ונקודות מפתח בזמן אמת</span>
                        </div>
                        <div
                            onClick={() => setConfig({ ...config, aiInsights: !config.aiInsights })}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${config.aiInsights ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${config.aiInsights ? 'right-1' : 'left-1'}`}></div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">שפת שיחה ברירת מחדל</label>
                        <select
                            value={config.language}
                            onChange={(e) => setConfig({ ...config, language: e.target.value })}
                            className="w-full md:w-64 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                        >
                            <option value="auto">זיהוי אוטומטי (Auto-detect)</option>
                            <option value="he">עברית (Hebrew)</option>
                            <option value="en">אנגלית (English)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* AI Coach Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-500" /> הגדרות אימון (AI Coach)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">מודל AI</label>
                        <select
                            value={config.aiModel}
                            onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none mb-4"
                        >
                            <option value="standard">מודל ברירת מחדל (Standard v2)</option>
                            <option value="pro">מודל מכירות מתקדם (Sales Pro)</option>
                            <option value="advanced">מודל מתקדם - Claude 3.5 (Advanced)</option>
                        </select>

                        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white block">הפעלת טיפים קצרים בלבד</span>
                                <span className="text-xs text-slate-500">הסתרת הסברים ארוכים לטובת קריאות מהירה</span>
                            </div>
                            <div
                                onClick={() => setConfig({ ...config, shortTips: !config.shortTips })}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${config.shortTips ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${config.shortTips ? 'right-1' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">מיקוד האימון (משקולות)</h4>

                        {/* Discovery Weight */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">דגש על גילוי צרכים</span>
                                <span className="text-xs font-bold text-brand-600">{config.coachingWeights.discovery}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={config.coachingWeights.discovery}
                                onChange={(e) => setConfig({ ...config, coachingWeights: { ...config.coachingWeights, discovery: parseInt(e.target.value) } })}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            />
                        </div>

                        {/* Objections Weight */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">דגש על טיפול בהתנגדויות</span>
                                <span className="text-xs font-bold text-brand-600">{config.coachingWeights.objections}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={config.coachingWeights.objections}
                                onChange={(e) => setConfig({ ...config, coachingWeights: { ...config.coachingWeights, objections: parseInt(e.target.value) } })}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            />
                        </div>

                        {/* Closing Weight */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">דגש על סגירה</span>
                                <span className="text-xs font-bold text-brand-600">{config.coachingWeights.closing}%</span>
                            </div>
                            <input
                                type="range" min="0" max="100"
                                value={config.coachingWeights.closing}
                                onChange={(e) => setConfig({ ...config, coachingWeights: { ...config.coachingWeights, closing: parseInt(e.target.value) } })}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            />
                        </div>

                    </div>
                </div>
            </div>

            {/* Call Stages */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">שלבי שיחת מכירה</h3>
                    <Button size="sm" variant="ghost" className="text-xs border border-dashed border-slate-300" onClick={addStage}>
                        <Plus className="w-3 h-3 ml-1" /> הוסף שלב
                    </Button>
                </div>

                <div className="space-y-2">
                    {stages.map((stage, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg group hover:border-brand-200 transition-colors">
                            <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                {i + 1}
                            </div>

                            {isEditingStage === i ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={stageEditText}
                                        onChange={(e) => setStageEditText(e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-brand-300 outline-none text-sm"
                                        autoFocus
                                    />
                                    <button onClick={() => saveEditStage(i)} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 font-medium">{stage}</span>
                            )}

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditStage(i)} className="p-1.5 text-slate-400 hover:text-slate-600"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => removeStage(i)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save FAB */}
            <div className="fixed bottom-8 left-8 z-20">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="shadow-xl rounded-full px-6 py-4 h-auto flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'שומר שינויים...' : 'שמור הגדרות'}
                </Button>
            </div>

        </div>
    );
};
