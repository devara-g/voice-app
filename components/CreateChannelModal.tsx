'use client';

import { useState } from 'react';
import { X, Hash, Volume2 } from 'lucide-react';

interface CreateChannelModalProps {
  serverId: string;
  onClose: () => void;
  onCreated: () => void; // Callback to refresh channels
}

export default function CreateChannelModal({ serverId, onClose, onCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: serverId,
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat channel');
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-y-auto z-50 p-4">
      <div className="bg-[#313338] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">Buat Channel</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 pt-0">
          <p className="text-zinc-400 text-sm mb-4">Pilih tipe channel yang ingin Anda buat untuk server ini.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Tipe Channel */}
            <div className="flex flex-col gap-2">
              <label className="text-zinc-300 text-xs font-bold uppercase">Tipe Channel</label>

              <div
                onClick={() => setType('text')}
                className={`flex items-center gap-4 p-3 rounded-md cursor-pointer border ${type === 'text' ? 'bg-[#2b2d31] border-indigo-500' : 'bg-[#2b2d31]/50 border-transparent hover:bg-[#2b2d31]'}`}
              >
                <Hash className="w-6 h-6 text-zinc-400" />
                <div className="flex flex-col flex-1">
                  <span className="text-zinc-200 font-medium text-sm">Text Channel</span>
                  <span className="text-zinc-400 text-xs">Kirim pesan teks, gambar, dan stiker.</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${type === 'text' ? 'border-indigo-500' : 'border-zinc-500'}`}>
                  {type === 'text' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                </div>
              </div>

              <div
                onClick={() => setType('voice')}
                className={`flex items-center gap-4 p-3 rounded-md cursor-pointer border ${type === 'voice' ? 'bg-[#2b2d31] border-indigo-500' : 'bg-[#2b2d31]/50 border-transparent hover:bg-[#2b2d31]'}`}
              >
                <Volume2 className="w-6 h-6 text-zinc-400" />
                <div className="flex flex-col flex-1">
                  <span className="text-zinc-200 font-medium text-sm">Voice Channel</span>
                  <span className="text-zinc-400 text-xs">Ngobrol bareng teman-teman dengan suara.</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${type === 'voice' ? 'border-indigo-500' : 'border-zinc-500'}`}>
                  {type === 'voice' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                </div>
              </div>
            </div>

            {/* Nama Channel */}
            <div className="flex flex-col gap-2">
              <label className="text-zinc-300 text-xs font-bold uppercase">Nama Channel</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-zinc-400">
                  {type === 'text' ? <Hash className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="baru-channel"
                  className="w-full bg-[#1e1f22] text-zinc-200 rounded-md py-2.5 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
              </div>
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-300 hover:underline text-sm font-medium">Batal</button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-md font-medium text-sm transition disabled:opacity-50"
              >
                {loading ? 'Membuat...' : 'Buat Channel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
