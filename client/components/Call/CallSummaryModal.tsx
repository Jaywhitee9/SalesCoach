
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  Clock,
  FileText,
  Sparkles,
  ThumbsDown,
  Loader2,
  Save,
  MessageSquare,
  Zap,
  Volume2,
  Play,
  Pause,
  DollarSign,
  Target,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Award
} from 'lucide-react';
import { Button } from '../Common/Button';
import { DateTimePicker } from '../Common/DateTimePicker';
import { useCall } from '../../src/context/CallContext';
import { Message } from '../../types';
import { supabase } from '../../src/lib/supabaseClient';

interface CallSummaryModalProps {
  leadName: string;
  leadId: string;
  callDuration: number; // seconds
  transcripts: Message[];
  coachingTips?: any[]; // New prop for tips
}

export const CallSummaryModal: React.FC<CallSummaryModalProps> = ({
  leadName: propLeadName,
  leadId,
  callDuration,
  transcripts,
  coachingTips = [] // Default to empty
}) => {
  const {
    showSummaryModal,
    dismissSummaryModal,
    summaryStatus,
    callSummary,
    callSessionId,
    // Power Flow
    smartQueue,
    dialNextLead
  } = useCall();

  const [activeTab, setActiveTab] = useState<'summary' | 'moments' | 'transcript'>('summary');
  const [outcome, setOutcome] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState<Date | null>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  });
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [notRelevantReason, setNotRelevantReason] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showNotRelevantForm, setShowNotRelevantForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dealAmount, setDealAmount] = useState<number | null>(null);
  const [debriefCompleted, setDebriefCompleted] = useState(false);
  const [debriefLoading, setDebriefLoading] = useState(false);

  // Recording playback state
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Lead name state - needs to reset when modal opens with new lead
  const [leadName, setLeadName] = useState(propLeadName);

  // Reset all form state when modal opens (new call)
  useEffect(() => {
    if (showSummaryModal) {
      // Reset form state for new summary
      setOutcome(null);
      setFollowUpNotes('');
      setNotRelevantReason('');
      setShowFollowUpForm(false);
      setShowNotRelevantForm(false);
      setDealAmount(null);
      setDebriefCompleted(false);
      setDebriefLoading(false);

      // Reset lead name to prop value first, will fetch if needed
      setLeadName(propLeadName);

      // Set follow-up date to tomorrow 10am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFollowUpDate(tomorrow);
    }
  }, [showSummaryModal]);

  // Initialize deal amount from AI summary
  useEffect(() => {
    if (callSummary?.deal_amount && typeof callSummary.deal_amount === 'number') {
      setDealAmount(callSummary.deal_amount);
    }
  }, [callSummary]);

  // Fetch real lead name from database
  useEffect(() => {
    const fetchLeadName = async () => {
      // Only fetch if we have a leadId and modal is open
      if (leadId && showSummaryModal) {
        const { data, error } = await supabase
          .from('leads')
          .select('name')
          .eq('id', leadId)
          .single();

        if (data?.name && !error) {
          setLeadName(data.name);
        }
      }
    };
    fetchLeadName();
  }, [leadId, showSummaryModal]);

  // Fetch recording URL from call record
  useEffect(() => {
    const fetchRecording = async () => {
      if (callSessionId && showSummaryModal) {
        // Query calls table for recording URL
        const { data, error } = await supabase
          .from('calls')
          .select('recording_url')
          .eq('recording_url', `sid:${callSessionId}`)
          .or(`recording_url.ilike.https%`)
          .single();

        if (!error && data?.recording_url && data.recording_url.startsWith('https')) {
          setRecordingUrl(data.recording_url);
        }
      }
    };
    fetchRecording();
  }, [callSessionId, showSummaryModal]);

  // Audio playback toggle
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!showSummaryModal) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const outcomes = [
    { id: 'deal_closed', label: 'עסקה נסגרה', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'follow_up', label: 'המשך טיפול', icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'not_relevant', label: 'לא רלוונטי', icon: ThumbsDown, color: 'bg-rose-100 text-rose-600 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400' },
  ];

  const handleOutcomeClick = (id: string) => {
    setOutcome(id);
    setShowFollowUpForm(id === 'follow_up');
    setShowNotRelevantForm(id === 'not_relevant');
  };

  const handleSave = async () => {
    if (!outcome) return;

    setIsSaving(true);
    console.log('[Summary] Saving outcome:', outcome, { followUpDate, followUpNotes, callSessionId, leadId, dealAmount });

    try {
      // Save to backend API
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcome,
          followUpAt: followUpDate ? followUpDate.toISOString() : null,
          notes: outcome === 'not_relevant' ? notRelevantReason : (followUpNotes || null),
          callSessionId,
          summaryJson: callSummary,
          dealAmount: dealAmount // Include deal amount
        })
      });

      if (!response.ok) {
        console.error('[Summary] Failed to save:', await response.text());
      } else {
        console.log('[Activity] inserted:', { type: outcome, leadId, dealAmount });
      }
    } catch (err) {
      console.error('[Summary] Save error:', err);
    }

    setIsSaving(false);
    dismissSummaryModal();
  };

  // Power Flow: Save outcome AND immediately dial next lead
  const handleSaveAndNext = async () => {
    if (!outcome) return;

    setIsSaving(true);
    console.log('[Summary] Saving outcome and dialing next:', outcome, { dealAmount });

    try {
      // Save to backend API
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcome,
          followUpAt: followUpDate ? followUpDate.toISOString() : null,
          notes: outcome === 'not_relevant' ? notRelevantReason : (followUpNotes || null),
          callSessionId,
          summaryJson: callSummary,
          dealAmount: dealAmount // Include deal amount
        })
      });

      if (!response.ok) {
        console.error('[Summary] Failed to save:', await response.text());
      } else {
        console.log('[Activity] inserted:', { type: outcome, leadId, dealAmount });
      }
    } catch (err) {
      console.error('[Summary] Save error:', err);
    }

    setIsSaving(false);

    // Trigger next call via context
    await dialNextLead();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={dismissSummaryModal}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              סיכום שיחה
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              עם {leadName} • {formatDuration(callDuration)} דקות
            </p>
          </div>

          {/* AI Score */}
          {summaryStatus === 'ready' && callSummary?.score && (
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ציון AI</span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                <span className="font-bold text-slate-900 dark:text-white">{callSummary.score}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
          )}

          {/* Recording Player */}
          {recordingUrl && (
            <button
              onClick={togglePlayback}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              title="השמע הקלטה"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">הקלטה</span>
            </button>
          )}
          {/* Hidden audio element */}
          <audio ref={audioRef} src={recordingUrl || undefined} onEnded={() => setIsPlaying(false)} />

          <button onClick={dismissSummaryModal} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'summary'
              ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            סיכום
          </button>
          {callSummary?.key_moments?.length > 0 && (
            <button
              onClick={() => setActiveTab('moments')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'moments'
                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <Target className="w-4 h-4" />
              רגעי מפתח ({callSummary.key_moments.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'transcript'
              ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50 dark:bg-brand-900/10'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            תמלול ({transcripts.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {activeTab === 'summary' && (
            <>
              {/* AI Summary Section */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-3 h-3" /> סיכום AI
                    </label>
                    {summaryStatus === 'generating' && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        מייצר סיכום...
                      </span>
                    )}
                  </div>

                  {summaryStatus === 'generating' ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                    </div>
                  ) : summaryStatus === 'ready' && callSummary?.summary ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {callSummary.summary}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      לא נוצר סיכום לשיחה זו
                    </p>
                  )}
                </div>
              </div>


              {/* Coaching Tips History */}
              {coachingTips.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    טיפים שניתנו בשיחה
                  </h3>
                  <div className="space-y-3">
                    {coachingTips.map((tip, idx) => (
                      <div k={idx} className="flex gap-3 items-start relative animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tip.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm shadow-sm flex-1">
                          <p className="text-slate-700 dark:text-slate-300">{tip.message}</p>
                          <span className="text-xs text-slate-400 mt-1 block">
                            {new Date(tip.timestamp).toLocaleTimeString('he-IL', { minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Micro-Lesson Card */}
              {summaryStatus === 'ready' && callSummary?.micro_lesson && (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
                  <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                          {callSummary.micro_lesson.title}
                        </h3>
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          תחום: {callSummary.micro_lesson.weak_area}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                      {callSummary.micro_lesson.tip}
                    </p>
                    {callSummary.micro_lesson.example_phrase && (
                      <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 border border-amber-200/50 dark:border-amber-700/30">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">משפט לדוגמה:</span>
                        <p className="text-sm text-slate-800 dark:text-slate-200 italic">
                          &ldquo;{callSummary.micro_lesson.example_phrase}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Debrief Complete Button */}
                    {!debriefCompleted ? (
                      <button
                        onClick={async () => {
                          setDebriefLoading(true);
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const token = session?.access_token;
                            const res = await fetch(`/api/debrief/${callSessionId}/complete`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                              },
                              body: '{}'
                            });
                            const data = await res.json();
                            if (res.ok && data.xpAwarded > 0) setDebriefCompleted(true);
                          } catch (e) {
                            console.error('[Debrief] XP error:', e);
                          }
                          setDebriefLoading(false);
                        }}
                        disabled={debriefLoading}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg"
                      >
                        {debriefLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Award className="w-4 h-4" />
                        )}
                        סימנתי, הבנתי (+10 XP)
                      </button>
                    ) : (
                      <div className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        +10 XP!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Outcome Selection */}
              <div>
                <label className="text-sm font-bold text-slate-900 dark:text-white mb-3 block">מה הסטטוס?</label>
                <div className="grid grid-cols-3 gap-3">
                  {outcomes.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleOutcomeClick(item.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${outcome === item.id
                        ? `${item.color} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-brand-500`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="font-bold text-sm text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deal Amount Field - Show if AI detected amount or if deal_closed selected */}
              {(dealAmount !== null || outcome === 'deal_closed') && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">סכום העסקה</span>
                    {callSummary?.deal_amount && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        זוהה אוטומטית
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      type="number"
                      value={dealAmount ?? ''}
                      onChange={(e) => setDealAmount(e.target.value ? Number(e.target.value) : null)}
                      placeholder="הזן סכום בשקלים..."
                      className="w-full rounded-xl border-2 border-emerald-200 dark:border-emerald-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-right placeholder:text-slate-400 text-lg font-semibold"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₪</span>
                  </div>
                  
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>סכום זה יעדכן אוטומטית את ערך הליד בדשבורד ובדוחות הפייפליין</span>
                  </p>
                </div>
              )}

              {/* Follow Up Form - Premium Design */}
              {showFollowUpForm && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800 space-y-4 animate-in slide-in-from-top-2 pb-64">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">תזמן המשך טיפול</span>
                  </div>

                  {/* Date Time Picker */}
                  <DateTimePicker
                    value={followUpDate}
                    onChange={setFollowUpDate}
                    minDate={new Date()}
                    label="תאריך ושעה"
                    showTime={true}
                  />

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      הערות לשיחה הבאה
                    </label>
                    <textarea
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="מה סוכם? על מה לדבר בפעם הבאה? פרטים חשובים..."
                      rows={3}
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-right placeholder:text-slate-400 resize-none text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Not Relevant Form */}
              {showNotRelevantForm && (
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800 space-y-3 animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1.5 block">למה לא רלוונטי?</label>
                  <div className="flex items-start gap-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 rounded-lg px-3 py-2">
                    <ThumbsDown className="w-4 h-4 text-rose-400 mt-0.5" />
                    <textarea
                      value={notRelevantReason}
                      onChange={(e) => setNotRelevantReason(e.target.value)}
                      placeholder="לדוגמה: תקציב לא מתאים, לא מעוניין כרגע, עבר למתחרה..."
                      rows={2}
                      className="bg-transparent border-none text-sm w-full outline-none text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'moments' && callSummary?.key_moments && (
            <div className="space-y-4">
              <div className="relative pr-4">
                <div className="absolute right-1.5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                {callSummary.key_moments.map((moment: any, idx: number) => {
                  const isPositive = moment.impact === 'positive';
                  const iconBg = isPositive
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 border-rose-300 dark:border-rose-700';
                  const cardBorder = isPositive
                    ? 'border-emerald-200 dark:border-emerald-800/50'
                    : 'border-rose-200 dark:border-rose-800/50';

                  return (
                    <div key={idx} className="relative flex gap-3 items-start mb-4 last:mb-0 animate-in slide-in-from-right-3 duration-300" style={{ animationDelay: `${idx * 120}ms` }}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${iconBg} z-10`}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`flex-1 bg-white dark:bg-slate-900 rounded-xl p-3.5 border ${cardBorder} shadow-sm`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPositive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {moment.type === 'turning_point' ? 'נקודת מפנה'
                              : moment.type === 'missed_opportunity' ? 'הזדמנות שהוחמצה'
                              : moment.type === 'objection_handled' ? 'התנגדות טופלה'
                              : moment.type === 'great_question' ? 'שאלה מצוינת'
                              : moment.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {moment.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {transcripts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">אין תמלול זמין</p>
              ) : (
                transcripts.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.speaker === 'agent' ? 'items-end' : 'items-start'}`}
                  >
                    <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${msg.speaker === 'agent' ? 'text-brand-600' : 'text-slate-500'
                      }`}>
                      {msg.speaker === 'agent' ? 'נציג' : 'לקוח'}
                    </span>
                    <div className={`max-w-[85%] px-4 py-2 rounded-xl text-sm ${msg.speaker === 'agent'
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center gap-3">
          <button
            onClick={dismissSummaryModal}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-4"
          >
            דלג וסגור
          </button>

          <div className="flex gap-2">
            {/* Regular Save */}
            <Button
              onClick={handleSave}
              disabled={!outcome || isSaving}
              variant="secondary"
              className="px-4"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              שמור
            </Button>

            {/* Power Flow: Save & Next (only if queue has items) */}
            {smartQueue.length > 0 && (
              <Button
                onClick={handleSaveAndNext}
                disabled={!outcome || isSaving}
                className="px-6 shadow-lg shadow-brand-500/20 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 ml-2 fill-current" />
                )}
                שמור והמשך ⚡
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
