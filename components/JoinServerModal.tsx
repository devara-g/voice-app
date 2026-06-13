'use client';

import { useState } from 'react';
import { X, Hash, Loader2, ArrowRight, Check } from 'lucide-react';

interface JoinServerModalProps {
  userId: string;
  onClose: () => void;
  onJoined: (serverId: string, serverName: string) => void;
}

export default function JoinServerModal({ userId, onClose, onJoined }: JoinServerModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ serverId: string; serverName: string } | null>(null);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase(), userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kode undangan tidak valid');
        setLoading(false);
        return;
      }

      setSuccess({ serverId: data.serverId, serverName: data.serverName });
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[#2b2d31] border border-[#1e1f22] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1f22]">
          <div>
            <h2 className="text-white font-bold text-lg">Gabung ke Server</h2>
            <p className="text-slate-400 text-sm mt-0.5">Masukkan kode undangan untuk bergabung</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#35373d] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!success ? (
            <>
              {/* Invite code input */}
              <div className="mb-4">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">
                  Kode Undangan
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Contoh: ABC12345"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleJoin()}
                    className="w-full pl-10 pr-4 py-3 bg-[#1e1f22] text-white rounded-xl border border-[#35373d] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm placeholder-slate-600 font-mono tracking-widest uppercase"
                    maxLength={8}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="mt-2 text-red-400 text-xs font-semibold flex items-center gap-1.5">
                    <span>⚠️</span> {error}
                  </p>
                )}
              </div>

              {/* Info box */}
              <div className="bg-[#1e1f22] rounded-xl p-4 mb-6 border border-[#35373d]/50">
                <p className="text-slate-400 text-xs leading-relaxed">
                  💡 <strong className="text-slate-300">Cara mendapatkan kode:</strong> Minta pemilik server untuk membagikan kode undangan mereka. Kode dapat ditemukan di halaman server.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleJoin}
                  disabled={loading || !inviteCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mencari...
                    </>
                  ) : (
                    <>
                      Gabung Server
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Berhasil Bergabung!</h3>
              <p className="text-slate-400 text-sm mb-6">
                Kamu sekarang menjadi anggota <span className="text-white font-semibold">{success.serverName}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition"
                >
                  Nanti
                </button>
                <button
                  onClick={() => onJoined(success.serverId, success.serverName)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                >
                  Buka Server
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
