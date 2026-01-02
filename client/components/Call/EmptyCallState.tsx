
import React, { useState, useEffect, useRef } from 'react';
import {
   Phone,
   Clock,
   Search,
   Play,
   PauseCircle,
   PlayCircle,
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
   Trash2,
   MoreVertical,
   ArrowLeft,
   X,
   Briefcase,
   PanelLeft,
   PanelRight,
   Menu,
   AlertCircle,
   Loader2,
   Flame,
   Building2,
   Square,
   SkipForward,
   Repeat
} from 'lucide-react';
import { Badge } from '../Common/Badge';
import { Lead } from '../../types';

// Logic Injection
import { useCall } from '../../src/context/CallContext';
import { supabase } from '../../src/lib/supabaseClient';

interface EmptyCallStateProps {
   onStartCall: () => void;
   isCallActive?: boolean;
   onEndCall?: () => void;
   currentUserId?: string;
}

// Mock KPI Data
// KPI types - will be fetched from API
interface DailyStats {
   calls: { answered: number; total: number };
   deals: number;
   newLeads: number;
   avgCallTime: number;
}

export const EmptyCallState: React.FC<EmptyCallStateProps> = ({ onStartCall, onEndCall, currentUserId }) => {
   const [activeTab, setActiveTab] = useState<'followup' | 'search'>('followup');
   // const [activeLeadId, setActiveLeadId] = useState<string | null>(null); // MOVED TO CONTEXT
   const [campaign, setCampaign] = useState<string>('');
   const scrollRef = useRef<HTMLDivElement>(null);

   // Responsive Drawer States
   const [isQueueOpen, setIsQueueOpen] = useState(false);
   const [isKPIOpen, setIsKPIOpen] = useState(false);

   // Real DB Data States
   const [leads, setLeads] = useState<Lead[]>([]);
   const [recentCalls, setRecentCalls] = useState<any[]>([]);
   const [isLoadingLeads, setIsLoadingLeads] = useState(true);
   const [isLoadingCalls, setIsLoadingCalls] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');

   // Error Toast State
   const [errorToast, setErrorToast] = useState<string | null>(null);

   // Daily Stats for KPIs
   const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
   const [isLoadingStats, setIsLoadingStats] = useState(true);

   // Campaigns State
   const [campaigns, setCampaigns] = useState<any[]>([]);
   const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

   // Collapsible call history state
   const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

   // Collapsible center panel history calls
   const [expandedHistoryCallId, setExpandedHistoryCallId] = useState<string | null>(null);

   // Quick action modal states for history calls
   const [historyFollowUpCallId, setHistoryFollowUpCallId] = useState<string | null>(null);
   const [historyFollowUpDate, setHistoryFollowUpDate] = useState('');
   const [historyFollowUpTime, setHistoryFollowUpTime] = useState('10:00');
   const [historyFollowUpNotes, setHistoryFollowUpNotes] = useState('');

   // --- LOGIC HOOK ---
   const {
      callStatus,
      callDuration,
      transcripts,
      coachingData,
      startCall,
      connectionStatus,
      isReady,
      initDevice,
      activeLeadId,
      setActiveLeadId,
      runDiagnostics,
      hasLastCall,
      showLastSummary,
      historyCalls,
      // Power Dialer
      powerDialer,
      startPowerDialer,
      stopPowerDialer,
      pausePowerDialer,
      resumePowerDialer,
      skipToNextLead
   } = useCall();
   const isCallActive = callStatus === 'connected' || callStatus === 'dialing';

   const getSourceLabel = (source?: string | null) => {
      if (!source) return null;
      switch (source) {
         case 'Website': return 'אתר';
         case 'LinkedIn': return 'לינקדאין';
         case 'Facebook Ads': return 'פייסבוק';
         case 'Instagram': return 'אינסטגרם';
         case 'Referral': return 'הפניה';
         case 'Webinar': return 'וובינר';
         case 'Social Media': return 'רשתות';
         case 'Manual': return 'ידני';
         default: return source;
      }
   };

   const getStatusLabel = (status?: string | null) => {
      if (!status) return null;
      switch (status) {
         case 'New': return 'ליד חדש';
         case 'Discovery': return 'גילוי צרכים';
         case 'Negotiation': return 'משא ומתן';
         case 'Proposal': return 'הצעת מחיר';
         case 'Contacted': return 'נוצר קשר';
         case 'In Progress': return 'בטיפול';
         case 'Qualified': return 'ליד איכותי';
         case 'Lost': return 'אבוד';
         case 'Deal': return 'עסקה';
         case 'Closed': return 'סגור';
         default: return status;
      }
   };

   const getCallStatusLabel = (status: string) => {
      switch (status) {
         case 'completed': return 'הושלמה';
         case 'missed': return 'לא נענתה';
         case 'rejected': return 'נדחתה';
         case 'busy': return 'תפוס';
         case 'no-answer': return 'אין מענה';
         case 'failed': return 'נכשלה';
         default: return status;
      }
   };

   const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
   };

   // --- FETCH REAL LEADS FROM DB ---
   useEffect(() => {
      const fetchLeads = async () => {
         setIsLoadingLeads(true);
         try {
            const { data, error } = await supabase
               .from('leads')
               .select('id, name, phone, company, status, priority, source, created_at')
               .order('created_at', { ascending: false })
               .limit(20);

            if (error) throw error;
            setLeads(data || []);
         } catch (err: any) {
            console.error('[Leads] Fetch error:', err);
            setErrorToast('שגיאה בטעינת לידים: ' + err.message);
         } finally {
            setIsLoadingLeads(false);
         }
      };

      fetchLeads();
   }, []);

   // --- FETCH RECENT CALLS FROM DB ---
   useEffect(() => {
      const fetchCalls = async () => {
         setIsLoadingCalls(true);
         try {
            const { data, error } = await supabase
               .from('calls')
               .select('id, agent_id, lead_id, status, duration, created_at, leads(name, phone, company)')
               .order('created_at', { ascending: false })
               .limit(15);

            if (error) throw error;
            setRecentCalls(data || []);
         } catch (err: any) {
            console.error('[Calls] Fetch error:', err);
         } finally {
            setIsLoadingCalls(false);
         }
      };

      fetchCalls();
   }, []);

   // --- FETCH DAILY STATS FOR KPIs ---
   useEffect(() => {
      const fetchDailyStats = async () => {
         setIsLoadingStats(true);
         try {
            const res = await fetch('/api/stats/daily');
            const json = await res.json();
            if (json.success) {
               setDailyStats(json.stats);
            }
         } catch (err) {
            console.error('[Stats] Fetch error:', err);
         } finally {
            setIsLoadingStats(false);
         }
      };
      fetchDailyStats();
   }, []);

   // --- FETCH CAMPAIGNS ---
   useEffect(() => {
      const fetchCampaigns = async () => {
         setIsLoadingCampaigns(true);
         try {
            // Get user's organization_id from current session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            const { data: profile } = await supabase
               .from('profiles')
               .select('organization_id')
               .eq('id', session.user.id)
               .single();

            if (!profile?.organization_id) return;

            const res = await fetch(`/api/campaigns?organizationId=${profile.organization_id}`);
            const json = await res.json();
            if (json.success) {
               setCampaigns(json.campaigns || []);
            }
         } catch (err) {
            console.error('[Campaigns] Fetch error:', err);
         } finally {
            setIsLoadingCampaigns(false);
         }
      };
      fetchCampaigns();
   }, []);

   // --- DELETE LEAD HANDLER ---
   const handleDeleteLead = async (leadId: string) => {
      if (!confirm('האם אתה בטוח שברצונך למחוק ליד זה?')) return;

      try {
         const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
         const json = await res.json();
         if (json.success) {
            setLeads(prev => prev.filter(l => l.id !== leadId));
            setErrorToast('ליד נמחק בהצלחה');
            setTimeout(() => setErrorToast(null), 3000);
         } else {
            setErrorToast('שגיאה במחיקת הליד');
         }
      } catch (err: any) {
         console.error('[Lead] Delete error:', err);
         setErrorToast('שגיאה במחיקת הליד');
      }
   };

   // Auto-scroll transcript
   useEffect(() => {
      if (transcripts.length && scrollRef.current) {
         if (isCallActive) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
         } else {
            scrollRef.current.scrollTop = 0;
         }
      }
   }, [transcripts, isCallActive]);

   // Initialize Twilio Device on mount if not ready
   useEffect(() => {
      if (!isReady && connectionStatus === 'disconnected') {
         console.log('[Dialer] Initializing Twilio Device...');
         initDevice();
      }
   }, [isReady, connectionStatus, initDevice]);

   // Error toast auto-dismiss
   useEffect(() => {
      if (errorToast) {
         const timer = setTimeout(() => setErrorToast(null), 5000);
         return () => clearTimeout(timer);
      }
   }, [errorToast]);

   // --- CLICK TO CALL HANDLER ---
   const handleLeadClick = async (lead: Lead) => {
      console.log('[Dialer] Lead clicked:', { id: lead.id, name: lead.name, phone: lead.phone });
      setActiveLeadId(lead.id);
   };

   const startCallFromLead = async (lead: Lead) => {
      console.log('[Dialer] Starting call to lead:', { id: lead.id, phone: lead.phone });

      if (!lead.phone) {
         setErrorToast('לליד זה אין מספר טלפון');
         return;
      }

      if (!isReady) {
         console.warn('[Dialer] Device not ready, attempting init...');
         setErrorToast('מאתחל חיבור... נסה שוב בעוד שניה');
         await initDevice();
         return;
      }

      if (connectionStatus === 'error') {
         setErrorToast('שגיאת חיבור למערכת הטלפון. בדוק הרשאות מיקרופון.');
         return;
      }

      try {
         // Get current user ID from session
         const { data: { session } } = await supabase.auth.getSession();
         const agentId = session?.user?.id || currentUserId || 'unknown';

         console.log('[Dialer] Calling via Twilio:', { phone: lead.phone, agentId, leadId: lead.id });
         await startCall(lead.phone, agentId, lead.id);
      } catch (err: any) {
         console.error('[Dialer] Call error:', err);
         // Handle specific Twilio errors
         if (err.code === 31401) {
            setErrorToast('שגיאת הרשאה: בדוק גישה למיקרופון');
         } else if (err.code === 31005 || err.code === 31009) {
            setErrorToast('שגיאת רשת: בדוק חיבור לאינטרנט');
         } else {
            setErrorToast('שגיאה בהתחלת שיחה: ' + (err.message || 'Unknown error'));
         }
      }
   };

   // --- CAMPAIGN DIALER (POWER DIALER) ---
   // Filter leads by selected campaign's source and start continuous dialing
   const handleStartDialer = async () => {
      console.log('[PowerDialer] Starting campaign dialer:', { campaign, campaignsCount: campaigns.length });

      if (!campaign) {
         setErrorToast('בחר קמפיין לפני הפעלת החייגן');
         return;
      }

      // Find selected campaign
      const selectedCampaign = campaigns.find(c => c.id === campaign);
      if (!selectedCampaign) {
         setErrorToast('קמפיין נבחר לא נמצא');
         return;
      }

      console.log('[PowerDialer] Selected campaign:', { name: selectedCampaign.name, source: selectedCampaign.source_filter });

      // Filter leads by campaign's source filter
      const matchingLeads = leads.filter(lead => {
         // Case-insensitive source matching
         const leadSource = (lead.source || '').toLowerCase().trim();
         const campaignSource = (selectedCampaign.source_filter || '').toLowerCase().trim();
         return campaignSource === '' || leadSource === campaignSource;
      });

      console.log('[PowerDialer] Matching leads:', { count: matchingLeads.length, total: leads.length });

      if (matchingLeads.length === 0) {
         setErrorToast(`אין לידים מתאימים לקמפיין "${selectedCampaign.name}" (מקור: ${selectedCampaign.source_filter})`);
         return;
      }

      // Filter out leads that already have 'Won' or 'Lost' status
      const callableLeads = matchingLeads.filter(lead =>
         lead.status !== 'Won' && lead.status !== 'Lost'
      );

      if (callableLeads.length === 0) {
         setErrorToast(`כל הלידים בקמפיין "${selectedCampaign.name}" כבר טופלו`);
         return;
      }

      console.log('[PowerDialer] Starting with', callableLeads.length, 'leads in queue');

      // Convert to PowerDialerLead format
      const powerDialerLeads = callableLeads.map(lead => ({
         id: lead.id,
         name: lead.name,
         phone: lead.phone || '',
         source: lead.source,
         status: lead.status,
         company: lead.company
      }));

      // Start Power Dialer with the full queue
      startPowerDialer(powerDialerLeads);

      // Start first call immediately
      const firstLead = callableLeads[0];
      await startCallFromLead(firstLead);
   };

   // Handler for scheduling follow-up from call history
   const handleHistoryFollowUp = async () => {
      if (!currentLead || !historyFollowUpDate) return;

      try {
         const followUpAt = new Date(`${historyFollowUpDate}T${historyFollowUpTime}:00`).toISOString();

         const response = await fetch(`/api/leads/${currentLead.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               status: 'follow_up',
               followUpAt,
               notes: historyFollowUpNotes || null
            })
         });

         if (!response.ok) throw new Error('Failed to schedule follow-up');

         console.log('[History] Follow-up scheduled successfully');

         // Reset state
         setHistoryFollowUpCallId(null);
         setHistoryFollowUpDate('');
         setHistoryFollowUpTime('10:00');
         setHistoryFollowUpNotes('');
      } catch (err) {
         console.error('[History] Follow-up failed:', err);
         setErrorToast('שגיאה ביצירת משימה');
      }
   };

   const currentLead = activeLeadId ? leads.find(l => l.id === activeLeadId) : null;

   console.log('[EmptyCallState] Render:', {
      activeLeadId,
      leadsCount: leads.length,
      currentLeadFound: !!currentLead,
      isCallActive,
      leadIds: leads.map(l => l.id)
   });

   // Filter leads by search
   const filteredLeads = searchQuery
      ? leads.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone?.includes(searchQuery))
      : leads;

   return (
      <div className="flex w-full h-full bg-[#F7F8FC] font-sans overflow-hidden text-[#0B1220] relative">

         {/* Error Toast */}
         {errorToast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2">
               <div className="bg-rose-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{errorToast}</span>
                  <button onClick={() => setErrorToast(null)} className="p-1 hover:bg-white/20 rounded">
                     <X className="w-4 h-4" />
                  </button>
               </div>
            </div>
         )}

         {/* Power Dialer Status Bar */}
         {powerDialer.isActive && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99] animate-in fade-in slide-in-from-top-2">
               <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 min-w-[400px]">
                  {/* Status Icon */}
                  <div className="flex items-center gap-2">
                     <Repeat className="w-5 h-5 animate-spin-slow" />
                     <span className="font-bold">Power Dialer</span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg">
                     <span className="text-sm font-medium">
                        ליד {powerDialer.currentIndex + 1}/{powerDialer.queue.length}
                     </span>
                  </div>

                  {/* Current/Next Lead Preview */}
                  {powerDialer.isInPreview && powerDialer.queue[powerDialer.currentIndex] && (
                     <div className="flex items-center gap-3 bg-white/10 px-3 py-1 rounded-lg">
                        <div className="text-right">
                           <p className="text-xs opacity-75">הבא בתור:</p>
                           <p className="font-medium text-sm">{powerDialer.queue[powerDialer.currentIndex].name}</p>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                           {powerDialer.previewCountdown}
                        </div>
                     </div>
                  )}

                  {/* Controls */}
                  <div className="flex items-center gap-2 mr-auto">
                     {powerDialer.isPaused ? (
                        <button
                           onClick={resumePowerDialer}
                           className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                           title="המשך"
                        >
                           <PlayCircle className="w-5 h-5" />
                        </button>
                     ) : (
                        <button
                           onClick={pausePowerDialer}
                           className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                           title="עצור זמנית"
                        >
                           <PauseCircle className="w-5 h-5" />
                        </button>
                     )}
                     <button
                        onClick={skipToNextLead}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="דלג לבא"
                     >
                        <SkipForward className="w-5 h-5" />
                     </button>
                     <button
                        onClick={stopPowerDialer}
                        className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-lg transition-colors"
                        title="סיים"
                     >
                        <Square className="w-5 h-5 fill-current" />
                     </button>
                  </div>
               </div>
            </div>
         )}

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

            {/* Mobile Close Button */}
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
                  <span className="text-[11px] font-medium text-[#667085] bg-slate-50 border border-[#E7EAF2] px-2 py-0.5 rounded-full">
                     {filteredLeads.length} לידים
                  </span>
               </div>

               {/* Tabs */}
               <div className="flex bg-[#F0F2F5] p-1 rounded-xl mb-3">
                  <button
                     onClick={() => setActiveTab('followup')}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border border-transparent
                        ${activeTab === 'followup' ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#0B1220]' : 'text-[#667085] hover:text-[#0B1220]'}`}
                  >
                     לידים ({leads.length})
                  </button>
                  <button
                     onClick={() => setActiveTab('search')}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all
                        ${activeTab === 'search' ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#0B1220]' : 'text-[#667085] hover:text-[#0B1220]'}`}
                  >
                     היסטוריה ({recentCalls.length})
                  </button>
               </div>

               {/* Search Input */}
               <div className="relative group">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] group-focus-within:text-brand-500 transition-colors" />
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="חיפוש..."
                     className="w-full pl-3 pr-9 py-2 bg-white border border-[#E7EAF2] rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all placeholder-[#98A2B3]"
                  />
               </div>
            </div>

            {/* Lead List / Calls History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
               {activeTab === 'followup' ? (
                  // LEADS TAB - Real DB Data
                  isLoadingLeads ? (
                     <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                           <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
                        ))}
                     </div>
                  ) : filteredLeads.length === 0 ? (
                     <div className="text-center py-10 text-slate-400 text-sm">אין לידים להצגה</div>
                  ) : (
                     filteredLeads.map((lead) => (
                        <div
                           key={lead.id}
                           onClick={() => handleLeadClick(lead)}
                           onDoubleClick={() => startCallFromLead(lead)}
                           className={`
                              p-4 rounded-2xl border cursor-pointer transition-all relative group
                              ${activeLeadId === lead.id
                                 ? 'bg-gradient-to-l from-brand-50 to-white border-brand-200 shadow-md shadow-brand-500/10'
                                 : 'bg-white border-slate-100 hover:bg-slate-50/80 hover:border-slate-200 hover:shadow-sm'}
                           `}
                        >
                           {/* Active Indicator */}
                           {activeLeadId === lead.id && <div className="absolute right-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-brand-500 to-indigo-600 rounded-l-full"></div>}

                           {/* Name + Company + Hot Badge */}
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <span className={`font-bold text-[14px] block ${activeLeadId === lead.id ? 'text-brand-900' : 'text-[#0B1220]'}`}>
                                    {lead.name}
                                 </span>
                                 <span className="text-[11px] text-slate-400">{lead.company || 'פרטי'}</span>
                              </div>
                              {lead.priority === 'Hot' && (
                                 <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 rounded-md border border-rose-200">
                                    <Flame className="w-3 h-3 text-rose-500" />
                                    <span className="text-[10px] font-bold text-rose-600">חם</span>
                                 </div>
                              )}
                           </div>

                           {/* Stage + Source */}
                           <div className="flex items-center gap-2 mb-2">
                              {/* Stage Badge */}
                              <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${lead.status === 'New' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                 lead.status === 'Discovery' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                    lead.status === 'Proposal' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                                       lead.status === 'Negotiation' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                          lead.status === 'Closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                             'bg-slate-50 text-slate-500 border-slate-200'
                                 }`}>
                                 {getStatusLabel(lead.status) || 'ליד חדש'}
                              </span>

                              {/* Source Badge */}
                              {lead.source && (
                                 <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                    {getSourceLabel(lead.source)}
                                 </span>
                              )}
                           </div>

                           {/* Phone */}
                           <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <Phone className="w-3 h-3" />
                              <span dir="ltr" className="font-medium">{lead.phone}</span>
                           </div>

                           {/* Hover Actions - With Gap */}
                           {/* Hover Action - Call Button Only */}
                           <button
                              onClick={(e) => { e.stopPropagation(); startCallFromLead(lead); }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white p-2.5 rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:scale-105"
                              title="התקשר"
                           >
                              <Phone className="w-4 h-4" />
                           </button>
                        </div>
                     ))
                  )
               ) : (
                  // CALLS HISTORY TAB - Real DB Data
                  isLoadingCalls ? (
                     <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                     </div>
                  ) : recentCalls.length === 0 ? (
                     <div className="text-center py-10 text-slate-400 text-sm">אין שיחות קודמות</div>
                  ) : (
                     recentCalls.map((call) => (
                        <div
                           key={call.id}
                           className="rounded-2xl border bg-white border-slate-100 overflow-hidden transition-all"
                        >
                           {/* Collapsed Header - Always Visible */}
                           <div
                              onClick={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
                              className="p-3.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
                           >
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm truncate text-[#0B1220]">
                                       {call.leads?.name || '(ליד נמחק)'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${call.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                                       {getCallStatusLabel(call.status)}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-3 text-[11px] text-[#98A2B3]">
                                    <span className="flex items-center gap-1">
                                       <Clock className="w-3 h-3" />
                                       {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(call.created_at).toLocaleDateString('he-IL')} • {new Date(call.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                                 </div>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedCallId === call.id ? 'rotate-180' : ''}`} />
                           </div>

                           {/* Expanded Content - Transcript */}
                           {expandedCallId === call.id && (
                              <div className="border-t border-slate-100 p-3.5 bg-slate-50/50 space-y-3 animate-in slide-in-from-top-2">
                                 {/* Transcript Section */}
                                 {call.transcript ? (
                                    <div className="space-y-2">
                                       <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                          <FileText className="w-3 h-3" />
                                          תמלול שיחה
                                       </h4>
                                       <div className="text-xs text-slate-600 max-h-40 overflow-y-auto p-2 bg-white rounded-lg border border-slate-100 whitespace-pre-wrap">
                                          {call.transcript}
                                       </div>
                                    </div>
                                 ) : (
                                    <p className="text-xs text-slate-400 italic">אין תמלול זמין לשיחה זו</p>
                                 )}

                                 {/* Summary if exists */}
                                 {call.summary && (
                                    <div className="space-y-2">
                                       <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                          <Sparkles className="w-3 h-3" />
                                          סיכום AI
                                       </h4>
                                       <div className="text-xs text-slate-600 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                                          {call.summary}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                     ))
                  )
               )}
            </div>

            {/* Call Selected Lead Button */}
            {currentLead && !isCallActive && (
               <div className="p-3 border-t border-[#E7EAF2]">
                  <button
                     onClick={() => startCallFromLead(currentLead)}
                     disabled={!isReady || connectionStatus === 'error'}
                     className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${isReady
                           ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/25'
                           : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                     <Phone className="w-4 h-4" />
                     {isReady ? `התקשר ל${currentLead.name}` : 'מאתחל...'}
                  </button>
               </div>
            )}
         </div>

         {/* 2. CENTER COLUMN - Workspace */}
         <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FC] relative h-full overflow-hidden">

            {/* Mobile Toggles Header */}
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

            {/* Connection Status Banner */}
            {connectionStatus === 'connecting' && (
               <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">מתחבר למערכת הטלפון...</span>
               </div>
            )}
            {connectionStatus === 'error' && (
               <div className="bg-rose-100 border-b border-rose-200 px-4 py-2 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-medium text-rose-700">שגיאת חיבור - בדוק הרשאות מיקרופון</span>
                  <button onClick={initDevice} className="text-xs bg-rose-600 text-white px-2 py-1 rounded hover:bg-rose-700">נסה שוב</button>
               </div>
            )}

            {/* Show Last Summary Button */}
            {hasLastCall && !isCallActive && (
               <div className="bg-gradient-to-l from-brand-50 to-purple-50 border-b border-brand-200 px-4 py-2 flex items-center justify-center gap-3">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-medium text-brand-700">יש לך סיכום שיחה שלא צפית בו</span>
                  <button
                     onClick={showLastSummary}
                     className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 font-medium shadow-sm transition-all hover:shadow"
                  >
                     צפה בסיכום
                  </button>
               </div>
            )}

            {!isCallActive ? (
               // STATE A: NO ACTIVE CALL
               isLoadingLeads ? (
                  <div className="flex-1 flex items-center justify-center">
                     <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                     {currentLead ? (
                        // LEAD CONTEXT VIEW (Chat/History Mode)
                        <div className="flex-1 flex flex-col h-full relative">
                           {/* Lead Header - Premium Design */}
                           <div className="bg-gradient-to-l from-white via-white to-brand-50/30 border-b border-[#E7EAF2] p-5 flex items-center justify-between shadow-sm z-10">
                              <div className="flex items-center gap-4">
                                 {/* Premium Avatar with Gradient Ring */}
                                 <div className="relative">
                                    <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-brand-500/20">
                                       {currentLead.name.charAt(0)}
                                    </div>
                                    {currentLead.priority === 'Hot' && (
                                       <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                          <Flame className="w-3 h-3 text-white" />
                                       </div>
                                    )}
                                 </div>

                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <h2 className="text-xl font-bold text-[#0B1220]">{currentLead.name}</h2>
                                       {/* Status Badge with Dynamic Color */}
                                       <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentLead.status === 'New' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                          currentLead.status === 'Discovery' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                             currentLead.status === 'Proposal' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                                                currentLead.status === 'Negotiation' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                   currentLead.status === 'Contacted' ? 'bg-sky-50 text-sky-600 border-sky-200' :
                                                      currentLead.status === 'Qualified' ? 'bg-teal-50 text-teal-600 border-teal-200' :
                                                         currentLead.status === 'Deal' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                            currentLead.status === 'Closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                               currentLead.status === 'Lost' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                                  'bg-slate-100 text-slate-600 border-slate-200'
                                          }`}>
                                          {getStatusLabel(currentLead.status) || 'ליד חדש'}
                                       </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm text-[#667085]">
                                       {/* Company */}
                                       <span className="flex items-center gap-1.5">
                                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                          {currentLead.company || 'פרטי'}
                                       </span>

                                       {/* Phone */}
                                       <span className="flex items-center gap-1.5">
                                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                                          <span dir="ltr">{currentLead.phone}</span>
                                       </span>

                                       {/* Source Badge */}
                                       {currentLead.source && (
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                                             {getSourceLabel(currentLead.source)}
                                          </span>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              <button
                                 onClick={() => startCallFromLead(currentLead)}
                                 disabled={!isReady}
                                 className={`h-11 px-7 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-xl hover:-translate-y-0.5 hover:shadow-2xl
                                 ${isReady
                                       ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white hover:from-brand-700 hover:to-indigo-700 shadow-brand-500/30'
                                       : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                              >
                                 <Phone className="w-4 h-4" />
                                 חייג עכשיו
                              </button>
                           </div>

                           {/* Chat / Transcript History Area - History Mode */}
                           <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F7F8FC] space-y-6" ref={scrollRef}>

                              {historyCalls.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                       <Sparkles className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 text-sm">אין היסטוריית שיחות לליד זה</p>
                                    <p className="text-slate-400 text-xs mt-1">התחל שיחה כדי לייצר תוכן</p>
                                 </div>
                              ) : (
                                 historyCalls.map((call: any, callIndex: number) => (
                                    <div key={call.id || callIndex} className="bg-white rounded-2xl border border-[#E7EAF2] overflow-hidden shadow-sm">
                                       {/* Call Header - Clickable to Expand/Collapse */}
                                       <div
                                          onClick={() => setExpandedHistoryCallId(expandedHistoryCallId === call.id ? null : call.id)}
                                          className="bg-slate-50/50 p-3 border-b border-[#E7EAF2] flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
                                       >
                                          <div className="flex items-center gap-2">
                                             <div className={`p-1.5 rounded-lg ${call.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Phone className="w-3.5 h-3.5" />
                                             </div>
                                             <div>
                                                <div className="text-xs font-bold text-[#0B1220]">
                                                   {new Date(call.created_at).toLocaleDateString('he-IL')} • {new Date(call.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-medium flex gap-2">
                                                   <span>משך: {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '00:00'}</span>
                                                   <span>•</span>
                                                   <span>{getCallStatusLabel(call.status)}</span>
                                                </div>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             {call.summary?.score && (
                                                <Badge variant={call.summary.score >= 80 ? 'success' : 'warning'} size="sm">
                                                   ציון AI: {call.summary.score}
                                                </Badge>
                                             )}
                                             <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedHistoryCallId === call.id ? 'rotate-180' : ''}`} />
                                          </div>
                                       </div>

                                       {/* Collapsible Content */}
                                       {expandedHistoryCallId === call.id && (
                                          <>
                                             {/* Call Transcript */}
                                             <div className="p-4 space-y-3 bg-white max-h-80 overflow-y-auto">
                                                {!call.transcript || Object.keys(call.transcript).length === 0 ? (
                                                   <div className="text-center text-xs text-slate-400 py-2">אין תמלול זמין לשיחה זו</div>
                                                ) : (
                                                   // Helper to merge and sort transcript
                                                   (() => {
                                                      const msgs: any[] = [];
                                                      if (call.transcript) {
                                                         Object.entries(call.transcript).forEach(([role, messages]: [string, any]) => {
                                                            if (Array.isArray(messages)) {
                                                               messages.forEach((m: any) => msgs.push({ ...m, role }));
                                                            }
                                                         });
                                                      }
                                                      return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg, i) => (
                                                         <div key={i} className={`flex flex-col ${msg.role === 'agent' ? 'items-end' : 'items-start'} max-w-[90%] w-full ${msg.role === 'agent' ? 'mr-auto' : 'ml-auto'}`}>
                                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                               <span className="text-[10px] text-slate-400 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                               <span className="text-[10px] font-bold text-slate-500">{msg.role === 'agent' ? 'נציג' : 'לקוח'}</span>
                                                            </div>
                                                            <div className={`
                                                                relative px-3 py-2 text-sm leading-relaxed rounded-xl
                                                                ${msg.role === 'agent'
                                                                  ? 'bg-[#EFF4FF] text-[#1E3A8A] rounded-tl-none'
                                                                  : 'bg-[#F9FAFB] text-[#344054] rounded-tr-none border border-slate-100'}
                                                             `}>
                                                               {msg.text}
                                                            </div>
                                                         </div>
                                                      ));
                                                   })()
                                                )}
                                             </div>

                                             {/* Call Summary Footer */}
                                             {call.summary?.summary && (
                                                <div className="p-3 bg-slate-50 border-t border-[#E7EAF2] text-xs text-slate-600 leading-relaxed">
                                                   <span className="font-bold block mb-1">סיכום שיחה:</span>
                                                   {call.summary.summary}
                                                </div>
                                             )}

                                             {/* Action Buttons */}
                                             <div className="p-3 bg-white border-t border-[#E7EAF2] flex flex-wrap gap-2">
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); setHistoryFollowUpCallId(call.id); }}
                                                   className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm"
                                                >
                                                   <Calendar className="w-3.5 h-3.5" />
                                                   קבע המשך טיפול
                                                </button>
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); setExpandedHistoryCallId(null); }}
                                                   className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-all"
                                                >
                                                   <X className="w-3.5 h-3.5" />
                                                   סגור
                                                </button>
                                             </div>
                                          </>
                                       )}
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     ) : (
                        // EMPTY STATE (DIALER)
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
                                       disabled={isLoadingCampaigns}
                                    >
                                       <option value="" disabled>
                                          {isLoadingCampaigns ? 'טוען קמפיינים...' : campaigns.length === 0 ? 'אין קמפיינים - צור אחד בהגדרות' : 'בחירת קמפיין...'}
                                       </option>
                                       {campaigns.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                       ))}
                                    </select>
                                    <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3] pointer-events-none" />
                                 </div>

                                 <button
                                    onClick={handleStartDialer}
                                    disabled={!campaign || !isReady}
                                    className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5
                                   ${campaign && isReady
                                          ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/25'
                                          : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'}`}
                                 >
                                    <Play className="w-4 h-4 fill-current" />
                                    הפעלת חייגן
                                 </button>
                              </div>
                           </div>

                           <div className="mt-8 flex flex-col items-center gap-2">
                              <p className="text-xs text-[#98A2B3] font-medium flex items-center gap-2">
                                 <Sparkles className="w-3 h-3 text-purple-500" />
                                 AI Coach מוכן לסייע בזמן אמת
                                 {isReady && <span className="text-emerald-500">● מחובר</span>}
                              </p>
                              <button
                                 onClick={runDiagnostics}
                                 className="text-[10px] text-slate-400 hover:text-brand-500 underline"
                              >
                                 בדיקת רשת (Preflight)
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               )
            ) : (
               // STATE B: ACTIVE CALL (REAL TIME)
               <div className="flex flex-col h-full p-3 md:p-4 lg:p-6 gap-4 overflow-y-auto lg:overflow-hidden">

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
                        <button className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                           <PauseCircle className="w-5 h-5" />
                        </button>
                        <button onClick={onEndCall} className="px-4 py-2 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] font-bold hover:bg-[#FFE4E6] transition-colors text-sm flex items-center justify-center gap-2">
                           <PhoneOff className="w-4 h-4" />
                           <span>סיום שיחה</span>
                        </button>
                     </div>
                  </div>

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

                     {/* b) AI Coach Panel */}
                     <div className="w-full lg:w-80 bg-white rounded-2xl border border-[#E7EAF2] shadow-sm flex flex-col overflow-hidden shrink-0">
                        <div className="p-4 md:p-5 border-b border-[#E7EAF2] bg-gradient-to-r from-white to-[#F9FAFB]">
                           <h3 className="text-sm font-bold text-[#0B1220] flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-600 fill-purple-600" />
                              מאמן AI – Sales Coach
                           </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
                           {/* Recommendation Box */}
                           <div className="bg-gradient-to-br from-[#EEF2FF] to-white border border-[#E0E7FF] rounded-xl p-4 md:p-5 shadow-[0_2px_8px_rgba(99,102,241,0.05)] relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-brand-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                              <h4 className="text-[11px] font-extrabold text-brand-800 uppercase tracking-wider mb-3 relative z-10 flex items-center gap-1.5">
                                 <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
                                 Live Insights
                              </h4>
                              <p className="text-sm text-slate-600 mb-2">{coachingData?.insight || 'מאזין לשיחה...'}</p>
                              {coachingData?.suggestion && (
                                 <div className="mt-3 p-3 bg-white/80 rounded-lg border border-brand-100">
                                    <span className="text-xs font-bold text-brand-700">💡 הצעה:</span>
                                    <p className="text-sm text-brand-800 mt-1">{coachingData.suggestion}</p>
                                 </div>
                              )}
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
            {/* KPI Content */}
            <div className="p-4 border-b border-[#E7EAF2]">
               <h2 className="font-bold text-[#0B1220]">מדדים יומיים</h2>
            </div>
            <div className="p-4 space-y-3">
               {isLoadingStats ? (
                  <div className="text-center text-slate-400 py-8">טוען מדדים...</div>
               ) : (
                  <>
                     <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50">
                        <CheckCircle2 className="w-5 h-5 text-orange-600" />
                        <div className="flex-1">
                           <span className="text-xs text-slate-500">נענו</span>
                           <p className="font-bold text-slate-800">{dailyStats?.calls.answered || 0} / {dailyStats?.calls.total || 0}</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <div className="flex-1">
                           <span className="text-xs text-slate-500">עסקאות</span>
                           <p className="font-bold text-slate-800">{dailyStats?.deals || 0}</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
                        <UserPlus className="w-5 h-5 text-purple-600" />
                        <div className="flex-1">
                           <span className="text-xs text-slate-500">לקוחות חדשים</span>
                           <p className="font-bold text-slate-800">{dailyStats?.newLeads || 0}</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                        <Timer className="w-5 h-5 text-slate-600" />
                        <div className="flex-1">
                           <span className="text-xs text-slate-500">זמן שיחה ממוצע</span>
                           <p className="font-bold text-slate-800">{formatTime(dailyStats?.avgCallTime || 0)}</p>
                        </div>
                     </div>
                  </>
               )}
            </div>
         </div>

         {/* History Follow-up Modal */}
         {historyFollowUpCallId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={() => setHistoryFollowUpCallId(null)}>
               <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
               >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                     <Calendar className="w-5 h-5 text-brand-500" />
                     תזמון המשך טיפול
                  </h3>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">תאריך</label>
                        <input
                           type="date"
                           value={historyFollowUpDate}
                           min={new Date().toISOString().split('T')[0]}
                           onChange={(e) => setHistoryFollowUpDate(e.target.value)}
                           className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">שעה</label>
                        <input
                           type="time"
                           value={historyFollowUpTime}
                           min={historyFollowUpDate === new Date().toISOString().split('T')[0]
                              ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                              : undefined}
                           onChange={(e) => setHistoryFollowUpTime(e.target.value)}
                           className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">הערות (אופציונלי)</label>
                        <textarea
                           value={historyFollowUpNotes}
                           onChange={(e) => setHistoryFollowUpNotes(e.target.value)}
                           placeholder="מה צריך לעשות בהמשך הטיפול?"
                           className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500 resize-none h-20"
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                     <button
                        onClick={() => setHistoryFollowUpCallId(null)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-all"
                     >
                        ביטול
                     </button>
                     <button
                        onClick={handleHistoryFollowUp}
                        disabled={!historyFollowUpDate}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-medium rounded-xl hover:from-brand-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        שמור משימה
                     </button>
                  </div>
               </div>
            </div>
         )}

      </div >
   );
};
