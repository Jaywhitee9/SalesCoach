
import React from 'react';
import { Stage, Lead } from '../../types';
import { Check, Circle, Building2, User, Clock, MoreVertical, Smile, Meh, Frown } from 'lucide-react';
import { Badge } from '../Common/Badge';

interface CallStatusPanelProps {
  stages: Stage[];
  lead: Lead;
  duration: string;
  isDarkMode: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export const CallStatusPanel: React.FC<CallStatusPanelProps> = ({ stages, lead, duration, isDarkMode, sentiment = 'neutral' }) => {
  
  const getSentimentConfig = (s: string) => {
      switch(s) {
          case 'positive': return { label: 'חיובי', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
          case 'negative': return { label: 'מאותגר', icon: Frown, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' };
          default: return { label: 'נייטרלי', icon: Meh, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' };
      }
  };

  const sentimentConfig = getSentimentConfig(sentiment);
  const SentimentIcon = sentimentConfig.icon;

  return (
    <div className="w-72 flex flex-col border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto hidden md:flex">
      
      {/* Lead Info Header - Clean & Simple */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-start mb-3">
           <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-500 dark:text-slate-400">
            {lead.name.charAt(0)}
           </div>
           <button className="text-slate-300 hover:text-slate-500">
             <MoreVertical className="w-4 h-4" />
           </button>
        </div>
        
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{lead.name}</h2>
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-3">
          <Building2 className="w-3.5 h-3.5 ml-1.5" />
          {lead.company}
        </div>
        
        <div className="flex gap-2">
             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
               {lead.status === 'New' ? 'חדש' : lead.status}
             </span>
             {lead.priority === 'Hot' && (
               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                 חם
               </span>
             )}
        </div>
      </div>

      {/* Stages Stepper - Emphasize Current */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">מהלך השיחה</h3>
          <span className="text-[10px] text-slate-400 font-mono">{duration}</span>
        </div>
        
        <div className="relative space-y-0">
          {stages.map((stage, index) => {
            const isLast = index === stages.length - 1;
            const isCurrent = stage.status === 'current';
            const isCompleted = stage.status === 'completed';
            const isUpcoming = stage.status === 'upcoming';
            
            return (
              <div key={stage.id} className="relative flex gap-4 pb-8 group min-h-[3rem]">
                {/* Connecting Line */}
                {!isLast && (
                  <div 
                    className={`absolute right-[9px] top-6 bottom-0 w-0.5 
                    ${isCompleted ? 'bg-emerald-200 dark:bg-emerald-900/50' : ''}
                    ${isCurrent ? 'bg-gradient-to-b from-brand-200 to-slate-100 dark:from-brand-900/50 dark:to-slate-800' : ''}
                    ${isUpcoming ? 'bg-slate-100 dark:bg-slate-800' : ''}
                    `} 
                  />
                )}
                
                {/* Icon/Dot */}
                <div className={`
                  relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all mt-0.5
                  ${isCompleted ? 'bg-emerald-500 text-white shadow-sm' : ''}
                  ${isCurrent ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-50 dark:ring-brand-900/20' : ''}
                  ${isUpcoming ? 'bg-white border-2 border-slate-200 text-slate-300 dark:bg-slate-900 dark:border-slate-700' : ''}
                `}>
                  {isCompleted && <Check className="w-3 h-3" strokeWidth={3} />}
                  {isCurrent && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                  {isUpcoming && <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />}
                </div>

                {/* Content */}
                <div className={`flex flex-col pt-0.5 transition-all duration-300 ${isUpcoming ? 'opacity-60' : 'opacity-100'}`}>
                  <span className={`text-sm font-medium leading-none ${isCurrent ? 'text-brand-700 dark:text-brand-300 font-bold mb-1.5 scale-105 origin-right' : isCompleted ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {stage.label}
                  </span>
                  
                  {/* Current Stage Description */}
                  {isCurrent && (
                    <div className="mt-2 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-900 p-3 rounded-xl border border-brand-100 dark:border-brand-800/50 shadow-sm relative overflow-hidden animate-in slide-in-from-top-2 duration-300">
                       <div className="absolute top-0 right-0 w-1 h-full bg-brand-500"></div>
                       <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                         {stage.description}
                       </p>
                    </div>
                  )}

                  {/* Completed Stage Description (Simplified) */}
                  {isCompleted && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{stage.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics - Simplified Linear Bars */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-5">
        
        {/* Sentiment Widget */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
             <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">סנטימנט השיחה</span>
             <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${sentimentConfig.bg}`}>
                <SentimentIcon className={`w-3.5 h-3.5 ${sentimentConfig.color}`} />
                <span className={`text-xs font-bold ${sentimentConfig.color}`}>{sentimentConfig.label}</span>
             </div>
        </div>

        {/* Quality Score */}
        <div>
           <div className="flex justify-between items-end mb-2">
             <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ציון איכות שיחה</span>
             <div className="flex items-center gap-1">
               <span className="text-sm font-bold text-slate-900 dark:text-white">88</span>
               <span className="text-[10px] text-slate-400">/ 100</span>
             </div>
           </div>
           <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }}></div>
           </div>
        </div>

        {/* Talk Ratio */}
        <div>
           <div className="flex justify-between items-end mb-2">
             <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">יחס דיבור</span>
           </div>
           
           <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
             {/* Agent */}
             <div className="h-full bg-brand-500" style={{ width: '45%' }}></div>
             {/* Customer */}
             <div className="h-full bg-slate-400/50 dark:bg-slate-600" style={{ width: '55%' }}></div>
           </div>
           
           <div className="flex justify-between mt-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
             <span className="text-brand-600 dark:text-brand-400">נציג 45%</span>
             <span>לקוח 55%</span>
           </div>
        </div>

      </div>

    </div>
  );
};
