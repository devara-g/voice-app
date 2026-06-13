'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Server {
  id: string;
  name: string;
  image_url: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/');
      return;
    } else {
      setUserEmail(user.email ?? null);
    }

    await fetchServers(user.id);
  };

  const fetchServers = async (userId: string) => {
    setLoading(true);
    setErrorMessage(null);
    
    const { data, error } = await supabase
      .from('servers')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching servers:', error.message, error.code, error.details, error.hint);
      setErrorMessage(error.message);
    } else {
      setServers(data || []);
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const createServer = async () => {
    const serverName = prompt('Masukkan nama server:');
    if (!serverName) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('servers')
      .insert([
        { 
          name: serverName, 
          owner_id: user.id 
        }
      ])
      .select()
      .single();

    if (error) {
      alert('Gagal membuat server: ' + error.message);
    } else {
      setServers((currentServers) => [...currentServers, data]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1f22]">
      {/* Sidebar kiri - daftar server */}
      <div className="fixed left-0 top-0 h-full w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#2b2d31]">
        {/* Home button (nanti) */}
        <div className="w-12 h-12 bg-[#5865f2] rounded-2xl hover:rounded-xl transition-all cursor-pointer flex items-center justify-center text-white font-bold">
          V
        </div>
        
        <div className="w-8 h-[2px] bg-[#2b2d31] my-2" />
        
        {/* Daftar server */}
        {servers.map((server) => (
          <div
            key={server.id}
            className="w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all cursor-pointer flex items-center justify-center text-white font-semibold hover:bg-[#5865f2] group relative"
          >
            {server.name.charAt(0).toUpperCase()}
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              {server.name}
            </div>
          </div>
        ))}
        
        {/* Tombol buat server baru */}
        <div
          onClick={createServer}
          className="w-12 h-12 bg-[#2b2d31] rounded-2xl hover:rounded-xl transition-all cursor-pointer flex items-center justify-center text-[#23a559] text-2xl hover:bg-[#23a559] hover:text-white"
        >
          +
        </div>
      </div>

      {/* Area utama */}
      <div className="ml-[72px]">
        {/* Header */}
        <div className="h-12 bg-[#2b2d31] border-b border-[#1e1f22] flex items-center justify-between px-4 shadow-md">
          <div className="text-white font-semibold">
            Dashboard
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Konten */}
        <div className="p-6">
          <h1 className="text-white text-2xl font-bold mb-4">Server Kamu</h1>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              <p className="font-semibold">Gagal memuat server</p>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>
          )}
          
          {servers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Kamu belum punya server</p>
              <button
                onClick={createServer}
                className="bg-[#5865f2] text-white px-4 py-2 rounded hover:bg-[#4752c4] transition"
              >
                + Buat Server Pertama
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {servers.map((server) => (
                <div
                  key={server.id}
                  onClick={() => router.push(`/server/${server.id}`)}
                  className="bg-[#2b2d31] p-4 rounded-lg cursor-pointer hover:bg-[#35373d] transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#5865f2] rounded-full flex items-center justify-center text-white font-bold">
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{server.name}</h3>
                      <p className="text-gray-400 text-sm">Klik untuk masuk</p>
                    </div>
                  </div>
                  <div className="text-gray-500 text-sm">
                    ▶
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}