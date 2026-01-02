
import React, { useState } from 'react';
import { Insight, CoachSuggestion } from '../../types';
import {
  Zap,
  CheckSquare,
  ChevronDown,
  Target,
  Eye,
  GitMerge,
  Link,
  ShieldAlert,
  Flag,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Smile,
  Meh,
  Minus,
  Check,
  Sparkles
} from 'lucide-react';
import { Badge } from '../Common/Badge';

interface InsightsPanelProps {
  insights: Insight[];
  coachingData?: {
    stage?: string;
    stageStatus?: { [key: string]: 'completed' | 'current' | 'upcoming' };
    signals?: { type: string; label: string }[];
  };
}

// --- Stage Types ---
type StageId = 'opening' | 'discovery' | 'closing';

interface Stage {
  id: StageId;
  label: string;
  labelEn: string;
}

const STAGES: Stage[] = [
  { id: 'opening', label: 'פתיחה', labelEn: 'Opening' },
  { id: 'discovery', label: 'בירור צרכים', labelEn: 'Discovery' },
  { id: 'closing', label: 'סגירה', labelEn: 'Closing' },
];

// --- Internal Types for the Coaching Map ---

type SectionId = 'needs' | 'vision' | 'gaps' | 'bridges' | 'objections' | 'summary';

interface MapSection {
  id: SectionId;
  title: string;
  count: number;
  icon: React.ElementType;
  color: string; // Tailwind text color class for icon
}

// --- Mock Data for the Live Coaching Map ---

