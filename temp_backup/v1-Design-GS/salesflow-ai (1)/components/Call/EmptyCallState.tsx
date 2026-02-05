
import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Clock, 
  Search, 
  Play, 
  PauseCircle, 
  PhoneOff, 
  UserPlus, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Download, 
  ChevronDown, 
  Sparkles,
  DollarSign,
  Timer,
  MoreVertical,
  ArrowLeft,
  X,
  Briefcase,
  PanelLeft,
  PanelRight,
  Menu
} from 'lucide-react';
import { MOCK_LEADS, CALL_STAGES, MOCK_TRANSCRIPT } from '../../constants';
import { Badge } from '../Common/Badge';

interface EmptyCallStateProps {
  onStartCall: () => void;
  isCallActive?: boolean;
  onEndCall?: () => void;
}

// Mock KPI Data
const KPI_METRICS = [
  { label: 'שיחות מעקב', value: '3 / 5', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'עסקאות', value: '1', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'לקוחות חדשים', value: '8', icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'נענו', value: '10 / 27', icon: CheckCircle2, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: 'זמן שיחה', value: '00:44', icon: Timer, color: 'text-slate-600', bg: 'bg-slate-100' },
];

export const EmptyCallState: React.FC<EmptyCallStateProps> = ({ onStartCall, isCallActive = false, onEndCall }) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Responsive Drawer States
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isKPIOpen, setIsKPIOpen] = useState(false);

  // Auto-scroll transcript
  useEffect(() => {
    if (isCallActive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isCallActive]);

  const currentLead = activeLeadId ? MOCK_LEADS.find(l => l.id === activeLeadId) : MOCK_LEADS[0];

  return (
    <div className="flex w-full h-full bg-[#F7F8FC] font-sans overflow-hidden text-[#0B1220] relative">
      
      {/* Mobile Backdrop */}
      {(isQueueOpen || isKPIOpen) && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={() => { setIsQueueOpen(false); setIsKPIOpen(false); }}
        />
      )}

      {/* 1. RIGHT COLUMN (Visual Right in RTL) - Lead Queue */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-[#E7EAF2] h-full flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        xl:relative xl:translate-x-0 xl:shadow-[4px_0_24px_rgba(0,0,0,0.01)] xl:z-auto xl:flex-shrink-0
        ${isQueueOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
      `}>
        
        {/* Mobile Close Button - Right Side (Outer Edge) */}
        <button 
          onClick={() => setIsQueueOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 xl:hidden z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-4 border-b border-[#E7EAF2] flex-shrink-0">
           <div className="flex items-center justify-between mb-4">
             <h2 className="font-bold text-[#0B1220] text-base">שיחה בטיפול</h2>
             <span className="text-[11px] font-medium text-[#667085] bg-slate-50 border border-[#E7EAF2] px-2 py-0.5 rounded-full">3 ממתינות</span>
           </div>
           
           {/* Tabs */}
           <div className="flex bg-[#F0F2F5] p-1 rounded-xl mb-3">
              <button className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#0B1220] transition-all border border-transparent">
                שיחות מעקב
              </button>
              <button className="flex-1 py-1.5 text-xs font-medium text-[#667085] hover:text-[#0B1220] transition-all">
                חיפוש
              </button>
           </div>

           {/* Search Input */}
           <div className="relative group">
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] group-focus-within:text-brand-500 transition-colors" />
             <input 
               type="text" 
               placeholder="חיפוש..." 
               className="w-full pl-3 pr-9 py-2 bg-white border border-[#E7EAF2] rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-[#98A2B3]"
             />
           </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
           {MOCK_LEADS.map((lead) => (
             <div 
               key={lead.id}
               onClick={() => setActiveLeadId(lead.id)}
               className={`
                  p-3.5 rounded-2xl border cursor-pointer transition-all relative group
                  ${activeLeadId === lead.id 
                    ? 'bg-[#F0F6FF] border-brand-200/60 shadow-sm' 
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-[#F2F4F7]'}
               `}
             >
                {/* Active Indicator */}
                {activeLeadId === lead.id && <div className="absolute right-0 top-4 bottom-4 w-1 bg-brand-500 rounded-l-full"></div>}
                
                <div className="flex justify-between items-start mb-1.5 pl-1">
                   <span className={`font-semibold text-sm truncate ${activeLeadId === lead.id ? 'text-brand-900' : 'text-[#0B1220]'}`}>{lead.name}</span>
                   {lead.priority === 'Hot' && (
                     <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.2)]"></div>
                     </div>
                   )}
                </div>
                
                <div className="flex items-center justify-between pl-1">
                   <div className="flex items-center gap-2">
                     <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${activeLeadId === lead.id ? 'bg-white/60 border-brand-100 text-brand-600' : 'bg-slate-50 border-slate-100 text-[#667085]'}`}>
                       {lead.source}
                     </span>
                   </div>
                   <span className="text-[11px] text-[#98A2B3] font-medium">16:00</span>
                </div>
             </div>
           ))}
        </div>

        {/* Timeline Preview - Hidden on small mobile heights if needed, but kept for now */}
        <div className="h-1/3 min-h-[200px] border-t border-[#E7EAF2] bg-[#FAFAFC] p-5 overflow-hidden flex flex-col flex-shrink-0">
           <h3 className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-4">פעילות אחרונה</h3>
           <div className="flex-1 overflow-y-auto space-y-0 relative pr-1">
              <div className="absolute right-[11px] top-2 bottom-0 w-px bg-[#E7EAF2]"></div>
              
              <div className="relative flex gap-3 pb-5 group">
                 <div className="w-6 h-6 rounded-full bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center relative z-10 shrink-0 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                 </div>
                 <div>
                    <p className="text-xs font-semibold text-[#344054] group-hover:text-brand-600 transition-colors">שיחת AI - סיכום</p>
                    <span className="text-[10px] text-[#98A2B3] block mt-0.5 font-medium">אתמול • 14:30</span>
                 </div>
              </div>

              <div className="relative flex gap-3 pb-5 group">
                 <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center relative z-10 shrink-0 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                 </div>
                 <div>
                    <p className="text-xs font-semibold text-[#344054] group-hover:text-brand-600 transition-colors">נקבעה שיחת מעקב</p>
                    <span className="text-[10px] text-[#98A2B3] block mt-0.5 font-medium">8 נוב • 09:15</span>
                 </div>
              </div>

              <div className="relative flex gap-3 group">
                 <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center relative z-10 shrink-0 shadow-sm">
                    <FileText className="w-3 h-3" />
                 </div>
                 <div>
                    <p className="text-xs font-semibold text-[#344054] group-hover:text-brand-600 transition-colors">ליד חדש נוצר</p>
                    <span className="text-[10px] text-[#98A2B3] block mt-0.5 font-medium">1 נוב • 11:00</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* 2. CENTER COLUMN - Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FC] relative h-full overflow-hidden">
         
         {/* Mobile Toggles Header (Visible only on < xl) */}
         <div className="h-12 px-4 flex items-center justify-between xl:hidden border-b border-[#E7EAF2] bg-white shrink-0 shadow-sm z-20">
            <button onClick={() => setIsQueueOpen(true)} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-600 transition-colors">
               <PanelRight className="w-4 h-4" />
               תור שיחות
            </button>
            <button onClick={() => setIsKPIOpen(true)} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-600 transition-colors">
               מדדים
               <PanelLeft className="w-4 h-4" />
            </button>
         </div>

         {!isCallActive ? (
            // STATE A: NO ACTIVE CALL
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
               <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E7EAF2] p-6 md:p-10 max-w-lg w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-purple-500"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                  
                  <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-sm border border-brand-100">
                     <Phone className="w-9 h-9 text-brand-600" />
                  </div>
                  
                  <h2 className="text-xl md:text-2xl font-bold text-[#0B1220] mb-2 relative z-10">הפעלת חייגן אוטומטי</h2>
                  <p className="text-[#667085] text-sm mb-8 max-w-xs mx-auto leading-relaxed relative z-10">
                     בחר קמפיין כדי להתחיל את החייגן האוטומטי ולדבר עם הליד הבא בתור.
                  </p>

                  <div className="space-y-3 relative z-10">
                     <div className="relative">
                        <select 
                          value={campaign}
                          onChange={(e) => setCampaign(e.target.value)}
                          className="w-full h-12 pl-4 pr-10 bg-[#FAFAFC] border border-[#E7EAF2] rounded-xl text-sm font-medium text-[#0B1220] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 appearance-none cursor-pointer transition-all"
                        >
                           <option value="" disabled>בחירת קמפיין...</option>
                           <option value="q4">Q4 Promotion</option>
                           <option value="leads">Webinar Leads</option>
                        </select>
                        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] pointer-events-none" />
                     </div>

                     <button 
                        onClick={onStartCall}
                        disabled={!campaign}
                        className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5
                           ${campaign 
                             ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/25' 
                             : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'}`}
                     >
                        <Play className="w-4 h-4 fill-current" />
                        הפעלת חייגן
                     </button>
                  </div>
               </div>
               
               <p className="mt-8 text-xs text-[#98A2B3] font-medium flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  AI Coach מוכן לסייע בזמן אמת
               </p>
            </div>
         ) : (
            // STATE B: ACTIVE CALL
            <div className="flex flex-col h-full p-3 md:p-4 lg:p-6 gap-4 overflow-y-auto lg:overflow-hidden">
               
               {/* TOP HALF: Lead & Call Controls */}
               {/* Responsive logic: 
                   - Mobile (<lg): Stacked (Column)
                   - Tablet/Laptop (lg, <xl): Row (Side by Side) - Plenty space
                   - Desktop w/ Sidebars (xl, <2xl): Stacked (Column) - Sidebars reduce space
                   - Large Desktop (2xl+): Row (Side by Side) - Huge space
               */}
               <div className="flex flex-col lg:flex-row xl:flex-col 2xl:flex-row gap-4 h-auto shrink-0">
                  
                  {/* Lead Info & Actions Combined Card */}
                  <div className="flex-1 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                     
                     {/* Lead Identity */}
                     <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                        <div className="w-12 h-12 rounded-xl bg-[#F0F6FF] flex items-center justify-center text-lg font-bold text-brand-600 border border-brand-50 shrink-0">
                           {currentLead?.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 mb-0.5">
                              <h2 className="text-lg font-bold text-[#0B1220] truncate">{currentLead?.name}</h2>
                              <Badge variant="neutral" className="px-1.5 py-0 text-[10px] bg-[#F9FAFB] border-[#E7EAF2] text-[#475467]">
                                 {currentLead?.source || 'LinkedIn'}
                              </Badge>
                           </div>
                           <div className="flex items-center gap-3 text-xs text-[#667085] flex-wrap">
                              <span className="font-mono dir-ltr flex items-center gap-1">
                                 <Phone className="w-3 h-3 text-[#98A2B3]" /> 
                                 {currentLead?.phone}
                              </span>
                              <span className="w-px h-3 bg-slate-200 hidden md:block"></span>
                              <span className="truncate flex items-center gap-1">
                                 <Briefcase className="w-3 h-3 text-[#98A2B3]" />
                                 {currentLead?.company}
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Divider (Hidden on mobile) */}
                     <div className="w-px h-10 bg-slate-100 mx-2 hidden lg:block xl:hidden 2xl:block"></div>

                     {/* Actions & Next Step Row */}
                     <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                        
                        {/* Next Step Input Group */}
                        <div className="flex flex-col gap-1 w-full md:w-auto">
                           <span className="text-[10px] font-bold text-[#98A2B3] uppercase">צעד הבא</span>
                           <div className="flex items-center gap-2 bg-[#FAFAFC] border border-[#E7EAF2] rounded-lg p-1 w-full">
                              <div className="relative flex-1">
                                 <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                 <input type="date" className="bg-transparent border-none text-xs w-full pl-1 pr-6 py-1 outline-none text-[#475467] focus:ring-0" />
                              </div>
                              <div className="w-px h-4 bg-slate-200"></div>
                              <input type="time" className="bg-transparent border-none text-xs w-16 py-1 outline-none text-[#475467] focus:ring-0" />
                           </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                           <button className="h-10 px-3 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm flex-1 md:flex-initial justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              עסקה נסגרה
                           </button>
                           <button className="h-10 px-3 bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-100 hover:border-brand-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm flex-1 md:flex-initial justify-center">
                              <Clock className="w-3.5 h-3.5" />
                              Follow Up
                           </button>
                           <button className="h-10 px-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs font-medium transition-all whitespace-nowrap shadow-sm flex-1 md:flex-initial justify-center">
                              לא רלוונטי
                           </button>
                        </div>

                     </div>
                  </div>

                  {/* Call Controls (Timer + End) */}
                  <div className="w-full lg:w-64 xl:w-full 2xl:w-64 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm p-4 flex flex-row lg:flex-col xl:flex-row 2xl:flex-col justify-between items-center gap-3 shrink-0">
                     <div className="flex lg:flex-col xl:flex-row 2xl:flex-col items-center gap-3 lg:gap-1 xl:gap-3 2xl:gap-1">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                           <span className="text-xs font-bold text-rose-600">מקליט</span>
                        </div>
                        <span className="font-mono text-xl font-bold text-[#0B1220]">00:26:33</span>
                     </div>
                     <div className="flex gap-2 flex-1 w-full justify-end lg:justify-center xl:justify-end 2xl:justify-center">
                        <button className="p-2 lg:w-full xl:w-auto 2xl:w-full lg:py-2 xl:py-2 2xl:py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                           <PauseCircle className="w-5 h-5 lg:mx-auto xl:mx-0 2xl:mx-auto" />
                        </button>
                        <button onClick={onEndCall} className="px-4 lg:w-full xl:w-auto 2xl:w-full lg:py-2 xl:py-2 2xl:py-2 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] font-bold hover:bg-[#FFE4E6] transition-colors text-sm flex items-center justify-center gap-2">
                           <PhoneOff className="w-4 h-4" />
                           <span className="hidden lg:inline xl:inline 2xl:inline">סיום</span>
                           <span className="lg:hidden xl:hidden 2xl:hidden">סיום שיחה</span>
                        </button>
                     </div>
                  </div>

               </div>

               {/* BOTTOM HALF: Coach & Transcript */}
               <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                  
                  {/* a) Transcript & Summary */}
                  <div className="flex-1 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm flex flex-col overflow-hidden min-h-[400px] lg:h-auto lg:min-h-0">
                     <div className="px-5 py-3 border-b border-[#E7EAF2] flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex bg-[#F0F2F5] p-1 rounded-lg">
                           <button 
                             onClick={() => setActiveTab('transcript')}
                             className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'transcript' ? 'bg-white shadow-sm text-brand-600' : 'text-[#667085] hover:text-[#0B1220]'}`}
                           >
                             תמלול
                           </button>
                           <button 
                             onClick={() => setActiveTab('summary')}
                             className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'summary' ? 'bg-white shadow-sm text-brand-600' : 'text-[#667085] hover:text-[#0B1220]'}`}
                           >
                             סיכום
                           </button>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-2 text-[#98A2B3] hover:text-brand-600 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-[#E7EAF2]" title="Download Text">
                              <Download className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white" ref={scrollRef}>
                        {activeTab === 'transcript' ? (
                           <div className="space-y-6">
                              {MOCK_TRANSCRIPT.map((msg) => (
                                 <div key={msg.id} className={`flex flex-col ${msg.speaker === 'agent' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[65%] w-full ${msg.speaker === 'agent' ? 'mr-auto' : 'ml-auto'}`}>
                                    <div className="flex items-center gap-2 mb-1.5 px-1">
                                       <span className="text-[10px] text-[#98A2B3] font-medium font-mono">{msg.timestamp}</span>
                                       <span className="text-xs font-bold text-[#667085]">{msg.speaker === 'agent' ? 'אני' : 'לקוח'}</span>
                                    </div>
                                    <div className={`
                                       relative px-4 py-3 text-sm leading-relaxed shadow-sm
                                       ${msg.speaker === 'agent' 
                                         ? 'bg-[#EFF4FF] text-[#1E3A8A] rounded-2xl rounded-tl-none border border-blue-100/50' 
                                         : 'bg-white text-[#344054] rounded-2xl rounded-tr-none border border-[#E7EAF2]'}
                                    `}>
                                       {msg.text}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="space-y-6 animate-fade-in max-w-2xl mx-auto py-2">
                              <div className="p-4 rounded-xl border border-[#E7EAF2] bg-[#FAFAFC]">
                                 <h4 className="text-xs font-bold text-[#98A2B3] uppercase tracking-wider mb-2">מטרת השיחה</h4>
                                 <p className="text-sm text-[#344054] font-medium leading-relaxed">בדיקת היתכנות לשדרוג מערכת CRM.</p>
                              </div>
                              {/* ... Summary Content ... */}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* b) AI Coach Panel */}
                  <div className="w-full lg:w-80 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm flex flex-col overflow-hidden shrink-0 h-auto min-h-[300px] lg:h-full lg:min-h-0">
                     <div className="p-4 md:p-5 border-b border-[#E7EAF2] bg-gradient-to-r from-white to-[#F9FAFB]">
                        <h3 className="text-sm font-bold text-[#0B1220] flex items-center gap-2">
                           <Sparkles className="w-4 h-4 text-purple-600 fill-purple-600" />
                           מאמן AI – Sales Coach
                        </h3>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
                        
                        {/* Progress Stepper */}
                        <div>
                           <div className="flex justify-between items-center relative mb-3">
                              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#E7EAF2] -z-10"></div>
                              {CALL_STAGES.slice(0,5).map((stage, idx) => (
                                 <div key={idx} className="flex flex-col items-center gap-1 bg-white px-1">
                                    <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 ring-2 ring-white ${stage.status === 'current' ? 'border-brand-500 bg-brand-500 shadow-md' : stage.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}></div>
                                 </div>
                              ))}
                           </div>
                           <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-[#98A2B3]">
                              <span>פתיחה</span>
                              <span className="text-brand-600">בירור צרכים</span>
                              <span>סגירה</span>
                           </div>
                        </div>

                        {/* Recommendation Box */}
                        <div className="bg-gradient-to-br from-[#EEF2FF] to-white border border-[#E0E7FF] rounded-xl p-4 md:p-5 shadow-[0_2px_8px_rgba(99,102,241,0.05)] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-20 h-20 bg-brand-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                           <h4 className="text-[11px] font-extrabold text-brand-800 uppercase tracking-wider mb-3 relative z-10 flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
                             מה לעשות עכשיו?
                           </h4>
                           <ul className="space-y-3 relative z-10">
                              <li className="text-sm font-medium text-[#1E3A8A] flex items-start gap-2.5">
                                 <div className="w-5 h-5 rounded-full bg-white border border-brand-200 text-brand-600 flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">1</div>
                                 שאל על התקציב השנתי
                              </li>
                              <li className="text-sm font-medium text-[#1E3A8A] flex items-start gap-2.5">
                                 <div className="w-5 h-5 rounded-full bg-white border border-brand-200 text-brand-600 flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">2</div>
                                 בדוק דדליין להקמת האתר
                              </li>
                           </ul>
                        </div>

                     </div>
                  </div>

               </div>
            </div>
         )}
      </div>

      {/* 3. LEFT COLUMN (Visual Left in RTL) - KPIs */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#F7F8FC] border-r border-[#E7EAF2] h-full flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        xl:relative xl:translate-x-0 xl:shadow-[inset_4px_0_24px_rgba(0,0,0,0.01)] xl:z-auto xl:flex-shrink-0
        ${isKPIOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
         
         {/* Mobile Close Button - Left Side (Outer Edge) */}
         <button 
           onClick={() => setIsKPIOpen(false)}
           className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 xl:hidden z-10"
         >
           <X className="w-5 h-5" />
         </button>

         <div className="flex-1 flex flex-col p-5 space-y-4 overflow-y-auto">
            <div className="mb-2">
                <h2 className="font-bold text-[#0B1220] text-base">הביצועים שלי</h2>
                <p className="text-xs text-[#667085] mt-0.5">מדדים יומיים בזמן אמת</p>
            </div>

            <div className="space-y-3">
                {KPI_METRICS.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-[#E7EAF2] hover:border-brand-200 transition-all hover:shadow-md group">
                    <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wide group-hover:text-brand-600 transition-colors">{kpi.label}</span>
                        <div className={`p-1.5 rounded-lg ${kpi.bg} bg-opacity-50`}>
                            <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                        </div>
                    </div>
                    <div>
                        <span className="text-2xl font-bold text-[#0B1220] tracking-tight font-mono">
                            {kpi.value}
                        </span>
                    </div>
                </div>
                ))}
            </div>

            {/* Goal Progress */}
            <div className="bg-brand-600 rounded-2xl p-5 text-white shadow-lg shadow-brand-600/15 mt-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none group-hover:bg-white/20 transition-colors"></div>
                <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm">יעד חודשי</h3>
                    <Sparkles className="w-4 h-4 text-brand-200" />
                </div>
                <div className="flex items-end justify-between font-mono text-sm mb-2">
                    <span className="opacity-80">₪80k</span>
                    <span className="font-bold text-lg">₪42k</span>
                </div>
                <div className="h-1.5 bg-black/20 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-white w-[52%] rounded-full shadow-sm"></div>
                </div>
                <p className="text-[10px] text-brand-100 text-center opacity-90 font-medium">חסרים 38,000 ₪ לעמידה ביעד</p>
                </div>
            </div>
         </div>
      </div>

    </div>
  );
};
