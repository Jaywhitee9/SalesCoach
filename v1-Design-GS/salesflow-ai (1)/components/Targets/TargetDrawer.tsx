
import React from 'react';
import { RepTargets, User } from '../../types';
import { X, Save, RotateCcw, Target, Activity, Award, Briefcase } from 'lucide-react';
import { Button } from '../Common/Button';

interface TargetDrawerProps {
  targetData: RepTargets | null;
  user: User | undefined;
  onClose: () => void;
  onSave: () => void;
}

export const TargetDrawer: React.FC<TargetDrawerProps> = ({ targetData, user, onClose, onSave }) => {
  if (!targetData || !user) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 left-0 z-50 w-full md:w-[480px] bg-white dark:bg-slate-950 shadow-2xl border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
             <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" />
             <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">יעדים של {user.name}</h2>
               <p className="text-xs text-slate-500 mt-0.5">הגדרת מדדי ביצוע לתקופה הנוכחית</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           
           {/* Activity Section */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                 <Activity className="w-4 h-4 text-brand-500" />
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">פעילות (Activity)</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">שיחות ליום</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         defaultValue={targetData.calls.target} 
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">שיחות</span>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">שיחות מחוברות ליום</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         defaultValue={targetData.connectedCalls.target} 
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">שיחות</span>
                    </div>
                 </div>
                 <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">זמן שיחה כולל (יומי)</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         defaultValue={targetData.talkTime.target} 
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">דקות</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Quality Section */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                 <Award className="w-4 h-4 text-purple-500" />
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">איכות (Quality)</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">יחס המרה (מחוברות לפגישה)</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         defaultValue={15} 
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">ציון איכות מינימלי</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         defaultValue={80} 
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">נק׳</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Outcome Section */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                 <Briefcase className="w-4 h-4 text-emerald-500" />
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">תוצאה (Outcome)</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">יעד עסקאות חודשי</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         defaultValue={targetData.deals.target * 20} // Just mocking monthly
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">עסקאות</span>
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">יעד מחזור חודשי</label>
                    <div className="relative">
                       <input 
                         type="text" 
                         defaultValue={targetData.revenue.target} 
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                       />
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">₪</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Info Box */}
           <div className="bg-brand-50 dark:bg-brand-900/10 p-4 rounded-xl border border-brand-100 dark:border-brand-900/30 flex gap-3">
              <Target className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brand-800 dark:text-brand-200 leading-relaxed">
                היעדים כאן משפיעים על ציון הפריון של הנציג ועל הצגת ההתקדמות בדשבורד האישי שלו. שינויים יחולו החל ממחר בבוקר.
              </p>
           </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-3">
           <Button onClick={onSave} className="w-full justify-center">
             <Save className="w-4 h-4 ml-2" />
             שמור יעדים
           </Button>
           <button className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center justify-center gap-1.5 py-2">
             <RotateCcw className="w-3 h-3" />
             איפוס ליעדי ברירת מחדל
           </button>
        </div>

      </div>
    </>
  );
};
