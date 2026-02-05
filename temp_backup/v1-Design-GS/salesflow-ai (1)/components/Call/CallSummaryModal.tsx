
import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  FileText, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Meh,
  Save,
  ArrowRight
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';

interface CallSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  leadName: string;
}

export const CallSummaryModal: React.FC<CallSummaryModalProps> = ({ isOpen, onClose, onSave, leadName }) => {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [summary, setSummary] = useState("הלקוח הביע עניין רב במודול המובייל. ציין שהמחיר הנוכחי מעט גבוה אך יש גמישות אם נסגור עד סוף הרבעון. ביקש לראות דמו טכני בשבוע הבא.");
  const [nextStepDate, setNextStepDate] = useState("מחר, 10:00");

  if (!isOpen) return null;

  const outcomes = [
    { id: 'meeting', label: 'נקבעה פגישה', icon: Calendar, color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
    { id: 'followup', label: 'נדרש פולואפ', icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
    { id: 'not_interested', label: 'לא רלוונטי', icon: ThumbsDown, color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
    { id: 'bad_timing', label: 'תזמון גרוע', icon: Meh, color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
        
        {/* Header with Score */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              סיכום שיחה
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">עם {leadName} • 08:42 דקות</p>
          </div>
          
          <div className="flex flex-col items-end">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ציון AI</span>
             <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                <span className="font-bold text-slate-900 dark:text-white">88</span>
                <span className="text-xs text-slate-400">/ 100</span>
             </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Outcome Selection */}
          <div>
            <label className="text-sm font-bold text-slate-900 dark:text-white mb-3 block">איך הסתיימה השיחה?</label>
            <div className="grid grid-cols-2 gap-3">
              {outcomes.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOutcome(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                    outcome === item.id 
                      ? `${item.color} ring-1 ring-offset-1 ring-offset-white dark:ring-offset-slate-950` 
                      : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-full bg-white/50 dark:bg-black/20`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          <div className="relative group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
             <div className="relative bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5 uppercase tracking-wide">
                     <Sparkles className="w-3 h-3" /> סיכום אוטומטי
                   </label>
                   <button className="text-xs text-slate-400 hover:text-brand-600 underline">ערוך</button>
                </div>
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full text-sm text-slate-700 dark:text-slate-300 bg-transparent border-none p-0 focus:ring-0 resize-none leading-relaxed h-20"
                />
             </div>
          </div>

          {/* Next Steps */}
          {outcome !== 'not_interested' && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-4">
                  <div className="flex-1">
                     <label className="text-xs font-bold text-slate-500 mb-1.5 block">הצעד הבא</label>
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <input type="text" defaultValue="שליחת הצעת מחיר" className="bg-transparent border-none text-sm w-full outline-none text-slate-900 dark:text-white" />
                     </div>
                  </div>
                  <div className="w-1/3">
                     <label className="text-xs font-bold text-slate-500 mb-1.5 block">מתי?</label>
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input type="text" defaultValue={nextStepDate} className="bg-transparent border-none text-sm w-full outline-none text-slate-900 dark:text-white" />
                     </div>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
           <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-4">
             דלג וסגור
           </button>
           <Button onClick={() => onSave({ outcome, summary })} disabled={!outcome} className="px-6 shadow-lg shadow-brand-500/20">
             <Save className="w-4 h-4 ml-2" />
             שמור וסיים
           </Button>
        </div>

      </div>
    </div>
  );
};
