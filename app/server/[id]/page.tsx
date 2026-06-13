'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VoiceChat from '@/components/VoiceChat';
import { User } from '@supabase/supabase-js';
import { Plus, Compass, Users, Volume2, ChevronRight, LogOut as LeaveIcon } from 'lucide-react';
import ProfileModal from '@/components/ProfileModal';

interface Server {
  id: string;
  name: string;
  image_url: string | null;
  owner_id: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

interface Member {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function ServerDetail() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.id as string;

  const [server, setServer] = useState<Server | null>(null);
  const [servers, setServers] = useState<Server[]>([]); // Menyimpan daftar server pengguna
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<{ id: string; name: string } | null>(null);

  // State untuk modal kustom saluran suara
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // State untuk modal kustom server baru
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [creatingServer, setCreatingServer] = useState(false);

  // State untuk profil
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const createDefaultChannel = async () => {
      await supabase
        .from('channels')
        .insert([
          { server_id: serverId, name: 'General', type: 'voice' }
        ]);
      
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId);
      
      if (data) setChannels(data);
    };

    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);
      setDisplayName(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User');
      setAvatarUrl(user.user_metadata?.avatar_url ?? 'preset:purple');

      // Ambil data server aktif
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single();

      if (serverError || !serverData) {
        console.error('Server tidak ditemukan:', serverError);
        router.push('/dashboard');
        return;
      }
      setServer(serverData);

      // Ambil daftar seluruh server milik pengguna untuk sidebar
      const { data: allServers } = await supabase
        .from('servers')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });
      if (allServers) setServers(allServers);

      // Ambil data saluran suara
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: true });

      if (!channelsError && channelsData && channelsData.length > 0) {
        setChannels(channelsData);
      } else {
        await createDefaultChannel();
      }

      // Ambil data anggota pelayan
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('user_id')
        .eq('server_id', serverId);

      if (!membersError && membersData) {
        const userIds = membersData.map((m: { user_id: string }) => m.user_id);
        let emailMap: Record<string, string> = {};
        let profileMap: Record<string, { email: string; display_name: string; avatar_url: string | null; bio: string | null }> = {};
        
        try {
          const emailResponse = await fetch('/api/users/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds }),
          });
          
          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            emailMap = emailData.emails || {};
            profileMap = emailData.profiles || {};
          }
        } catch (err) {
          console.error('Gagal mendapatkan e-mel ahli:', err);
        }

        const membersWithProfiles = membersData.map((member: { user_id: string }) => {
          const profile = profileMap[member.user_id];
          return {
            user_id: member.user_id,
            email: profile?.email || emailMap[member.user_id] || 'Unknown',
            display_name: profile?.display_name || emailMap[member.user_id]?.split('@')[0] || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            bio: profile?.bio || null,
          };
        });
        setMembers(membersWithProfiles);
      }

      setLoading(false);
    };

    checkUserAndFetch();
  }, [serverId, router, refreshCount]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCreateChannelSubmit = async () => {
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);

    const { error } = await supabase
      .from('channels')
      .insert([
        { server_id: serverId, name: newChannelName.trim(), type: 'voice' }
      ]);
    
    setCreatingChannel(false);

    if (error) {
      alert('Gagal membuat channel: ' + error.message);
    } else {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId);
      if (data) setChannels(data);
      setIsCreateChannelOpen(false);
      setNewChannelName('');
    }
  };

  const handleCreateServerSubmit = async () => {
    if (!newServerName.trim()) return;
    setCreatingServer(true);

    if (!currentUser) return;

    const { data, error } = await supabase
      .from('servers')
      .insert([
        { 
          name: newServerName.trim(), 
          owner_id: currentUser.id 
        }
      ])
      .select()
      .single();

    setCreatingServer(false);

    if (error) {
      alert('Gagal membuat server: ' + error.message);
    } else {
      setServers((currentServers) => [...currentServers, data]);
      setIsCreateServerOpen(false);
      setNewServerName('');
      // Navigasi ke server baru
      router.push(`/server/${data.id}`);
    }
  };

  const joinVoiceChannel = (channelId: string, channelName: string) => {
    setActiveVoiceChannel({ id: channelId, name: channelName });
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
        <div className="text-gray-400 text-sm font-medium">Memuatkan data server...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] flex relative">
      
      {/* 1. Sidebar Kiri Jauh - Daftar Server ala Discord */}
      <div className="fixed left-0 top-0 h-full w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#2b2d31] z-20">
        {/* Home / Dashboard button */}
        <div 
          onClick={() => router.push('/dashboard')}
          className="group relative w-12 h-12 flex items-center justify-center cursor-pointer"
        >
          {/* Pill Indicator */}
          <div className="absolute left-0 w-1 bg-white rounded-r-md transition-all duration-200 origin-left scale-y-0 group-hover:scale-y-[0.6] h-8" />
          
          <div className="w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-white hover:bg-[#5865f2]">
            <Compass className="w-6 h-6" />
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
            Dashboard
          </div>
        </div>
        
        <div className="w-8 h-[2px] bg-[#2b2d31] my-1" />
        
        {/* Daftar server */}
        {servers.map((s) => {
          const isActive = s.id === serverId;
          return (
            <div
              key={s.id}
              onClick={() => router.push(`/server/${s.id}`)}
              className="group relative w-12 h-12 flex items-center justify-center cursor-pointer"
            >
              {/* Pill Indicator */}
              <div className={`absolute left-0 w-1 bg-white rounded-r-md transition-all duration-200 origin-left ${
                isActive ? 'scale-y-100 h-10' : 'scale-y-0 group-hover:scale-y-[0.6] h-8'
              }`} />
              
              <div className={`w-12 h-12 rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-white font-bold shadow-md ${
                isActive 
                  ? `bg-gradient-to-tr ${getGradient(s.name)} rounded-xl` 
                  : `bg-[#2b2d31] hover:bg-gradient-to-tr hover:${getGradient(s.name)}`
              }`}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
                {s.name}
              </div>
            </div>
          );
        })}
        
        {/* Tombol buat server baru */}
        <div
          onClick={() => setIsCreateServerOpen(true)}
          className="group relative w-12 h-12 flex items-center justify-center cursor-pointer mt-1"
        >
          {/* Pill Indicator */}
          <div className="absolute left-0 w-1 bg-[#23a559] rounded-r-md transition-all duration-200 origin-left scale-y-0 group-hover:scale-y-[0.6] h-8" />
          
          <div className="w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all flex items-center justify-center text-[#23a559] hover:bg-[#23a559] hover:text-white shadow-md">
            <Plus className="w-6 h-6" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
            Tambah Server
          </div>
        </div>
      </div>

      {/* Panel Utama (Di-offset ke kanan agar muat sidebar server) */}
      <div className="ml-[72px] flex-1 flex min-h-screen">
        
        {/* 2. Sidebar Tengah - Daftar Saluran Suara */}
        <div className="w-60 bg-[#2b2d31] flex flex-col border-r border-[#1e1f22]/30">
          {/* Header Server Name */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#1e1f22] shadow-sm bg-[#2b2d31]/80 backdrop-blur-md">
            <h2 className="text-white font-extrabold text-sm truncate uppercase tracking-wider">{server?.name}</h2>
          </div>
          
          {/* Saluran Suara */}
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-slate-400 text-xs font-extrabold uppercase tracking-widest">Saluran Suara</span>
              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="text-slate-400 hover:text-white transition rounded p-0.5 hover:bg-[#35373d]"
                title="Buat Saluran Suara"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => joinVoiceChannel(channel.id, channel.name)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#35373d] text-slate-300 hover:text-white cursor-pointer group transition-all"
                >
                  <Volume2 className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  <span className="text-sm font-semibold flex-1 truncate">{channel.name}</span>
                  <span className="text-indigo-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-bold">
                    <span>Masuk</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Profil Pengguna Aktif */}
          <div className="h-16 bg-[#232428] flex items-center justify-between px-3 border-t border-[#1e1f22]/50">
            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 min-w-0 cursor-pointer hover:bg-[#2b2d31]/40 p-1 rounded-xl transition-all select-none group"
              title="Edit Profil"
            >
              {avatarUrl?.startsWith('preset:') ? (
                <div className={`w-8.5 h-8.5 rounded-full bg-gradient-to-tr ${getPresetClasses(avatarUrl)} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                  {(displayName || currentUser?.email || '?').charAt(0).toUpperCase()}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={avatarUrl || ''} 
                  alt="Profile" 
                  className="w-8.5 h-8.5 rounded-full object-cover border border-zinc-700 shadow-sm"
                  onError={() => setAvatarUrl('preset:purple')}
                />
              )}
              <div className="text-sm truncate min-w-0">
                <div className="text-white text-xs font-bold truncate max-w-[90px] group-hover:text-indigo-400 transition">
                  {displayName}
                </div>
                <div className="text-slate-500 text-[9px] truncate max-w-[90px]">
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-[#2b2d31]/50 transition"
              title="Logout"
            >
              <LeaveIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Panel Tengah - Area Obrolan */}
        <div className="flex-1 flex flex-col bg-[#313338]">
          <div className="h-14 bg-[#313338] border-b border-[#1e1f22] flex items-center px-6 shadow-sm">
            <span className="text-white font-extrabold text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <span>Saluran Suara Aktif</span>
            </span>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-8 text-center select-none">
            <div className="max-w-sm">
              <div className="w-20 h-20 bg-[#2b2d31] rounded-3xl flex items-center justify-center text-4xl shadow-inner mx-auto mb-6">🎙️</div>
              <h3 className="text-white text-lg font-bold">Obrolan Suara SiHALO</h3>
              <p className="text-slate-400 text-sm mt-2">
                Pilih salah satu saluran suara di menu kiri untuk terhubung dan mulai mengobrol secara langsung dengan anggota server lainnya.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Sidebar Kanan - Anggota Pelayan */}
        <div className="w-60 bg-[#2b2d31] border-l border-[#1e1f22]/30 flex flex-col">
          <div className="h-14 flex items-center px-4 border-b border-[#1e1f22] shadow-sm">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Anggota — {members.length}</span>
            </span>
          </div>
          
          <div className="p-3 overflow-y-auto space-y-1 flex-1">
            {members.map((member) => {
              const isLocal = currentUser?.id === member.user_id;
              const hasPresetAvatar = member.avatar_url?.startsWith('preset:');
              
              return (
                <div 
                  key={member.user_id} 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#35373d] transition cursor-pointer group"
                  title={member.bio || undefined}
                >
                  {hasPresetAvatar ? (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getPresetClasses(member.avatar_url || '')} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                      {member.display_name.charAt(0).toUpperCase()}
                    </div>
                  ) : member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={member.avatar_url} 
                      alt={member.display_name} 
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700 shadow-sm"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradient(member.email)} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                      {member.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-slate-300 text-sm font-semibold truncate block max-w-[120px]">
                      {member.display_name}
                    </span>
                    <span className="text-slate-500 text-[10px] block mt-0.5 uppercase tracking-wider font-semibold">
                      {isLocal ? 'Kamu' : 'Anggota'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. LiveKit Room Modal Overlay */}
      {activeVoiceChannel && (
        <VoiceChat
          serverId={serverId}
          channelId={activeVoiceChannel.id}
          channelName={activeVoiceChannel.name}
          userEmail={currentUser?.email || 'User'}
          userDisplayName={displayName || currentUser?.email?.split('@')[0] || 'User'}
          userAvatarUrl={avatarUrl || 'preset:purple'}
          onClose={() => setActiveVoiceChannel(null)}
        />
      )}

      {/* 6. Modal Kustom - Pembuatan Saluran */}
      {isCreateChannelOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b2d31] border border-[#35373d] p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <h2 className="text-white text-xl font-bold mb-2">Buat Saluran Suara Baru</h2>
            <p className="text-slate-400 text-sm mb-4">Buat tempat mengobrol suara baru dalam server ini.</p>
            
            <input
              type="text"
              placeholder="Nama Saluran (contoh: Lounge, Mabar)"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#1e1f22] text-white border border-[#35373d] outline-none focus:ring-2 focus:ring-indigo-500/50 mb-6 text-sm placeholder-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && !creatingChannel && handleCreateChannelSubmit()}
              autoFocus
            />
            
            <div className="flex gap-3 justify-end text-sm">
              <button
                disabled={creatingChannel}
                onClick={() => {
                  setIsCreateChannelOpen(false);
                  setNewChannelName('');
                }}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition font-medium"
              >
                Batal
              </button>
              <button
                disabled={creatingChannel || !newChannelName.trim()}
                onClick={handleCreateChannelSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#23a559] text-white hover:bg-[#1a6335] font-bold transition shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50"
              >
                {creatingChannel ? 'Membuat...' : 'Buat Saluran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Kustom - Pembuatan Server */}
      {isCreateServerOpen && (
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
              onKeyDown={(e) => e.key === 'Enter' && !creatingServer && handleCreateServerSubmit()}
              autoFocus
            />
            
            <div className="flex gap-3 justify-end text-sm">
              <button
                disabled={creatingServer}
                onClick={() => {
                  setIsCreateServerOpen(false);
                  setNewServerName('');
                }}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition font-medium"
              >
                Batal
              </button>
              <button
                disabled={creatingServer || !newServerName.trim()}
                onClick={handleCreateServerSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#5865f2] text-white hover:bg-[#4752c4] font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
              >
                {creatingServer ? 'Membuat...' : 'Buat Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kustom - Edit Profil */}
      {isProfileModalOpen && (
        <ProfileModal
          onClose={() => setIsProfileModalOpen(false)}
          onProfileUpdate={() => setRefreshCount(prev => prev + 1)}
        />
      )}
    </div>
  );
}