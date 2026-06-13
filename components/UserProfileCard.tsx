'use client';

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
  'preset:pink': 'from-pink-500 to-rose-500',
  'preset:purple': 'from-purple-500 to-indigo-500',
  'preset:blue': 'from-blue-500 to-cyan-500',
  'preset:emerald': 'from-emerald-500 to-teal-500',
  'preset:orange': 'from-orange-500 to-amber-500',
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
    ? PRESET_GRADIENTS[avatarUrl!] || 'from-purple-500 to-indigo-500'
    : getGradient(member.email);

  // Pick a subtle banner color based on gradient
  const bannerGradient = gradientClass;

  const maskedEmail = member.email
    ? member.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : '';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-[#232428] border border-[#2b2d31] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className={`h-32 w-full bg-gradient-to-br ${bannerGradient} relative`}>
          {member.banner_url && (
            <img 
              src={member.banner_url} 
              alt="Banner" 
              className="absolute inset-0 w-full h-full object-cover" 
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {isOwner && (
              <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                👑 Owner
              </span>
            )}
            {isCurrentUser && (
              <span className="bg-indigo-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Kamu
              </span>
            )}
          </div>
        </div>

        {/* Avatar — overlaps banner */}
        <div className="px-5 pb-5">
          <div className="relative -mt-10 mb-3 flex items-end gap-3">
            {/* Avatar */}
            <div className="relative">
              {!isPreset && avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={member.display_name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-[#232428] shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-full bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white text-3xl font-extrabold border-4 border-[#232428] shadow-xl`}
                >
                  {member.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online dot */}
              {isCurrentUser && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#232428]" />
              )}
            </div>
          </div>

          {/* Name */}
          <h3 className="text-white text-lg font-extrabold leading-tight">
            {member.display_name}
          </h3>
          <p className="text-slate-500 text-xs mb-3">{maskedEmail}</p>

          {/* Bio */}
          {member.bio ? (
            <div className="bg-[#2b2d31] rounded-xl p-3 mb-4 border border-[#35373d]/50">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Tentang Saya</p>
              <p className="text-slate-200 text-sm leading-relaxed">{member.bio}</p>
            </div>
          ) : (
            <div className="bg-[#2b2d31] rounded-xl p-3 mb-4 border border-[#35373d]/50">
              <p className="text-slate-500 text-xs italic">Belum ada bio.</p>
            </div>
          )}

          {/* Member Since placeholder */}
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Anggota Server
          </div>
        </div>
      </div>
    </div>
  );
}
