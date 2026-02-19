import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../src/lib/supabaseClient';
import {
  AlertTriangle,
  Headphones,
  X,
  Activity,
  ShieldAlert,
  TrendingDown,
  MessageSquareWarning,
  Swords,
  Frown,
  Clock,
  PhoneCall,
  ChevronDown,
  Wifi,
  WifiOff,
  Eye,
  Sparkles,
  Zap,
  HeartCrack
} from 'lucide-react';
import { ManagerListenDrawer } from './ManagerListenDrawer';

interface AttentionAlert {
  id: string;
  callSid: string;
  agentId: string;
  agentName: string;
  leadName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reasons: Array<{ type: string; text: string; severity: string }>;
  score: number;
  stage: string;
  scoreBreakdown?: Record<string, number>;
  callDuration: number;
  createdAt: number;
  updatedAt: number;
}

interface ActiveCall {
  callSid: string;
  agentId: string;
  agentName: string;
  leadName: string;
  currentStage: string;
  lastScore: number;
  alertLevel: string;
  duration: number;
}

interface NeedsAttentionCardProps {
  orgId?: string;
}

const severityConfig = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900/50',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    pulse: 'animate-pulse',
    dot: 'bg-red-500',
    label: 'קריטי'
  },
  high: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-900/50',
    text: 'text-orange-700 dark:text-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    pulse: '',
    dot: 'bg-orange-500',
    label: 'גבוה'
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900/50',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    pulse: '',
    dot: 'bg-amber-500',
    label: 'בינוני'
  },
  low: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    pulse: '',
    dot: 'bg-slate-400',
    label: 'נמוך'
  }
};

