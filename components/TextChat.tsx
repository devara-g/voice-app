'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Send, Hash } from 'lucide-react';

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
  };
}

// Data tambahan untuk profile
interface UserProfile {
  email: string;
  display_name: string;
  avatar_url: string | null;
}

interface TextChatProps {
  channelId: string;
  channelName: string;
  currentUserId: string;
}

export default function TextChat({ channelId, channelName, currentUserId }: TextChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch profiles given userIds
  const fetchProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      const res = await fetch('/api/users/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles((prev) => ({ ...prev, ...data.profiles }));
      }
    } catch (err) {
      console.error('Error fetching profiles', err);
    }
  };

  // Load history and setup subscription
  useEffect(() => {
    // Setup Realtime synchronously so cleanup works immediately
    const channel = supabase
      .channel(`public:messages:channel_id=eq.${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          // Fetch profile for the new message
          await fetchProfiles([newMessage.user_id]);
          scrollToBottom();
        }
      )
      .subscribe();

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages?channel_id=${channelId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);

          // Get unique user IDs to fetch profiles
          const uniqueUserIds = Array.from(new Set(data.messages.map((m: Message) => m.user_id)));
          await fetchProfiles(uniqueUserIds as string[]);
        }
      } catch (err) {
        console.error('Error loading messages', err);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    };

    loadMessages();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, profiles]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          user_id: currentUserId,
          content,
        }),
      });
      if (!res.ok) {
        console.error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const PRESET_GRADIENTS: Record<string, string> = {
    'preset:pink': 'from-pink-500 to-rose-500',
    'preset:purple': 'from-purple-500 to-indigo-500',
    'preset:blue': 'from-blue-500 to-cyan-500',
    'preset:emerald': 'from-emerald-500 to-teal-500',
    'preset:orange': 'from-orange-500 to-amber-500',
  };

  const getGradient = (name: string) => {
    const gradients = Object.values(PRESET_GRADIENTS);
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  return (
    <div className="flex-1 flex min-h-0 flex-col bg-[#313338] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent" />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 md:px-6">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center pl-4 md:pl-10 lg:pl-16">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex max-w-md flex-col items-center justify-center rounded-3xl border border-white/6 bg-white/[0.03] px-8 py-10 text-center text-zinc-400 shadow-[0_16px_60px_rgba(0,0,0,0.2)] backdrop-blur-sm">
                <Hash className="mb-4 h-16 w-16 rounded-full bg-zinc-700/50 p-3 text-zinc-200" />
                <h3 className="mb-2 text-xl font-bold text-white">Selamat datang di #{channelName}!</h3>
                <p className="text-sm leading-relaxed">Ini adalah awal dari channel {channelName}.</p>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-1.5 py-2">
              {messages.map((msg, index) => {
                const prevMsg = messages[index - 1];
                const isConsecutive = prevMsg && prevMsg.user_id === msg.user_id &&
                  (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000);

                const profile = profiles[msg.user_id];
                const displayName = profile?.display_name || 'Unknown';
                const avatarUrl = profile?.avatar_url;
                const isPreset = avatarUrl?.startsWith('preset:');

                return (
                  <div
                    key={msg.id}
                    className={`group flex gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.025] ${isConsecutive ? 'mt-0' : 'mt-2'}`}
                  >
                    {!isConsecutive ? (
                      <div className="flex-shrink-0 pt-0.5">
                        {isPreset || !avatarUrl ? (
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${isPreset ? PRESET_GRADIENTS[avatarUrl || ''] || getGradient(displayName) : getGradient(displayName)} flex items-center justify-center text-white font-bold shadow-lg shadow-black/10`}>
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover shadow-lg shadow-black/10" />
                        )}
                      </div>
                    ) : (
                      <div className="w-10 flex-shrink-0 pt-1 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-zinc-500">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                      {!isConsecutive && (
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-white hover:underline cursor-pointer">{displayName}</span>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      )}
                      <div className="mt-0.5 text-[15px] leading-6 text-zinc-200 whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-white/5 bg-[#313338]/95 px-4 py-4 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="relative mx-auto flex w-full max-w-3xl items-center pl-4 md:pl-10 lg:pl-16">
          <div className="flex w-full items-center rounded-2xl border border-white/8 bg-[#383a40] shadow-[0_8px_24px_rgba(0,0,0,0.18)] focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/15 transition">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Kirim pesan ke #${channelName}`}
              className="w-full bg-transparent px-4 py-3.5 text-zinc-100 placeholder-zinc-500 outline-none"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
