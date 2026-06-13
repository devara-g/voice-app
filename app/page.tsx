'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Cek apakah user sudah login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router]);

  const handleSignUp = async () => {
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    setLoading(false);
    
    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Cek email untuk verifikasi!');
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    setLoading(false);
    
    if (error) {
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Login berhasil! Mengarahkan...');
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center">
      <div className="bg-[#2b2d31] p-8 rounded-lg w-96">
        <h1 className="text-white text-2xl font-bold mb-2 text-center">🎤 Voice App</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Login atau daftar untuk mulai</p>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-3 rounded bg-[#1e1f22] text-white border-none outline-none focus:ring-2 focus:ring-[#5865f2]"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
          className="w-full p-3 mb-4 rounded bg-[#1e1f22] text-white border-none outline-none focus:ring-2 focus:ring-[#5865f2]"
        />
        
        <div className="flex gap-3">
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="flex-1 bg-[#5865f2] text-white p-2 rounded hover:bg-[#4752c4] disabled:opacity-50 transition"
          >
            {loading ? '...' : 'Daftar'}
          </button>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex-1 bg-[#248046] text-white p-2 rounded hover:bg-[#1a6335] disabled:opacity-50 transition"
          >
            {loading ? '...' : 'Login'}
          </button>
        </div>
        
        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}