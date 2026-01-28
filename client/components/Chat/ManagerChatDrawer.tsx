import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { X, Send, Paperclip, Phone, Check, CheckCheck, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../../src/lib/supabaseClient';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  context_type?: string;
  context_id?: string;
  context_label?: string;
}

interface ManagerProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

interface ManagerChatDrawerProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  activeContext?: { type: 'call'; id: string; label: string; subLabel: string } | null;
  orgId?: string;
}

export const ManagerChatDrawer: React.FC<ManagerChatDrawerProps> = ({
  currentUser,
  isOpen,
  onClose,
  activeContext,
  orgId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [manager, setManager] = useState<ManagerProfile | null>(null);
  const [noPartnerFound, setNoPartnerFound] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find the chat partner (manager for reps, or first rep for managers)
  useEffect(() => {
    const fetchChatPartner = async () => {
      if (!orgId || !currentUser?.id) {
        console.log('[Chat] Missing orgId or currentUser:', { orgId, currentUser });
        return;
      }

      try {
        // First, check if current user is a manager
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        const isManager = ['sales_manager', 'manager', 'admin'].includes(myProfile?.role || '');
        console.log('[Chat] Current user role:', myProfile?.role, 'isManager:', isManager);

        let query;
        if (isManager) {
          // Manager wants to chat with reps - find first rep
          query = supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('organization_id', orgId)
            .eq('role', 'rep')
            .limit(1);
        } else {
          // Rep wants to chat with manager
          query = supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('organization_id', orgId)
            .in('role', ['sales_manager', 'manager', 'admin'])
            .neq('id', currentUser.id)
            .limit(1);
        }

        const { data, error } = await query.single();

        console.log('[Chat] Found chat partner:', data, 'error:', error);

        if (data && !error) {
          setManager(data);
        } else {
          // Fallback: just find anyone else in the org
          const { data: fallback } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('organization_id', orgId)
            .neq('id', currentUser.id)
            .limit(1)
            .single();

          console.log('[Chat] Fallback partner:', fallback);
          if (fallback) {
            setManager(fallback);
          } else {
            setNoPartnerFound(true);
          }
        }
      } catch (err) {
        console.error('[Chat] Failed to fetch chat partner:', err);
        setNoPartnerFound(true);
      }
    };

    fetchChatPartner();
  }, [orgId, currentUser?.id]);

  // Fetch existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!isOpen || !manager?.id || !currentUser?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${manager.id}),and(sender_id.eq.${manager.id},recipient_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark incoming messages as read
        const unreadIds = (data || [])
          .filter(m => m.recipient_id === currentUser.id && !m.is_read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }

      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [isOpen, manager?.id, currentUser?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!isOpen || !manager?.id || !currentUser?.id) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if it's from our manager
          if (newMsg.sender_id === manager.id) {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read immediately since drawer is open
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, manager?.id, currentUser?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !manager?.id || !currentUser?.id || !orgId) return;

    setSending(true);
    const messageContent = input.trim();
    setInput('');

    try {
      const newMessage = {
        sender_id: currentUser.id,
        recipient_id: manager.id,
        content: messageContent,
        organization_id: orgId,
        is_read: false,
        context_type: activeContext?.type || null,
        context_id: activeContext?.id || null,
        context_label: activeContext?.label || null
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore input on error
      setInput(messageContent);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'היום';
    if (date.toDateString() === yesterday.toDateString()) return 'אתמול';
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const dateKey = new Date(msg.created_at).toDateString();
    const existing = groupedMessages.find(g => g.date === dateKey);
    if (existing) {
      existing.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

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
              {manager?.avatar_url ? (
                <img src={manager.avatar_url} alt={manager.full_name} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                  {manager?.full_name?.charAt(0) || 'M'}
                </div>
              )}
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {manager?.full_name || 'המנהל שלך'}
              </h2>
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
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : noPartnerFound ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-2">אין משתמש אחר בארגון</p>
              <p className="text-xs text-slate-400 max-w-[250px]">
                כדי להשתמש בצ'אט, צריך להוסיף מנהל או נציג מכירות נוסף לארגון דרך הגדרות המערכת.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">עדיין אין הודעות</p>
              <p className="text-xs text-slate-400 mt-1">שלח הודעה למנהל שלך</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    {formatDate(group.messages[0].created_at)}
                  </div>
                </div>

                {group.messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'} mb-3`}>
                      <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                        {msg.context_label && (
                          <div className={`mb-1 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 w-fit ${isMe ? 'bg-white border-brand-100 text-brand-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <MessageSquare className="w-3 h-3" />
                            הקשר: {msg.context_label}
                          </div>
                        )}
                        <div className={`
                              px-4 py-2.5 rounded-2xl text-sm shadow-sm relative
                              ${isMe
                            ? 'bg-brand-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}
                           `}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                          {formatTime(msg.created_at)}
                          {isMe && (
                            msg.is_read ? <CheckCheck className="w-3 h-3 text-brand-500" /> : <Check className="w-3 h-3" />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
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
              onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
              placeholder="כתוב הודעה למנהל..."
              disabled={sending}
              className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-900 dark:text-white placeholder-slate-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

export default ManagerChatDrawer;
