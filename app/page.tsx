'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mail, Lock, Shield, Activity, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('❌ Harap isi semua kolom.');
      return;
    }

    setLoading(true);
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setMessage('❌ Ralat: ' + error.message);
      } else {
        setMessage('✅ Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setMessage('❌ Ralat: ' + error.message);
      } else {
        setMessage('✅ Berhasil masuk! Mengalihkan...');
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #27272a 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />
      {/* Subtle radial gradients from corners like Vercel/Stripe */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3b82f6]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6366f1]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[440px] px-6 relative z-10">
        
        {/* Branding / Head */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl shadow-black/40">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Selamat datang di SiHALO
          </h1>
          <p className="text-zinc-400 text-xs mt-1.5 text-center max-w-[280px]">
            Platform komunikasi suara berkualitas tinggi untuk tim modern.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.4)] animate-fade-in">
          {/* Tab Selector */}
          <div className="flex p-1 bg-zinc-950/80 rounded-xl mb-6 border border-zinc-800/50">
            <button
              type={"button" as "button"}
              onClick={() => { setIsSignUp(false); setMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                !isSignUp 
                  ? 'bg-zinc-850 text-white shadow-sm border border-zinc-700/50' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Masuk
            </button>
            <button
              type={"button" as "button"}
              onClick={() => { setIsSignUp(true); setMessage(''); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isSignUp 
                  ? 'bg-zinc-850 text-white shadow-sm border border-zinc-700/50' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 py-2 rounded-xl font-semibold text-sm transition active:scale-[0.98] disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Daftar Akun Baru' : 'Masuk ke Platform'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Alert Message */}
          {message && (
            <div className={`mt-5 p-3 rounded-xl text-xs font-medium border animate-fade-in ${
              message.includes('✅') 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <div className="flex gap-2 items-center">
                <span>{message.includes('✅') ? '✓' : '⚠'}</span>
                <span>{message.replace(/^[❌✅]\s*/, '')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-zinc-600">
          <Shield className="w-3.5 h-3.5" />
          <span>Keamanan dilindungi oleh Supabase Auth</span>
        </div>

      </div>
    </div>
  );
}