
import React, { useState, useEffect, useRef } from 'react';
import { Message, CoachSuggestion } from '../../types';
import { Mic, MicOff, PhoneOff, PauseCircle, PlayCircle, Search, Sparkles, Send, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../Common/Button';
import { useCall } from '../../src/context/CallContext';

interface ActiveCallPanelProps {
  transcript: Message[];
  coachSuggestions: CoachSuggestion[];
  onEndCall?: () => void;
}

export const ActiveCallPanel: React.FC<ActiveCallPanelProps> = ({ transcript, coachSuggestions, onEndCall }) => {
  const { isMuted, toggleMute, callDuration, activeCall } = useCall();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle hold (uses Twilio's hold functionality if available)
  const toggleHold = () => {
    // Note: Twilio Client SDK doesn't have native hold - we simulate with mute + message
    // For full hold, you'd need to use Twilio REST API or conference
    setIsOnHold(!isOnHold);
    if (activeCall) {
      activeCall.mute(!isOnHold); // Mute when on hold
    }
    console.log(`[ActiveCallPanel] Hold toggled: ${!isOnHold ? 'ON HOLD' : 'RESUMED'}`);
  };

  // Coach Chat State
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: string, sender: 'user' | 'ai', text: string }[]>([
    { id: 'welcome', sender: 'ai', text: 'אני כאן. מה תרצה שאבדוק עבורך תוך כדי השיחה?' }
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Simple auto-scroll effect for transcript
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, autoScroll]);

  // Scroll to bottom of coach chat when new message arrives
  useEffect(() => {
    if (isCoachChatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isCoachChatOpen]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    // Add user message
    const newUserMsg = { id: Date.now().toString(), sender: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput("");

    if (!isCoachChatOpen) setIsCoachChatOpen(true);

    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'אני מכין לך תשובה קצרה... הנה: נסה לשקף ללקוח את הכאב שציין לגבי חוסר היעילות, ואז לקשר זאת לפתרון המובייל שלנו.'
      }]);
    }, 1500);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-slate-950 min-w-0 relative overflow-hidden h-full">

      {/* Call Controls Header - Minimalist */}
      <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-2 h-2 rounded-full ${isOnHold ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`}></div>
          <span className="font-medium text-slate-700 dark:text-slate-200 text-sm font-mono">
            {formatDuration(callDuration)} • {isOnHold ? 'המתנה' : 'מקליט...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleHold}
            variant="ghost"
            size="icon"
            className={`${isOnHold ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-slate-600'}`}
            title={isOnHold ? 'המשך' : 'המתנה'}
          >
            {isOnHold ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
          </Button>
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className={`${isMuted ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-400 hover:text-slate-600'}`}
            title={isMuted ? 'בטל השתקה' : 'השתק'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            onClick={onEndCall}
            variant="danger"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white border-0"
          >
            <PhoneOff className="w-4 h-4 ml-2" />
            סיום
          </Button>
        </div>
      </div>

      {/* Main Content Split: Transcript (Top) / AI Coach (Bottom) */}
      <div className="flex-1 flex flex-col min-h-0 relative">

        {/* Transcript Area */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-slate-50/30 dark:bg-slate-950">

          <div
            ref={scrollRef}
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              const isBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50;
              if (!isBottom) setAutoScroll(false);
              else setAutoScroll(true);
            }}
            className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
          >
            {transcript.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.speaker === 'agent' ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}
              >
                <div className="flex items-baseline gap-2 mb-1.5 px-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${msg.speaker === 'agent' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
                    {msg.speaker === 'agent' ? 'אני (נציג)' : 'לקוח'}
                  </span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                    {msg.timestamp}
                  </span>
                </div>

                <div className={`
                  relative max-w-[90%] md:max-w-[75%] px-6 py-4 rounded-2xl text-base leading-relaxed shadow-sm
                  ${msg.speaker === 'agent'
                    ? 'bg-white border border-brand-100 dark:bg-slate-900 dark:border-brand-900/30 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    : 'bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tr-none'}
                  ${msg.highlight ? 'ring-2 ring-amber-100 dark:ring-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10' : ''}
                  ${msg.isFinal === false ? 'opacity-70 animate-pulse' : ''}
                `}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div className="h-8"></div>
          </div>

          {/* Scroll to bottom button */}
          {!autoScroll && (
            <button
              onClick={() => setAutoScroll(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-4 py-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors z-10"
            >
              הודעות חדשות ↓
            </button>
          )}
        </div>

        {/* Existing AI Coach Feed (Separate) */}
        <div className="h-[25%] min-h-[160px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">תובנות בזמן אמת (Live Feed)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400">מחובר</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {coachSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="flex gap-3 items-start animate-in slide-in-from-bottom-2 duration-300 group">
                <div className={`
                    w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
                    ${suggestion.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                    suggestion.type === 'tip' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}
                  `}>
                  <Sparkles className="w-3 h-3" />
                </div>
                <div className="flex flex-col gap-1 max-w-2xl">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                    {suggestion.text}
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-brand-600 dark:text-brand-400 underline mr-auto">
                  יישם
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW: Bottom Input Bar Trigger (Always Visible) */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950 flex-shrink-0 z-10">
        <div className="relative max-w-3xl mx-auto w-full">
          <input
            type="text"
            placeholder="בקש עזרה מהמאמן…"
            className="w-full pl-12 pr-12 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 outline-none transition-all shadow-sm"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            onClick={() => setIsCoachChatOpen(true)}
          />
          <button
            onClick={handleSendMessage}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            {isCoachChatOpen ? <Send className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <Bot className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
        </div>
      </div>

      {/* NEW: Coach Chat Drawer (Bottom Sheet) */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-all duration-300 ease-in-out z-30 flex flex-col
        ${isCoachChatOpen ? 'h-[50%] opacity-100' : 'h-0 opacity-0 pointer-events-none'}
        `}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">צ׳אט עם המאמן</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">שאלות ותשובות שלא מתערבבות עם התובנות החיות</p>
            </div>
          </div>
          <button
            onClick={() => setIsCoachChatOpen(false)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages Area */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-slate-900">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
              {/* 
                           RTL Logic:
                           justify-start = Right (User)
                           justify-end = Left (AI)
                        */}
              <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative animate-in zoom-in-95 duration-200 ${msg.sender === 'user'
                ? 'bg-purple-50 border border-purple-100 text-purple-900 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-100 rounded-br-none'
                : 'bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded-bl-none flex items-start gap-3'
                }`}>
                {msg.sender === 'ai' && <Bot className="w-4 h-4 mt-0.5 text-purple-500 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input inside Drawer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="relative max-w-3xl mx-auto w-full">
            <input
              type="text"
              placeholder="בקש עזרה מהמאמן…"
              className="w-full pl-12 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              autoFocus={isCoachChatOpen}
            />
            <button
              onClick={handleSendMessage}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
            <Bot className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
          </div>
        </div>
      </div>

    </div>
  );
};
