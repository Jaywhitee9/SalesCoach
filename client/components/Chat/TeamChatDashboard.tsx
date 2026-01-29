import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, User } from '../../types';
import { Search, Send, Paperclip, Check, CheckCheck, MessageSquare, Phone, MoreVertical, Star, Loader2, Bell, BellRing } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface TeamMember {
   id: string;
   full_name: string;
   email: string;
   avatar_url: string | null;
   role: string;
   status: string;
   unreadCount: number;
   lastMessageTime: string | null;
   lastMessageContent: string | null;
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
   const [searchQuery, setSearchQuery] = useState('');
   const [totalUnread, setTotalUnread] = useState(0);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const audioRef = useRef<HTMLAudioElement | null>(null);

   // Create notification sound
   useEffect(() => {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT0jUY292p2PbDArQJPY88mtbzAWOnHT+ei0cDAKM2LQ/++3dDAHLVnN/vK8djEFJ1DE/vXHfDcEIkq+/fjQhD8GG0K1/tn/kEkJF0Cw/dD+l1EUR7j9xf+fXh9esy78vv+mZyZYq0L7tv+uc0o=');
   }, []);

   // Fetch Team Members with unread counts
   const fetchTeamWithUnread = useCallback(async () => {
      if (!currentUser?.organization_id || !currentUser?.id) {
         setLoadingTeam(false);
         return;
      }

      try {
         // Get team members
         const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, role')
            .eq('organization_id', currentUser.organization_id)
            .neq('id', currentUser.id);

         if (profileError) throw profileError;
         if (!profiles) return;

         // Get unread counts and last messages for each member
         const membersWithData = await Promise.all(
            profiles.map(async (profile: any) => {
               // Get unread count
               const { count: unreadCount } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('sender_id', profile.id)
                  .eq('recipient_id', currentUser.id)
                  .eq('is_read', false);

               // Get last message
               const { data: lastMsg } = await supabase
                  .from('messages')
                  .select('content, created_at')
                  .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${currentUser.id})`)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

               return {
                  ...profile,
                  status: 'offline',
                  unreadCount: unreadCount || 0,
                  lastMessageTime: lastMsg?.created_at || null,
                  lastMessageContent: lastMsg?.content || null
               };
            })
         );

         // Sort: unread first, then by last message time
         const sorted = membersWithData.sort((a, b) => {
            // First priority: unread messages
            if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
            if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

            // Second priority: last message time (most recent first)
            if (a.lastMessageTime && b.lastMessageTime) {
               return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
            }
            if (a.lastMessageTime) return -1;
            if (b.lastMessageTime) return 1;

            // Fallback: alphabetical
            return a.full_name.localeCompare(b.full_name);
         });

         setTeamMembers(sorted);

         // Calculate total unread
         const total = sorted.reduce((sum, m) => sum + m.unreadCount, 0);
         setTotalUnread(total);

         // Auto-select first if none selected
         if (sorted.length > 0 && !selectedRepId) {
            setSelectedRepId(sorted[0].id);
         }
      } catch (err) {
         console.error('Error fetching team:', err);
      } finally {
         setLoadingTeam(false);
      }
   }, [currentUser?.organization_id, currentUser?.id, selectedRepId]);

   // Initial fetch
   useEffect(() => {
      setLoadingTeam(true);
      fetchTeamWithUnread();
   }, [fetchTeamWithUnread]);

   // Global realtime subscription for ALL incoming messages
   useEffect(() => {
      if (!currentUser?.id) return;

      const globalChannel = supabase
         .channel(`global-chat-${currentUser.id}`)
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

               // Play notification sound
               if (audioRef.current) {
                  audioRef.current.play().catch(() => { });
               }

               // Update unread count for sender
               setTeamMembers(prev => {
                  const updated = prev.map(m => {
                     if (m.id === newMsg.sender_id) {
                        return {
                           ...m,
                           unreadCount: m.id === selectedRepId ? m.unreadCount : m.unreadCount + 1,
                           lastMessageTime: newMsg.created_at,
                           lastMessageContent: newMsg.content
                        };
                     }
                     return m;
                  });

                  // Re-sort
                  return updated.sort((a, b) => {
                     if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                     if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
                     if (a.lastMessageTime && b.lastMessageTime) {
                        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
                     }
                     return 0;
                  });
               });

               // Update total unread
               if (newMsg.sender_id !== selectedRepId) {
                  setTotalUnread(prev => prev + 1);
               }

               // If this is from the selected chat, add to messages
               if (newMsg.sender_id === selectedRepId) {
                  const uiMsg: ChatMessage = {
                     id: newMsg.id,
                     senderId: newMsg.sender_id,
                     text: newMsg.content,
                     timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                     isRead: false
                  };
                  setMessages(prev => [...prev, uiMsg]);
                  // Mark as read immediately
                  supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
               }
            }
         )
         .subscribe();

      return () => {
         supabase.removeChannel(globalChannel);
      };
   }, [currentUser?.id, selectedRepId]);

   const activeRep = teamMembers.find(u => u.id === selectedRepId);

   // Fetch Messages when selecting a rep
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

                  // Update local state
                  setTeamMembers(prev => prev.map(m =>
                     m.id === selectedRepId ? { ...m, unreadCount: 0 } : m
                  ));
                  setTotalUnread(prev => Math.max(0, prev - unreadIds.length));
               }
            }
         } catch (err) {
            console.error('Error fetching messages:', err);
         } finally {
            setLoading(false);
         }
      };

      fetchMessages();
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
      setInput('');

      // Optimistic UI
      const newMessage: ChatMessage = {
         id: tempId,
         senderId: currentUser.id,
         text: text,
         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
         isRead: false
      };
      setMessages(prev => [...prev, newMessage]);

      // Update last message in team list
      setTeamMembers(prev => {
         const updated = prev.map(m =>
            m.id === selectedRepId
               ? { ...m, lastMessageTime: new Date().toISOString(), lastMessageContent: text }
               : m
         );
         return updated.sort((a, b) => {
            if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
            if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
            if (a.lastMessageTime && b.lastMessageTime) {
               return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
            }
            return 0;
         });
      });

      try {
         await supabase
            .from('messages')
            .insert({
               sender_id: currentUser.id,
               recipient_id: selectedRepId,
               content: text,
               organization_id: currentUser.organization_id
            });
      } catch (err) {
         console.error('Error sending message:', err);
      }
   };

   // Filter team members by search
   const filteredMembers = teamMembers.filter(m =>
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase())
   );

   // Format relative time
   const formatRelativeTime = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'עכשיו';
      if (minutes < 60) return `לפני ${minutes} דק'`;
      if (hours < 24) return `לפני ${hours} ש'`;
      if (days < 7) return `לפני ${days} ימים`;
      return date.toLocaleDateString('he-IL');
   };

   return (
      <div className="flex flex-1 h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

         {/* 1. Left List (RTL visual right) */}
         <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">צ'אט צוות</h2>
                  {totalUnread > 0 && (
                     <div className="flex items-center gap-2 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
                        <BellRing className="w-3.5 h-3.5" />
                        <span>{totalUnread} חדשות</span>
                     </div>
                  )}
               </div>
               <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                     type="text"
                     placeholder="חפש נציג..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
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
               ) : filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                     <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                     <p>אין חברי צוות</p>
                  </div>
               ) : (
                  filteredMembers.map(rep => {
                     const isSelected = selectedRepId === rep.id;
                     const hasUnread = rep.unreadCount > 0;

                     return (
                        <div
                           key={rep.id}
                           onClick={() => setSelectedRepId(rep.id)}
                           className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-brand-50/50 dark:bg-brand-900/10 border-r-4 border-r-brand-500' : 'border-r-4 border-r-transparent'} ${hasUnread ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                        >
                           <div className="relative">
                              <img
                                 src={rep.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rep.full_name)}&background=6366f1&color=fff`}
                                 alt={rep.full_name}
                                 className="w-11 h-11 rounded-full border-2 border-slate-200 dark:border-slate-700"
                              />
                              {hasUnread && (
                                 <span className="absolute -top-1 -left-1 min-w-[20px] h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-bounce">
                                    {rep.unreadCount}
                                 </span>
                              )}
                              <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${rep.role === 'manager' || rep.role === 'sales_manager' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                 <h3 className={`text-sm font-bold truncate ${hasUnread ? 'text-slate-900 dark:text-white' : isSelected ? 'text-brand-900 dark:text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                                    {rep.full_name}
                                 </h3>
                                 {rep.lastMessageTime && (
                                    <span className={`text-[10px] ${hasUnread ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                                       {formatRelativeTime(rep.lastMessageTime)}
                                    </span>
                                 )}
                              </div>
                              <p className={`text-xs truncate pr-1 ${hasUnread ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                 {rep.lastMessageContent || ((rep.role === 'manager' || rep.role === 'sales_manager') ? 'מנהל מכירות' : 'נציג מכירות')}
                              </p>
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
                     <img
                        src={activeRep.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRep.full_name)}&background=6366f1&color=fff`}
                        alt={activeRep.full_name}
                        className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700"
                     />
                     <div className="flex flex-col">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeRep.full_name}</h2>
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
               {loading ? (
                  <div className="flex items-center justify-center h-full">
                     <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  </div>
               ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                     <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                     <p>אין הודעות עדיין. תגיד שלום! 👋</p>
                  </div>
               ) : (
                  messages.map((msg, idx) => {
                     const isMe = msg.senderId === currentUser?.id;

                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
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
