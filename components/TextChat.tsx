'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Send, Hash, Reply, PencilLine, Trash2, X, Check, CornerDownRight } from 'lucide-react';
import { decodeMessageContent, MessageReplyMeta } from '@/lib/messageFormat';

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_meta?: MessageReplyMeta | null;
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, { displayName: string; avatarUrl: string | null; updatedAt: number }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingLocalRef = useRef(false);

  const normalizeMessage = (message: any): Message => {
    const decoded = decodeMessageContent(message.content || '');
    return {
      ...message,
      content: decoded.content,
      reply_meta: decoded.replyMeta,
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendTypingEvent = async (isTyping: boolean) => {
    const profile = profiles[currentUserId];
    await typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        channelId,
        userId: currentUserId,
        displayName: profile?.display_name || 'Unknown',
        avatarUrl: profile?.avatar_url || null,
        isTyping,
        updatedAt: Date.now(),
      },
    });
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
        'broadcast',
        { event: 'typing' },
        (payload) => {
          const data = payload.payload as {
            channelId?: string;
            userId?: string;
            displayName?: string;
            avatarUrl?: string | null;
            isTyping?: boolean;
            updatedAt?: number;
          };

          if (!data?.userId || data.userId === currentUserId || data.channelId !== channelId) return;

          if (data.isTyping) {
            setTypingUsers((prev) => ({
              ...prev,
              [data.userId as string]: {
                displayName: data.displayName || 'Unknown',
                avatarUrl: data.avatarUrl ?? null,
                updatedAt: data.updatedAt || Date.now(),
              },
            }));
          } else {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[data.userId as string];
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMessage = normalizeMessage(payload.new);
          setMessages((prev) => prev.some((message) => message.id === newMessage.id) ? prev : [...prev, newMessage]);
          // Fetch profile for the new message
          await fetchProfiles([newMessage.user_id]);
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updatedMessage = normalizeMessage(payload.new);
          setMessages((prev) => prev.map((message) => message.id === updatedMessage.id ? updatedMessage : message));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages((prev) => prev.filter((message) => message.id !== deletedMessage.id));
        }
      )
      .subscribe();

    typingChannelRef.current = channel;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages?channel_id=${channelId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages((data.messages || []).map(normalizeMessage));

          // Get unique user IDs to fetch profiles
          const uniqueUserIds = Array.from(new Set([...(data.messages || []).map((m: Message) => m.user_id), currentUserId]));
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
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, profiles]);

  useEffect(() => {
    const onTypingChange = async () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }

      if (!newMessage.trim()) {
        if (isTypingLocalRef.current) {
          isTypingLocalRef.current = false;
          await sendTypingEvent(false);
        }
        return;
      }

      if (!isTypingLocalRef.current) {
        isTypingLocalRef.current = true;
        await sendTypingEvent(true);
      } else {
        await sendTypingEvent(true);
      }

      typingStopTimerRef.current = setTimeout(() => {
        isTypingLocalRef.current = false;
        sendTypingEvent(false).catch((err) => {
          console.error('Error stopping typing indicator', err);
        });
      }, 1200);
    };

    onTypingChange().catch((err) => {
      console.error('Error broadcasting typing state', err);
    });
  }, [newMessage, channelId, currentUserId, profiles]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    const replyMeta = replyingTo
      ? {
          messageId: replyingTo.id,
          displayName: profiles[replyingTo.user_id]?.display_name || 'Unknown',
          content: replyingTo.content,
          avatarUrl: profiles[replyingTo.user_id]?.avatar_url || null,
          userId: replyingTo.user_id,
          createdAt: replyingTo.created_at,
        }
      : null;
    const editTarget = editingMessage;
    setNewMessage('');
    setReplyingTo(null);
    setEditingMessage(null);

    try {
      if (editTarget) {
        const editResponse = await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: editTarget.id,
            user_id: currentUserId,
            content,
            reply_meta: editTarget.reply_meta || null,
          }),
        });

        if (editResponse.ok) {
          const edited = await editResponse.json();
          const updatedMessage = normalizeMessage(edited.message);
          setMessages((prev) => prev.map((message) => message.id === updatedMessage.id ? updatedMessage : message));
        }
        return;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          user_id: currentUserId,
          content,
          reply_meta: replyMeta,
        }),
      });

      if (!res.ok) {
        console.error('Failed to send message');
      } else {
        const data = await res.json();
        const created = normalizeMessage(data.message);
        setMessages((prev) => prev.some((message) => message.id === created.id) ? prev : [...prev, created]);
        await fetchProfiles([created.user_id]);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    setNewMessage(message.content);
  };

  const handleDelete = async (message: Message) => {
    if (!window.confirm('Hapus pesan ini?')) return;
    setBusyMessageId(message.id);

    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: message.id, user_id: currentUserId }),
      });

      if (res.ok) {
        setMessages((prev) => prev.filter((item) => item.id !== message.id));
        if (editingMessage?.id === message.id) {
          setEditingMessage(null);
          setNewMessage('');
        }
        if (replyingTo?.id === message.id) {
          setReplyingTo(null);
        }
      }
    } finally {
      setBusyMessageId(null);
    }
  };

  const PRESET_GRADIENTS: Record<string, string> = {
    'preset:pink': 'bg-pink-500',
    'preset:purple': 'bg-purple-500',
    'preset:blue': 'bg-blue-500',
    'preset:emerald': 'bg-emerald-500',
    'preset:orange': 'bg-orange-500',
  };

  const getGradient = (name: string) => {
    const gradients = Object.values(PRESET_GRADIENTS);
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  const canManageMessage = (message: Message) => message.user_id === currentUserId;
  const typingPeople = Object.entries(typingUsers)
    .filter(([userId]) => userId !== currentUserId)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, 3)
    .map(([userId, data]) => ({ userId, ...data }));

  const renderTypingAvatar = (displayName: string, avatarUrl: string | null) => {
    const isPreset = avatarUrl?.startsWith('preset:');

    if (isPreset || !avatarUrl) {
      return (
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getGradient(displayName)} text-[11px] font-bold text-white shadow-sm ring-2 ring-[#313338]`}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      );
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover shadow-sm ring-2 ring-[#313338]" />;
  };

  const typingLabel = () => {
    if (typingPeople.length === 0) return '';
    if (typingPeople.length === 1) {
      return `${typingPeople[0].displayName} sedang mengetik`;
    }
    if (typingPeople.length === 2) {
      return `${typingPeople[0].displayName} dan ${typingPeople[1].displayName} sedang mengetik`;
    }
    return `${typingPeople[0].displayName}, ${typingPeople[1].displayName}, dan ${typingPeople.length - 2} lainnya sedang mengetik`;
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
                    className={`group relative flex gap-3 rounded-2xl px-3 py-2.5 pr-16 transition-colors hover:bg-white/[0.025] ${isConsecutive ? 'mt-0' : 'mt-2'}`}
                  >
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleReply(msg)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                      {canManageMessage(msg) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(msg)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
                            title="Edit"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg)}
                            disabled={busyMessageId === msg.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    {!isConsecutive ? (
                      <div className="flex-shrink-0 pt-0.5">
                        {isPreset || !avatarUrl ? (
                          <div className={`w-10 h-10 rounded-full ${isPreset ? PRESET_GRADIENTS[avatarUrl || ''] || getGradient(displayName) : getGradient(displayName)} flex items-center justify-center text-white font-bold shadow-lg shadow-black/10`}>
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
                      {msg.reply_meta && (
                        <div className="mt-1 mb-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-sm text-zinc-200">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                            <CornerDownRight className="h-3.5 w-3.5" />
                            Balasan ke {msg.reply_meta.displayName}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs text-zinc-300/90">
                            {msg.reply_meta.content}
                          </div>
                        </div>
                      )}
                      <div className="mt-0.5 text-[15px] leading-6 text-zinc-200 whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              {typingPeople.length > 0 && (
                <div className="mt-2 flex items-end gap-3 rounded-2xl px-3 py-2.5 pr-16 transition-colors hover:bg-white/[0.02]">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="relative flex h-10 w-10 items-center justify-center">
                      {typingPeople.slice(0, 3).map((person, index) => (
                        <div
                          key={person.userId}
                          className={index === 0 ? 'absolute left-0 top-0 z-30' : index === 1 ? 'absolute left-2 top-0 z-20' : 'absolute left-4 top-0 z-10'}
                        >
                          {renderTypingAvatar(person.displayName, person.avatarUrl)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-white">{typingLabel()}</span>
                    </div>
                    <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300 shadow-[0_8px_20px_rgba(0,0,0,0.14)] backdrop-blur-sm">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                      <span>Sedang mengetik</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-white/5 bg-[#313338]/95 px-4 py-4 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="relative mx-auto flex w-full max-w-3xl items-center pl-4 md:pl-10 lg:pl-16">
          <div className="flex w-full flex-col gap-2">
            {(replyingTo || editingMessage) && (
              <div className="flex items-center justify-between rounded-2xl border border-indigo-500/15 bg-indigo-500/10 px-4 py-3 text-sm text-zinc-200">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                    {editingMessage ? 'Mengedit pesan' : `Membalas ${profiles[replyingTo?.user_id || '']?.display_name || 'pesan'}`}
                  </div>
                  <div className="truncate text-xs text-zinc-300/80">
                    {editingMessage ? editingMessage.content : replyingTo?.content}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null);
                    setEditingMessage(null);
                    setNewMessage('');
                  }}
                  className="ml-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex w-full items-center rounded-2xl border border-white/8 bg-[#383a40] shadow-[0_8px_24px_rgba(0,0,0,0.18)] focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/15 transition">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={editingMessage ? 'Ubah pesan Anda' : `Kirim pesan ke #${channelName}`}
                className="w-full bg-transparent px-4 py-3.5 text-zinc-100 placeholder-zinc-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
              >
                {editingMessage ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
