'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, UserCheck, UserX, Search, Users, Clock, Check, X, Trash2, MessageCircle } from 'lucide-react';

interface FriendUser {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  status: 'accepted' | 'pending_incoming' | 'pending_outgoing';
}

interface FriendsPanelProps {
  currentUserId: string;
  onClose: () => void;
}

const PRESET_GRADIENTS: Record<string, string> = {
  'preset:pink': 'from-pink-500 to-rose-500',
  'preset:purple': 'from-purple-500 to-indigo-500',
  'preset:blue': 'from-blue-500 to-cyan-500',
  'preset:emerald': 'from-emerald-500 to-teal-500',
  'preset:orange': 'from-orange-500 to-amber-500',
};

function getGradient(str: string): string {
  const gradients = Object.values(PRESET_GRADIENTS);
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return gradients[sum % gradients.length];
}

function Avatar({ user }: { user: { display_name: string; avatar_url: string | null; email: string } }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = user.avatar_url;

  if (avatarUrl && !avatarUrl.startsWith('preset:') && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={user.display_name}
        className="w-10 h-10 rounded-full object-cover border border-zinc-700"
        onError={() => setImgError(true)}
      />
    );
  }

  const gradientClass = avatarUrl?.startsWith('preset:')
    ? PRESET_GRADIENTS[avatarUrl] || 'from-purple-500 to-indigo-500'
    : getGradient(user.email || user.display_name);

  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
      {user.display_name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function FriendsPanel({ currentUserId, onClose }: FriendsPanelProps) {
  const [tab, setTab] = useState<'all' | 'pending' | 'add'>('all');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<FriendUser[]>([]);
  const [outgoing, setOutgoing] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<FriendUser | null | 'not_found'>(null);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friends?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setIncoming(data.incoming || []);
        setOutgoing(data.outgoing || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', email: searchEmail.trim() }),
      });
      const data = await res.json();
      if (data.user) {
        setSearchResult(data.user);
      } else {
        setSearchResult('not_found');
      }
    } catch {
      setSearchResult('not_found');
    }
    setSearching(false);
  };

  const handleSendRequest = async (targetId: string) => {
    setSendingTo(targetId);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', userId: currentUserId, targetId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Permintaan pertemanan terkirim!');
        await fetchFriends();
      } else {
        showToast('error', data.error || 'Gagal mengirim permintaan');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan');
    }
    setSendingTo(null);
  };

  const handleAccept = async (targetId: string) => {
    setActionLoading(targetId + '-accept');
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', userId: currentUserId, targetId }),
      });
      if (res.ok) {
        showToast('success', 'Pertemanan diterima!');
        await fetchFriends();
      } else {
        showToast('error', 'Gagal menerima pertemanan');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan');
    }
    setActionLoading(null);
  };

  const handleReject = async (targetId: string) => {
    setActionLoading(targetId + '-reject');
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', userId: currentUserId, targetId }),
      });
      if (res.ok) {
        showToast('success', 'Permintaan ditolak');
        await fetchFriends();
      }
    } catch {
      showToast('error', 'Terjadi kesalahan');
    }
    setActionLoading(null);
  };

  const handleRemoveFriend = async (targetId: string) => {
    setActionLoading(targetId + '-remove');
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', userId: currentUserId, targetId }),
      });
      if (res.ok) {
        showToast('success', 'Teman dihapus');
        await fetchFriends();
      }
    } catch {
      showToast('error', 'Terjadi kesalahan');
    }
    setActionLoading(null);
  };

  const pendingCount = incoming.length;

  // Check if already friend or pending
  const getFriendStatus = (userId: string) => {
    if (friends.some((f) => f.user_id === userId)) return 'accepted';
    if (incoming.some((f) => f.user_id === userId)) return 'pending_incoming';
    if (outgoing.some((f) => f.user_id === userId)) return 'pending_outgoing';
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-green-600/90 border border-green-500/50' : 'bg-red-600/90 border border-red-500/50'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-[#313338] border border-[#1e1f22] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1f22] bg-[#2b2d31]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Teman</h2>
              <p className="text-slate-400 text-xs">{friends.length} teman aktif</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#35373d] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-[#1e1f22]">
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px ${
              tab === 'all'
                ? 'text-white border-indigo-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px flex items-center gap-2 ${
              tab === 'pending'
                ? 'text-white border-indigo-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            Menunggu
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('add')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 -mb-px flex items-center gap-1.5 ${
              tab === 'add'
                ? 'text-white border-indigo-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Tambah Teman
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* All Friends Tab */}
          {tab === 'all' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
                  Memuat daftar teman...
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-[#2b2d31] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
                  <p className="text-white font-bold">Belum ada teman</p>
                  <p className="text-slate-400 text-sm mt-1">Tambahkan teman lewat tab &quot;Tambah Teman&quot;</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
                    Semua Teman — {friends.length}
                  </p>
                  {friends.map((friend) => (
                    <div
                      key={friend.user_id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-[#35373d] group transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar user={friend} />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#313338]" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{friend.display_name}</p>
                          <p className="text-slate-500 text-xs">{friend.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          title="Pesan"
                          className="w-8 h-8 bg-[#2b2d31] rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.user_id)}
                          disabled={actionLoading === friend.user_id + '-remove'}
                          title="Hapus Teman"
                          className="w-8 h-8 bg-[#2b2d31] rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          {actionLoading === friend.user_id + '-remove' ? (
                            <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Tab */}
          {tab === 'pending' && (
            <div className="space-y-6">
              {/* Incoming */}
              {incoming.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
                    Permintaan Masuk — {incoming.length}
                  </p>
                  <div className="space-y-1">
                    {incoming.map((req) => (
                      <div
                        key={req.user_id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-[#35373d] group transition"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar user={req} />
                          <div>
                            <p className="text-white font-semibold text-sm">{req.display_name}</p>
                            <p className="text-slate-500 text-xs">{req.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAccept(req.user_id)}
                            disabled={!!actionLoading}
                            className="w-8 h-8 bg-green-600/20 hover:bg-green-600 rounded-full flex items-center justify-center text-green-400 hover:text-white transition"
                            title="Terima"
                          >
                            {actionLoading === req.user_id + '-accept' ? (
                              <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(req.user_id)}
                            disabled={!!actionLoading}
                            className="w-8 h-8 bg-red-600/10 hover:bg-red-600/30 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition"
                            title="Tolak"
                          >
                            {actionLoading === req.user_id + '-reject' ? (
                              <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing */}
              {outgoing.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
                    Permintaan Terkirim — {outgoing.length}
                  </p>
                  <div className="space-y-1">
                    {outgoing.map((req) => (
                      <div
                        key={req.user_id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-[#35373d] group transition"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar user={req} />
                          <div>
                            <p className="text-white font-semibold text-sm">{req.display_name}</p>
                            <p className="text-slate-500 text-xs">{req.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Menunggu...</span>
                          <button
                            onClick={() => handleRemoveFriend(req.user_id)}
                            disabled={!!actionLoading}
                            className="ml-2 w-7 h-7 bg-red-600/10 hover:bg-red-600/30 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition"
                            title="Batalkan"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incoming.length === 0 && outgoing.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-[#2b2d31] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🕐</div>
                  <p className="text-white font-bold">Tidak ada permintaan menunggu</p>
                  <p className="text-slate-400 text-sm mt-1">Permintaan pertemanan yang masuk atau terkirim akan muncul di sini</p>
                </div>
              )}
            </div>
          )}

          {/* Add Friend Tab */}
          {tab === 'add' && (
            <div>
              <div className="bg-[#2b2d31] rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-white font-bold text-sm">Tambah Teman dengan Email</h3>
                </div>
                <p className="text-slate-400 text-xs mb-4">Masukkan alamat email pengguna SiHALO untuk mengirim permintaan pertemanan.</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="email@contoh.com"
                      value={searchEmail}
                      onChange={(e) => { setSearchEmail(e.target.value); setSearchResult(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#1e1f22] text-white rounded-xl border border-[#35373d] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm placeholder-slate-500"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchEmail.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition active:scale-95 flex items-center gap-2"
                  >
                    {searching ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Cari
                  </button>
                </div>
              </div>

              {/* Search Result */}
              {searchResult === 'not_found' && (
                <div className="text-center py-8 bg-[#2b2d31] rounded-xl">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-white font-semibold text-sm">Pengguna tidak ditemukan</p>
                  <p className="text-slate-400 text-xs mt-1">Pastikan email yang kamu masukkan sudah benar</p>
                </div>
              )}

              {searchResult && searchResult !== 'not_found' && (
                <div className="bg-[#2b2d31] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar user={searchResult} />
                    <div>
                      <p className="text-white font-bold text-sm">{searchResult.display_name}</p>
                      <p className="text-slate-400 text-xs">{searchResult.email}</p>
                    </div>
                  </div>

                  {searchResult.user_id === currentUserId ? (
                    <span className="text-slate-500 text-xs font-semibold bg-[#1e1f22] px-3 py-1.5 rounded-lg">Kamu sendiri</span>
                  ) : (() => {
                    const status = getFriendStatus(searchResult.user_id);
                    if (status === 'accepted') {
                      return (
                        <span className="text-green-400 text-xs font-semibold bg-green-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          Sudah berteman
                        </span>
                      );
                    }
                    if (status === 'pending_outgoing') {
                      return (
                        <span className="text-slate-400 text-xs font-semibold bg-[#1e1f22] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Permintaan terkirim
                        </span>
                      );
                    }
                    if (status === 'pending_incoming') {
                      return (
                        <button
                          onClick={() => handleAccept(searchResult.user_id)}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Terima
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={() => handleSendRequest(searchResult.user_id)}
                        disabled={sendingTo === searchResult.user_id}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
                      >
                        {sendingTo === searchResult.user_id ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        Tambah Teman
                      </button>
                    );
                  })()}
                </div>
              )}

              {!searchResult && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <UserX className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Cari teman dengan email mereka di atas</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
