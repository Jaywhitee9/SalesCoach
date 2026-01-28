import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Message, CoachSuggestion } from '../../types';
import { supabase } from '../lib/supabaseClient';

export interface CallSummaryData {
    summary: string;
    score: number;
    success: boolean;
}

interface CoachingData {
    score: number;
    stage: string;
    insight: string;
    suggestion?: string;
    signals?: {
        pains?: { text: string; severity?: 'high' | 'medium' | 'low' }[];
        objections?: { text: string; status?: 'open' | 'handled' }[];
        gaps?: { text: string }[];
        vision?: { text: string }[];
        bridges?: { text: string; sentiment?: 'positive' | 'skeptical' | 'neutral' }[];
    };
    stageStatus?: { [key: string]: 'completed' | 'current' | 'upcoming' };
    next_actions?: string[];
}

// Power Dialer Types
export interface PowerDialerLead {
    id: string;
    name: string;
    phone: string;
    source?: string;
    status?: string;
    company?: string;
}

export interface PowerDialerState {
    isActive: boolean;
    isPaused: boolean;
    queue: PowerDialerLead[];
    currentIndex: number;
    previewCountdown: number;
    isInPreview: boolean;
}

interface CallContextType {
    device: Device | null;
    activeCall: Call | null;
    connectionStatus: string;
    callStatus: string;
    isReady: boolean;
    isOnCall: boolean;
    isMuted: boolean;
    callDuration: number;
    transcripts: Message[];
    coachingData: CoachingData;
    activeLeadId: string | null;
    setActiveLeadId: (id: string | null) => void;
    // New
    historyCalls: any[];
    coachingTips: any[]; // New: Real-time accumulated tips
    callSummary: CallSummaryData | null;
    // P0: Summary Modal States
    showSummaryModal: boolean;
    summaryStatus: 'pending' | 'generating' | 'ready' | 'failed';
    callSessionId: string | null;
    dismissSummaryModal: () => void;
    // Last Call Data (for re-viewing summary)
    hasLastCall: boolean;
    showLastSummary: () => void;
    // Actions
    initDevice: () => Promise<void>;
    startCall: (phone: string, agentId?: string, leadId?: string) => Promise<void>;
    hangup: () => void;
    clearSummary: () => void;
    toggleMute: () => void;
    // Power Dialer
    powerDialer: PowerDialerState;
    startPowerDialer: (leads: PowerDialerLead[]) => void;
    stopPowerDialer: () => void;
    pausePowerDialer: () => void;
    resumePowerDialer: () => void;
    skipToNextLead: () => void;
    // Smart Queue Logic
    smartQueue: PowerDialerLead[];
    setSmartQueue: (queue: PowerDialerLead[]) => void;
    dialNextLead: () => Promise<void>;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within a CallProvider');
    return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [device, setDevice] = useState<Device | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    // Device Connection Status: 'disconnected' | 'connecting' | 'ready' | 'error'
    const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
    const [activeLeadId, setActiveLeadIdValue] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('activeLeadId');
        }
        return null;
    });

    const setActiveLeadId = (id: string | null) => {
        console.log('[CallContext] setActiveLeadId:', id);
        setActiveLeadIdValue(id);
        if (id) {
            localStorage.setItem('activeLeadId', id);
        } else {
            localStorage.removeItem('activeLeadId');
        }
    };
    // Active Call Status: 'idle' | 'dialing' | 'connected' | 'reconnecting'
    const [callStatus, setCallStatus] = useState<string>('idle');

    const [isReady, setIsReady] = useState(false);
    const [isOnCall, setIsOnCall] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    // ========================================
    // [P0] CALL SUMMARY AUTO-DISPLAY
    // ========================================
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryStatus, setSummaryStatus] = useState<'pending' | 'generating' | 'ready' | 'failed'>('pending');
    const [callSessionId, setCallSessionId] = useState<string | null>(null);
    // Store last call data so user can re-view summary after closing modal
    const [lastCallData, setLastCallData] = useState<{
        leadId: string | null;
        summary: any;
        transcripts: Message[];
        coachingTips: any[]; // New
        duration: number;
    } | null>(null);

    // ========================================
    // POWER DIALER STATE
    // ========================================
    const [powerDialer, setPowerDialer] = useState<PowerDialerState>({
        isActive: false,
        isPaused: false,
        queue: [],
        currentIndex: 0,
        previewCountdown: 0,
        isInPreview: false
    });
    // Global Smart Queue State
    const [smartQueue, setSmartQueue] = useState<PowerDialerLead[]>([]);
    const powerDialerRef = useRef<PowerDialerState>(powerDialer);
    const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Keep ref in sync
    useEffect(() => {
        powerDialerRef.current = powerDialer;
    }, [powerDialer]);

    const [transcripts, setTranscripts] = useState<Message[]>([]);
    // Partials State: Keyed by Speaker or just Role.
    // User wants `draftByRole = { agent: "", customer: "" }`.
    // We will store full Message object for convenience in merging.
    const [drafts, setDrafts] = useState<Record<string, Message | null>>({});
    const draftsRef = useRef<Record<string, Message | null>>({}); // For WS access

    // Sync Ref
    useEffect(() => {
        draftsRef.current = drafts;
    }, [drafts]);

    // ========================================
    // [A] ROLE NORMALIZATION WITH OVERRIDE
    // ========================================
    const normalizeRole = (serverRole: string, track?: string | null): 'agent' | 'customer' => {
        let role: 'agent' | 'customer' = serverRole === 'agent' ? 'agent' : 'customer';

        // Check localStorage for force swap override
        const forceSwap = typeof window !== 'undefined' && localStorage.getItem('forceSwapRoles') === '1';
        if (forceSwap) {
            role = role === 'agent' ? 'customer' : 'agent';
            console.log(`[UI-RoleNorm] FORCE_SWAP active: ${serverRole} -> ${role}`);
        }

        return role;
    };

    // ========================================
    // [D] KEYBOARD SHORTCUT FOR ROLE SWAP TOGGLE
    // ========================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                const current = localStorage.getItem('forceSwapRoles') || '0';
                const newVal = current === '1' ? '0' : '1';
                localStorage.setItem('forceSwapRoles', newVal);
                console.log(`[UI-RoleSwap] Toggled forceSwapRoles: ${current} -> ${newVal}`);
                alert(`Role Swap: ${newVal === '1' ? 'ENABLED' : 'DISABLED'}\n\nRefresh the page to see changes in new calls.`);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const [coachingData, setCoachingData] = useState<CoachingData>({
        score: 50,
        stage: 'פתיחה',
        insight: 'המערכת ממתינה לנתונים...',
    });
    const [coachingTips, setCoachingTips] = useState<any[]>([]); // New: Accumulator
    const [callSummary, setCallSummary] = useState<CallSummaryData | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Twilio Device
    const initDevice = async () => {
        try {
            if (connectionStatus === 'ready') return;
            setConnectionStatus('connecting');
            console.log('[Twilio] Fetching token...');

            const res = await fetch('/api/token');
            if (!res.ok) {
                const errorText = await res.text();
                console.error('[Twilio] Token fetch failed:', res.status, errorText);
                throw new Error(`Token fetch failed: ${res.status}`);
            }
            const data = await res.json();
            console.log('[Twilio] Token received, initializing device...');

            const newDevice = new Device(data.token, {
                codecPreferences: ['opus', 'pcmu'] as any,
                // Option A: Let Twilio choose the best edge automatically
                // edge: ['ashburn', 'dublin', 'singapore'], 
            });

            newDevice.on('registered', () => {
                console.log('[Twilio] Device Registered successfully');
                setIsReady(true);
                setConnectionStatus('ready');
            });

            newDevice.on('error', (err: any) => {
                const sid = err.callSid || activeCall?.parameters?.CallSid;
                console.error('[Twilio] Device Error:', {
                    code: err.code,
                    message: err.message,
                    twilioError: err.twilioError,
                    originalError: err.originalError,
                    callSid: sid
                });

                if (sid) {
                    console.info(`🔍 Twilio Debugger Link: https://console.twilio.com/us1/monitor/logs/call/${sid}`);
                    console.info(`🔍 General Debugger: https://console.twilio.com/us1/monitor/logs/debugger`);
                }

                // Handle specific Twilio errors
                if (err.code === 31401) {
                    console.error('[Twilio] Permission Denied - Check microphone access');
                } else if (err.code === 31005 || err.code === 31009) {
                    console.error('[Twilio] WebSocket/Transport Error (31005/31009) - Check network / firewall / region');
                } else if (err.code === 31000) {
                    console.error('[Twilio] Unknown Error - See details above');
                }

                setConnectionStatus('error');
                setIsReady(false);
            });

            newDevice.on('unregistered', () => {
                console.log('[Twilio] Device Unregistered');
                setConnectionStatus('disconnected');
                setIsReady(false);
            });

            await newDevice.register();
            setDevice(newDevice);
            console.log('[Twilio] Device registered and ready');

        } catch (err: any) {
            console.error('[Twilio] Device Init Error:', err);
            setConnectionStatus('error');
            setIsReady(false);
        }
    };

    // Diagnostics / Preflight
    const runDiagnostics = async () => {
        try {
            console.log('%c[Twilio] Starting Preflight Check...', 'color: #00bcd4; font-weight: bold; font-size: 12px');

            // Network Info Logging
            if (navigator.onLine !== undefined) {
                console.log(`[Network] Online Status: ${navigator.onLine ? '✅ Online' : '❌ Offline'}`);
            }
            // @ts-ignore
            if (navigator.connection) {
                // @ts-ignore
                const { effectiveType, rtt, downlink, saveData } = navigator.connection;
                console.log('[Network] Connection Info:', { effectiveType, rtt, downlink, saveData });
            }

            const res = await fetch('/api/token');
            const data = await res.json();

            // @ts-ignore - runPreflight might not be in all typedefs depending on version, but it is in SDK
            if (Device.runPreflight) {
                // @ts-ignore
                const preflight = Device.runPreflight(data.token);

                preflight.on('progress', (progress: any) => {
                    console.log('[Twilio-Preflight] Progress:', progress);
                });

                preflight.on('completed', (report: any) => {
                    console.log('%c[Twilio-Preflight] COMPLETED', 'color: #4caf50; font-weight: bold', report);

                    // Specific Analysis
                    if (report.status === 'connected') {
                        console.log('✅ Connectivity Check Passed');
                    } else {
                        console.error('❌ Connectivity Check Failed');
                    }

                    if (report.networkTiming) {
                        console.table(report.networkTiming);
                    }

                    if (report.warnings && report.warnings.length > 0) {
                        console.warn('⚠️ Preflight Warnings:', report.warnings);
                    }
                    if (report.errors && report.errors.length > 0) {
                        console.error('❌ Preflight Errors:', report.errors);
                    }
                });

                preflight.on('failed', (error: any) => {
                    console.error('[Twilio-Preflight] FAILED:', error);
                });
            } else {
                console.warn('[Twilio] Device.runPreflight not available in this SDK version.');
            }
        } catch (err) {
            console.error('[Twilio] Diagnostics Error:', err);
        }
    };

    // Timer Logic - Only count while connected, don't reset on disconnect (preserve for summary)
    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            // DON'T reset duration here - preserve for summary modal
            // Duration is reset in startCall when new call begins
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callStatus]);

    const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
    const [historyCalls, setHistoryCalls] = useState<any[]>([]); // New State for grouped history
    const historyCache = useRef<Record<string, Message[]>>({});

    // History Fetching Logic - Uses API to bypass RLS
    useEffect(() => {
        const fetchHistory = async () => {
            if (!activeLeadId) {
                setHistoryMessages([]);
                return;
            }

            // [CACHE] Check cache first for instant load
            if (historyCache.current[activeLeadId]) {
                console.log('[CallContext] Cache hit for lead:', activeLeadId);
                setHistoryMessages(historyCache.current[activeLeadId]);
            } else {
                // Clear state while fetching if not cached
                setHistoryMessages([]);
            }

            console.log('[CallContext] Fetching history for lead:', activeLeadId);

            try {
                // Use API endpoint (Secured with Org Check)
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                const response = await fetch(`/api/calls/lead/${activeLeadId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    console.error('[CallContext] History fetch error:', result.error);

                    if (response.status === 403) {
                        console.warn('[CallContext] Access Forbidden. Clearing active lead.');
                        setActiveLeadId(null);
                        localStorage.removeItem('activeLeadId');
                    }
                    return;
                }

                // Extract messages from call transcripts
                const allMessages: Message[] = [];
                result.calls?.forEach((call: any) => {
                    if (call.transcript) {
                        Object.entries(call.transcript).forEach(([role, messages]: [string, any]) => {
                            if (Array.isArray(messages)) {
                                messages.forEach((m: any, idx: number) => {
                                    allMessages.push({
                                        id: `${call.id}-${role}-${idx}`,
                                        speaker: role as 'agent' | 'customer',
                                        text: m.text,
                                        timestamp: new Date(m.timestamp || call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        isFinal: true
                                    });
                                });
                            }
                        });
                    }
                });

                // Sort by timestamp
                allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                console.log('[CallContext] Loaded history:', allMessages.length, 'messages from', result.calls?.length, 'calls');

                // [CACHE] Update Cache
                historyCache.current[activeLeadId] = allMessages;
                setHistoryMessages(allMessages);
                setHistoryCalls(result.calls || []); // Store raw calls for grouping
            } catch (err) {
                console.error('[CallContext] History fetch error:', err);
            }
        };

        fetchHistory();
    }, [activeLeadId]);

    // WebSocket Logic
    const connectWS = (callSid: string) => {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/ws/coach?callSid=${callSid}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => console.log('WS Connected');

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'transcript') {
                    const isFinal = data.isFinal === true;

                    // [A] Use normalizeRole for final role determination
                    const speakerArg = normalizeRole(data.role, data.track);
                    const segmentId = data.segmentId || `${speakerArg}-${Math.floor(Date.now() / 3000)}`;

                    const now = new Date();
                    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    console.log(`[WS-msg] role=${data.role} normalized=${speakerArg} isFinal=${isFinal} text="${data.text.substring(0, 20)}..." track=${data.track} segmentId=${segmentId}`);

                    // LOGIC:
                    // 1. If NOT Final: Update Drafts only.
                    // 2. If Final: Commit to Transcripts (Merge if needed), Clear Draft.

                    if (!isFinal) {
                        setDrafts(prev => {
                            const current = prev[speakerArg]; // This `prev` is fresh from React Update
                            let newText = data.text;

                            // MONOTONIC DRAFT UPDATE
                            if (current && current.text) {
                                const oldTxt = current.text;
                                // 1. Expansion
                                if (newText.startsWith(oldTxt)) {
                                    // good
                                }
                                // 2. Regression -> Ignore
                                else if (oldTxt.startsWith(newText) && oldTxt.length > newText.length) {
                                    newText = oldTxt;
                                }
                                // 3. Append
                                else {
                                    newText = newText; // FIXED
                                }
                            }

                            // Sync Ref immediately for next events in this loop?
                            // No, relying on useEffect is safer for React, but inside WS we use Ref.
                            // We can't update Ref inside setDrafts safely. 
                            // But we can update Ref BEFORE setDrafts if we calculate locally?
                            // Let's rely on Ref for READ in Final. 
                            // For Partial, we use functional update which is correct.

                            return {
                                ...prev,
                                [speakerArg]: {
                                    id: `draft-${speakerArg}`,
                                    speaker: speakerArg,
                                    text: newText,
                                    timestamp: timestamp,
                                    isFinal: false
                                }
                            };
                        });
                    } else {
                        // IS FINAL -> Commit Safely
                        const currentDraft = draftsRef.current[speakerArg];
                        let commitText = data.text;

                        // "Don't let Final delete text"
                        if (currentDraft && currentDraft.text) {
                            if (currentDraft.text.length > commitText.length && currentDraft.text.startsWith(commitText)) {
                                console.log(`[UI-Debug] Monotonic Rescue: Final "${commitText}" rejected. Kept "${currentDraft.text}"`);
                                commitText = currentDraft.text;
                            }
                        }

                        console.log(`[UI-Debug] role=${speakerArg} isFinal=true newLen=${data.text.length} draftLen=${currentDraft?.text?.length} commitLen=${commitText.length} text="${commitText.substring(0, 10)}..."`);

                        setTranscripts(prev => {
                            const lastMsg = prev[prev.length - 1];
                            const updated = [...prev];

                            // Helper function to find overlap between end of str1 and start of str2
                            const findOverlap = (str1: string, str2: string): number => {
                                const minLen = Math.min(str1.length, str2.length, 50); // Check last 50 chars max
                                for (let i = minLen; i > 3; i--) { // Min overlap of 4 chars
                                    if (str1.endsWith(str2.substring(0, i))) {
                                        return i;
                                    }
                                }
                                return 0;
                            };

                            // DEDUP CHECK: Skip if this text is already in the last message
                            if (lastMsg && lastMsg.speaker === speakerArg) {
                                const lastText = lastMsg.text || '';

                                // CASE 1: Exact containment
                                if (lastText.includes(commitText)) {
                                    // New text is already in existing - skip
                                    return prev;
                                }
                                if (commitText.includes(lastText)) {
                                    // New text contains old text - replace with new
                                    updated[prev.length - 1] = {
                                        ...lastMsg,
                                        text: commitText,
                                        timestamp: timestamp
                                    };
                                    return updated;
                                }

                                // CASE 2: Partial overlap - check if end of lastText overlaps with start of commitText
                                const overlap = findOverlap(lastText, commitText);
                                if (overlap > 0) {
                                    // Merge: keep lastText + add only the non-overlapping part of commitText
                                    const mergedText = lastText + commitText.substring(overlap);
                                    console.log(`[UI-Overlap] Found ${overlap} char overlap, merging`);
                                    updated[prev.length - 1] = {
                                        ...lastMsg,
                                        text: mergedText,
                                        timestamp: timestamp
                                    };
                                    return updated;
                                }

                                // CASE 3: No overlap - append with space
                                updated[prev.length - 1] = {
                                    ...lastMsg,
                                    text: `${lastMsg.text} ${commitText}`,
                                    timestamp: timestamp
                                };
                                return updated;
                            } else {
                                // New Bubble - different speaker
                                return [...prev, {
                                    id: Date.now().toString(),
                                    speaker: speakerArg,
                                    text: commitText,
                                    timestamp: timestamp,
                                    isFinal: true
                                }];
                            }
                        });

                        // CLEAR DRAFT for this speaker
                        setDrafts(prev => ({
                            ...prev,
                            [speakerArg]: null
                        }));
                    }
                }

                if (data.type === 'coaching') {
                    setCoachingData(prev => ({
                        ...prev,
                        score: data.score ?? prev.score,
                        stage: data.stage ?? prev.stage,
                        insight: data.message ?? prev.insight,
                        suggestion: data.suggested_reply,
                        signals: data.signals || prev.signals || [],
                    }));

                    // Accumulate unique tips for history
                    setCoachingTips(prev => {
                        // Avoid duplicates if same message comes twice
                        const isDuplicate = prev.some(tip => tip.message === data.message && Math.abs(tip.timestamp - Date.now()) < 5000);
                        if (isDuplicate) return prev;

                        return [...prev, {
                            type: 'coaching',
                            message: data.message,
                            severity: data.severity || 'info',
                            timestamp: Date.now()
                        }];
                    });
                }

                if (data.type === 'call_summary') {
                    console.log('[Summary] Received via WS, summaryStatus=ready', data.data);
                    setCallSummary(data.data);
                    setSummaryStatus('ready');
                }

            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        wsRef.current.onerror = (e) => console.error('WS Error', e);
        wsRef.current.onclose = () => console.log('WS Closed');
    };


    const startCall = async (phone: string, agentId?: string, leadId?: string) => {
        if (!device) return;

        try {
            setCallStatus('dialing');
            setIsOnCall(true);
            // Reset state for new call
            setCallDuration(0); // Reset duration for new call
            setTranscripts([]);
            setCoachingTips([]); // Reset tips
            setCallSummary(null);
            setCoachingData({ score: 50, stage: 'פתיחה', insight: 'מחבר שיחה...' });

            // Normalize Phone to E.164 (Client Side)
            let formattedPhone = phone.replace(/\D/g, ''); // strip non-digits
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '+972' + formattedPhone.substring(1);
            } else if (!formattedPhone.startsWith('+')) {
                // careful with international, but provided req is mainly IL
                // If user typed 972... make it +972
                if (formattedPhone.startsWith('972')) {
                    formattedPhone = '+' + formattedPhone;
                }
            }
            // If it was already +..., replace stripped +
            if (phone.startsWith('+') && !formattedPhone.startsWith('+')) {
                formattedPhone = '+' + formattedPhone;
            }

            console.log('[CallContext] Starting call trigger:', { formattedPhone, deviceStatus: !!device, readyState: device?.state });

            if (!device) {
                console.error('[CallContext] Start Call Failed: Device not initialized');
                alert('מערכת הטלפון לא מוכנה. נסה לרענן את הדף.');
                return;
            }

            console.log('[CallContext] Starting call to:', formattedPhone);

            // 1. MIC PERMISSION CHECK (Instruction #3)
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
                console.error('[CallContext] Mic Permission Denied', micErr);
                // Show a simple alert or just log, but do NOT proceed to connect.
                alert('המיקרופון חסום. אנא אשר גישה למיקרופון בדפדפן.');
                setCallStatus('idle');
                setIsOnCall(false);
                return;
            }

            const call = await device.connect({
                params: {
                    target_number: formattedPhone,
                    agent_id: agentId || 'unknown',
                    lead_id: leadId || 'unknown'
                }
            });

            call.on('accept', () => {
                console.log('Call Accepted');
                setCallStatus('connected');
                setActiveCall(call);
                // @ts-ignore
                const sid = call.parameters.CallSid;
                setCallSessionId(sid); // P0: Store for summary modal
                console.log('[Summary] callSessionId stored:', sid);
                connectWS(sid);
            });

            call.on('disconnect', async () => {
                console.log('Call Disconnected');
                setIsOnCall(false);
                setCallStatus('idle');
                setActiveCall(null);
                // DO NOT RESET activeLeadId - User wants to stay on lead

                // === AUTO-RETRY LOGIC ===
                // If call was very short (< 15 seconds), likely unanswered - schedule retry
                const currentDuration = callDuration;
                const currentLeadId = activeLeadId;

                if (currentLeadId && currentDuration < 15) {
                    console.log('[AutoRetry] Short call detected, scheduling retry:', {
                        leadId: currentLeadId,
                        duration: currentDuration
                    });

                    try {
                        // Get organization ID
                        const { data: { session } } = await supabase.auth.getSession();
                        let orgId = session?.user?.user_metadata?.organization_id;
                        if (!orgId && session?.user?.id) {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('organization_id')
                                .eq('id', session.user.id)
                                .single();
                            orgId = profile?.organization_id;
                        }

                        if (orgId) {
                            // Record the attempt and schedule next retry
                            await fetch(`/api/leads/${currentLeadId}/record-attempt`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    disposition: 'no_answer',
                                    organizationId: orgId
                                })
                            });
                            console.log('[AutoRetry] ✅ Retry scheduled for lead:', currentLeadId);
                        }
                    } catch (err) {
                        console.warn('[AutoRetry] Failed to schedule retry:', err);
                    }
                }

                // P0: Auto-open summary modal immediately
                console.log('[Summary] modalOpened, summaryStatus=generating');
                setSummaryStatus('generating');
                setShowSummaryModal(true);

                // Timeout: If summary doesn't arrive in 15 seconds, mark as ready (with what we have)
                setTimeout(() => {
                    setSummaryStatus(prev => {
                        if (prev === 'generating') {
                            console.log('[Summary] Timeout - marking as ready with available data');
                            return 'ready';
                        }
                        return prev;
                    });
                }, 15000);
            });

            call.on('error', (err: any) => {
                console.error('Call Error:', {
                    name: err.name,
                    message: err.message,
                    code: err.code,
                    originalError: err.originalError,
                    info: err.toString()
                });
                setCallStatus('idle');
                setIsOnCall(false);
            });

        } catch (err) {
            console.error('Start Call Error', err);
            setCallStatus('idle');
            setIsOnCall(false);
        }
    };


    const hangup = () => {
        if (activeCall) activeCall.disconnect();
        else if (device) device.disconnectAll();
        setCallStatus('idle');
    };

    const clearSummary = () => setCallSummary(null);

    // NEW: Toggle mute for agent microphone
    const toggleMute = () => {
        if (activeCall) {
            const newMuteState = !isMuted;
            activeCall.mute(newMuteState);
            setIsMuted(newMuteState);
            console.log(`[CallContext] Mute toggled: ${newMuteState ? 'MUTED' : 'UNMUTED'}`);
        } else {
            console.warn('[CallContext] Cannot toggle mute - no active call');
        }
    };

    // P0: Dismiss summary modal - but save data for later viewing
    const dismissSummaryModal = () => {
        // Save current call data before closing so user can re-view later
        if (callSummary || transcripts.length > 0) {
            setLastCallData({
                leadId: activeLeadId,
                summary: callSummary,
                transcripts: [...transcripts],
                coachingTips: coachingTips,
                duration: callDuration
            });
        }
        setShowSummaryModal(false);
        setSummaryStatus('pending');
        setCallSessionId(null);
        console.log('[Summary] Modal dismissed, states reset');
    };

    // P0: Dial Next Lead (Quick Disposition)
    const dialNextLead = async () => {
        if (smartQueue.length === 0) {
            console.log('[CallContext] Queue empty, cannot dial next.');
            return;
        }

        // Get next lead
        const nextLead = smartQueue[0];
        const remainingQueue = smartQueue.slice(1);

        console.log('⚡ Dialing Next Lead:', nextLead.name);

        // Update Queue
        setSmartQueue(remainingQueue);

        // Set Active
        setActiveLeadId(nextLead.id);

        // Close any modals
        setShowSummaryModal(false);

        // Start Call
        if (nextLead.phone) {
            // Small delay to allow UI to settle
            setTimeout(() => {
                startCall(nextLead.phone, undefined, nextLead.id);
            }, 500);
        } else {
            console.warn('Next lead has no phone:', nextLead);
            alert('לליד הבא אין מספר טלפון תקין');
        }
    };

    // Show last call summary
    const showLastSummary = () => {
        if (lastCallData) {
            setCallSummary(lastCallData.summary);
            setShowSummaryModal(true);
            setSummaryStatus(lastCallData.summary ? 'ready' : 'pending');
            console.log('[Summary] Re-showing last call summary');
        }
    };

    const hasLastCall = lastCallData !== null;

    // ========================================
    // POWER DIALER FUNCTIONS
    // ========================================

    // Start Power Dialer with a queue of leads
    const startPowerDialer = (leads: PowerDialerLead[]) => {
        console.log('[PowerDialer] Starting with', leads.length, 'leads');
        if (leads.length === 0) {
            console.warn('[PowerDialer] No leads provided');
            return;
        }
        setPowerDialer({
            isActive: true,
            isPaused: false,
            queue: leads,
            currentIndex: 0,
            previewCountdown: 0,
            isInPreview: false
        });
    };

    // Stop Power Dialer completely
    const stopPowerDialer = () => {
        console.log('[PowerDialer] Stopped');
        if (previewTimerRef.current) {
            clearInterval(previewTimerRef.current);
            previewTimerRef.current = null;
        }
        setPowerDialer({
            isActive: false,
            isPaused: false,
            queue: [],
            currentIndex: 0,
            previewCountdown: 0,
            isInPreview: false
        });
    };

    // Pause Power Dialer temporarily
    const pausePowerDialer = () => {
        console.log('[PowerDialer] Paused');
        if (previewTimerRef.current) {
            clearInterval(previewTimerRef.current);
            previewTimerRef.current = null;
        }
        setPowerDialer(prev => ({ ...prev, isPaused: true, isInPreview: false, previewCountdown: 0 }));
    };

    // Resume Power Dialer from pause
    const resumePowerDialer = () => {
        console.log('[PowerDialer] Resumed');
        setPowerDialer(prev => ({ ...prev, isPaused: false }));
        // Trigger next call preview
        triggerNextCallPreview();
    };

    // Skip to next lead
    const skipToNextLead = () => {
        console.log('[PowerDialer] Skipping to next lead');
        if (previewTimerRef.current) {
            clearInterval(previewTimerRef.current);
            previewTimerRef.current = null;
        }
        setPowerDialer(prev => {
            const nextIndex = prev.currentIndex + 1;
            if (nextIndex >= prev.queue.length) {
                console.log('[PowerDialer] No more leads, stopping');
                return { ...prev, isActive: false, isInPreview: false };
            }
            return { ...prev, currentIndex: nextIndex, isInPreview: false, previewCountdown: 0 };
        });
        // Trigger preview for new lead
        setTimeout(() => triggerNextCallPreview(), 100);
    };

    // Trigger 5-second preview countdown before calling next lead
    const triggerNextCallPreview = () => {
        const state = powerDialerRef.current;
        if (!state.isActive || state.isPaused) return;
        if (state.currentIndex >= state.queue.length) {
            console.log('[PowerDialer] Queue complete');
            stopPowerDialer();
            return;
        }

        console.log('[PowerDialer] Starting 5 second preview');
        setPowerDialer(prev => ({ ...prev, isInPreview: true, previewCountdown: 5 }));

        // Countdown timer
        previewTimerRef.current = setInterval(() => {
            setPowerDialer(prev => {
                if (!prev.isActive || prev.isPaused) {
                    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
                    return prev;
                }
                if (prev.previewCountdown <= 1) {
                    // Time's up - start the call!
                    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
                    const lead = prev.queue[prev.currentIndex];
                    if (lead) {
                        console.log('[PowerDialer] Auto-calling lead:', lead.name);
                        // Call the lead (async, fire-and-forget)
                        startCall(lead.phone, undefined, lead.id);
                    }
                    return { ...prev, isInPreview: false, previewCountdown: 0 };
                }
                return { ...prev, previewCountdown: prev.previewCountdown - 1 };
            });
        }, 1000);
    };

    // Auto-continue to next lead after call ends (when summary modal is dismissed)
    useEffect(() => {
        // When showSummaryModal becomes false and powerDialer is active
        if (!showSummaryModal && powerDialerRef.current.isActive && !powerDialerRef.current.isPaused && callStatus === 'idle') {
            // Move to next lead
            setPowerDialer(prev => {
                const nextIndex = prev.currentIndex + 1;
                if (nextIndex >= prev.queue.length) {
                    console.log('[PowerDialer] All leads called, stopping');
                    return { ...prev, isActive: false };
                }
                return { ...prev, currentIndex: nextIndex };
            });
            // Trigger preview for next lead with small delay
            setTimeout(() => triggerNextCallPreview(), 500);
        }
    }, [showSummaryModal, callStatus]);

    // Unified Transcript List (History + Finals + Active Drafts)
    // FIX: Removed historyMessages from here to prevent old calls from showing up in active call / summary
    const displayedTranscripts = [
        ...transcripts,
        ...Object.values(drafts).filter(Boolean) as Message[]
    ];

    return (
        <CallContext.Provider value={{
            device,
            activeCall,
            connectionStatus,
            callStatus,
            isReady,
            isOnCall,
            isMuted,
            callDuration,
            transcripts: displayedTranscripts,
            coachingData,
            activeLeadId,
            setActiveLeadId,
            callSummary,
            historyCalls: historyCalls || [], // Expose history
            // P0: Summary Modal States
            showSummaryModal,
            summaryStatus,
            callSessionId,
            dismissSummaryModal,
            // Last Call Re-view
            hasLastCall,
            showLastSummary,
            // Actions
            initDevice,
            startCall,
            hangup,
            clearSummary,
            toggleMute,
            // Power Dialer
            powerDialer,
            startPowerDialer,
            stopPowerDialer,
            pausePowerDialer,
            resumePowerDialer,
            skipToNextLead,
            // Smart Queue
            smartQueue,
            setSmartQueue,
            dialNextLead
        }}>
            {children}
        </CallContext.Provider>
    );
};
