import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Message, CoachSuggestion } from '../../types';
import { CallSummaryData } from '../../components/Call/CallSummaryModal';

interface CoachingData {
    score: number;
    stage: string;
    insight: string;
    suggestion?: string;
    signals?: { type: 'pain' | 'interest' | 'objection' | 'positive', label: string }[];
    stageStatus?: { [key: string]: 'completed' | 'current' | 'upcoming' };
}



interface CallContextType {
    device: Device | null;
    activeCall: Call | null;
    connectionStatus: string; // 'disconnected', 'connecting', 'connected', 'error'
    callStatus: string; // 'idle' | 'dialing' | 'connected' | 'reconnecting'
    isReady: boolean;
    isOnCall: boolean;
    callDuration: number;
    transcripts: Message[];
    coachingData: CoachingData;
    callSummary: CallSummaryData | null;
    initDevice: () => Promise<void>;
    startCall: (phone: string, agentId?: string, leadId?: string) => Promise<void>;
    hangup: () => void;
    clearSummary: () => void;
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
    // Active Call Status: 'idle' | 'dialing' | 'connected' | 'reconnecting'
    const [callStatus, setCallStatus] = useState<string>('idle');

    const [isReady, setIsReady] = useState(false);
    const [isOnCall, setIsOnCall] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [transcripts, setTranscripts] = useState<Message[]>([]);
    const [coachingData, setCoachingData] = useState<CoachingData>({
        score: 50,
        stage: 'פתיחה',
        insight: 'המערכת ממתינה לנתונים...',
    });
    const [callSummary, setCallSummary] = useState<CallSummaryData | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Twilio Device
    const initDevice = async () => {
        try {
            if (connectionStatus === 'ready') return;
            setConnectionStatus('connecting');
            const res = await fetch('/api/token');
            if (!res.ok) throw new Error('Failed to fetch token');
            const data = await res.json();

            const newDevice = new Device(data.token, {
                codecPreferences: ['opus', 'pcmu'] as any,
                // debug: true, 
            });

            newDevice.on('registered', () => {
                console.log('Twilio Device Registered');
                setIsReady(true);
                setConnectionStatus('ready');
            });

            newDevice.on('error', (err) => {
                console.error('Twilio Device Error:', err);
                setConnectionStatus('error');
            });

            await newDevice.register();
            setDevice(newDevice);

        } catch (err) {
            console.error('Device Init Error:', err);
            setConnectionStatus('error');
        }
    };

    // Timer Logic
    useEffect(() => {
        if (callStatus === 'connected') {
            timerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setCallDuration(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callStatus]);

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
                    console.log(`[WS] Transcript: ${data.role} - "${data.text?.substring(0, 20)}..." [Final: ${data.isFinal}]`);
                    const newMsg: Message = {
                        id: Date.now().toString(), // Simple ID
                        speaker: data.role === 'agent' ? 'agent' : 'customer',
                        text: data.text,
                        timestamp: new Date().toLocaleTimeString(),
                        isFinal: data.isFinal
                    } as any;

                    setTranscripts(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.speaker === newMsg.speaker && (last as any).isFinal === false) {
                            const updated = [...prev];
                            updated[prev.length - 1] = newMsg;
                            return updated;
                        }
                        return [...prev, newMsg];
                    });
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
                }

                if (data.type === 'call_summary') {
                    console.log('[WS] Received Call Summary:', data.data);
                    setCallSummary(data.data);
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
            setTranscripts([]);
            setCallSummary(null);
            setCoachingData({ score: 50, stage: 'פתיחה', insight: 'מחבר שיחה...' });

            const call = await device.connect({
                params: {
                    target_number: phone,
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
                connectWS(sid);
            });

            call.on('disconnect', () => {
                console.log('Call Disconnected');
                setIsOnCall(false);
                setCallStatus('idle');
                setActiveCall(null);
                // WS logic removed to allow summary to arrive
            });

            call.on('error', (err) => {
                console.error('Call Error', err);
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

    return (
        <CallContext.Provider value={{
            device,
            activeCall,
            connectionStatus,
            callStatus,
            isReady,
            isOnCall,
            callDuration,
            transcripts,
            coachingData,
            callSummary,
            initDevice,
            startCall,
            hangup,
            clearSummary
        }}>
            {children}
        </CallContext.Provider>
    );
};