const SECTIONS: MapSection[] = [
  { id: 'needs', title: 'צרכים וכאבים', count: 3, icon: Target, color: 'text-blue-500' },
  { id: 'vision', title: 'חזון / תוצאה רצויה', count: 2, icon: Eye, color: 'text-purple-500' },
  { id: 'gaps', title: 'פערים (המצב היום)', count: 2, icon: GitMerge, color: 'text-rose-500' },
  { id: 'bridges', title: 'גשרים / פתרונות', count: 2, icon: Link, color: 'text-emerald-500' },
  { id: 'objections', title: 'התנגדויות מרכזיות', count: 2, icon: ShieldAlert, color: 'text-amber-500' },
  { id: 'summary', title: 'סיכום ומחויבויות', count: 4, icon: Flag, color: 'text-slate-500' },
];

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, coachingData }) => {
  const [expandedSection, setExpandedSection] = useState<SectionId | null>('gaps'); // Default open focused section
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<StageId>(
    (coachingData?.stage as StageId) || 'discovery'
  );

  // Toggle Accordion
  const toggleSection = (id: SectionId) => {
    setExpandedSection(prev => prev === id ? null : id);
  };

  const toggleTask = (id: string) => {
    setCompletedTasks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // Filter existing insights for Next Best Action (Top Widget)
  const nextSteps = insights.filter(i => i.type === 'next_step');

  // Determine stage status based on currentStage
  const getStageStatus = (stageId: StageId): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    const stageIndex = STAGES.findIndex(s => s.id === stageId);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-80 flex flex-col border-s border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden hidden xl:flex font-sans h-full">

      {/* 1. Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            מאמן AI - Sales Coach
          </h2>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-slate-400">Live</span>
          </span>
        </div>

        {/* Stage Progress Bar */}
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{
              width: currentStage === 'opening' ? '0%' :
                currentStage === 'discovery' ? '50%' : '100%'
            }}
          ></div>

          {/* Stage Dots */}
          {STAGES.map((stage, index) => {
            const status = getStageStatus(stage.id);
            return (
              <button
                key={stage.id}
                onClick={() => setCurrentStage(stage.id)}
                className="relative z-10 flex flex-col items-center group"
              >
                <div className={`
                  w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                  ${status === 'completed'
                    ? 'bg-brand-500 border-brand-500'
                    : status === 'current'
                      ? 'bg-emerald-500 border-emerald-500 ring-4 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }
                `}>
                  {status === 'completed' && (
                    <Check className="w-2.5 h-2.5 text-white" />
                  )}
                  {status === 'current' && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </div>
                <span className={`
                  mt-1.5 text-[10px] font-bold transition-colors
                  ${status === 'current'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : status === 'completed'
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-400'
                  }
                `}>
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">

        {/* 2. Top Widget: Next Best Action (Quick Actions) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">הצעד הבא המומלץ</h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug px-1">
              {nextSteps.length > 0 ? nextSteps[0].title : "וודא הבנה של הפתרון"}
            </div>
            <div className="space-y-1">
              {(nextSteps.slice(1).length > 0 ? nextSteps.slice(1) : [{ id: 'st1', title: 'הצג מקרה בוחן רלוונטי' }]).map((task) => (
                <label key={task.id} className="flex items-start gap-3 cursor-pointer group p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={completedTasks.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 checked:border-brand-500 checked:bg-brand-500 transition-all"
                    />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                      <CheckSquare className="w-3 h-3" />
                    </span>
                  </div>
                  <span className={`text-xs transition-colors leading-snug pt-0.5 ${completedTasks.includes(task.id) ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                    {task.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Live Coaching Map (Redesigned) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">מפת שיחה חיה</h3>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">AI Live</span>
          </div>

          <div className="space-y-2.5">
            {SECTIONS.map((section) => {
              const isOpen = expandedSection === section.id;
              const Icon = section.icon;

              return (
                <div
                  key={section.id}
                  className={`bg-white dark:bg-slate-900 border transition-all duration-300 overflow-hidden rounded-xl shadow-sm
                      ${isOpen ? 'border-brand-200 dark:border-brand-900 ring-1 ring-brand-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
                    `}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-slate-100 dark:bg-slate-800' : 'bg-transparent'}`}>
                        <Icon className={`w-4 h-4 ${section.color}`} />
                      </div>
                      <span className={`text-sm font-bold ${isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {section.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isOpen && (
                        <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                          {section.count}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Accordion Content */}
                  <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-4 pb-4 pt-0 border-t border-slate-50 dark:border-slate-800/50">

                      {/* Content Logic based on Section ID */}
                      <div className="mt-3 space-y-3">

                        {/* PAINS / NEEDS */}
                        {section.id === 'needs' && (
                          <>
                            {(coachingData?.signals?.pains && coachingData.signals.pains.length > 0) ? (
                              coachingData.signals.pains.map((item, i) => (
                                <div key={i} className="flex items-start justify-between group">
                                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.text}</span>
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.severity === 'high' ? 'bg-rose-500' :
                                    item.severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
                                    }`} title={item.severity || 'medium'}></div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">לא זוהו כאבים עדיין...</p>
                            )}
                          </>
                        )}

                        {/* VISION */}
                        {section.id === 'vision' && (
                          <>
                            {(coachingData?.signals?.vision && coachingData.signals.vision.length > 0) ? (
                              coachingData.signals.vision.map((item, i) => (
                                <div key={i} className="flex items-start justify-between group">
                                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.text}</span>
                                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-purple-500"></div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">לא זוהה חזון / תוצאה רצויה עדיין...</p>
                            )}
                          </>
                        )}

                        {/* GAPS */}
                        {section.id === 'gaps' && (
                          <>
                            {(coachingData?.signals?.gaps && coachingData.signals.gaps.length > 0) ? (
                              <div className="space-y-3">
                                {coachingData.signals.gaps.map((item, i) => (
                                  <div key={i} className="flex flex-col gap-1">
                                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{item.text}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">לא זוהו פערים עדיין...</p>
                            )}
                          </>
                        )}

                        {/* BRIDGES */}
                        {section.id === 'bridges' && (
                          <>
                            <div className="space-y-3">
                              <div className="flex flex-col gap-1.5">
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">מודול סנכרון אוטומטי דו-כיווני</p>
                                <div className="flex items-center gap-1.5">
                                  <Smile className="w-3 h-3 text-emerald-500" />
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">תגובה חיובית</span>
                                </div>
                              </div>
                              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
                              <div className="flex flex-col gap-1.5">
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">אפליקציית נייטיב לאנדרואיד/iOS</p>
                                <div className="flex items-center gap-1.5">
                                  <Meh className="w-3 h-3 text-amber-500" />
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">ספקנות קלה</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* OBJECTIONS */}
                        {section.id === 'objections' && (
                          <>
                            {(coachingData?.signals?.objections && coachingData.signals.objections.length > 0) ? (
                              <div className="space-y-3">
                                {coachingData.signals.objections.map((item, i) => (
                                  <div key={i} className={`p-2.5 rounded-lg border ${item.status === 'handled'
                                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 opacity-75'
                                      : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30'
                                    }`}>
                                    <div className="flex justify-between items-start mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        {item.status === 'handled' ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                                        )}
                                        <span className={`text-[10px] font-bold ${item.status === 'handled' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                          התנגדות
                                        </span>
                                      </div>
                                      <span className={`text-[9px] border px-1.5 rounded-sm bg-white dark:bg-slate-900 ${item.status === 'handled'
                                          ? 'border-emerald-200 text-emerald-600'
                                          : 'border-rose-200 text-rose-600'
                                        }`}>
                                        {item.status === 'handled' ? 'טופלה' : 'פתוחה'}
                                      </span>
                                    </div>
                                    <p className={`text-xs text-slate-700 dark:text-slate-300 ${item.status === 'handled' ? 'line-through' : 'italic'}`}>
                                      "{item.text}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">לא זוהו התנגדויות עדיין...</p>
                            )}
                          </>
                        )}

                        {/* SUMMARY */}
                        {section.id === 'summary' && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase">הלקוח יבצע</h4>
                                <ul className="space-y-1.5">
                                  <li className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                                    <span className="w-1 h-1 bg-slate-400 rounded-full mt-1.5"></span>
                                    שליחת דוגמת דאטה
                                  </li>
                                  <li className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                                    <span className="w-1 h-1 bg-slate-400 rounded-full mt-1.5"></span>
                                    בדיקת לו"ז מקבל החלטות
                                  </li>
                                </ul>
                              </div>
                              <div className="space-y-2 border-r border-slate-100 dark:border-slate-800 pr-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase">הנציג יבצע</h4>
                                <ul className="space-y-1.5">
                                  <li className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                                    <span className="w-1 h-1 bg-brand-400 rounded-full mt-1.5"></span>
                                    שליחת מחשבון ROI
                                  </li>
                                  <li className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                                    <span className="w-1 h-1 bg-brand-400 rounded-full mt-1.5"></span>
                                    זימון פגישת דמו
                                  </li>
                                </ul>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                טיפ: וודא סגירת הפער לפני סיום השיחה.
                              </p>
                            </div>
                          </>
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
