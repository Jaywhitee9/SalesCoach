import React, { useState, useRef, useEffect } from 'react';
import {
    FileText,
    PauseCircle,
    PhoneOff,
    Sparkles,
    Zap,
    AlertTriangle,
    ShieldAlert,
    GitMerge,
    Target
} from 'lucide-react';
import { QuickActionsBar } from './QuickActionsBar';

interface LegacyCallPanelProps {
    transcripts: any[];
    coachingData: any;
    callDuration: number;
    currentLead: any;
    onEndCall?: () => void;
    formatTime: (seconds: number) => string;
}

export const LegacyCallPanel: React.FC<LegacyCallPanelProps> = ({
    transcripts,
    coachingData,
    callDuration,
    currentLead,
    onEndCall,
    formatTime
}) => {
    const [showCallScript, setShowCallScript] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (transcripts.length && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    return (
        <div className="flex flex-col h-full p-3 md:p-4 lg:p-6 gap-4 overflow-y-auto lg:overflow-hidden bg-[#F7F8FC]">

            {/* Call Controls (Timer + End) */}
            <div className="w-full bg-white rounded-2xl border border-[#E7EAF2] shadow-sm p-4 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-rose-600">מקליט</span>
                    </div>
                    <span className="font-mono text-xl font-bold text-[#0B1220]">{formatTime(callDuration)}</span>
                    {currentLead && <span className="text-sm text-slate-500">• {currentLead.name}</span>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCallScript(!showCallScript)}
                        className={`p-2 rounded-lg border transition-colors ${showCallScript
                            ? 'bg-brand-50 border-brand-200 text-brand-600'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        title="תסריט שיחה"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                        <PauseCircle className="w-5 h-5" />
                    </button>
                    <button onClick={onEndCall} className="px-4 py-2 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] font-bold hover:bg-[#FFE4E6] transition-colors text-sm flex items-center justify-center gap-2">
                        <PhoneOff className="w-4 h-4" />
                        <span>סיום שיחה</span>
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <QuickActionsBar
                leadPhone={currentLead?.phone}
                leadName={currentLead?.name}
                leadEmail={currentLead?.email}
                className="bg-white rounded-xl border border-slate-200 p-3"
                callTranscript={transcripts.map((t: any) => `${t.speaker}: ${t.text}`).join('\n')}
                callSummary={coachingData}
            />

            {/* BOTTOM HALF: Coach & Transcript */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">

                {/* a) Transcript */}
                <div className="flex-1 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm flex flex-col overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-[#E7EAF2]">
                        <h3 className="font-bold text-slate-800">Transcript</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white space-y-4" ref={scrollRef}>
                        {transcripts.length === 0 && (
                            <div className="text-center text-slate-400 mt-10">Waiting for call to start...</div>
                        )}
                        {transcripts.map((msg: any, i: number) => (
                            <div key={i} className={`flex flex-col ${msg.speaker === 'agent' ? 'items-end' : 'items-start'} max-w-[85%] w-full ${msg.speaker === 'agent' ? 'mr-auto' : 'ml-auto'}`}>
                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <span className="text-[10px] text-[#98A2B3] font-medium font-mono">Now</span>
                                    <span className="text-xs font-bold text-[#667085]">{msg.speaker === 'agent' ? 'אני' : 'לקוח'}</span>
                                </div>
                                <div className={`
                        relative px-4 py-3 text-sm leading-relaxed shadow-sm
                        ${msg.speaker === 'agent'
                                        ? 'bg-[#EFF4FF] text-[#1E3A8A] rounded-2xl rounded-tl-none border border-blue-100/50'
                                        : 'bg-white text-[#344054] rounded-2xl rounded-tr-none border border-[#E7EAF2]'}
                        ${msg.isFinal === false ? 'opacity-70 animate-pulse' : ''}
                     `}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* b) AI Coach Panel - ENHANCED */}
                <div className="w-full lg:w-96 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm flex flex-col overflow-hidden shrink-0 max-h-[calc(100vh-200px)]">
                    {/* Header */}
                    <div className="p-4 border-b border-[#E7EAF2] bg-gradient-to-r from-[#6366f1]/5 to-white flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#0B1220] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 fill-purple-600" />
                            מאמן AI – Sales Coach
                        </h3>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-700">Live</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* 🎯 Main Tip Box - Most Prominent */}
                        <div className="bg-gradient-to-br from-[#6366f1] to-[#4f46e5] rounded-xl p-4 text-white relative overflow-hidden shadow-lg">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 opacity-90">
                                <Zap className="w-3.5 h-3.5" />
                                טיפ עכשיו
                            </h4>
                            <p className="text-sm leading-relaxed font-medium">
                                {coachingData?.insight || 'מאזין לשיחה...'}
                            </p>

                            {/* Suggested Reply */}
                            {coachingData?.suggestion && (
                                <div className="mt-3 p-3 bg-white/15 backdrop-blur rounded-lg border border-white/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">💬 אמור:</span>
                                    <p className="text-sm mt-1 leading-relaxed">"{coachingData.suggestion}"</p>
                                </div>
                            )}
                        </div>

                        {/* 📊 Signals Grid */}
                        <div className="grid grid-cols-2 gap-3">

                            {/* Pains / כאבים */}
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                                <h5 className="text-[10px] font-bold text-rose-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    כאבים
                                </h5>
                                {coachingData?.signals?.pains && coachingData.signals.pains.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {coachingData.signals.pains.slice(0, 3).map((pain: any, i: number) => (
                                            <li key={i} className="text-xs text-rose-800 flex items-start gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${pain.severity === 'high' ? 'bg-rose-600' :
                                                    pain.severity === 'medium' ? 'bg-rose-400' : 'bg-rose-300'
                                                    }`}></span>
                                                {pain.text}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] text-rose-400 italic">לא זוהו עדיין</p>
                                )}
                            </div>

                            {/* Objections / התנגדויות */}
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                <h5 className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3" />
                                    התנגדויות
                                </h5>
                                {coachingData?.signals?.objections && coachingData.signals.objections.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {coachingData.signals.objections.slice(0, 3).map((obj: any, i: number) => (
                                            <li key={i} className={`text-xs flex items-start gap-1.5 ${obj.status === 'handled' ? 'text-emerald-700 line-through opacity-60' : 'text-amber-800'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${obj.status === 'handled' ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`}></span>
                                                {obj.text}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] text-amber-400 italic">לא זוהו עדיין</p>
                                )}
                            </div>

                            {/* Gaps / פערים */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                <h5 className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <GitMerge className="w-3 h-3" />
                                    פערים
                                </h5>
                                {coachingData?.signals?.gaps && coachingData.signals.gaps.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {coachingData.signals.gaps.slice(0, 3).map((gap: any, i: number) => (
                                            <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-blue-500"></span>
                                                {gap.text}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] text-blue-400 italic">לא זוהו עדיין</p>
                                )}
                            </div>

                            {/* Vision / חזון */}
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                                <h5 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    חזון הלקוח
                                </h5>
                                {coachingData?.signals?.vision && coachingData.signals.vision.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {coachingData.signals.vision.slice(0, 3).map((vis: any, i: number) => (
                                            <li key={i} className="text-xs text-purple-800 flex items-start gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-purple-500"></span>
                                                {vis.text}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[10px] text-purple-400 italic">לא זוהו עדיין</p>
                                )}
                            </div>
                        </div>

                        {/* Stage Indicator */}
                        {coachingData?.stage && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-xs text-slate-500">שלב נוכחי:</span>
                                <span className="text-xs font-bold text-slate-800 px-2 py-1 bg-white rounded-lg border border-slate-200">
                                    {coachingData.stage}
                                </span>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};
