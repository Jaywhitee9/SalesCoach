import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, HelpCircle, ShieldAlert, MessageSquare, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { CoachSuggestion } from '../../types';

interface LivePlaybookProps {
    stages: string[];
    currentStageIdx: number;
    setStageIdx: (idx: number) => void;
    suggestions: CoachSuggestion[];
}

// Hardcoded "Best Practice" content for common sales stages
// Maps stage name (or partial match) to content
const getStageContent = (stageName: string) => {
    const normalized = stageName.toLowerCase();

    if (normalized.includes('פתיחה') || normalized.includes('intro')) {
        return [
            'הצגה עצמית (שם + חברה)',
            'בדיקת זמינות ("תופס אותך בזמן נוח?")',
            'משפט פתיחה ("הסיבה שאני מתקשר...")',
            'יצירת עניין ראשוני (Hook)'
        ];
    }
    if (normalized.includes('גילוי') || normalized.includes('discovery') || normalized.includes('צרכים')) {
        return [
            'מה האתגר הנוכחי שלכם?',
            'כמה זמן הבעיה קיימת?',
            'מה ניסיתם לעשות עד היום?',
            'מה יקרה אם לא תפתרו את זה?',
            'מי מקבל ההחלטות בנושא?'
        ];
    }
    if (normalized.includes('הצגה') || normalized.includes('demo') || normalized.includes('פתרון')) {
        return [
            'חיבור הפתרון לכאב שזוהה',
            'הדגשת ROI / תועלת עסקית',
            'שימוש בדוגמאות מלקוחות דומים (Social Proof)',
            'בדיקת הבנה ("איך זה נשמע לך עד כאן?")'
        ];
    }
    if (normalized.includes('התנגדויות') || normalized.includes('objection')) {
        return [
            'הקשבה פעילה (לא להתפרץ)',
            'אמפתיה ("אני מבין...")',
            'בידוד ההתנגדות ("חוץ מהמחיר...")',
            'מתן מענה',
            'וידוא פתרון ("זה עונה על החשש?")'
        ];
    }
    if (normalized.includes('סגירה') || normalized.includes('closing')) {
        return [
            'סיכום התועלות',
            'הצגת הצעה ברורה',
            'שאלת סגירה ("נתקדם לחוזה?")',
            'קביעת צעדים הבאים (Next Steps)'
        ];
    }

    // Default generic checklist
    return [
        'הקשבה ללקוח',
        'רישום נקודות חשובות',
        'אמפתיה',
        'קידום השיחה למטרה'
    ];
};

export const LivePlaybook: React.FC<LivePlaybookProps> = ({
    stages,
    currentStageIdx,
    setStageIdx,
    suggestions
}) => {
    // Battlecards State
    const [openBattlecard, setOpenBattlecard] = useState<string | null>(null);

    // If no stages defined, provide defaults
    const activeStages = stages.length > 0 ? stages : ['פתיחה והיכרות', 'גילוי צרכים', 'הצגת פתרון', 'טיפול בהתנגדויות', 'סגירה'];
    const safeCurrentStageIdx = Math.min(currentStageIdx, activeStages.length - 1);
    const currentChecklist = getStageContent(activeStages[safeCurrentStageIdx]);

    const battlecards = [
        { id: 'price', label: 'יקר לי', response: 'המחיר הוא השקעה, לא הוצאה. בוא נראה את ה-ROI למול עלות הבעיה שיש לכם היום.' },
        { id: 'send_info', label: 'שלח חומר', response: 'בשמחה. כדי שאדע בדיוק מה רלוונטי לשלוח, מה הנקודה שהכי חשובה לך כרגע?' },
        { id: 'competitor', label: 'עובד עם מתחרה', response: 'מצוין! מה הייתם רוצים לשפר בעבודה איתם? אנחנו מתמחים בדיוק ב...' },
        { id: 'busy', label: 'אין לי זמן', response: 'מבין לגמרי. אני צריך 30 שניות כדי להסביר למה התקשרתי, ואז תחליט אם להמשיך. הולך?' }
    ];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">

            {/* 1. Stage Timeline (Top) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">שלבי השיחה</h3>
                <div className="relative flex justify-between items-center z-0">
                    {/* Progress Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

                    {activeStages.map((stage, idx) => {
                        const isActive = idx === safeCurrentStageIdx;
                        const isPast = idx < safeCurrentStageIdx;

                        return (
                            <button
                                key={idx}
                                onClick={() => setStageIdx(idx)}
                                className={`relative group flex flex-col items-center focus:outline-none transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                                title={stage}
                            >
                                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-300 bg-white dark:bg-slate-900
                  ${isActive ? 'border-brand-500 text-brand-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' :
                                        isPast ? 'border-emerald-500 text-emerald-500' : 'border-slate-300 dark:border-slate-600 text-slate-300'}
                `}>
                                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-500' : 'bg-transparent'}`} />}
                                </div>
                                {/* Tooltip-like label for active stage */}
                                {isActive && (
                                    <span className="absolute top-8 text-[10px] font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-full animate-in fade-in slide-in-from-top-1">
                                        {stage}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-8 text-center">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white transition-all duration-300">
                        {activeStages[safeCurrentStageIdx]}
                    </h2>
                </div>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0">

                {/* Current Stage Checklist */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-3">
                        {currentChecklist.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-lg transition-colors">
                                <div className="mt-0.5 w-5 h-5 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center group-hover:border-brand-400 transition-colors">
                                    {/* In a real app, this would be state-controlled checkbox */}
                                    <div className="w-2.5 h-2.5 rounded-sm bg-transparent group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50" />
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live AI Insights Feed (Unified here) */}
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">תובנות בזמן אמת</h3>
                    </div>

                    <div className="space-y-3">
                        {suggestions.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                                ממתין לתובנות ראשונות...
                            </div>
                        ) : (
                            suggestions.map((suggestion) => (
                                <div key={suggestion.id} className="flex gap-3 items-start animate-in slide-in-from-bottom-2 duration-300 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 p-3 rounded-xl shadow-sm">
                                    <div className={`
                                w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
                                ${suggestion.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                            suggestion.type === 'tip' ? 'text-brand-600 dark:text-brand-400' :
                                                'text-slate-500 dark:text-slate-400'}
                            `}>
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                            {suggestion.text}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Footer: Objection Battlecards */}
            <div className="mt-auto bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <div className="p-2 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> מענה להתנגדויות
                    </h3>
                </div>

                {/* Accordion List */}
                <div className="max-h-48 overflow-y-auto">
                    {battlecards.map((card) => {
                        const isOpen = openBattlecard === card.id;
                        return (
                            <div key={card.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <button
                                    onClick={() => setOpenBattlecard(isOpen ? null : card.id)}
                                    className={`w-full text-right px-4 py-3 flex items-center justify-between text-sm transition-colors
                                ${isOpen ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-100 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}
                            `}
                                >
                                    <span>{card.label}</span>
                                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 opacity-50" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
                                </button>

                                {isOpen && (
                                    <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed animate-in slide-in-from-top-1">
                                        {card.response}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
