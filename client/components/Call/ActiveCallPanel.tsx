import React, { useState, useEffect, useRef } from 'react';
import { Message, CoachSuggestion } from '../../types';
import { Mic, MicOff, PhoneOff, PauseCircle, PlayCircle, Send, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../Common/Button';
import { useCall } from '../../src/context/CallContext';
import { LivePlaybook } from './LivePlaybook';
import { useOrganizationSettings } from '../../src/hooks/useOrganizationSettings';

interface ActiveCallPanelProps {
  transcript: Message[];
  coachSuggestions: CoachSuggestion[];
  onEndCall?: () => void;
  orgId?: string;
}

export const ActiveCallPanel: React.FC<ActiveCallPanelProps> = ({
  transcript,
  coachSuggestions,
  onEndCall,
  orgId
}) => {
  const { isMuted, toggleMute, callDuration, activeCall } = useCall();
  const { settings } = useOrganizationSettings(orgId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);

  // Playbook Stage State
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle hold
  const toggleHold = () => {
    setIsOnHold(!isOnHold);
    if (activeCall) {
      activeCall.mute(!isOnHold);
    }
    console.log(`[ActiveCallPanel] Hold toggled: ${!isOnHold ? 'ON HOLD' : 'RESUMED'}`);
  };

  // Chat Drawer State (Interactive Help)
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: string, sender: 'user' | 'ai', text: string }[]>([
    { id: 'welcome', sender: 'ai', text: 'אני כאן לעזרה נוספת אם תצטרך.' }
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, autoScroll]);

  // Scroll Chat to bottom
  useEffect(() => {
    if (isCoachChatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isCoachChatOpen]);

  // Handle User Chat
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newUserMsg = { id: Date.now().toString(), sender: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput("");

    if (!isCoachChatOpen) setIsCoachChatOpen(true);

    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'קיבלתי. בודק לך את הנושא מיד...'
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-slate-950 min-w-0 relative overflow-hidden h-full">

      {/* 1. Header Controls */}
      <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center gap-2 px-3 py-1 rounded-full ${isOnHold ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'} transition-colors`}>
            <div className={`w-2 h-2 rounded-full ${isOnHold ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`}></div>
            <span className="font-mono font-medium text-sm">
              {formatDuration(callDuration)}
            </span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {isOnHold ? 'שיחה בהמתנה' : 'שיחה פעילה'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleHold}
            variant="ghost"
            size="icon"
            className={`${isOnHold ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-slate-600'}`}
            title={isOnHold ? 'המשך לוח' : 'שים בהמתנה'}
          >
            {isOnHold ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
          </Button>
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className={`${isMuted ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-400 hover:text-slate-600'}`}
            title={isMuted ? 'בטל השתקה' : 'השתק מיקרופון'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            onClick={() => onEndCall && onEndCall()}
            variant="danger"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
          >
            <PhoneOff className="w-4 h-4 ml-2" />
            סיום שיחה
          </Button>
        </div>
      </div>

      {/* 2. Main Content Area (Split View) */}
      <div className="flex-1 flex min-h-0 relative">

        {/* Right Sidebar: Sales Copilot / Playbook (RTL: Visually Right = First Child) */}
        <div className="w-96 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10 shadow-lg">
          <LivePlaybook
            stages={settings?.stages_config || []}
            currentStageIdx={currentStageIdx}
            setStageIdx={setCurrentStageIdx}
            suggestions={coachSuggestions}
          />
        </div>

        {/* Center: Transcript */}
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 relative flex flex-col min-w-0">

          <div
            ref={scrollRef}
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              const isBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50;
              if (!isBottom) setAutoScroll(false);
              else setAutoScroll(true);
            }}
            className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
          >
            {transcript.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.speaker === 'agent' ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full group`}
              >
                <div className="flex items-baseline gap-2 mb-1.5 px-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className={`text-xs font-bold uppercase tracking-wider ${msg.speaker === 'agent' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
                    {msg.speaker === 'agent' ? 'אני (נציג)' : 'לקוח'}
                  </span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                    {msg.timestamp}
                  </span>
                </div>

                <div className={`
                  relative max-w-[90%] md:max-w-[85%] px-6 py-4 rounded-2xl text-base leading-relaxed shadow-sm transition-all duration-200
                  ${msg.speaker === 'agent'
                    ? 'bg-white border border-brand-100 dark:bg-slate-900 dark:border-brand-900/30 text-slate-800 dark:text-slate-200 rounded-tl-none hover:border-brand-300'
                    : 'bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tr-none hover:border-slate-300'}
                  ${msg.highlight ? 'ring-2 ring-amber-100 dark:ring-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10' : ''}
                  ${msg.isFinal === false ? 'opacity-70 animate-pulse' : ''}
                `}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div className="h-12"></div>
          </div>

          {!autoScroll && (
            <button
              onClick={() => setAutoScroll(true)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-4 py-2 rounded-full shadow-lg hover:bg-slate-700 transition-all z-20 animate-in fade-in slide-in-from-bottom-2"
            >
              הודעות חדשות ↓
            </button>
          )}

        </div>
      </div>

      {/* 3. Helper Chat Drawer (Overlay) */}
      {/* Collapsed Button Trigger */}
      {!isCoachChatOpen && (
        <button
          onClick={() => setIsCoachChatOpen(true)}
          className="absolute bottom-4 left-6 z-30 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 hover:scale-105 transition-all flex items-center gap-2"
          title="עזרה מהמאמן"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-bold pr-1">צ'אט עוזר</span>
        </button>
      )}

      <div
        className={`absolute bottom-0 left-6 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-t-xl transition-all duration-300 ease-in-out z-40 flex flex-col
        ${isCoachChatOpen ? 'h-[400px] opacity-100 translate-y-0' : 'h-0 opacity-0 translate-y-10 pointer-events-none'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-900/10 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-900 dark:text-purple-100">צ'אט מהיר</span>
          </div>
          <button onClick={() => setIsCoachChatOpen(false)} className="text-slate-400 hover:text-slate-600">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${msg.sender === 'user'
                  ? 'bg-purple-100 text-purple-900 rounded-br-none'
                  : 'bg-slate-100 text-slate-700 rounded-bl-none'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="שאל שאלה..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
