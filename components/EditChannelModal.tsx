'use client';

import { useEffect, useState } from 'react';
import { X, Hash, Trash2 } from 'lucide-react';

interface EditChannelModalProps {
  channelId: string;
  serverId: string;
  initialName: string;
  userId: string;
  onClose: () => void;
  onUpdated: (updated: { id: string; name: string; type: 'text' | 'voice' }) => void;
  onDeleted: (channelId: string) => void;
}

export default function EditChannelModal({
  channelId,
  serverId,
  initialName,
  userId,
  onClose,
  onUpdated,
  onDeleted,
}: EditChannelModalProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          server_id: serverId,
          user_id: userId,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah channel');
      }

      onUpdated(data.channel);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmation = window.prompt(`Ketik nama channel "${initialName}" untuk menghapusnya`);
    if (confirmation?.trim() !== initialName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          user_id: userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus channel');
      }

      onDeleted(channelId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[#313338] shadow-2xl">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Channel</h2>
            <p className="text-sm text-zinc-400">Ubah nama channel ini.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 transition hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4 pt-0">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">Nama Channel</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-zinc-400">
                <Hash className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="nama-channel"
                className="w-full rounded-xl border border-[#35373d] bg-[#1e1f22] py-2.5 pl-9 pr-3 text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Channel
            </button>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:underline">
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="rounded-md bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}