
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../../types';
import { MOCK_CHATS, MANAGER_USER } from '../../constants';
import { X, Send, Paperclip, Phone, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { Button } from '../Common/Button';

interface ManagerChatDrawerProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  activeContext?: { type: 'call'; id: string; label: string; subLabel: string } | null;
}

export const ManagerChatDrawer: React.FC<ManagerChatDrawerProps> = ({ currentUser, isOpen, onClose, activeContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat on open
  useEffect(() => {
    if (isOpen) {
      const myChat = MOCK_CHATS.find(c => c.repId === currentUser.id);
      if (myChat) {
        setMessages(myChat.messages);
      }
    }
  }, [isOpen, currentUser.id]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      context: activeContext ? { ...activeContext } : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Simulate quick reply if first message
    if (messages.length < 2) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          senderId: MANAGER_USER.id,
          text: 'קיבלתי, אני בודק את זה.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: true
        }]);
      }, 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="relative">
               <img src={MANAGER_USER.avatar} alt={MANAGER_USER.name} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
               <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
             </div>
             <div>
               <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{MANAGER_USER.name}</h2>
               <p className="text-xs text-slate-500 dark:text-slate-400">מנהל מכירות • מחובר</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
           {/* Context Banner */}
           {activeContext && (
             <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 px-4 py-3 bg-brand-50/95 dark:bg-brand-900/40 backdrop-blur-sm border-b border-brand-100 dark:border-brand-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-sm text-brand-600 dark:text-brand-400">
                     <Phone className="w-3.5 h-3.5" />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-brand-900 dark:text-brand-100">שיחה פעילה: {activeContext.label}</p>
                     <p className="text-[10px] text-brand-700 dark:text-brand-300">{activeContext.subLabel}</p>
                   </div>
                </div>
                <button className="text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline">פרטים</button>
             </div>
           )}

           {messages.map((msg, idx) => {
             const isMe = msg.senderId === currentUser.id;
             return (
               <div key={idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                  {/* Note: RTL means justify-start is RIGHT (Me) and justify-end is LEFT (Other) if dir=rtl is set on body. 
                      However, Tailwind flex classes follow logical direction usually but visual LTR in code.
                      Let's stick to explicit visual: 
                      If RTL: 
                        Me (Right) -> margin-right: auto (No, flex-start is right in RTL)
                        Wait, standard flex row in RTL:
                        start = right. end = left.
                        So: isMe ? 'justify-start' (Right) : 'justify-end' (Left).
                  */}
                  <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                     {msg.context && (
                        <div className={`mb-1 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 w-fit ${isMe ? 'bg-white border-brand-100 text-brand-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                           <MessageSquare className="w-3 h-3" />
                           הקשר: {msg.context.label}
                        </div>
                     )}
                     <div className={`
                        px-4 py-2.5 rounded-2xl text-sm shadow-sm relative
                        ${isMe 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}
                     `}>
                        {msg.text}
                     </div>
                     <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                       {msg.timestamp}
                       {isMe && (
                         msg.isRead ? <CheckCheck className="w-3 h-3 text-brand-500" /> : <Check className="w-3 h-3" />
                       )}
                     </span>
                  </div>
               </div>
             );
           })}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="כתוב הודעה למנהל..."
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-900 dark:text-white placeholder-slate-400"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" /> {/* Optical balance for RTL icon */}
              </button>
           </div>
        </div>

      </div>
    </>
  );
};
