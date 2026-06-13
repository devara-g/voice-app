'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Plus, LogOut, Compass, Server, ChevronRight, Users, UserPlus, Link } from 'lucide-react';
import ProfileModal from '@/components/ProfileModal';
import FriendsPanel from '@/components/FriendsPanel';
import JoinServerModal from '@/components/JoinServerModal';
import InviteModal from '@/components/InviteModal';

interface ServerData {
  id: string;
  name: string;
  image_url: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [servers, setServers] = useState<ServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // State untuk modal kustom
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [creating, setCreating] = useState(false);

  // State untuk profil
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // State untuk fitur baru
  const [isFriendsPanelOpen, setIsFriendsPanelOpen] = useState(false);
  const [isJoinServerOpen, setIsJoinServerOpen] = useState(false);
  const [inviteModalServerId, setInviteModalServerId] = useState<string | null>(null);
  const [inviteModalServerName, setInviteModalServerName] = useState<string | null>(null);

  useEffect(() => {
    const fetchServers = async (uid: string) => {
      setLoading(true);
      setErrorMessage(null);
      
      // Fetch servers owned by user
      const { data: ownedServers, error: ownedError } = await supabase
        .from('servers')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: true });
      
      if (ownedError) {
        console.error('Error fetching owned servers:', ownedError.message);
        setErrorMessage(ownedError.message);
        setLoading(false);
        return;
      }

      // Fetch servers user has joined as member (but not owner)
      const { data: memberRows } = await supabase
        .from('members')
        .select('server_id')
        .eq('user_id', uid);

      let joinedServers: ServerData[] = [];
      if (memberRows && memberRows.length > 0) {
        const joinedIds = memberRows.map((m: { server_id: string }) => m.server_id);
        const { data: joinedData } = await supabase
          .from('servers')
          .select('*')
          .in('id', joinedIds)
          .neq('owner_id', uid) // Exclude owned servers
          .order('created_at', { ascending: true });
        joinedServers = joinedData || [];
      }

      setServers([...(ownedServers || []), ...joinedServers]);
      setLoading(false);
    };

    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      } else {
        setUserEmail(user.email ?? null);
        setUserId(user.id);
        setDisplayName(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User');
        setAvatarUrl(user.user_metadata?.avatar_url ?? 'preset:purple');
      }

      await fetchServers(user.id);
    };

    loadDashboard();
  }, [router]);

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setDisplayName(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User');
      setAvatarUrl(user.user_metadata?.avatar_url ?? 'preset:purple');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCreateServerSubmit = async () => {
    if (!newServerName.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('servers')
      .insert([
        { 
          name: newServerName.trim(), 
          owner_id: user.id 
        }
      ])
      .select()
      .single();

    setCreating(false);

    if (error) {
      alert('Gagal membuat server: ' + error.message);
    } else {
      setServers((currentServers) => [...currentServers, data]);
      setIsCreateModalOpen(false);
      setNewServerName('');
    }
  };

  const handleJoinedServer = (serverId: string) => {
    setIsJoinServerOpen(false);
    router.push(`/server/${serverId}`);
  };

  const getPresetClasses = (id: string) => {
    const presets: Record<string, string> = {
      'preset:pink': 'from-pink-500 to-rose-500',
      'preset:purple': 'from-purple-500 to-indigo-500',
      'preset:blue': 'from-blue-500 to-cyan-500',
      'preset:emerald': 'from-emerald-500 to-teal-500',
      'preset:orange': 'from-orange-500 to-amber-500',
    };
    return presets[id] || 'from-purple-500 to-indigo-500';
  };

  const getGradient = (name: string) => {
    const gradients = [
      'from-pink-500 to-rose-500',
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-orange-500 to-amber-500',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-gray-400 text-sm font-medium">Memuat data Anda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] flex">
      {/* Sidebar kiri - daftar server ala Discord */}
      <div className="fixed left-0 top-0 h-full w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#2b2d31] z-20">
        
        {/* Home / Dashboard button */}
        <div className="group relative w-12 h-12 flex items-center justify-center cursor-pointer">
          {/* Pill Indicator */}
          <div className="absolute left-0 w-1 bg-white rounded-r-md transition-all duration-200 origin-left scale-y-100 h-10" />
          
          <div className="w-12 h-12 bg-[#5865f2] rounded-xl transition-all cursor-pointer flex items-center justify-center text-white">
            <Compass className="w-6 h-6" />
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
            Dashboard
          </div>
        </div>
        
        <div className="w-8 h-[2px] bg-[#2b2d31] my-1" />
        
        {/* Daftar server */}
        {servers.map((server) => (
          <div
            key={server.id}
            onClick={() => router.push(`/server/${server.id}`)}
            className="group relative w-12 h-12 flex items-center justify-center cursor-pointer"
          >
            {/* Pill Indicator */}
            <div className="absolute left-0 w-1 bg-white rounded-r-md transition-all duration-200 origin-left scale-y-0 group-hover:scale-y-[0.6] group-active:scale-y-[1] h-8" />
            
            <div className={`w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-white font-bold hover:bg-gradient-to-tr hover:${getGradient(server.name)} shadow-md`}>
              {server.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
              {server.name}
            </div>
          </div>
        ))}
        
        {/* Tombol buat server baru */}
        <div
          onClick={() => setIsCreateModalOpen(true)}
          className="group relative w-12 h-12 flex items-center justify-center cursor-pointer mt-1"
        >
          {/* Pill Indicator */}
          <div className="absolute left-0 w-1 bg-[#23a559] rounded-r-md transition-all duration-200 origin-left scale-y-0 group-hover:scale-y-[0.6] h-8" />
          
          <div className="w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-[#23a559] hover:bg-[#23a559] hover:text-white shadow-md">
            <Plus className="w-6 h-6" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
            Buat Server
          </div>
        </div>

        {/* Tombol gabung server */}
        <div
          onClick={() => setIsJoinServerOpen(true)}
          className="group relative w-12 h-12 flex items-center justify-center cursor-pointer"
        >
          <div className="absolute left-0 w-1 bg-indigo-400 rounded-r-md transition-all duration-200 origin-left scale-y-0 group-hover:scale-y-[0.6] h-8" />
          <div className="w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-indigo-400 hover:bg-indigo-600 hover:text-white shadow-md">
            <Link className="w-5 h-5" />
          </div>
          <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
            Gabung Server
          </div>
        </div>
      </div>

      {/* Area utama */}
      <div className="ml-[72px] flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="h-14 bg-[#2b2d31] border-b border-[#1e1f22] flex items-center justify-between px-6 shadow-md z-10">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Compass className="w-5 h-5 text-indigo-400" />
            <span>SiHALO Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Friends Button */}
            <button
              onClick={() => setIsFriendsPanelOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 text-slate-300 hover:text-white transition text-sm font-semibold"
              title="Teman"
            >
              <Users className="w-4 h-4" />
              <span>Teman</span>
            </button>

            {/* Add Friend shortcut */}
            <button
              onClick={() => { setIsFriendsPanelOpen(true); }}
              className="w-8 h-8 rounded-xl bg-zinc-800/40 hover:bg-indigo-600/60 border border-zinc-800/60 hover:border-indigo-500/50 flex items-center justify-center text-slate-400 hover:text-white transition"
              title="Tambah Teman"
            >
              <UserPlus className="w-4 h-4" />
            </button>

            {/* Clickable Profile Card */}
            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 transition cursor-pointer select-none group"
              title="Edit Profil"
            >
              {avatarUrl?.startsWith('preset:') ? (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${getPresetClasses(avatarUrl)} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                  {(displayName || userEmail || '?').charAt(0).toUpperCase()}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={avatarUrl || ''} 
                  alt="Avatar" 
                  className="w-7 h-7 rounded-lg object-cover border border-zinc-700 shadow"
                  onError={() => setAvatarUrl('preset:purple')}
                />
              )}
              <div className="text-left min-w-0">
                <div className="text-white text-xs font-bold truncate max-w-[120px] group-hover:text-indigo-400 transition">
                  {displayName}
                </div>
                <div className="text-zinc-500 text-[9px] truncate max-w-[120px]">
                  {userEmail}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-[#f23f43]/10 hover:bg-[#f23f43]/20 text-[#f23f43] px-3.5 py-1.5 rounded-lg text-sm font-semibold transition active:scale-95 border border-red-500/5"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Konten Utama */}
        <div className="p-8 flex-1 max-w-6xl w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-white text-2xl font-extrabold tracking-tight">Pelayan Anda ({servers.length})</h1>
              <p className="text-slate-400 text-sm mt-1">Pilih server di bawah ini untuk memulai obrolan suara</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsJoinServerOpen(true)}
                className="flex items-center gap-2 bg-[#2b2d31] hover:bg-[#35373d] border border-[#35373d] text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition active:scale-95"
              >
                <Link className="w-4 h-4" />
                <span>Gabung Server</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Server</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm flex gap-2">
              <span>⚠️</span>
              <div>
                <p className="font-semibold">Gagal memuat server</p>
                <p className="mt-0.5 text-xs text-red-300/80">{errorMessage}</p>
              </div>
            </div>
          )}
          
          {servers.length === 0 ? (
            <div className="text-center py-20 bg-[#2b2d31]/40 border border-[#2b2d31] rounded-2xl max-w-md mx-auto mt-10">
              <div className="w-16 h-16 bg-[#35373d] rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner">🌐</div>
              <h3 className="text-white text-lg font-bold">Belum Ada Pelayan</h3>
              <p className="text-slate-400 text-sm mt-1 px-6">Buat server baru atau gabung ke server orang lain menggunakan kode undangan.</p>
              <div className="flex gap-3 justify-center mt-6">
                <button
                  onClick={() => setIsJoinServerOpen(true)}
                  className="bg-[#35373d] hover:bg-[#404249] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition active:scale-95 flex items-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  Gabung Server
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Buat Server
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className="bg-[#2b2d31] rounded-2xl overflow-hidden cursor-pointer border border-[#35373d]/50 hover:border-slate-700 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col group relative"
                >
                  {/* Bagian Atas - Gradien Warna */}
                  <div
                    onClick={() => router.push(`/server/${server.id}`)}
                    className={`h-24 bg-gradient-to-tr ${getGradient(server.name)} relative flex items-end p-4`}
                  >
                    <div className="absolute top-4 right-4 bg-black/35 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white uppercase tracking-wider font-bold border border-white/5">
                      Server
                    </div>
                  </div>

                  {/* Konten Kartu */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div
                      onClick={() => router.push(`/server/${server.id}`)}
                      className="flex gap-4 items-center"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-tr ${getGradient(server.name)} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                        {server.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-base truncate group-hover:text-indigo-400 transition">{server.name}</h3>
                        <p className="text-slate-400 text-xs mt-0.5">Voice channels ready</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#35373d]/60 flex items-center justify-between text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInviteModalServerId(server.id);
                          setInviteModalServerName(server.name);
                        }}
                        className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 transition font-semibold"
                        title="Undang teman"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>Undang</span>
                      </button>
                      <span
                        onClick={() => router.push(`/server/${server.id}`)}
                        className="text-indigo-400 font-semibold group-hover:translate-x-1 transition flex items-center gap-0.5 cursor-pointer"
                      >
                        <Server className="w-3.5 h-3.5 text-slate-500 mr-1" />
                        <span>Masuk</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Kustom - Pembuatan Server */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b2d31] border border-[#35373d] p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <h2 className="text-white text-xl font-bold mb-2">Buat Server Baru</h2>
            <p className="text-slate-400 text-sm mb-4">Beri nama server baru Anda agar teman-teman Anda dapat mengenalinya.</p>
            
            <input
              type="text"
              placeholder="Nama Server"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#1e1f22] text-white border border-[#35373d] outline-none focus:ring-2 focus:ring-indigo-500/50 mb-6 text-sm placeholder-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && !creating && handleCreateServerSubmit()}
              autoFocus
            />
            
            <div className="flex gap-3 justify-end text-sm">
              <button
                disabled={creating}
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewServerName('');
                }}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition font-medium"
              >
                Batal
              </button>
              <button
                disabled={creating || !newServerName.trim()}
                onClick={handleCreateServerSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#5865f2] text-white hover:bg-[#4752c4] font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
              >
                {creating ? 'Membuat...' : 'Buat Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kustom - Edit Profil */}
      {isProfileModalOpen && (
        <ProfileModal
          onClose={() => setIsProfileModalOpen(false)}
          onProfileUpdate={refreshProfile}
        />
      )}

      {/* Friends Panel */}
      {isFriendsPanelOpen && userId && (
        <FriendsPanel
          currentUserId={userId}
          onClose={() => setIsFriendsPanelOpen(false)}
        />
      )}

      {/* Join Server Modal */}
      {isJoinServerOpen && userId && (
        <JoinServerModal
          userId={userId}
          onClose={() => setIsJoinServerOpen(false)}
          onJoined={handleJoinedServer}
        />
      )}

      {/* Invite Modal */}
      {inviteModalServerId && inviteModalServerName && (
        <InviteModal
          serverId={inviteModalServerId}
          serverName={inviteModalServerName}
          onClose={() => { setInviteModalServerId(null); setInviteModalServerName(null); }}
        />
      )}
    </div>
  );
}