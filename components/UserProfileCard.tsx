'use client';

import { Shield, User as UserIcon, X, Crown, Sparkles } from 'lucide-react';

interface UserProfileCardProps {
  member: {
    user_id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    banner_url?: string | null;
    bio: string | null;
  };
  isOwner?: boolean;
  isCurrentUser?: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

const PRESET_GRADIENTS: Record<string, string> = {
  'preset:pink': 'bg-pink-500',
  'preset:purple': 'bg-purple-500',
  'preset:blue': 'bg-blue-500',
  'preset:emerald': 'bg-emerald-500',
  'preset:orange': 'bg-orange-500',
};

function getGradient(str: string): string {
  const gradients = Object.values(PRESET_GRADIENTS);
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return gradients[sum % gradients.length];
}

export default function UserProfileCard({
  member,
  isOwner,
  isCurrentUser,
  onClose,
}: UserProfileCardProps) {
  const avatarUrl = member.avatar_url;
  const isPreset = avatarUrl?.startsWith('preset:');
  const gradientClass = isPreset
    ? PRESET_GRADIENTS[avatarUrl!] || 'bg-purple-500'
    : getGradient(member.email);

  const bannerGradient = gradientClass;

  const maskedEmail = member.email
    ? member.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : '';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[24px] overflow-hidden bg-[#111214] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '200ms' }}
      >
        {/* Banner Section */}
        <div className={`relative h-32 w-full bg-gradient-to-br ${bannerGradient}`}>
          {member.banner_url && (
            <img 
              src={member.banner_url} 
              alt="Banner" 
              className="absolute inset-0 w-full h-full object-cover" 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          
          {/* Subtle gradient overlay at the bottom of banner to blend with the card */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#111214] to-transparent" />

          {/* Controls */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badges on Banner */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            {isOwner && (
              <div className="bg-amber-500/90 backdrop-blur-md border border-amber-400/50 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Crown className="w-3 h-3" />
                <span>Owner</span>
              </div>
            )}
            {isCurrentUser && (
              <div className="bg-indigo-500/90 backdrop-blur-md border border-indigo-400/50 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Sparkles className="w-3 h-3" />
                <span>Kamu</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 pb-6 relative flex flex-col">
          {/* Avatar Area */}
          <div className="relative -mt-12 mb-4 flex justify-between items-end">
            <div className="relative">
              <div className="relative w-[92px] h-[92px] rounded-full border-[6px] border-[#111214] bg-[#111214] shadow-2xl z-10">
                {!isPreset && avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={member.display_name}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-full h-full rounded-full ${gradientClass} flex items-center justify-center text-white text-3xl font-extrabold`}>
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Online Indicator */}
                {isCurrentUser && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-[4px] border-[#111214] shadow-sm z-20" />
                )}
              </div>
            </div>
            
            {/* Quick Action Placeholder (e.g., Message) */}
            <div className="mb-2 z-10">
              <button className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 active:scale-95">
                Kirim Pesan
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="mb-5">
            <h3 className="text-white text-2xl font-black tracking-tight leading-none mb-1 flex items-center gap-2">
              {member.display_name}
            </h3>
            <p className="text-zinc-400 text-sm font-medium">{maskedEmail}</p>
          </div>

          {/* Separator */}
          <div className="w-full h-px bg-white/5 mb-5" />

          {/* Bio Section */}
          <div className="bg-[#1e1f22]/60 backdrop-blur-xl border border-white/5 rounded-[16px] p-4 mb-5">
            <h4 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              Tentang Saya
            </h4>
            {member.bio ? (
              <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{member.bio}</p>
            ) : (
              <p className="text-zinc-500 text-xs italic">Belum ada bio yang ditulis.</p>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest bg-white/[0.02] rounded-xl px-3 py-2 border border-white/[0.02] w-fit">
            <Shield className="w-3.5 h-3.5" />
            <span>Anggota Server</span>
          </div>
        </div>
      </div>
    </div>
  );
}
