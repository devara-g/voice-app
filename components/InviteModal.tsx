'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Link, RefreshCw } from 'lucide-react';

interface InviteModalProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export default function InviteModal({ serverId, serverName, onClose }: InviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchInviteCode = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/join?serverId=${serverId}`);
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.inviteCode);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInviteCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[#2b2d31] border border-[#1e1f22] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1f22]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center">
              <Link className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Undang ke Server</h2>
              <p className="text-slate-400 text-xs truncate max-w-[200px]">{serverName}</p>
            </div>
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
          <p className="text-slate-400 text-sm mb-4">
            Bagikan kode undangan ini ke temanmu agar mereka bisa bergabung ke server <strong className="text-white">{serverName}</strong>.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-[#1e1f22] rounded-xl p-4 flex items-center justify-between border border-[#35373d] mb-4">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Kode Undangan</p>
                  <p className="text-white font-mono text-2xl font-bold tracking-widest">{inviteCode}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchInviteCode}
                    className="w-9 h-9 bg-[#2b2d31] hover:bg-[#35373d] rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition"
                    title="Generate kode baru"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                    title="Salin kode"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {copied && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5 text-green-400 text-xs font-semibold flex items-center gap-2 mb-4">
                  <Check className="w-3.5 h-3.5" />
                  Kode berhasil disalin!
                </div>
              )}

              <p className="text-slate-500 text-xs">
                💡 Kode ini bisa digunakan berkali-kali. Siapapun yang memiliki kode ini bisa bergabung ke server.
              </p>
            </>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#1e1f22] hover:bg-[#35373d] text-white text-sm font-medium transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