const reasonIcons: Record<string, React.ElementType> = {
  critical_score: ShieldAlert,
  low_score: TrendingDown,
  declining_score: TrendingDown,
  unhandled_objections: MessageSquareWarning,
  competitor_mentioned: Swords,
  customer_frustration: Frown,
  weak_discovery: Activity,
  weak_objection_handling: MessageSquareWarning,
  weak_closing: TrendingDown,
  stuck_stage: Clock,
  long_struggling_call: PhoneCall,
  golden_moment: Sparkles,
  lost_momentum: Zap,
  negative_tone: HeartCrack,
  score_downtrend: TrendingDown
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const NeedsAttentionCard: React.FC<NeedsAttentionCardProps> = ({ orgId }) => {
  const [alerts, setAlerts] = useState<AttentionAlert[]>([]);
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [listeningTo, setListeningTo] = useState<string | null>(null);
  const [showAllCalls, setShowAllCalls] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<any>(null);

  const connectWS = useCallback(async () => {
    if (!orgId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.error('[Manager WS] No auth token');
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/manager?orgId=${orgId}&token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: 'get_alerts' }));
        ws.send(JSON.stringify({ type: 'get_active_calls' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'monitor_connected':
              setAlerts(msg.activeAlerts || []);
              break;

            case 'attention_alert':
              setAlerts(prev => {
                const existing = prev.findIndex(a => a.id === msg.alert.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = msg.alert;
                  return updated;
                }
                return [msg.alert, ...prev];
              });
              break;

            case 'attention_resolved':
            case 'attention_ended':
              setAlerts(prev => prev.filter(a => a.callSid !== msg.callSid));
              if (msg.type === 'attention_ended') {
                setActiveCalls(prev => prev.filter(c => c.callSid !== msg.callSid));
              }
              break;

            case 'attention_dismissed':
              setAlerts(prev => prev.filter(a => a.callSid !== msg.callSid));
              break;

            case 'alerts_list':
              setAlerts(msg.alerts || []);
              break;

            case 'active_calls':
              setActiveCalls(msg.calls || []);
              break;

            case 'call_update':
              setActiveCalls(prev => {
                const idx = prev.findIndex(c => c.callSid === msg.callSid);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], lastScore: msg.score, currentStage: msg.stage, alertLevel: msg.alertLevel };
                  return updated;
                }
                return [...prev, { callSid: msg.callSid, agentName: msg.agentName, agentId: '', leadName: '', currentStage: msg.stage, lastScore: msg.score, alertLevel: msg.alertLevel, duration: 0 }];
              });
              break;
          }
        } catch (e) { }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimeout.current = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => ws.close();
    } catch (err) {
      console.error('[Manager WS] Connection error:', err);
    }
  }, [orgId]);

  useEffect(() => {
    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connectWS]);

  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    const interval = setInterval(() => {
      wsRef.current?.send(JSON.stringify({ type: 'get_active_calls' }));
    }, 15000);
    return () => clearInterval(interval);
  }, [connected]);

  const handleDismiss = (callSid: string) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'dismiss_alert', callSid }));
    }
  };

  const handleListen = (callSid: string) => {
    setListeningTo(callSid);
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const totalAlerts = alerts.length;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center relative ${totalAlerts > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
              <AlertTriangle className={`w-5 h-5 ${totalAlerts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping opacity-75" />
              )}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">דורש תשומת לב</h3>
            <div className="flex items-center gap-1.5">
              {totalAlerts > 0 && (
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  {totalAlerts}
                </span>
              )}
              {connected ? (
                <Wifi className="w-3 h-3 text-emerald-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-slate-400" />
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {!expanded && (
          <div className="px-5 pb-4">
            {totalAlerts > 0 ? (
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {totalAlerts}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 dark:text-slate-400">נציגים שדורשים עזרה</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {criticalCount > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{criticalCount} קריטי</span>}
                    {highCount > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">{highCount} גבוה</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCalls.length}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {activeCalls.length > 0 ? 'שיחות פעילות - הכל תקין' : 'אין שיחות פעילות כרגע'}
                </span>
              </div>
            )}
          </div>
        )}

        {expanded && (
          <div className="border-t border-slate-100 dark:border-slate-800">
            {totalAlerts > 0 ? (
              <div className="p-3 space-y-2">
                {alerts.map(alert => {
                  const config = severityConfig[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-lg border p-3 ${config.bg} ${config.border} ${config.pulse} transition-all`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${config.dot} shrink-0`} />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{alert.agentName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.badge}`}>
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleListen(alert.callSid)}
                            className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                            title="האזנה לשיחה"
                          >
                            <Headphones className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDismiss(alert.callSid)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                            title="הסר התראה"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>שיחה עם: <strong className="text-slate-700 dark:text-slate-300">{alert.leadName}</strong></span>
                        <span>|</span>
                        <span>שלב: <strong className="text-slate-700 dark:text-slate-300">{alert.stage || 'לא ידוע'}</strong></span>
                        <span>|</span>
                        <span>ציון: <strong className={`${alert.score < 40 ? 'text-red-600' : alert.score < 60 ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'}`}>{alert.score}</strong></span>
                        <span>|</span>
                        <span>{formatDuration(alert.callDuration)}</span>
                      </div>

                      <div className="space-y-1">
                        {alert.reasons.map((reason, i) => {
                          const Icon = reasonIcons[reason.type] || AlertTriangle;
                          return (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <Icon className={`w-3 h-3 shrink-0 ${config.text}`} />
                              <span className="text-slate-600 dark:text-slate-400">{reason.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">הכל תקין</p>
                <p className="text-xs text-slate-400">אין נציגים שדורשים עזרה כרגע</p>
              </div>
            )}

            {activeCalls.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-3 pb-3">
                <button
                  onClick={() => setShowAllCalls(!showAllCalls)}
                  className="w-full flex items-center justify-between py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <span className="font-medium">שיחות פעילות ({activeCalls.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAllCalls ? 'rotate-180' : ''}`} />
                </button>
                {showAllCalls && (
                  <div className="space-y-1.5">
                    {activeCalls.map(call => (
                      <div
                        key={call.callSid}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${call.alertLevel === 'critical' ? 'bg-red-500 animate-pulse' :
                              call.alertLevel === 'high' ? 'bg-orange-500' :
                                call.alertLevel === 'medium' ? 'bg-amber-500' :
                                  'bg-emerald-500'
                            }`} />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{call.agentName}</span>
                          {call.lastScore != null && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${call.lastScore < 40 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                call.lastScore < 60 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                              }`}>{call.lastScore}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleListen(call.callSid)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="האזנה לשיחה"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {listeningTo && wsRef.current && (
        <ManagerListenDrawer
          callSid={listeningTo}
          ws={wsRef.current}
          onClose={() => setListeningTo(null)}
        />
      )}
    </>
  );
};
