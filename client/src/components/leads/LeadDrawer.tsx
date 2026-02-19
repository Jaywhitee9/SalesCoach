import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import {
   X, Phone, Mail, Globe, MapPin, Calendar, Clock, Tag, MessageSquare, ArrowRight, User, MoreVertical, Edit2, Check, ExternalLink, HelpCircle, ChevronDown, Sparkles, Building2, Hash, Plus, Filter, ArrowUpRight, MessageCircle, LayoutDashboard, Pencil, Save, FileText, Loader2, RotateCcw, Target, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { useLeadActivities, LeadActivity } from '../../src/hooks/useLeadActivities';
import { useOrganizationSettings, PipelineStatus } from '../../src/hooks/useOrganizationSettings';

// Type for the updateLead function
type UpdateLeadFn = (leadId: string, updates: Partial<Lead>) => Promise<{ success: boolean }>;
type GenerateAiScoreFn = (leadId: string) => Promise<any>;

interface TeamMember {
   id: string;
   name: string;
   avatar: string;
   role: string;
}

interface LeadDrawerProps {
   lead: Lead | null;
   onClose: () => void;
   updateLead: UpdateLeadFn;
   generateAiScore?: GenerateAiScoreFn;
   teamMembers?: TeamMember[];
   orgId?: string;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({ lead, onClose, updateLead, generateAiScore, teamMembers = [], orgId }) => {
   const { settings } = useOrganizationSettings(orgId);
   const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'history' | 'ai'>('overview');
   const [isScoreTooltipOpen, setIsScoreTooltipOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [newNoteText, setNewNoteText] = useState('');
   const [isAddingNote, setIsAddingNote] = useState(false);
   const [aiError, setAiError] = useState<string | null>(null);

   // History tab filters
   const [historyActionFilter, setHistoryActionFilter] = useState<'all' | 'calls' | 'emails' | 'notes'>('all');
   const [historyTimeFilter, setHistoryTimeFilter] = useState<'all' | 'week' | 'month'>('all');

   // Quick Actions State
   const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
   const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
   const [followUpDate, setFollowUpDate] = useState('');
   const [followUpTime, setFollowUpTime] = useState('10:00');
   const [followUpNotes, setFollowUpNotes] = useState('');
   const [isSubmittingAction, setIsSubmittingAction] = useState(false);

   // Fetch activities for this lead
   const { activities, loading: activitiesLoading, addActivity } = useLeadActivities(lead?.id);

   // Edit Form State
   const [editForm, setEditForm] = useState({
      name: '',
      company: '',
      phone: '',
      email: '',
      website: '',
      status: '',
      source: '',
      value: '',
      ownerId: ''
   });

   // Sync state with lead data
   useEffect(() => {
      if (lead) {
         setEditForm({
            name: lead.name || '',
            company: lead.company || '',
            phone: lead.phone || '',
            email: lead.email || '',
            website: (lead as any).website || '',
            status: lead.status,
            source: lead.source,
            value: lead.value?.replace(/[^0-9.]/g, '') || '',
            ownerId: lead.owner?.id || ''
         });
      }
   }, [lead]);

   // Close on Escape key
   useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
            if (isEditModalOpen) setIsEditModalOpen(false);
            else onClose();
         }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
   }, [onClose, isEditModalOpen]);

   if (!lead) return null;

   // ... (existing score calculation logic) ...
   const fitScore = (() => {
      let score = 0;
      if (lead.name) score += 10;
      if (lead.company) score += 10;
      if (lead.email) score += 10;
      if (lead.phone) score += 10;
      if (lead.value && lead.value !== '$0') score += 10;
      return score; // Max 50
   })();

   const activityScore = (() => {
      let score = 0;
      if (lead.status !== 'New') score += 10;
      if (lead.lastActivity) {
         const days = (new Date().getTime() - new Date(lead.lastActivity).getTime()) / (1000 * 3600 * 24);
         if (days < 3) score += 20;
         else if (days < 7) score += 10;
         else score += 5;
      }
      return Math.min(score, 30); // Max 30
   })();

   const intentScore = (() => {
      if (lead.priority === 'Hot') return 20;
      if (lead.priority === 'Warm') return 10;
      return 5; // Max 20 (leaving 5 buffer)
   })();

   const weightedFit = Math.round((fitScore / 50) * 40);
   const weightedActivity = Math.round((activityScore / 30) * 35);
   const weightedIntent = Math.round((intentScore / 20) * 25);

   const totalScore = weightedFit + weightedActivity + weightedIntent;

   const handleAiAnalyze = async () => {
      setIsAnalyzing(true);
      setAiError(null);
      try {
         await generateAiScore(lead.id);
         setIsScoreTooltipOpen(true); // Open tooltip to show new details
      } catch (err: any) {
         console.error('AI Analysis failed', err);
         setAiError(err.message || 'שגיאה בניתוח הליד. אנא נסה שנית.');
      } finally {
         setIsAnalyzing(false);
      }
   };

   const handleSaveEdit = async () => {
      try {
         const updates: Partial<Lead> & { website?: string } = {
            name: editForm.name,
            company: editForm.company,
            phone: editForm.phone,
            email: editForm.email,
            website: editForm.website,
            status: editForm.status as Lead['status'],
            source: editForm.source,
            value: editForm.value ? `₪${editForm.value}` : '₪0',
            owner: { id: editForm.ownerId } as any
         };

         await updateLead(lead.id, updates);
         setIsEditModalOpen(false);
      } catch (err) {
         console.error('Update failed', err);
      }
   };

   // -- Actions --
   const handleCall = (phone: string) => {
      const normalized = phone.replace(/\D/g, '');
      window.location.href = `tel:${normalized} `;
   };

   const handleWhatsApp = (phone: string) => {
      const normalized = phone.replace(/\D/g, '');
      const international = normalized.startsWith('0') ? '972' + normalized.substring(1) : normalized;
      window.open(`https://wa.me/${international}`, '_blank');
   };

   // Quick Actions Handler
   const handleQuickAction = async (action: 'follow_up' | 'deal_closed' | 'not_relevant') => {
      if (!lead) return;
      setIsSubmittingAction(true);

      try {
         if (action === 'follow_up' && !followUpDate) {
            setIsFollowUpModalOpen(true);
            setIsSubmittingAction(false);
            return;
         }

         const followUpAt = action === 'follow_up' && followUpDate
            ? new Date(`${followUpDate}T${followUpTime}:00`).toISOString()
            : null;

         const response = await fetch(`/api/leads/${lead.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               status: action,
               followUpAt,
               notes: followUpNotes || null
            })
         });

         if (!response.ok) {
            throw new Error('Failed to update lead');
         }

         // Reset state
         setFollowUpDate('');
         setFollowUpTime('10:00');
         setFollowUpNotes('');
         setIsFollowUpModalOpen(false);
         setIsQuickActionsOpen(false);

         // Show success and refresh
         console.log(`Lead marked as ${action}`);
         // Optionally trigger a refresh of the lead data here

      } catch (err) {
         console.error('Quick action failed:', err);
      } finally {
         setIsSubmittingAction(false);
      }
   };

   // -- Render Helpers --
   // -- Render Helpers --
   // -- Render Helpers --
   const getStatusConfig = (statusId: string) => {
      if (!settings?.pipeline_statuses) return null;
      return settings.pipeline_statuses.find(s => s.id === statusId || s.label === statusId);
   };

   const getStatusColor = (status: string) => {
      // Return custom color object or fallbacks for Badge variant
      // Since Badge supports style prop now, we return null for variant if we have custom color
      // But here we return the color string itself for consumption
      const config = getStatusConfig(status);
      if (config?.color) return config.color;

      switch (status) {
         case 'New': return '#10B981'; // emerald-500
         case 'Discovery': return '#8B5CF6'; // violet-500
         case 'Negotiation': return '#F59E0B'; // amber-500
         case 'Closed': return '#10B981'; // emerald-500
         case 'Proposal': return '#3B82F6'; // blue-500
         default: return '#64748B'; // slate-500
      }
   };

   const getStatusLabel = (status: string) => {
      const config = getStatusConfig(status);
      if (config) return config.label;

      switch (status) {
         case 'New': return 'ליד חדש';
         case 'Discovery': return 'גילוי צרכים';
         case 'Negotiation': return 'משא ומתן';
         case 'Proposal': return 'הצעת מחיר';
         case 'Closed': return 'סגור';
         default: return status;
      }
   };

   const getSourceLabel = (source: string) => {
      switch (source) {
         case 'Website': return 'אתר אינטרנט';
         case 'LinkedIn': return 'לינקדאין';
         case 'Facebook Ads': return 'פייסבוק';
         case 'Referral': return 'הפניה';
         case 'Webinar': return 'וובינר';
         default: return source;
      }
   };

   // -- Content Sections --

   const renderOverview = () => (
      <div className="space-y-6 animate-in fade-in duration-300">

         {/* 1. Top Section: Key Info & Score Grid */}
         <div className="flex flex-col gap-6">

            {/* Top: Lead Score Card (Premium Gradient Style) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-300 relative flex flex-col justify-between group hover:shadow-md">
               {/* Subtle Background Glow/Gradient */}
               {/* Glow Container - constrained */}
               <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl -ml-5 -mb-5"></div>
               </div>

               <div className="relative z-10 flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 relative z-20">
                     <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">ציון ליד</h3>
                     <div className="relative">
                        <button
                           onMouseEnter={() => setIsScoreTooltipOpen(true)}
                           onMouseLeave={() => setIsScoreTooltipOpen(false)}
                           onClick={() => setIsScoreTooltipOpen(!isScoreTooltipOpen)}
                           className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-help"
                        >
                           <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </button>

                        {/* Delicate Popup */}
                        {isScoreTooltipOpen && (
                           <div className="absolute top-3 right-8 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-[999999] animate-in zoom-in-95 duration-200">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">חישוב בזמן אמת</h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                                 הציון מתעדכן דינמית על בסיס הנתונים שיש במערכת:
                              </p>
                              <div className="space-y-2">
                                 <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-600 dark:text-slate-300">התאמה (פרופיל מלא)</span>
                                    <span className="font-bold text-brand-600">{weightedFit}%</span>
                                 </div>
                                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${weightedFit}%` }}></div>
                                 </div>

                                 <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-600 dark:text-slate-300">מעורבות (פעילות וזמן)</span>
                                    <span className="font-bold text-emerald-600">{weightedActivity}%</span>
                                 </div>
                                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${weightedActivity}%` }}></div>
                                 </div>

                                 <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-600 dark:text-slate-300">כוונות קנייה (דחיפות)</span>
                                    <span className="font-bold text-amber-600">{weightedIntent}%</span>
                                 </div>
                                 <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${weightedIntent}%` }}></div>
                                 </div>
                              </div>
                              {/* Arrow - Points Top-Right to Icon */}
                              <div className="absolute top-3 -right-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-t border-r border-slate-100 dark:border-slate-700 transform rotate-45"></div>
                           </div>
                        )}
                     </div>
                  </div>
                  {/* Premium Gradient Pill */}
                  <div className={`px-4 py-1 rounded-full text-[11px] font-bold tracking-wide shadow-sm text-white
                     ${totalScore > 80
                        ? 'bg-gradient-to-r from-brand-600 to-brand-500'
                        : totalScore > 50
                           ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                           : 'bg-gradient-to-r from-slate-500 to-slate-400'}`
                  }>
                     {totalScore > 80 ? 'HIGH INTENT' : totalScore > 50 ? 'MEDIUM INTENT' : 'LOW INTENT'}
                  </div>
               </div>

               <div className="relative z-0 flex items-center justify-between">
                  <span className="text-6xl font-bold text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">
                     {totalScore}
                  </span>

                  <button
                     onClick={handleAiAnalyze}
                     disabled={isAnalyzing}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                        ${isAnalyzing
                           ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-wait'
                           : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:scale-105 active:scale-95'
                        }`}
                  >
                     <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                     <span className="text-xs font-bold">{isAnalyzing ? 'מנתח...' : 'נתח עם AI'}</span>
                  </button>
               </div>
            </div>

            {/* Bottom: General Details Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col relative group">
               <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50 dark:border-slate-800/50">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                     <LayoutDashboard className="w-4 h-4 text-brand-500" />
                     פרטים כלליים
                  </h3>

                  {/* Edit Action */}
                  <button
                     onClick={() => setIsEditModalOpen(true)}
                     className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                     <Pencil className="w-3 h-3" />
                     עריכה
                  </button>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">סטטוס</span>
                     <Badge
                        variant="neutral"
                        className="text-xs px-3 py-1"
                        style={{
                           backgroundColor: `${getStatusColor(lead.status)}20`,
                           color: getStatusColor(lead.status),
                           borderColor: `${getStatusColor(lead.status)}40`
                        }}
                     >
                        {getStatusLabel(lead.status)}
                     </Badge>
                  </div>
                  <div>
                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">מקור הגעה</span>
                     <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-medium">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        {getSourceLabel(lead.source)}
                     </div>
                  </div>
                  <div>
                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">נציג מטפל</span>
                     <div className="flex items-center gap-2.5">
                        {lead.owner?.avatar ? (
                           <img src={lead.owner.avatar} className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-sm" alt="" />
                        ) : (
                           <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        )}
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{lead.owner?.name}</span>
                     </div>
                  </div>
                  <div>
                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">תאריך נוצר</span>
                     <span className="text-sm font-medium text-slate-900 dark:text-white font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {lead.createdAt
                           ? new Date(lead.createdAt).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                           : '10/11/2024'}
                     </span>
                  </div>
               </div>
            </div>

         </div>

         {/* 2. Contact Details Card */}
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               <User className="w-4 h-4 text-brand-500" />
               פרטי קשר
            </h3>
            <div className="space-y-1">
               <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <Phone className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">טלפון</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white dir-ltr text-right font-mono">{lead.phone}</p>
                     </div>
                  </div>
                  <button
                     onClick={() => handleCall(lead.phone)}
                     className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                     <Phone className="w-3.5 h-3.5" />
                  </button>
               </div>

               <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <Mail className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">אימייל</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{lead.email}</p>
                     </div>
                  </div>
                  <button
                     onClick={() => window.open(`mailto:${lead.email}`)}
                     className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                     <ArrowUpRight className="w-4 h-4" />
                  </button>
               </div>

               <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <Globe className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">אתר</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">www.spectra.com</p>
                     </div>
                  </div>
                  <button
                     onClick={() => window.open('https://google.com', '_blank')}
                     className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                  >
                     <ExternalLink className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>

         {/* 3. Business Info */}
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               <Building2 className="w-4 h-4 text-brand-500" />
               פרטי עסק
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
               <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">שם החברה</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{lead.company}</p>
               </div>
               <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">ערך עסקה משוער</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                     {lead.value?.startsWith('₪') || lead.value?.startsWith('$') ? lead.value.replace('$', '₪') : `₪${lead.value || 0}`}
                  </p>
               </div>
            </div>
            <div>
               <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> תגיות ותחום
               </p>
               <div className="flex flex-wrap gap-2">
                  {['Software', 'SaaS', 'Enterprise'].map(tag => (
                     <span key={tag} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full border border-slate-200 dark:border-slate-700 font-medium">
                        {tag}
                     </span>
                  ))}
                  {(lead.tags || []).map(tag => (
                     <span key={tag} className="px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs rounded-full border border-brand-100 dark:border-brand-800">
                        {tag}
                     </span>
                  ))}
                  <button className="text-xs text-slate-400 hover:text-brand-600 px-2 py-1 rounded-full border border-dashed border-slate-300 hover:border-brand-300 transition-colors flex items-center gap-1">
                     <Plus className="w-3 h-3" /> הוסף
                  </button>
               </div>
            </div>
         </div>

         {/* 4. Quick Actions Section */}
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               <Target className="w-4 h-4 text-brand-500" />
               צעדים הבאים
            </h3>
            <div className="flex flex-wrap gap-2">
               <button
                  onClick={() => handleQuickAction('follow_up')}
                  disabled={isSubmittingAction}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
               >
                  <Calendar className="w-4 h-4" />
                  תזמן המשך טיפול
               </button>
               <button
                  onClick={() => handleQuickAction('deal_closed')}
                  disabled={isSubmittingAction}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
               >
                  <CheckCircle className="w-4 h-4" />
                  סגור כסגור
               </button>
               <button
                  onClick={() => handleQuickAction('not_relevant')}
                  disabled={isSubmittingAction}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
               >
                  <XCircle className="w-4 h-4" />
                  לא רלוונטי
               </button>
            </div>
         </div>

         {/* Follow-up Modal */}
         {isFollowUpModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]" onClick={() => setIsFollowUpModalOpen(false)}>
               <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
               >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                     <Calendar className="w-5 h-5 text-brand-500" />
                     תזמון המשך טיפול
                  </h3>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">תאריך</label>
                        <input
                           type="date"
                           value={followUpDate}
                           min={new Date().toISOString().split('T')[0]}
                           onChange={(e) => setFollowUpDate(e.target.value)}
                           className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">שעה</label>
                        <input
                           type="time"
                           value={followUpTime}
                           min={followUpDate === new Date().toISOString().split('T')[0]
                              ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                              : undefined}
                           onChange={(e) => setFollowUpTime(e.target.value)}
                           className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">הערות (אופציונלי)</label>
                        <textarea
                           value={followUpNotes}
                           onChange={(e) => setFollowUpNotes(e.target.value)}
                           placeholder="מה צריך לעשות בהמשך הטיפול?"
                           className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 resize-none h-20"
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                     <button
                        onClick={() => setIsFollowUpModalOpen(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                     >
                        ביטול
                     </button>
                     <button
                        onClick={() => handleQuickAction('follow_up')}
                        disabled={!followUpDate || isSubmittingAction}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-medium rounded-xl hover:from-brand-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {isSubmittingAction ? 'שומר...' : 'שמור משימה'}
                     </button>
                  </div>
               </div>
            </div>
         )}

      </div>
   );

   // Helper functions for activities
   const getActivityIcon = (type: string) => {
      switch (type) {
         case 'call_start':
         case 'call_end':
            return Phone;
         case 'email_sent':
            return Mail;
         case 'note':
            return FileText;
         case 'follow_up':
            return Calendar;
         case 'status_change':
            return ArrowRight;
         case 'deal_closed':
            return Check;
         case 'lead_created':
            return Sparkles;
         default:
            return MessageSquare;
      }
   };

   const getActivityLabel = (type: string) => {
      switch (type) {
         case 'call_start': return 'שיחה התחילה';
         case 'call_end': return 'שיחה הסתיימה';
         case 'email_sent': return 'אימייל נשלח';
         case 'note': return 'הערה נוספה';
         case 'follow_up': return 'מתוזמן פולו-אפ';
         case 'status_change': return 'שינוי סטטוס';
         case 'deal_closed': return 'עסקה נסגרה';
         case 'not_relevant': return 'לא רלוונטי';
         case 'lead_created': return 'ליד נוצר';
         case 'summary_ready': return 'סיכום מוכן';
         default: return type;
      }
   };

   const formatActivityDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
         return `היום, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (diffDays === 1) {
         return `אתמול, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
         return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
   };

   const handleAddNote = async () => {
      if (!newNoteText.trim()) return;

      setIsAddingNote(true);
      try {
         await addActivity('note', { note: newNoteText });
         setNewNoteText('');
      } catch (err) {
         console.error('Failed to add note:', err);
      } finally {
         setIsAddingNote(false);
      }
   };

   const renderActivity = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
         {/* Add Note Section */}
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
               <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="הוסף הערה..."
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
               />
               <Button
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim() || isAddingNote}
                  className="px-4"
               >
                  {isAddingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               </Button>
            </div>
         </div>

         <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">ציר זמן</h3>
            <span className="text-xs text-slate-400">{activities.length} פעילויות</span>
         </div>

         {/* Loading State */}
         {activitiesLoading && (
            <div className="flex items-center justify-center py-8">
               <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
         )}

         {/* Empty State */}
         {!activitiesLoading && activities.length === 0 && (
            <div className="text-center py-8 text-slate-400">
               <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
               <p className="text-sm">אין פעילויות עדיין</p>
               <p className="text-xs mt-1">הוסף הערה או התחל שיחה</p>
            </div>
         )}

         {/* RTL Timeline */}
         {!activitiesLoading && activities.length > 0 && (
            <div className="relative border-r-2 border-slate-100 dark:border-slate-800 mr-2 space-y-6 py-2">
               {activities.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.type);
                  const isFirst = index === 0;

                  return (
                     <div key={activity.id} className="relative pr-6 group">
                        <div className={`absolute -right-[7px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 ${isFirst ? 'border-brand-500' : 'border-slate-300 dark:border-slate-700'} group-hover:scale-110 transition-transform`}></div>
                        <div className="flex flex-col gap-1.5">
                           <div className="flex justify-between items-start">
                              <span className={`text-xs font-semibold ${isFirst ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                 {formatActivityDate(activity.created_at)}
                              </span>
                           </div>
                           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm group-hover:border-brand-200 dark:group-hover:border-brand-800 transition-colors">
                              <div className="flex items-center gap-2 mb-1">
                                 <IconComponent className={`w-3.5 h-3.5 ${activity.type === 'lead_created' ? 'text-amber-400' : 'text-slate-400'}`} />
                                 <span className="text-sm font-bold text-slate-900 dark:text-white">{getActivityLabel(activity.type)}</span>
                              </div>
                              {activity.data?.note && (
                                 <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{activity.data.note}</p>
                              )}
                              {activity.data?.summary && (
                                 <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{activity.data.summary}</p>
                              )}
                              {activity.data?.source && (
                                 <p className="text-sm text-slate-500 dark:text-slate-400">מקור: {activity.data.source}</p>
                              )}
                              {activity.data?.old_status && activity.data?.new_status && (
                                 <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {activity.data.old_status} ← {activity.data.new_status}
                                 </p>
                              )}
                              {activity.data?.duration && (
                                 <Badge variant="neutral" className="text-[10px] mt-2 px-2 py-0.5">
                                    {Math.floor(activity.data.duration / 60)}:{(activity.data.duration % 60).toString().padStart(2, '0')} דקות
                                 </Badge>
                              )}
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
   );

   // Filter activities for history tab
   const getFilteredHistoryActivities = () => {
      let filtered = [...activities];

      // Filter by action type
      if (historyActionFilter === 'calls') {
         filtered = filtered.filter(a => a.type === 'call_start' || a.type === 'call_end');
      } else if (historyActionFilter === 'emails') {
         filtered = filtered.filter(a => a.type === 'email_sent');
      } else if (historyActionFilter === 'notes') {
         filtered = filtered.filter(a => a.type === 'note');
      }

      // Filter by time
      const now = new Date();
      if (historyTimeFilter === 'week') {
         const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
         filtered = filtered.filter(a => new Date(a.created_at) >= weekAgo);
      } else if (historyTimeFilter === 'month') {
         const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
         filtered = filtered.filter(a => new Date(a.created_at) >= monthAgo);
      }

      return filtered;
   };

   const renderHistory = () => {
      const filteredActivities = getFilteredHistoryActivities();

      return (
         <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
               <div className="relative flex-1">
                  <select
                     value={historyActionFilter}
                     onChange={(e) => setHistoryActionFilter(e.target.value as any)}
                     className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2 outline-none text-slate-700 dark:text-slate-200"
                  >
                     <option value="all">כל הפעולות</option>
                     <option value="calls">שיחות</option>
                     <option value="emails">אימיילים</option>
                     <option value="notes">הערות</option>
                  </select>
               </div>
               <div className="relative flex-1">
                  <select
                     value={historyTimeFilter}
                     onChange={(e) => setHistoryTimeFilter(e.target.value as any)}
                     className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2 outline-none text-slate-700 dark:text-slate-200"
                  >
                     <option value="all">כל הזמנים</option>
                     <option value="week">השבוע</option>
                     <option value="month">החודש</option>
                  </select>
               </div>
            </div>

            {/* Loading State */}
            {activitiesLoading && (
               <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
               </div>
            )}

            {/* Empty State */}
            {!activitiesLoading && filteredActivities.length === 0 && (
               <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">אין פעילויות להציג</p>
                  <p className="text-xs mt-1">נסה לשנות את הסינון</p>
               </div>
            )}

            {!activitiesLoading && filteredActivities.length > 0 && (
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-right text-xs">
                     <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                           <th className="px-4 py-3 font-medium">תאריך</th>
                           <th className="px-4 py-3 font-medium">פעולה</th>
                           <th className="px-4 py-3 font-medium">סוג</th>
                           <th className="px-4 py-3 font-medium">הערות</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredActivities.map((activity) => (
                           <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                 {new Date(activity.created_at).toLocaleDateString('he-IL', {
                                    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                 })}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                 {getActivityLabel(activity.type)}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                 {activity.type === 'call_start' || activity.type === 'call_end' ? 'שיחה' :
                                    activity.type === 'email_sent' ? 'אימייל' :
                                       activity.type === 'note' ? 'הערה' : 'אחר'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                 {activity.data?.note || activity.data?.summary || '-'}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      );
   };

   const renderAI = () => {
      const hasAiData = lead.scoreDetails && lead.scoreDetails.generatedAt;

      const getScoreColor = (score: number) => {
         if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
         if (score >= 60) return 'text-amber-600 dark:text-amber-400';
         return 'text-rose-600 dark:text-rose-400';
      };

      const getScoreLabel = (score: number) => {
         if (score >= 80) return 'גבוה מאוד';
         if (score >= 60) return 'בינוני-גבוה';
         if (score >= 40) return 'בינוני';
         return 'נמוך';
      };

      return (
         <div className="space-y-6 animate-in fade-in duration-300">
            {/* Generate Button if no data */}
            {!hasAiData && (
               <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6 shadow-sm text-center">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">ניתוח AI</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                     הפעל ניתוח אוטומטי לקבלת ציון איכות וכוונת רכישה
                  </p>
                  <Button onClick={handleAiAnalyze} disabled={isAnalyzing}>
                     {isAnalyzing ? (
                        <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> מנתח...</>
                     ) : (
                        <><Sparkles className="w-4 h-4 ml-2" /> הפעל ניתוח</>
                     )}
                  </Button>
                  {aiError && (
                     <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
                        {aiError}
                     </div>
                  )}
               </div>
            )}

            {/* Show AI Data if exists */}
            {hasAiData && (
               <>
                  {/* Score Overview */}
                  <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                              <Sparkles className="w-4 h-4" />
                           </div>
                           <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm">ציון איכות הליד</h3>
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(lead.score || 0)}`}>
                           {lead.score || 0}
                        </div>
                     </div>

                     {/* Score Breakdown */}
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        {[
                           { label: 'התאמה', value: lead.scoreDetails?.fit, icon: User },
                           { label: 'מעורבות', value: lead.scoreDetails?.activity, icon: Clock },
                           { label: 'כוונות', value: lead.scoreDetails?.intent, icon: ArrowUpRight }
                        ].map((item, i) => (
                           <div key={i} className="text-center p-3 bg-white dark:bg-slate-800/50 rounded-lg">
                              <item.icon className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                              <div className={`text-lg font-bold ${getScoreColor(item.value || 0)}`}>{item.value || 0}</div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</div>
                           </div>
                        ))}
                     </div>

                     {/* AI Reasoning */}
                     {lead.scoreDetails?.reasoning && (
                        <div className="bg-white dark:bg-slate-800/30 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
                           <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2">ניתוח AI:</h4>
                           <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {lead.scoreDetails.reasoning}
                           </p>
                        </div>
                     )}

                     {/* Refresh Button */}
                     <div className="flex items-center justify-between mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800">
                        <span className="text-[10px] text-slate-400">
                           עודכן: {new Date(lead.scoreDetails.generatedAt!).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleAiAnalyze} disabled={isAnalyzing} className="text-xs">
                           {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 ml-1" />}
                           עדכן
                        </Button>
                     </div>
                  </div>

                  {/* Action Recommendations based on score */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                     <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">המלצות לפעולה</h3>
                     <div className="space-y-3">
                        {(lead.scoreDetails?.recommendations && lead.scoreDetails.recommendations.length > 0) ? (
                           lead.scoreDetails.recommendations.map((rec, i) => (
                              <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                 <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800" />
                                 <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{rec}</span>
                              </label>
                           ))
                        ) : (lead.score || 0) >= 70 ? (
                           // Fallback for high score
                           ['תזמן פגישת סגירה בהקדם', 'שלח הצעת מחיר מותאמת', 'הצע תקופת ניסיון'].map((rec, i) => (
                              <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                 <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800" />
                                 <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{rec}</span>
                              </label>
                           ))
                        ) : (lead.score || 0) >= 40 ? (
                           // Fallback for medium score
                           ['שלח תוכן ערך נוסף', 'תזמן שיחת מעקב', 'הזמן לוובינר הבא'].map((rec, i) => (
                              <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                 <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800" />
                                 <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{rec}</span>
                              </label>
                           ))
                        ) : (
                           // Fallback for low score
                           ['נסה ליצור קשר בערוץ אחר', 'שלח תזכורת אוטומטית', 'העבר לניהול אוטומטי'].map((rec, i) => (
                              <label key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                 <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 bg-white dark:bg-slate-800" />
                                 <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{rec}</span>
                              </label>
                           ))
                        )}
                     </div>
                  </div>
               </>
            )}
         </div>
      );
   };

   return (
      <>
         {/* Backdrop */}
         <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={onClose}
         />

         {/* Drawer Panel - Slide from Right */}
         <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] lg:w-[540px] bg-white dark:bg-slate-950 shadow-2xl shadow-slate-900/20 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right flex flex-col h-full border-l border-slate-200 dark:border-slate-800">

            {/* Sticky Header Section */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 z-20 border-b border-slate-100 dark:border-slate-800 relative">

               {/* Top Row: User Info & Close */}
               <div className="px-6 pt-6 pb-4 flex justify-between items-start">
                  <div className="flex items-start gap-4">
                     {/* Avatar */}
                     <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {lead.name.charAt(0)}
                     </div>
                     {/* Name & Role */}
                     <div className="mt-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-2">{lead.name}</h2>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                           <span>מנכ"ל</span>
                           <span className="mx-2 text-slate-300">•</span>
                           <span>{lead.company}</span>
                        </div>
                     </div>
                  </div>
                  {/* Close Button */}
                  <button
                     onClick={onClose}
                     className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                  >
                     <X className="w-6 h-6" />
                  </button>
               </div>

               {/* Actions Row */}
               <div className="px-6 pb-6 flex gap-3">
                  <Button className="flex-1 justify-center py-2.5" onClick={() => handleCall(lead.phone)}>
                     <Phone className="w-4 h-4 ml-2" />
                     התקשר
                  </Button>
                  <Button variant="secondary" className="flex-1 justify-center py-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-900/20" onClick={() => handleWhatsApp(lead.phone)}>
                     <MessageCircle className="w-4 h-4 ml-2" />
                     וואטסאפ
                  </Button>
                  <Button variant="ghost" className="px-3 border border-slate-200 dark:border-slate-700 text-slate-500" onClick={() => setIsEditModalOpen(true)}>
                     <Edit2 className="w-4 h-4" />
                  </Button>
               </div>

               {/* Tabs */}
               <div className="px-6 flex gap-8 overflow-x-auto border-t border-slate-100 dark:border-slate-800 no-scrollbar">
                  {[
                     { id: 'overview', label: 'סקירה' },
                     { id: 'activity', label: 'פעילויות' },
                     { id: 'history', label: 'היסטוריה' },
                     { id: 'ai', label: 'AI Insights', icon: Sparkles }
                  ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                    py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5
                    ${activeTab === tab.id
                              ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-bold'
                              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}
                  `}
                     >
                        {tab.icon && <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'fill-current' : ''}`} />}
                        {tab.label}
                     </button>
                  ))}
               </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
               {activeTab === 'overview' && renderOverview()}
               {activeTab === 'activity' && renderActivity()}
               {activeTab === 'history' && renderHistory()}
               {activeTab === 'ai' && renderAI()}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
               <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
                  <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-in zoom-in-95 duration-200">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">עריכת פרטי ליד</h3>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                     </div>

                     <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
                        {/* Basic Info Section */}
                        <div className="space-y-3">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">פרטי ליד</h4>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">שם מלא</label>
                              <input
                                 type="text"
                                 value={editForm.name}
                                 onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">חברה</label>
                              <input
                                 type="text"
                                 value={editForm.company}
                                 onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                              />
                              ```
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">סטטוס</label>
                                 <div className="relative">
                                    <select
                                       value={editForm.status}
                                       onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                       className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                       {settings?.pipeline_statuses ? (
                                          settings.pipeline_statuses.map(status => (
                                             <option key={status.id} value={status.id}>{status.label}</option>
                                          ))
                                       ) : (
                                          <>
                                             <option value="New">ליד חדש</option>
                                             <option value="Discovery">גילוי צרכים</option>
                                             <option value="Negotiation">משא ומתן</option>
                                             <option value="Proposal">הצעת מחיר</option>
                                             <option value="Closed">סגור</option>
                                          </>
                                       )}
                                    </select>
                                    <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">מקור הגעה</label>
                                 <div className="relative">
                                    <select
                                       value={editForm.source}
                                       onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                                       className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                       <option value="Website">אתר אינטרנט</option>
                                       <option value="LinkedIn">לינקדאין</option>
                                       <option value="Facebook Ads">פייסבוק</option>
                                       <option value="Referral">הפניה</option>
                                       <option value="Webinar">וובינר</option>
                                    </select>
                                    <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Contact Info Section */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">פרטי קשר</h4>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">טלפון</label>
                              <input
                                 type="tel"
                                 value={editForm.phone}
                                 onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 dir-ltr text-right"
                                 placeholder="050-0000000"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אימייל</label>
                              <input
                                 type="email"
                                 value={editForm.email}
                                 onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 dir-ltr text-right"
                                 placeholder="name@example.com"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">אתר</label>
                              <input
                                 type="url"
                                 value={editForm.website}
                                 onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                 className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 dir-ltr text-right"
                                 placeholder="www.example.com"
                              />
                           </div>
                        </div>

                        {/* Business Info Section */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">פרטי עסקה</h4>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ערך עסקה משוער (₪)</label>
                              <div className="relative">
                                 <span className="absolute top-2 right-3 text-slate-400 text-sm">₪</span>
                                 <input
                                    type="number"
                                    value={editForm.value}
                                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                                    className="w-full pr-8 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="0"
                                 />
                              </div>
                           </div>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">נציג מטפל</label>
                              <div className="relative">
                                 <select
                                    value={editForm.ownerId}
                                    onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-brand-500"
                                 >
                                    {teamMembers.map(m => (
                                       <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                 </select>
                                 <ChevronDown className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>ביטול</Button>
                        <Button onClick={handleSaveEdit}>
                           <Save className="w-4 h-4 ml-2" />
                           שמירת שינויים
                        </Button>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </>
   );
};
