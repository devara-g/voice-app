'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Loader2, Check, Server, Image as ImageIcon, Type, Trash2 } from 'lucide-react';

interface ServerSettingsModalProps {
  serverId: string;
  serverName: string;
  serverImageUrl: string | null;
  serverBannerUrl?: string | null;
  userId: string;
  onClose: () => void;
  onUpdated: (updated: { name: string; image_url: string | null; banner_url: string | null }) => void;
  onDeleted: () => void;
}

export default function ServerSettingsModal({
  serverId,
  serverName,
  serverImageUrl,
  serverBannerUrl,
  userId,
  onClose,
  onUpdated,
  onDeleted,
}: ServerSettingsModalProps) {
  const [name, setName] = useState(serverName);
  const [imageUrl, setImageUrl] = useState(serverImageUrl || '');
  const [bannerUrl, setBannerUrl] = useState(serverBannerUrl || '');
  const [localIconPreview, setLocalIconPreview] = useState<string | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'banner'>('overview');

  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sync initial props
  useEffect(() => {
    setName(serverName);
    setImageUrl(serverImageUrl || '');
    setBannerUrl(serverBannerUrl || '');
  }, [serverName, serverImageUrl, serverBannerUrl]);

  const uploadFile = async (file: File, type: 'icon' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('serverId', serverId);
    formData.append('type', type);

    const res = await fetch('/api/upload/server', { method: 'POST', body: formData });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload gagal');
    }
    const { url } = await res.json();
    return url as string;
  };

  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format tidak didukung (JPG, PNG, WebP, GIF).' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File terlalu besar, maksimal 8MB.' });
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalIconPreview(preview);
    setMessage(null);
    setUploadingIcon(true);
    try {
      const url = await uploadFile(file, 'icon');
      setImageUrl(url);
      setLocalIconPreview(null);
      setMessage({ type: 'success', text: 'Ikon server berhasil diupload!' });
    } catch (err) {
      setLocalIconPreview(null);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload gagal.' });
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format tidak didukung (JPG, PNG, WebP, GIF).' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File terlalu besar, maksimal 8MB.' });
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalBannerPreview(preview);
    setMessage(null);
    setUploadingBanner(true);
    try {
      const url = await uploadFile(file, 'banner');
      setBannerUrl(url);
      setLocalBannerPreview(null);
      setMessage({ type: 'success', text: 'Banner berhasil diupload!' });
    } catch (err) {
      setLocalBannerPreview(null);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload gagal.' });
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Nama server tidak boleh kosong.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/servers/${serverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          image_url: imageUrl || null,
          banner_url: bannerUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');
      setMessage({ type: 'success', text: 'Pengaturan server berhasil disimpan!' });
      onUpdated({
        name: data.server.name,
        image_url: data.server.image_url,
        banner_url: data.server.banner_url,
      });
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteServer = async () => {
    const confirmation = window.prompt(`Ketik nama server "${serverName}" untuk menghapus server ini`);
    if (confirmation?.trim() !== serverName.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus server');

      onDeleted();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal menghapus server.' });
      setSaving(false);
    }
  };

  const displayIcon = localIconPreview || imageUrl;
  const displayBanner = localBannerPreview || bannerUrl;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[#1e1f22] border border-[#2b2d31] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#2b2d31] px-5 py-4 flex justify-between items-center border-b border-[#1e1f22] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <Server className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white text-base font-bold">Pengaturan Server</h2>
              <p className="text-slate-400 text-xs truncate max-w-[220px]">{serverName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition p-1 rounded-lg hover:bg-[#35373d]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e1f22] bg-[#2b2d31] flex-shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 text-sm font-semibold transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'text-white border-indigo-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('banner')}
            className={`px-5 py-2.5 text-sm font-semibold transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'banner'
                ? 'text-white border-indigo-500'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Banner
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {activeTab === 'overview' && (
            <>
              {/* Server Icon */}
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-3">
                  Ikon Server
                </label>
                <div className="flex items-center gap-5">
                  {/* Icon preview */}
                  <div
                    className="relative group cursor-pointer flex-shrink-0"
                    onClick={() => !uploadingIcon && iconInputRef.current?.click()}
                    title="Klik untuk ganti ikon"
                  >
                    {displayIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayIcon}
                        alt="Server Icon"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-zinc-700 shadow-lg"
                        onError={() => setImageUrl('')}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                        {name.charAt(0).toUpperCase() || 'S'}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className={`absolute inset-0 rounded-2xl flex items-center justify-center transition-all ${
                      uploadingIcon ? 'bg-black/60' : 'bg-black/0 group-hover:bg-black/50'
                    }`}>
                      {uploadingIcon ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition flex flex-col items-center gap-1">
                          <Camera className="w-6 h-6 text-white" />
                          <span className="text-white text-[10px] font-bold">Ganti</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => iconInputRef.current?.click()}
                      disabled={uploadingIcon}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 hover:text-white text-xs font-bold transition disabled:opacity-50 mb-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Ikon
                    </button>
                    <p className="text-zinc-500 text-[10px]">Disarankan 512×512 · JPG, PNG, WebP, GIF · Maks 8MB</p>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => { setImageUrl(''); setLocalIconPreview(null); }}
                        className="text-red-400/70 hover:text-red-400 text-[10px] font-semibold mt-1 transition"
                      >
                        Hapus ikon
                      </button>
                    )}
                  </div>
                </div>
                <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconSelect} disabled={uploadingIcon} />
              </div>

              <div className="border-t border-zinc-800" />

              {/* Server Name */}
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                  Nama Server
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition text-sm placeholder-zinc-600"
                  placeholder="Nama server Anda"
                />
                <p className="text-zinc-600 text-[10px] mt-1 text-right">{name.length}/100</p>
              </div>
            </>
          )}

          {activeTab === 'banner' && (
            <>
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold tracking-wider uppercase mb-3">
                  Banner Server
                </label>
                <p className="text-zinc-500 text-xs mb-4">Banner ditampilkan di bagian atas channel list sebagai latar server Anda.</p>

                {/* Banner preview */}
                <div
                  className="relative group cursor-pointer w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 transition mb-3"
                  onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                >
                  {displayBanner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayBanner}
                      alt="Server Banner"
                      className="w-full h-full object-cover"
                      onError={() => setBannerUrl('')}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="w-8 h-8 text-zinc-600" />
                      <p className="text-zinc-500 text-xs">Klik untuk upload banner</p>
                    </div>
                  )}
                  {/* Overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                    uploadingBanner ? 'bg-black/60' : 'bg-black/0 group-hover:bg-black/40'
                  }`}>
                    {uploadingBanner ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-7 h-7 text-white animate-spin" />
                        <span className="text-white text-xs font-bold">Mengupload...</span>
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition flex flex-col items-center gap-1">
                        <Camera className="w-7 h-7 text-white" />
                        <span className="text-white text-xs font-bold">{displayBanner ? 'Ganti Banner' : 'Upload Banner'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 hover:text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Banner
                  </button>
                  {bannerUrl && (
                    <button
                      type="button"
                      onClick={() => { setBannerUrl(''); setLocalBannerPreview(null); }}
                      className="text-red-400/70 hover:text-red-400 text-xs font-semibold transition"
                    >
                      Hapus banner
                    </button>
                  )}
                </div>
                <p className="text-zinc-600 text-[10px] mt-2">Disarankan 1920×480 · JPG, PNG, WebP, GIF · Maks 8MB</p>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} disabled={uploadingBanner} />
              </div>
            </>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-xl text-xs font-medium border animate-fade-in flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {message.type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 text-sm px-6 py-4 border-t border-zinc-800 bg-[#1e1f22] flex-shrink-0">
          <button
            type="button"
            disabled={saving || uploadingIcon || uploadingBanner}
            onClick={handleDeleteServer}
            className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 font-semibold text-rose-300 transition hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Server
          </button>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white transition font-medium"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving || uploadingIcon || uploadingBanner}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
