import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User } from '../../types';
import { Search, Send, Paperclip, Check, CheckCheck, MessageSquare, Phone, MoreVertical, Star, Loader2 } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface TeamMember {
   id: string;
   full_name: string;
   email: string;
   avatar_url: string | null;
   role: string;
   status: string;
}

interface TeamChatDashboardProps {
   isDarkMode: boolean;
   currentUser?: User;
}

export const TeamChatDashboard: React.FC<TeamChatDashboardProps> = ({ isDarkMode, currentUser }) => {
   const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
   const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
   const [input, setInput] = useState('');
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [loading, setLoading] = useState(false);
   const [loadingTeam, setLoadingTeam] = useState(true);
   const messagesEndRef = useRef<HTMLDivElement>(null);

   // Fetch Team Members on mount
   useEffect(() => {
      if (!currentUser?.organization_id) {
         setLoadingTeam(false);
         return;
      }

      const fetchTeam = async () => {
         setLoadingTeam(true);
         try {
            const { data, error } = await supabase
               .from('profiles')
               .select('id, full_name, email, avatar_url, role')
               .eq('organization_id', currentUser.organization_id)
               .neq('id', currentUser.id);

            if (error) throw error;

            if (data) {
               const members = data.map((m: any) => ({
                  ...m,
                  status: 'offline' // You could implement online status later
               }));
               setTeamMembers(members);

               // Auto-select first team member if none selected
               if (members.length > 0 && !selectedRepId) {
                  setSelectedRepId(members[0].id);
               }
            }
         } catch (err) {
            console.error('Error fetching team:', err);
         } finally {
            setLoadingTeam(false);
         }
      };

      fetchTeam();
   }, [currentUser?.organization_id, currentUser?.id]);

   const activeRep = teamMembers.find(u => u.id === selectedRepId);

   // Fetch Messages & Subscribe
   useEffect(() => {
      if (!currentUser?.id || !selectedRepId) return;

      const fetchMessages = async () => {
         setLoading(true);
         try {
            const { data, error } = await supabase
               .from('messages')
               .select('*')
               .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedRepId}),and(sender_id.eq.${selectedRepId},recipient_id.eq.${currentUser.id})`)
               .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
               const uiMessages: ChatMessage[] = data.map((m: any) => ({
                  id: m.id,
                  senderId: m.sender_id,
                  text: m.content,
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isRead: m.is_read,
                  context: m.context_type ? { type: m.context_type, label: m.context_label || 'Context' } : undefined
               }));
               setMessages(uiMessages);

               // Mark as read
               const unreadIds = data
                  .filter((m: any) => m.sender_id === selectedRepId && !m.is_read)
                  .map((m: any) => m.id);

               if (unreadIds.length > 0) {
                  await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
               }
            }
         } catch (err) {
            console.error('Error fetching messages:', err);
         } finally {
            setLoading(false);
         }
      };

      fetchMessages();

      // Realtime Subscription
      const channel = supabase
         .channel(`chat-${currentUser.id}-${selectedRepId}`)
         .on(
            'postgres_changes',
            {
               event: 'INSERT',
               schema: 'public',
               table: 'messages',
               filter: `recipient_id=eq.${currentUser.id}`
            },
            (payload) => {
               const newMsg = payload.new;
               if (newMsg.sender_id === selectedRepId) {
                  const uiMsg: ChatMessage = {
                     id: newMsg.id,
                     senderId: newMsg.sender_id,
                     text: newMsg.content,
                     timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                     isRead: false
                  };
                  setMessages(prev => [...prev, uiMsg]);
                  // Mark read
                  supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
               }
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [selectedRepId, currentUser?.id]);

   // Scroll to bottom
   useEffect(() => {
      if (messagesEndRef.current) {
         messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
   }, [messages]);

   const handleSend = async () => {
      if (!input.trim() || !currentUser?.id || !selectedRepId) return;

      const tempId = Date.now().toString();
      const text = input;
      setInput(''); // Clear immediately

      // Optimistic UI
      const newMessage: ChatMessage = {
         id: tempId,
         senderId: currentUser.id,
         text: text,
         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         isRead: false
      };
      setMessages(prev => [...prev, newMessage]);

      try {
         const { data, error } = await supabase
            .from('messages')
            .insert({
               sender_id: currentUser.id,
               recipient_id: selectedRepId,
               content: text,
               organization_id: currentUser.organization_id
            })
            .select()
            .single();

         if (error) throw error;

         // Replace temp message with real one (optional, or just rely on re-fetch/update)
         // For simplicity we just leave the optimistic one unless we want to update ID/status
      } catch (err) {
         console.error('Error sending message:', err);
         // Ideally revert optimistic update here
      }
   };

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
               {loadingTeam ? (
                  <div className="flex items-center justify-center h-32 text-slate-400">
                     <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
               ) : teamMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                     <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                     <p>אין חברי צוות</p>
                  </div>
               ) : (
                  teamMembers.map(rep => {
                     const isSelected = selectedRepId === rep.id;

                     return (
                        <div
                           key={rep.id}
                           onClick={() => setSelectedRepId(rep.id)}
                           className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-brand-50/50 dark:bg-brand-900/10 border-r-4 border-r-brand-500' : 'border-r-4 border-r-transparent'}`}
                        >
                           <div className="relative">
                              <img
                                 src={rep.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rep.full_name)}&background=6366f1&color=fff`}
                                 alt={rep.full_name}
                                 className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
                              />
                              <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-2 border-white dark:border-slate-900 rounded-full ${rep.role === 'manager' || rep.role === 'sales_manager' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                 <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-brand-900 dark:text-white' : 'text-slate-900 dark:text-slate-200'}`}>{rep.full_name}</h3>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-1">{(rep.role === 'manager' || rep.role === 'sales_manager') ? 'מנהל מכירות' : 'נציג מכירות'}</p>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         </div>

         {/* 2. Main Chat Area */}
         <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-950">

            {/* Context Header */}
            <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm z-10">
               {activeRep ? (
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeRep.full_name}</h2>
                        <span className="h-4 w-px bg-slate-200 dark:bg-slate-700"></span>
                        <span className="text-xs text-slate-500">{(activeRep.role === 'manager' || activeRep.role === 'sales_manager') ? 'מנהל מכירות' : 'נציג מכירות'}</span>
                     </div>
                  </div>
               ) : (
                  <div></div>
               )}

               <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                     <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                     <MoreVertical className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                     <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                     <p>אין הודעות עדיין. תגיד שלום! 👋</p>
                  </div>
               ) : (
                  messages.map((msg, idx) => {
                     const isMe = msg.senderId === currentUser?.id;

                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                           <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
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
                  })
               )}
               <div ref={messagesEndRef} />
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
            </div>

         </div>
      </div>
   );
};
