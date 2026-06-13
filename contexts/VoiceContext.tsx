'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface VoiceSession {
  serverId: string;
  channelId: string;
  channelName: string;
  serverName: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl: string;
}

interface VoiceContextValue {
  session: VoiceSession | null;
  isVisible: boolean;
  joinVoice: (session: VoiceSession) => void;
  showVoice: () => void;
  hideVoice: () => void;
  disconnectVoice: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const joinVoice = useCallback((newSession: VoiceSession) => {
    setSession(newSession);
    setIsVisible(true);
  }, []);

  const showVoice = useCallback(() => setIsVisible(true), []);
  const hideVoice = useCallback(() => setIsVisible(false), []);

  const disconnectVoice = useCallback(() => {
    setSession(null);
    setIsVisible(false);
  }, []);

  return (
    <VoiceContext.Provider value={{ session, isVisible, joinVoice, showVoice, hideVoice, disconnectVoice }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used inside VoiceProvider');
  return ctx;
}
