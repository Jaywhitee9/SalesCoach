import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Headphones,
  Activity,
  User,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Volume2,
  VolumeX
} from 'lucide-react';

interface TranscriptEntry {
  role: 'agent' | 'customer';
  text: string;
  timestamp: number;
}

interface CoachingEntry {
  score: number;
  stage: string;
  message: string;
  suggested_reply?: string;
  severity: string;
  score_breakdown?: Record<string, number>;
  signals?: any;
  battle_card?: any;
  timestamp?: number;
}

interface ManagerListenDrawerProps {
  callSid: string;
  ws: WebSocket;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export const ManagerListenDrawer: React.FC<ManagerListenDrawerProps> = ({ callSid, ws, onClose }) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [coaching, setCoaching] = useState<CoachingEntry[]>([]);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [currentBreakdown, setCurrentBreakdown] = useState<Record<string, number>>({});
  const [isListening, setIsListening] = useState(false);
  const [showCoaching, setShowCoaching] = useState(true);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.callSid && msg.callSid !== callSid) return;

      switch (msg.type) {
        case 'listen_status':
          setIsListening(msg.listening);
          break;

        case 'transcript_history':
          setTranscripts(msg.history || []);
          break;

        case 'coaching_history':
          if (msg.history && msg.history.length > 0) {
            setCoaching(msg.history);
            const last = msg.history[msg.history.length - 1];
            if (last.score !== undefined) setCurrentScore(last.score);
            if (last.stage) setCurrentStage(last.stage);
            if (last.score_breakdown) setCurrentBreakdown(last.score_breakdown);
          }
          break;

        case 'live_transcript':
          if (msg.isFinal) {
            setTranscripts(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === msg.role && (msg.timestamp - last.timestamp) < 3000) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, text: msg.text };
                return updated;
              }
              return [...prev, { role: msg.role, text: msg.text, timestamp: msg.timestamp }];
            });
          }
          break;

        case 'live_coaching':
          setCoaching(prev => [...prev, { ...msg, timestamp: Date.now() }]);
          if (msg.score !== undefined) setCurrentScore(msg.score);
          if (msg.stage) setCurrentStage(msg.stage);
          if (msg.score_breakdown) setCurrentBreakdown(msg.score_breakdown);
          break;
      }
    } catch (e) {}
  }, [callSid]);

  useEffect(() => {
    ws.addEventListener('message', handleMessage);

    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'start_listening', callSid }));
    }

    return () => {
      ws.removeEventListener('message', handleMessage);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'stop_listening' }));
      }
    };
  }, [ws, callSid, handleMessage]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const breakdownLabels: Record<string, string> = {
    discovery: 'גילוי צרכים',
    presentation: 'הצגת ערך',
    objection_handling: 'טיפול בהתנגדויות',
    closing: 'סגירה',
    rapport: 'יצירת קשר',
    engagement: 'מעורבות'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        style={{ opacity: isVisible ? 1 : 0 }}
        onClick={handleClose}
      />

      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-200 ease-out"
        style={{ transform: isVisible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-l from-indigo-50 dark:from-indigo-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                האזנה לשיחה
                {isListening && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {currentStage && `שלב: ${currentStage}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentScore !== null && (
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>{currentScore}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">{currentStage}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getScoreBg(currentScore)}`}
                style={{ width: `${currentScore}%` }}
              />
            </div>
            {Object.keys(currentBreakdown).length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {Object.entries(currentBreakdown).map(([key, val]) => {
                  const numVal = Number(val) || 0;
                  return (
                    <div key={key} className="text-center">
                      <div className="text-[10px] text-slate-400 mb-0.5">{breakdownLabels[key] || key}</div>
                      <div className={`text-xs font-bold ${numVal < 40 ? 'text-red-500' : numVal < 60 ? 'text-amber-500' : 'text-emerald-500'}`}>{numVal}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <span className="text-xs font-bold text-slate-500">תמלול שיחה</span>
            <button
              onClick={() => setShowCoaching(!showCoaching)}
              className={`text-[10px] px-2 py-1 rounded-full transition-colors ${showCoaching ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
            >
              {showCoaching ? 'הסתר אימון' : 'הצג אימון'}
            </button>
          </div>

          <div className="p-4 space-y-3">
            {transcripts.length === 0 && (
              <div className="text-center py-10">
                <Volume2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">ממתין לתמלול...</p>
              </div>
            )}

            {transcripts.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2 ${
                  entry.role === 'agent'
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {entry.role === 'agent' ? (
                      <UserCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <User className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="text-[10px] font-bold opacity-60">
                      {entry.role === 'agent' ? 'נציג' : 'לקוח'}
                    </span>
                    <span className="text-[10px] opacity-40 mr-auto">{formatTime(entry.timestamp)}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{entry.text}</p>
                </div>
              </div>
            ))}

            {showCoaching && coaching.length > 0 && (
              <>
                {coaching.slice(-3).map((c, i) => (
                  <div key={`coaching-${i}`} className="mx-4 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageSquare className="w-3 h-3 text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">אימון AI</span>
                      {c.severity === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{c.message}</p>
                    {c.suggested_reply && (
                      <div className="mt-1.5 p-2 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800">
                        <span className="text-[10px] text-amber-600 font-medium">הצעת מענה:</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{c.suggested_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              {isListening ? (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span>{isListening ? 'מאזין לשיחה בזמן אמת' : 'ממתין לחיבור...'}</span>
            </div>
            <span>{transcripts.length} הודעות</span>
          </div>
        </div>
      </div>
    </div>
  );
};
