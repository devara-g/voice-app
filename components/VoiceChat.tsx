'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useTracks,
  TrackLoop,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, PhoneOff, Users, ChevronDown, ScreenShare, ScreenShareOff, Maximize2, Minimize2 } from 'lucide-react';
import '@livekit/components-styles';
import { playJoinSound, playLeaveSound, playMemberJoinSound, playMemberLeaveSound } from '@/lib/sounds';

interface VoiceChatProps {
  serverId: string;
  channelId: string;
  channelName: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string;
  /** Jika false, overlay tersembunyi tapi koneksi tetap hidup */
  isVisible: boolean;
  onMinimize: () => void;   // Sembunyikan overlay, tetap connected
  onDisconnect: () => void; // Benar-benar keluar dari room
}

export default function VoiceChat({
  serverId,
  channelId,
  channelName,
  userEmail,
  userDisplayName,
  userAvatarUrl,
  isVisible,
  onMinimize,
  onDisconnect,
}: VoiceChatProps) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectToVoice = async () => {
      try {
        setConnecting(true);
        setError(null);

        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: `${serverId}_${channelId}`,
            participantName: userEmail,
            displayName: userDisplayName,
            avatarUrl: userAvatarUrl,
          }),
        });

        if (!response.ok) throw new Error('Gagal mendapatkan token dari server');

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setToken(data.token);
        setUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || '');
      } catch (err) {
        console.error('Error connecting to voice:', err);
        setError(err instanceof Error ? err.message : 'Gagal terhubung ke saluran suara');
      } finally {
        setConnecting(false);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason &&
        (reason.name === 'NotAllowedError' ||
          reason.message?.includes('Permission denied') ||
          reason.message?.includes('getDisplayMedia') ||
          reason.name === 'PublishTrackError' ||
          reason.message?.includes('engine not connected') ||
          reason.message?.includes('LiveKit') ||
          reason.message?.includes('signal connection'))
      ) {
        console.warn('Caught LiveKit unhandled rejection:', reason);
        event.preventDefault();
        setError(reason.message || 'Koneksi suara gagal terhubung atau ditolak.');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    connectToVoice();

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [serverId, channelId, userEmail, userDisplayName, userAvatarUrl]);

  // Jangan unmount komponen ini ketika tidak visible — cukup sembunyikan overlay
  const overlayClass = isVisible
    ? 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    : 'hidden';

  if (connecting) {
    if (!isVisible) return null;
    return (
      <div className={overlayClass}>
        <div className="bg-[#2b2d31] p-8 rounded-2xl text-center shadow-2xl border border-[#35373d] max-w-sm w-full mx-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white text-lg font-semibold mb-1">Menghubungkan ke {channelName}</div>
          <div className="text-gray-400 text-sm">Mohon tunggu sebentar...</div>
        </div>
      </div>
    );
  }

  if (error) {
    if (!isVisible) return null;
    return (
      <div className={overlayClass}>
        <div className="bg-[#2b2d31] p-6 rounded-2xl text-center max-w-md w-full mx-4 shadow-2xl border border-[#35373d] animate-fade-in">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">⚠️</div>
          <div className="text-red-400 text-lg font-semibold mb-2">Gagal Terhubung</div>
          <div className="text-gray-400 text-sm mb-5">{error}</div>
          <button
            onClick={onDisconnect}
            className="w-full bg-[#5865f2] text-white py-2.5 rounded-xl hover:bg-[#4752c4] transition font-medium shadow-lg shadow-indigo-500/20 active:scale-98"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  if (!token || !url) return null;

  return (
    <div className={overlayClass}>
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect={true}
        audio={true}
        video={false}
        onConnected={() => {
          playJoinSound();
        }}
        onDisconnected={() => {
          playLeaveSound();
          onDisconnect();
        }}
        onError={(err) => {
          console.error('LiveKitRoom error:', err);
          setError(err.message || 'Terjadi kesalahan koneksi LiveKit.');
        }}
        className="w-full max-w-3xl h-[85vh] sm:h-[550px] bg-[#1e1f22] rounded-2xl border border-[#2b2d31] shadow-2xl overflow-hidden flex flex-col"
      >
        <ActiveVoiceRoom
          channelName={channelName}
          serverId={serverId}
          userEmail={userEmail}
          userDisplayName={userDisplayName}
          userAvatarUrl={userAvatarUrl}
          onMinimize={onMinimize}
          onDisconnect={onDisconnect}
        />
      </LiveKitRoom>
    </div>
  );
}

function ActiveVoiceRoom({
  channelName,
  serverId,
  userEmail,
  userDisplayName,
  userAvatarUrl,
  onMinimize,
  onDisconnect,
}: {
  channelName: string;
  serverId: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string;
  onMinimize: () => void;
  onDisconnect: () => void;
}) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant();
  const screenShareTracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const prevCountRef = useRef(participants.length);
  const screenSharePanelRef = useRef<HTMLDivElement | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [isScreenShareFullscreen, setIsScreenShareFullscreen] = useState(false);

  // SFX saat ada orang lain join/leave (bukan kita sendiri)
  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = participants.length;
    if (curr > prev) {
      playMemberJoinSound();
    } else if (curr < prev) {
      playMemberLeaveSound();
    }
    prevCountRef.current = curr;
  }, [participants.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsScreenShareFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (localParticipant) {
      try {
        setScreenShareError(null);
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      } catch (err) {
        console.error('Screen share toggle failed:', err);
        const message =
          err instanceof Error &&
          (err.name === 'NotAllowedError' || err.message.includes('Permission denied'))
            ? 'Izin share screen ditolak browser.'
            : 'Gagal menyalakan share screen.';
        setScreenShareError(message);
      }
    }
  };

  const toggleScreenShareFullscreen = async () => {
    const panel = screenSharePanelRef.current;

    try {
      if (!panel) return;

      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (panel.requestFullscreen) {
        await panel.requestFullscreen();
      } else {
        setIsScreenShareFullscreen((value) => !value);
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
      setScreenShareError('Browser menolak fullscreen untuk share screen.');
    }
  };

  const getPresetClasses = (id: string) => {
    const presets: Record<string, string> = {
      'preset:pink': 'bg-pink-500',
      'preset:purple': 'bg-purple-500',
      'preset:blue': 'bg-blue-500',
      'preset:emerald': 'bg-emerald-500',
      'preset:orange': 'bg-orange-500',
    };
    return presets[id] || 'bg-purple-500';
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1f22]">
      {/* Header */}
      <div className="bg-[#2b2d31] p-4 flex justify-between items-center border-b border-[#1e1f22] shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-[#35373d] p-2 rounded-lg text-[#23a559]">🎙️</div>
          <div>
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">{channelName}</h2>
            <p className="text-gray-400 text-xs">Server: {serverId.slice(0, 8)}…</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#1e1f22] px-3 py-1.5 rounded-full text-sm text-gray-300">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{participants.length} Terhubung</span>
          </div>
          {/* Tombol minimize — sembunyikan overlay tapi tetap connected */}
          <button
            onClick={onMinimize}
            className="w-8 h-8 bg-[#35373d] hover:bg-[#404249] rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition"
            title="Sembunyikan (tetap terhubung)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Peserta */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        {participants.length === 0 ? (
          <div className="text-gray-400 text-center">
            <div className="text-4xl mb-2">🤫</div>
            <p>Menunggu peserta lain...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-2xl w-full">
            {participants.map((p) => {
              const identity = p.identity || (p.isLocal ? userEmail : '') || 'Unknown';
              const displayName = p.name || identity.split('@')[0];
              const pAvatar = p.metadata || (p.isLocal ? userAvatarUrl : '');
              const isSpeaking = p.isSpeaking;
              const isMuted = !p.isMicrophoneEnabled;
              const isLocal = p.isLocal;
              const hasPreset = pAvatar?.startsWith('preset:');

              return (
                <div
                  key={p.sid}
                  className="bg-[#2b2d31] rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-300 hover:bg-[#35373d] border border-[#35373d]/50 hover:border-gray-700/50 shadow-lg group relative"
                >
                  {/* Avatar */}
                  <div className="relative mb-3">
                    {hasPreset || !pAvatar ? (
                      <div
                        className={`w-20 h-20 rounded-full ${getPresetClasses(pAvatar || 'preset:purple')} flex items-center justify-center text-white text-2xl font-bold transition-all duration-300 ${
                          isSpeaking
                            ? 'ring-4 ring-[#23a559] shadow-[0_0_20px_rgba(35,165,89,0.5)] scale-105'
                            : 'ring-2 ring-zinc-700'
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pAvatar}
                        alt={displayName}
                        className={`w-20 h-20 rounded-full object-cover transition-all duration-300 ${
                          isSpeaking
                            ? 'ring-4 ring-[#23a559] shadow-[0_0_20px_rgba(35,165,89,0.5)] scale-105'
                            : 'ring-2 ring-zinc-700'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {/* Badge Mikrofon */}
                    <div
                      className={`absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#2b2d31] shadow-md transition-all duration-300 ${
                        isMuted
                          ? 'bg-[#f23f43] text-white'
                          : isSpeaking
                          ? 'bg-[#23a559] text-white animate-bounce'
                          : 'bg-[#35373d] text-gray-300'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Info Nama */}
                  <span className="text-white text-sm font-medium truncate max-w-full text-center">
                    {displayName}
                  </span>
                  <span className="text-gray-400 text-[10px] mt-0.5 uppercase tracking-wider">
                    {isLocal ? 'Kamu' : 'Peserta'}
                  </span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    {identity}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {screenShareTracks.length > 0 && (
        <div
          ref={screenSharePanelRef}
          className={isScreenShareFullscreen
            ? 'fixed inset-0 z-[70] bg-black px-4 py-4 flex flex-col'
            : 'border-t border-[#1e1f22] bg-[#1e1f22] px-4 py-3'}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white text-sm font-semibold">Share Screen Aktif</div>
              <div className="text-slate-400 text-xs">Peserta sedang membagikan layar.</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-300 font-bold">
                Live
              </div>
              <button
                onClick={toggleScreenShareFullscreen}
                className="inline-flex items-center gap-1 rounded-lg bg-[#2b2d31] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-[#404249] hover:text-white"
                title={isScreenShareFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
              >
                {isScreenShareFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isScreenShareFullscreen ? 'Minimize' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>
          <div className={isScreenShareFullscreen ? 'flex-1 min-h-0' : 'grid gap-3 sm:grid-cols-2'}>
            <TrackLoop tracks={screenShareTracks}>
              <VideoTrack className={isScreenShareFullscreen ? 'w-full h-full rounded-xl border border-[#35373d] bg-black object-contain' : 'w-full rounded-xl border border-[#35373d] bg-black aspect-video object-cover'} />
            </TrackLoop>
          </div>
        </div>
      )}

      {screenShareError && (
        <div className="px-4 pt-3">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {screenShareError}
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-[#2b2d31] p-4 flex items-center justify-center gap-3 border-t border-[#1e1f22] shadow-2xl flex-wrap">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isMicrophoneEnabled
              ? 'bg-[#35373d] text-white hover:bg-[#4752c4] hover:scale-105'
              : 'bg-[#f23f43] text-white hover:bg-[#d8373b] hover:scale-105 animate-pulse'
          }`}
          title={isMicrophoneEnabled ? 'Bisukan Mikrofon' : 'Aktifkan Mikrofon'}
        >
          {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isScreenShareEnabled
              ? 'bg-[#5865f2] text-white hover:bg-[#4752c4] hover:scale-105'
              : 'bg-[#35373d] text-slate-300 hover:bg-[#404249] hover:text-white hover:scale-105'
          }`}
          title={isScreenShareEnabled ? 'Berhenti berbagi layar' : 'Bagikan layar'}
        >
          {isScreenShareEnabled ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
        </button>

        {/* Minimize */}
        <button
          onClick={onMinimize}
          className="w-12 h-12 bg-[#35373d] text-slate-300 rounded-full flex items-center justify-center hover:bg-[#404249] hover:text-white hover:scale-105 transition-all duration-200"
          title="Sembunyikan panel (tetap terhubung)"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          className="w-12 h-12 bg-[#f23f43] text-white rounded-full flex items-center justify-center hover:bg-[#d8373b] hover:scale-105 transition-all duration-200"
          title="Keluar Saluran Suara"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Room Audio Renderer */}
      <RoomAudioRenderer />
    </div>
  );
}