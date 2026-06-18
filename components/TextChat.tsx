'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Send, Hash, Reply, PencilLine, Trash2, X, Check,
  CornerDownRight, Mic, MicOff, Paperclip, Image as ImageIcon,
  ZoomIn, AlertTriangle,
} from 'lucide-react';
import { decodeMessageContent, encodeMessageContent, MessageReplyMeta, MessageAttachment } from '@/lib/messageFormat';

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_meta?: MessageReplyMeta | null;
  attachments?: MessageAttachment[] | null;
  user?: { id: string };
}

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

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteModal({
  message,
  displayName,
  onConfirm,
  onCancel,
  busy,
}: {
  message: Message;
  displayName: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#2b2d31] shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Hapus Pesan</h3>
            <p className="text-xs text-zinc-400">Tindakan ini tidak bisa dibatalkan</p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-white/8 bg-[#313338] px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 mb-1">{displayName}</p>
          <p className="text-sm text-zinc-200 line-clamp-3 break-words">{message.content || '[Lampiran]'}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Preview"
        className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Audio Player ─────────────────────────────────────────────────────────────
function AudioPlayer({ url, name }: { url: string; name?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => setIsPlaying(false);

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-[#2b2d31] p-3 w-64 shadow-md border border-white/5">
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-400 hover:scale-105 transition shadow-lg shadow-indigo-500/20"
      >
        {isPlaying ? (
          <div className="flex gap-1">
            <span className="w-1.5 h-3.5 bg-white rounded-full"></span>
            <span className="w-1.5 h-3.5 bg-white rounded-full"></span>
          </div>
        ) : (
          <div className="ml-1 w-0 h-0 border-t-[7px] border-t-transparent border-l-[11px] border-l-white border-b-[7px] border-b-transparent"></div>
        )}
      </button>

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold text-indigo-200 truncate pr-2">{name || 'Voice Note'}</p>
          <span className="text-[10px] text-zinc-400 font-medium tracking-wide">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        {/* Custom Progress Bar */}
        <div className="relative h-1.5 w-full rounded-full bg-black/40 overflow-hidden cursor-pointer"
             onClick={(e) => {
               if (!audioRef.current || !duration) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const pos = (e.clientX - rect.left) / rect.width;
               audioRef.current.currentTime = pos * duration;
             }}>
          <div 
            className="absolute left-0 top-0 h-full bg-indigo-400 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
        preload="metadata"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TextChat({ channelId, channelName, currentUserId }: TextChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image upload state
  const [imagePreview, setImagePreview] = useState<{ file: File; previewUrl: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Typing
  const [typingUsers, setTypingUsers] = useState<Record<string, { displayName: string; avatarUrl: string | null; updatedAt: number }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingLocalRef = useRef(false);

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

  const normalizeMessage = (message: any): Message => {
    const decoded = decodeMessageContent(message.content || '');
    return {
      ...message,
      content: decoded.content,
      reply_meta: decoded.replyMeta,
      attachments: decoded.attachments,
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current[messageId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('message-highlight');
    void el.offsetWidth; // force reflow
    el.classList.add('message-highlight');
    setTimeout(() => el.classList.remove('message-highlight'), 2000);
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

  // Load history and setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`public:messages:channel_id=eq.${channelId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as {
          channelId?: string; userId?: string; displayName?: string;
          avatarUrl?: string | null; isTyping?: boolean; updatedAt?: number;
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
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, async (payload) => {
        // normalizeMessage di sini aman karena payload.new adalah raw DB row (belum decoded)
        const newMsg = normalizeMessage(payload.new);
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMsg.id);
          // Jika sudah ada (dari optimistic UI), ganti dengan data dari DB yang sudah benar
          if (exists) return prev.map((m) => m.id === newMsg.id ? newMsg : m);
          return [...prev, newMsg];
        });
        await fetchProfiles([newMsg.user_id]);
        scrollToBottom();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        const updated = normalizeMessage(payload.new);
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
        const deleted = payload.old as Message;
        setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
      })
      .subscribe();

    typingChannelRef.current = channel;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages?channel_id=${channelId}`);
        if (res.ok) {
          const data = await res.json();
          // DO NOT normalize messages here because the API already decodes them!
          // Normalizing again will overwrite the parsed reply_meta and attachments with null.
          const fetchedMessages = data.messages || [];
          setMessages(fetchedMessages);
          const uniqueUserIds = Array.from(new Set([...fetchedMessages.map((m: Message) => m.user_id), currentUserId]));
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
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId]);

  useEffect(() => { scrollToBottom(); }, [messages, profiles]);

  useEffect(() => {
    const onTypingChange = async () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (!newMessage.trim()) {
        if (isTypingLocalRef.current) { isTypingLocalRef.current = false; await sendTypingEvent(false); }
        return;
      }
      if (!isTypingLocalRef.current) { isTypingLocalRef.current = true; await sendTypingEvent(true); }
      else { await sendTypingEvent(true); }
      typingStopTimerRef.current = setTimeout(() => {
        isTypingLocalRef.current = false;
        sendTypingEvent(false).catch(() => {});
      }, 1200);
    };
    onTypingChange().catch(() => {});
  }, [newMessage, channelId, currentUserId, profiles]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = !!newMessage.trim();
    const hasImage = !!imagePreview;
    if (!hasText && !hasImage && !editingMessage) return;

    const content = newMessage.trim();
    const editTarget = editingMessage;
    const replyTarget = replyingTo;
    setNewMessage('');
    setReplyingTo(null);
    setEditingMessage(null);

    try {
      if (editTarget) {
        const editRes = await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: editTarget.id, user_id: currentUserId, content, reply_meta: editTarget.reply_meta || null }),
        });
        if (editRes.ok) {
          const edited = await editRes.json();
          // API response already decoded — use directly
          const updatedMessage = edited.message as Message;
          setMessages((prev) => prev.map((m) => m.id === updatedMessage.id ? updatedMessage : m));
        }
        return;
      }

      let attachments: MessageAttachment[] | null = null;

      // Upload image first if attached
      if (imagePreview) {
        setUploadingImage(true);
        try {
          const fd = new FormData();
          fd.append('file', imagePreview.file);
          fd.append('userId', currentUserId);
          const upRes = await fetch('/api/upload/message', { method: 'POST', body: fd });
          if (upRes.ok) {
            const upData = await upRes.json();
            attachments = [{ url: upData.url, type: 'image', name: imagePreview.file.name }];
          }
        } finally {
          setUploadingImage(false);
          URL.revokeObjectURL(imagePreview.previewUrl);
          setImagePreview(null);
        }
      }

      const replyMeta = replyTarget
        ? {
            messageId: replyTarget.id,
            displayName: profiles[replyTarget.user_id]?.display_name || 'Unknown',
            content: replyTarget.content,
            avatarUrl: profiles[replyTarget.user_id]?.avatar_url || null,
            userId: replyTarget.user_id,
            createdAt: replyTarget.created_at,
          }
        : null;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, user_id: currentUserId, content, reply_meta: replyMeta, attachments }),
      });

      if (res.ok) {
        const data = await res.json();
        // API response already decoded — use directly to preserve attachments
        const created = data.message as Message;
        setMessages((prev) => prev.some((m) => m.id === created.id) ? prev : [...prev, created]);
        await fetchProfiles([created.user_id]);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  // ── Reply ───────────────────────────────────────────────────────────────────
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    setNewMessage('');
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    setNewMessage(message.content);
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deletingMessage) return;
    setBusyDelete(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: deletingMessage.id, user_id: currentUserId }),
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== deletingMessage.id));
        if (editingMessage?.id === deletingMessage.id) { setEditingMessage(null); setNewMessage(''); }
        if (replyingTo?.id === deletingMessage.id) setReplyingTo(null);
      }
    } finally {
      setBusyDelete(false);
      setDeletingMessage(null);
    }
  };

  // ── Voice Note ──────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendVoiceNote(blob, mimeType);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      alert('Izin mikrofon diperlukan untuk merekam suara.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const sendVoiceNote = async (blob: Blob, mimeType: string) => {
    setUploadingVoice(true);
    try {
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', currentUserId);
      const upRes = await fetch('/api/upload/message', { method: 'POST', body: fd });
      if (!upRes.ok) { console.error('Voice upload failed'); return; }
      const upData = await upRes.json();
      const attachments: MessageAttachment[] = [{ url: upData.url, type: 'audio', name: file.name }];

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, user_id: currentUserId, content: '', attachments }),
      });
      if (res.ok) {
        const data = await res.json();
        // API response already decoded — use directly to preserve attachments
        const created = data.message as Message;
        setMessages((prev) => prev.some((m) => m.id === created.id) ? prev : [...prev, created]);
        scrollToBottom();
      }
    } finally {
      setUploadingVoice(false);
    }
  };

  // ── Image pick ──────────────────────────────────────────────────────────────
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Gambar terlalu besar (maks 10MB)'); return; }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview({ file, previewUrl });
    e.target.value = '';
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const canManageMessage = (message: Message) => message.user_id === currentUserId;
  const typingPeople = Object.entries(typingUsers)
    .filter(([uid]) => uid !== currentUserId)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, 3)
    .map(([userId, data]) => ({ userId, ...data }));

  const typingLabel = () => {
    if (typingPeople.length === 0) return '';
    if (typingPeople.length === 1) return `${typingPeople[0].displayName} sedang mengetik`;
    if (typingPeople.length === 2) return `${typingPeople[0].displayName} dan ${typingPeople[1].displayName} sedang mengetik`;
    return `${typingPeople[0].displayName}, ${typingPeople[1].displayName}, dan ${typingPeople.length - 2} lainnya sedang mengetik`;
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const renderAvatar = (displayName: string, avatarUrl: string | null | undefined, size = 'w-10 h-10') => {
    const isPreset = avatarUrl?.startsWith('preset:');
    if (isPreset || !avatarUrl) {
      const bg = isPreset ? (PRESET_GRADIENTS[avatarUrl || ''] || getGradient(displayName)) : getGradient(displayName);
      return (
        <div className={`${size} rounded-full ${bg} flex items-center justify-center text-white font-bold shadow-lg shadow-black/10 text-sm`}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={displayName} className={`${size} rounded-full object-cover shadow-lg shadow-black/10`} />;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Lightbox */}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* Delete Confirmation Modal */}
      {deletingMessage && (
        <DeleteModal
          message={deletingMessage}
          displayName={profiles[deletingMessage.user_id]?.display_name || 'Unknown'}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingMessage(null)}
          busy={busyDelete}
        />
      )}

      <div className="flex-1 flex min-h-0 flex-col bg-[#313338] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent z-10" />

        {/* ── Messages Area ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 md:px-6 flex flex-col">
          <div className="mx-auto flex w-full max-w-3xl flex-col mt-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex max-w-md flex-col items-center justify-center rounded-3xl border border-white/6 bg-[#2b2d31] px-8 py-10 text-center text-zinc-400 shadow-[0_16px_60px_rgba(0,0,0,0.2)]">
                  <Hash className="mb-4 h-16 w-16 rounded-full bg-zinc-700/50 p-3 text-zinc-200" />
                  <h3 className="mb-2 text-xl font-bold text-white">Selamat datang di #{channelName}!</h3>
                  <p className="text-sm leading-relaxed">Ini adalah awal dari channel {channelName}.</p>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-0.5 py-2">
                {messages.map((msg, index) => {
                  const prevMsg = messages[index - 1];
                  const isConsecutive =
                    prevMsg && prevMsg.user_id === msg.user_id &&
                    new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60000;

                  const profile = profiles[msg.user_id];
                  const displayName = profile?.display_name || 'Unknown';
                  const avatarUrl = profile?.avatar_url;

                  return (
                    <div
                      key={msg.id}
                      ref={(el) => { messageRefs.current[msg.id] = el; }}
                      className={`group relative flex gap-3 px-4 py-1 pr-14 transition-colors hover:bg-[#2e3035] ${isConsecutive ? 'mt-0' : 'mt-4'}`}
                    >
                      {/* Action buttons (hover) */}
                      <div className="absolute right-4 top-[-10px] flex items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100 bg-[#313338] rounded-md border border-[#1e1f22] shadow-sm z-10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleReply(msg)}
                          className="flex h-8 w-8 items-center justify-center text-zinc-400 hover:bg-[#404249] hover:text-zinc-200 transition"
                          title="Balas"
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                        {canManageMessage(msg) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(msg)}
                              className="flex h-8 w-8 items-center justify-center text-zinc-400 hover:bg-[#404249] hover:text-zinc-200 transition"
                              title="Edit"
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingMessage(msg)}
                              className="flex h-8 w-8 items-center justify-center text-zinc-400 hover:bg-[#da373c] hover:text-white transition"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Avatar / Time column */}
                      {!isConsecutive ? (
                        <div className="flex-shrink-0 pt-0.5 cursor-pointer">{renderAvatar(displayName, avatarUrl)}</div>
                      ) : (
                        <div className="w-10 flex-shrink-0 pt-1 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-semibold text-zinc-500 select-none">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        {!isConsecutive && (
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-0.5">
                            <span className="text-sm font-semibold text-white hover:underline cursor-pointer">{displayName}</span>
                            <span className="text-[11px] text-zinc-500">
                              {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        )}

                        {/* Reply quote */}
                        {msg.reply_meta && (
                          <div className="relative mb-1 flex items-center gap-2 group/reply cursor-pointer" onClick={() => scrollToMessage(msg.reply_meta!.messageId)}>
                            <div className="absolute left-[-38px] top-1/2 w-[34px] h-[14px] -translate-y-[140%] border-l-2 border-t-2 border-[#4e5058] rounded-tl-xl pointer-events-none" />
                            
                            {renderAvatar(msg.reply_meta.displayName, msg.reply_meta.avatarUrl, 'w-4 h-4')}
                            <span className="text-sm font-semibold text-zinc-400 group-hover/reply:underline transition">
                              {msg.reply_meta.displayName}
                            </span>
                            <span className="text-sm text-zinc-400 truncate group-hover/reply:text-zinc-300 transition">
                              {msg.reply_meta.content || 'Lampiran'}
                            </span>
                          </div>
                        )}

                        {/* Text content */}
                        {msg.content && (
                          <div className="text-[15px] leading-6 text-zinc-200 whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        )}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.map((att, i) => {
                          if (att.type === 'image') {
                            return (
                              <div key={i} className="mt-2 relative inline-block group/img">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.url}
                                  alt={att.name || 'Gambar'}
                                  className="max-h-72 max-w-xs rounded-xl object-cover cursor-pointer hover:opacity-90 transition shadow-lg"
                                  onClick={() => setLightboxUrl(att.url)}
                                />
                                <button
                                  onClick={() => setLightboxUrl(att.url)}
                                  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 group-hover/img:opacity-100 transition"
                                >
                                  <ZoomIn className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          }
                          if (att.type === 'audio') {
                            return <AudioPlayer key={i} url={att.url} name={att.name} />;
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typingPeople.length > 0 && (
                  <div className="mt-2 flex items-center gap-3 px-3 py-1.5">
                    <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
                      {typingPeople.slice(0, 2).map((person, i) => (
                        <div key={person.userId} className={i === 0 ? 'absolute left-0 top-0 z-20' : 'absolute left-3 top-0 z-10'}>
                          {renderAvatar(person.displayName, person.avatarUrl, 'w-6 h-6')}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">{typingLabel()}</span>
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Input Area ────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-[#313338] px-4 py-6">
          <div className="mx-auto w-full max-w-3xl flex flex-col gap-2">

            {/* Reply / Edit Banner */}
            {(replyingTo || editingMessage) && (
              <div className="flex items-center justify-between rounded-t-lg bg-[#2b2d31] px-4 py-2 border-b border-[#1e1f22]/50 -mb-2">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="text-xs font-semibold text-zinc-400">
                    {editingMessage ? 'MENGEDIT PESAN' : `MEMBALAS ${profiles[replyingTo?.user_id || '']?.display_name?.toUpperCase() || 'PESAN'}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview.previewUrl}
                  alt="Preview"
                  className="h-24 w-auto rounded-xl object-cover border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => { URL.revokeObjectURL(imagePreview.previewUrl); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Voice Recording Bar */}
            {isRecording && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5">
                <div className="flex items-end gap-1 h-5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="wave-bar h-5" />
                  ))}
                </div>
                <span className="text-sm font-semibold text-rose-300 tabular-nums">{formatTime(recordingSeconds)}</span>
                <span className="text-xs text-rose-400">Merekam suara...</span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 transition"
                >
                  <MicOff className="h-3.5 w-3.5" />
                  Selesai
                </button>
              </div>
            )}

            {/* Main Input Row */}
            <form onSubmit={handleSendMessage}>
              <div className={`flex items-center gap-2 bg-[#383a40] px-2 py-1 ${replyingTo || editingMessage ? 'rounded-b-lg' : 'rounded-lg'}`}>
                {/* Attach image */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                  id="image-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || uploadingVoice}
                  title="Kirim Gambar"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/8 hover:text-indigo-300 transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ImageIcon className="h-4.5 w-4.5" />
                </button>

                {/* Text input */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    isRecording ? 'Sedang merekam...' :
                    editingMessage ? 'Ubah pesan Anda' :
                    `Kirim pesan ke #${channelName}`
                  }
                  disabled={isRecording}
                  className="flex-1 bg-transparent py-2.5 text-zinc-100 placeholder-zinc-500 outline-none text-[15px] disabled:opacity-50"
                />

                {/* Voice note button */}
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={uploadingVoice || uploadingImage}
                    title="Rekam Suara"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/8 hover:text-indigo-300 transition disabled:opacity-40"
                  >
                    {uploadingVoice ? (
                      <span className="h-4 w-4 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
                    ) : (
                      <Mic className="h-4.5 w-4.5" />
                    )}
                  </button>
                ) : null}

                {/* Send button */}
                {!isRecording && (
                  <button
                    type="submit"
                    disabled={!newMessage.trim() && !imagePreview && !editingMessage}
                    className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-white transition hover:bg-[#4752c4] disabled:opacity-0 disabled:w-0 disabled:mr-0 overflow-hidden"
                  >
                    {editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4 -ml-0.5" />}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
