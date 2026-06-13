'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, User, FileText, Camera, Check, Upload, ImageIcon, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
  onProfileUpdate?: () => void;
}

const PRESET_GRADIENTS = [
  { id: 'preset:pink', name: 'Rose Petal', classes: 'bg-pink-500' },
  { id: 'preset:purple', name: 'Indigo Nights', classes: 'bg-purple-500' },
  { id: 'preset:blue', name: 'Deep Ocean', classes: 'bg-blue-500' },
  { id: 'preset:emerald', name: 'Teal Forest', classes: 'bg-emerald-500' },
  { id: 'preset:orange', name: 'Sunset Glow', classes: 'bg-orange-500' },
];

export default function ProfileModal({ onClose, onProfileUpdate }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local preview sebelum upload selesai
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [bannerLocalPreview, setBannerLocalPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          setUserId(user.id);
          const metadata = user.user_metadata || {};
          setDisplayName(metadata.display_name || user.email?.split('@')[0] || '');
          setBio(metadata.bio || '');
          setAvatarUrl(metadata.avatar_url || 'preset:purple');
          setBannerUrl(metadata.banner_url || '');
        }
      } catch (err) {
        console.error('Error fetching user for profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi client-side
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File terlalu besar. Maksimal 5MB.' });
      return;
    }

    // Tampilkan preview lokal langsung
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setMessage(null);

    // Upload ke server
    setUploading(true);
    setUploadProgress(0);

    // Simulasi progress (progress actual fetch API tidak bisa di-track)
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 85));
    }, 150);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload gagal');
      }

      const { url } = await res.json();
      setAvatarUrl(url);
      setLocalPreview(null); // Pakai URL asli sekarang
      setMessage({ type: 'success', text: 'Foto berhasil diupload!' });
    } catch (err) {
      clearInterval(progressInterval);
      setLocalPreview(null);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal mengupload foto.' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input supaya bisa pilih file yang sama lagi
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi client-side
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File terlalu besar. Maksimal 5MB.' });
      return;
    }

    // Tampilkan preview lokal langsung
    const objectUrl = URL.createObjectURL(file);
    setBannerLocalPreview(objectUrl);
    setMessage(null);

    // Upload ke server
    setBannerUploading(true);
    setBannerUploadProgress(0);

    const progressInterval = setInterval(() => {
      setBannerUploadProgress((p) => Math.min(p + 15, 85));
    }, 150);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setBannerUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload gagal');
      }

      const { url } = await res.json();
      setBannerUrl(url);
      setBannerLocalPreview(null);
      setMessage({ type: 'success', text: 'Banner berhasil diupload!' });
    } catch (err) {
      clearInterval(progressInterval);
      setBannerLocalPreview(null);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal mengupload banner.' });
    } finally {
      setBannerUploading(false);
      setBannerUploadProgress(0);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
          banner_url: bannerUrl.trim() || null,
        },
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      if (onProfileUpdate) onProfileUpdate();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal memperbarui profil.' });
    } finally {
      setSaving(false);
    }
  };

  const getPresetClasses = (id: string) =>
    PRESET_GRADIENTS.find((p) => p.id === id)?.classes || 'from-zinc-600 to-zinc-800';

  const isPreset = (url: string) => url.startsWith('preset:');

  const displayAvatar = localPreview || avatarUrl;
  const displayBanner = bannerLocalPreview || bannerUrl;

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
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-zinc-400 text-sm">Memuat informasi profil...</div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[85vh]">

            {/* Avatar Preview + Upload */}
            <div className="flex flex-col items-center">
              {/* Avatar circle with upload overlay */}
              <div
                className="relative mb-3 group cursor-pointer"
                onClick={() => !uploading && fileInputRef.current?.click()}
                title="Klik untuk ganti foto"
              >
                {/* Avatar */}
                {!localPreview && isPreset(displayAvatar) ? (
                  <div className={`w-24 h-24 rounded-full ${getPresetClasses(displayAvatar)} flex items-center justify-center text-white text-4xl font-extrabold shadow-xl`}>
                    {(displayName || email || '?').charAt(0).toUpperCase()}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt="Preview Avatar"
                    className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 shadow-xl"
                    onError={() => { setAvatarUrl('preset:purple'); setLocalPreview(null); }}
                  />
                )}

                {/* Hover overlay */}
                <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-all duration-200 ${uploading
                    ? 'bg-black/60'
                    : 'bg-black/0 group-hover:bg-black/50'
                  }`}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <span className="text-white text-[10px] font-bold">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 transition flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-white" />
                      <span className="text-white text-[10px] font-bold">Ganti Foto</span>
                    </div>
                  )}
                </div>

                {/* Upload progress ring */}
                {uploading && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="44" fill="none" stroke="#4f46e5" strokeWidth="4" strokeOpacity="0.3" />
                    <circle
                      cx="48" cy="48" r="44" fill="none"
                      stroke="#6366f1" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${2 * Math.PI * 44 * (1 - uploadProgress / 100)}`}
                      className="transition-all duration-200"
                    />
                  </svg>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 hover:text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed mb-1"
              >
                {uploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Mengupload...</>
                ) : (
                  <><Upload className="w-3.5 h-3.5" />Upload Avatar Baru</>
                )}
              </button>
              <span className="text-[10px] text-zinc-500">JPG, PNG, WebP, GIF · Maks 5MB</span>
            </div>

            {/* Banner Upload */}
            <div className="flex flex-col">
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2 text-center">
                Banner Profil
              </label>

              <div
                className={`relative w-full h-32 rounded-xl border-2 ${displayBanner ? 'border-zinc-700' : 'border-dashed border-zinc-700'} overflow-hidden group cursor-pointer bg-zinc-900/50 mb-2 flex items-center justify-center`}
                onClick={() => !bannerUploading && bannerFileInputRef.current?.click()}
              >
                {displayBanner ? (
                  <img
                    src={displayBanner}
                    alt="Preview Banner"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-zinc-500 flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                    <span className="text-xs font-semibold">Klik untuk memilih banner</span>
                  </div>
                )}

                {/* Overlay Banner Upload */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-200 ${bannerUploading ? 'bg-black/70' : 'bg-black/0 group-hover:bg-black/60'
                  }`}>
                  {bannerUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <div className="w-32 bg-zinc-800 rounded-full h-2 overflow-hidden mt-1">
                        <div className="bg-indigo-500 h-full transition-all duration-200" style={{ width: `${bannerUploadProgress}%` }} />
                      </div>
                      <span className="text-white text-[10px] font-bold mt-1">{bannerUploadProgress}%</span>
                    </div>
                  ) : displayBanner ? (
                    <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/20">
                      <Camera className="w-4 h-4 text-white" />
                      <span className="text-white text-xs font-bold">Ganti Banner</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleBannerSelect}
                disabled={bannerUploading}
              />

              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-zinc-500">JPG, PNG, WebP, GIF · Maks 5MB</span>
                {displayBanner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBannerUrl('');
                      setBannerLocalPreview(null);
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                  >
                    Hapus Banner
                  </button>
                )}
              </div>
            </div>

            {/* Preset Gradients */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                Atau pilih avatar preset
              </label>
              <div className="flex gap-3 justify-center">
                {PRESET_GRADIENTS.map((p) => {
                  const selected = avatarUrl === p.id && !localPreview;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setAvatarUrl(p.id); setLocalPreview(null); }}
                      disabled={uploading}
                      className={`w-10 h-10 rounded-full ${p.classes} flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-all relative border-2 shadow-md ${selected ? 'border-white scale-110' : 'border-white/10'
                        }`}
                      title={p.name}
                    >
                      {selected && (
                        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3px]" />
                        </div>
                      )}
                      {!selected && (displayName || email || '?').charAt(0).toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-800" />

            {/* Email (Read Only) */}
            <div>
              <label className="block text-zinc-500 text-[10px] font-bold tracking-wider uppercase mb-1.5">
                Alamat Email (Akun)
              </label>
              <input
                type="text"
                disabled
                value={email}
                className="w-full p-2.5 rounded-xl bg-zinc-950/40 text-zinc-500 border border-zinc-800 cursor-not-allowed text-xs outline-none"
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
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition"
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
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition resize-none"
                />
              </div>
            </div>

            {/* Advanced: Custom URL */}
            <div>
              <label className="block text-zinc-500 text-[10px] font-bold tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" />
                URL Avatar Profil (Opsional)
              </label>
              <input
                type="text"
                placeholder="https://domain.com/foto.jpg"
                value={isPreset(avatarUrl) || localPreview ? '' : avatarUrl}
                onChange={(e) => { setAvatarUrl(e.target.value || 'preset:purple'); setLocalPreview(null); }}
                className="w-full p-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition mb-3"
              />
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium border animate-fade-in ${message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                {message.text}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end text-sm pt-2 border-t border-zinc-800">
              <button
                type="button"
                disabled={saving || uploading}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white transition font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
