'use client';

import { useVoice } from '@/contexts/VoiceContext';
import VoiceChat from './VoiceChat';
import { Mic, PhoneOff, Volume2 } from 'lucide-react';

/**
 * Dikembalikan di root layout — selalu mounted, persists across routes.
 * Renders VoiceChat overlay + floating mini-bar saat minimize.
 */
export default function GlobalVoiceChat() {
  const { session, isVisible, showVoice, hideVoice, disconnectVoice } = useVoice();

  if (!session) return null;

  return (
    <>
      {/* VoiceChat overlay — hidden tapi tetap mounted saat isVisible=false */}
      <VoiceChat
        serverId={session.serverId}
        channelId={session.channelId}
        channelName={session.channelName}
        userEmail={session.userEmail}
        userDisplayName={session.userDisplayName}
        userAvatarUrl={session.userAvatarUrl}
        isVisible={isVisible}
        onMinimize={hideVoice}
        onDisconnect={disconnectVoice}
      />

      {/* Floating mini bar — muncul saat minimize, di semua halaman */}
      {!isVisible && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
          <div className="flex items-center gap-3 bg-[#232428]/95 backdrop-blur-md border border-green-500/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-black/60">
            {/* Pulse indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full absolute inset-0 animate-ping opacity-60" />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="text-green-400 text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5">
                Suara Aktif
              </div>
              <div className="text-white text-xs font-semibold truncate max-w-[160px] flex items-center gap-1">
                <Mic className="w-3 h-3 text-green-400 flex-shrink-0" />
                <span>{session.channelName}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400 font-normal">{session.serverName}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={showVoice}
                className="w-8 h-8 bg-[#35373d] hover:bg-indigo-600 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition"
                title="Buka panel suara"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={disconnectVoice}
                className="w-8 h-8 bg-red-600/20 hover:bg-red-600 rounded-xl flex items-center justify-center text-red-400 hover:text-white transition"
                title="Putuskan koneksi suara"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
