import React from 'react';
import { Lightbulb, Target } from 'lucide-react';

interface CoachingData {
  dailyFocus: Array<{ text: string; why: string }>;
  goldenTip: { title: string; content: string; example: string };
}

interface CoachingPanelProps {
  coaching: CoachingData | null;
  loading: boolean;
}

export const CoachingPanel = React.memo<CoachingPanelProps>(({ coaching, loading }) => {
  return (
    <div className="lg:col-span-4 flex flex-col gap-6">
      {/* Focus Card */}
      <div className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] rounded-2xl shadow-xl shadow-indigo-900/20 p-6 text-white relative overflow-hidden min-h-[260px] flex flex-col border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-20 -mt-20 blur-3xl mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full -ml-10 -mb-10 blur-3xl mix-blend-overlay"></div>

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
              <Lightbulb className="w-5 h-5 text-yellow-300 fill-yellow-300/20" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">המיקוד להיום</h3>
              <p className="text-xs text-indigo-200 opacity-80">
                {loading ? 'מנתח ביצועים...' : 'מבוסס על ביצועי אתמול'}
              </p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-yellow-400 rounded-full"></div>
              </div>
            ) : coaching?.dailyFocus?.length > 0 ? (
              coaching.dailyFocus.map((focus, idx) => (
                <div
                  key={idx}
                  className="group flex items-start gap-3 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm rounded-xl p-3.5 border border-white/5 hover:border-white/20 cursor-default hover:translate-x-1"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                  <div>
                    <p className="text-sm leading-relaxed font-medium text-indigo-50/90 group-hover:text-white">
                      {focus.text}
                    </p>
                    {focus.why && <p className="text-xs text-indigo-300/60 mt-1">{focus.why}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-indigo-200/60 py-4 text-sm">אין נתוני אימון כרגע</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Tips Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-200"></div>
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          {coaching?.goldenTip?.title || 'טיפ זהב'}
        </h3>
        <div className="relative z-10">
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="animate-spin w-4 h-4 border-2 border-slate-200 border-t-amber-500 rounded-full"></div>
              <span className="text-sm text-slate-400">מעבד טיפים...</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic">
                "{coaching?.goldenTip?.content || 'לקוחות ששואלים על מחיר בתחילת השיחה הם לרוב בשלים יותר.'}"
              </p>
              {coaching?.goldenTip?.example && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">💡 דוגמה:</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{coaching.goldenTip.example}</p>
                </div>
              )}
            </>
          )}
          <div className="mt-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">AI</span>
            </div>
            <span className="text-xs text-slate-400">AI Coach Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CoachingPanel.displayName = 'CoachingPanel';
