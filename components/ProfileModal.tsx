'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, User, FileText, Camera, Check } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
  onProfileUpdate?: () => void;
}

const PRESET_GRADIENTS = [
  { id: 'preset:pink', name: 'Rose Petal', classes: 'from-pink-500 to-rose-500' },
  { id: 'preset:purple', name: 'Indigo Nights', classes: 'from-purple-500 to-indigo-500' },
  { id: 'preset:blue', name: 'Deep Ocean', classes: 'from-blue-500 to-cyan-500' },
  { id: 'preset:emerald', name: 'Teal Forest', classes: 'from-emerald-500 to-teal-500' },
  { id: 'preset:orange', name: 'Sunset Glow', classes: 'from-orange-500 to-amber-500' },
];

export default function ProfileModal({ onClose, onProfileUpdate }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          const metadata = user.user_metadata || {};
          setDisplayName(metadata.display_name || user.email?.split('@')[0] || '');
          setBio(metadata.bio || '');
          setAvatarUrl(metadata.avatar_url || 'preset:purple');
        }
      } catch (err) {
        console.error('Error fetching user for profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profil Anda berhasil diperbarui!' });
      if (onProfileUpdate) onProfileUpdate();
      
      // Auto close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal memperbarui profil.' });
    } finally {
      setSaving(false);
    }
  };

  const getPresetClasses = (id: string) => {
    return PRESET_GRADIENTS.find(p => p.id === id)?.classes || 'from-zinc-650 to-zinc-800';
  };

  const isPreset = (url: string) => url.startsWith('preset:');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-[#1e1f22] border border-[#2b2d31] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-fade-in text-zinc-100 flex flex-col">
        {/* Header */}
        <div className="bg-[#2b2d31] px-5 py-4 flex justify-between items-center border-b border-[#1e1f22]">
          <h2 className="text-white text-lg font-bold">Edit Profil Anda</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-zinc-400 text-sm">Memuat informasi profil...</div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[80vh]">
            
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-3">
                {isPreset(avatarUrl) ? (
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${getPresetClasses(avatarUrl)} flex items-center justify-center text-white text-3xl font-extrabold shadow-xl`}>
                    {(displayName || email || '?').charAt(0).toUpperCase()}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                    alt="Profile Preview" 
                    className="w-20 h-20 rounded-full object-cover border border-zinc-700 shadow-xl"
                    onError={() => setAvatarUrl('preset:purple')} // Fallback if image fails
                  />
                )}
                <div className="absolute -bottom-1 -right-1 bg-zinc-950/80 border border-zinc-800 p-1.5 rounded-full text-zinc-400">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pratinjau Avatar</span>
            </div>

            {/* Email (Read Only) */}
            <div>
              <label className="block text-zinc-500 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Alamat Email (Akun)
              </label>
              <input
                type="text"
                disabled
                value={email}
                className="w-full p-2.5 rounded-xl bg-zinc-950/40 text-zinc-500 border border-zinc-850 cursor-not-allowed text-xs outline-none"
              />
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Nama Tampilan / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama tampilan Anda"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950/50 border border-zinc-850 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Bio / Deskripsi Singkat
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-3 pointer-events-none">
                  <FileText className="h-4 w-4 text-zinc-500" />
                </div>
                <textarea
                  placeholder="Ceritakan sedikit tentang diri Anda..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950/50 border border-zinc-850 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 transition resize-none"
                />
              </div>
            </div>

            {/* Avatar Selection Tab */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                Pilih Preset Avatar Gradien
              </label>
              <div className="flex gap-3 justify-center mb-4">
                {PRESET_GRADIENTS.map((p) => {
                  const selected = avatarUrl === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAvatarUrl(p.id)}
                      className={`w-9 h-9 rounded-full bg-gradient-to-tr ${p.classes} flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition-all relative border border-white/5 shadow-md`}
                      title={p.name}
                    >
                      {selected && (
                        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3px]" />
                        </div>
                      )}
                      {!selected && (displayName || email || '?').charAt(0).toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Atau masukkan URL gambar kustom
              </label>
              <input
                type="text"
                placeholder="https://domain.com/gambar.jpg"
                value={isPreset(avatarUrl) ? '' : avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value || 'preset:purple')}
                className="w-full p-2 bg-zinc-950/50 border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-zinc-750 focus:border-zinc-750 transition"
              />
            </div>

            {/* Notification Alert */}
            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium border animate-fade-in ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                <span>{message.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end text-sm pt-2 border-t border-[#2b2d31]/50">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />}
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
