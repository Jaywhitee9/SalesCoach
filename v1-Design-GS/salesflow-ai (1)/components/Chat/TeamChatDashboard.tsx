
import React, { useState } from 'react';
import { ChatThread, ChatMessage, User } from '../../types';
import { MOCK_CHATS, TEAM_MEMBERS, MOCK_REP_TARGETS } from '../../constants';
import { Search, Send, Paperclip, Check, CheckCheck, MessageSquare, Phone, MoreVertical, Star } from 'lucide-react';
import { Badge } from '../Common/Badge';

interface TeamChatDashboardProps {
  isDarkMode: boolean;
}

export const TeamChatDashboard: React.FC<TeamChatDashboardProps> = ({ isDarkMode }) => {
  const [selectedRepId, setSelectedRepId] = useState<string>(MOCK_CHATS[0].repId);
  const [input, setInput] = useState('');

  const activeThread = MOCK_CHATS.find(c => c.repId === selectedRepId) || MOCK_CHATS[0];
  const activeRep = TEAM_MEMBERS.find(u => u.id === selectedRepId);
  const activeRepStats = MOCK_REP_TARGETS.find(t => t.userId === selectedRepId);

  // Mock messages state for the active thread
  // In a real app, this would be global state or fetched
  const [threadMessages, setThreadMessages] = useState<Record<string, ChatMessage[]>>(
    MOCK_CHATS.reduce((acc, chat) => ({ ...acc, [chat.repId]: chat.messages }), {})
  );

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'u2', // Manager ID
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    setThreadMessages(prev => ({
      ...prev,
      [selectedRepId]: [...(prev[selectedRepId] || []), newMessage]
    }));
    setInput('');
  };

  const currentMessages = threadMessages[selectedRepId] || [];

  return (
    <div className="flex flex-1 h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* 1. Left List (RTL visual right) */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col">
         {/* Header */}
         <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">צ'אט צוות</h2>
            <div className="relative">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="חפש נציג..." 
                 className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-500"
               />
            </div>
         </div>

         {/* List */}
         <div className="flex-1 overflow-y-auto">
            {MOCK_CHATS.map(chat => {
               const rep = TEAM_MEMBERS.find(u => u.id === chat.repId);
               if (!rep) return null;
               const isSelected = selectedRepId === rep.id;
               
               return (
                 <div 
                   key={chat.id}
                   onClick={() => setSelectedRepId(rep.id)}
                   className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-brand-50/50 dark:bg-brand-900/10 border-r-4 border-r-brand-500' : 'border-r-4 border-r-transparent'}`}
                 >
                    <div className="relative">
                       <img src={rep.avatar} alt={rep.name} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
                       <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline mb-1">
                          <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-brand-900 dark:text-white' : 'text-slate-900 dark:text-slate-200'}`}>{rep.name}</h3>
                          <span className="text-[10px] text-slate-400">{chat.lastMessageTime}</span>
                       </div>
                       <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-1">{chat.lastMessage}</p>
                    </div>
                    {chat.unreadCount > 0 && (
                       <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {chat.unreadCount}
                       </div>
                    )}
                 </div>
               );
            })}
         </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-950">
         
         {/* Context Header */}
         <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-4">
               {activeRep && (
                 <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeRep.name}</h2>
                    <span className="h-4 w-px bg-slate-200 dark:bg-slate-700"></span>
                    <span className="text-xs text-slate-500">{activeRep.role}</span>
                 </div>
               )}
               
               {activeRepStats && (
                 <div className="hidden lg:flex items-center gap-3 mr-4">
                    <Badge variant="neutral" className="border border-slate-200 dark:border-slate-700 font-normal">
                       שיחות היום: {activeRepStats.calls.current} / {activeRepStats.calls.target}
                    </Badge>
                    <Badge variant={activeRepStats.productivityScore > 80 ? 'success' : 'warning'} className="border border-transparent font-normal">
                       ציון פריון: {activeRepStats.productivityScore}
                    </Badge>
                 </div>
               )}
            </div>
            
            <div className="flex items-center gap-2">
               <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <Phone className="w-4 h-4" />
               </button>
               <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <Star className="w-4 h-4" />
               </button>
               <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <MoreVertical className="w-4 h-4" />
               </button>
            </div>
         </div>

         {/* Messages */}
         <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentMessages.map((msg, idx) => {
               const isMe = msg.senderId === 'u2'; // Manager
               
               return (
                  <div key={idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                     <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                        {msg.context && (
                           <div className={`mb-1 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 w-fit ${isMe ? 'bg-white border-slate-200 text-slate-600' : 'bg-white border-brand-100 text-brand-700'}`}>
                              <MessageSquare className="w-3 h-3" />
                              הקשר: {msg.context.label}
                           </div>
                        )}
                        <div className={`
                           px-4 py-3 rounded-2xl text-sm shadow-sm relative leading-relaxed
                           ${isMe 
                             ? 'bg-brand-600 text-white rounded-tr-none' 
                             : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}
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
         </div>

         {/* Input */}
         <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
               <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors mb-0.5">
                 <Paperclip className="w-4 h-4" />
               </button>
               <textarea 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSend();
                    }
                 }}
                 placeholder="כתוב הודעה..."
                 className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 resize-none max-h-32"
                 rows={1}
               />
               <button 
                 onClick={handleSend}
                 disabled={!input.trim()}
                 className="p-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mb-0.5"
               >
                 <Send className="w-4 h-4 ml-0.5" />
               </button>
            </div>
            
            {/* Quick Chips (Manager Only) */}
            <div className="max-w-4xl mx-auto mt-2 flex gap-2 overflow-x-auto pb-1">
               {['כל הכבוד! 👏', 'שים לב ליעד היומי', 'בוא נעשה זום קצר', 'איך הולך עם הליד הזה?'].map((tip, i) => (
                  <button 
                     key={i} 
                     onClick={() => setInput(tip)}
                     className="whitespace-nowrap text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                     {tip}
                  </button>
               ))}
            </div>
         </div>

      </div>
    </div>
  );
};
