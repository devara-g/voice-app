/**
 * SFX Generator via Web Audio API — tidak perlu file audio eksternal.
 * Suara ala Discord: join = 2 nada naik, leave = 2 nada turun.
 */

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  volume = 0.25,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);

  gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);

  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.05);
}

/** Suara join voice channel: dua nada naik lembut */
export function playJoinSound() {
  const ctx = createAudioContext();
  if (!ctx) return;
  playTone(ctx, 660, 0,    0.12, 0.2, 'sine');
  playTone(ctx, 880, 0.14, 0.14, 0.18, 'sine');
  // Fade out context setelah selesai
  setTimeout(() => ctx.close().catch(() => {}), 500);
}

/** Suara leave voice channel: dua nada turun lembut */
export function playLeaveSound() {
  const ctx = createAudioContext();
  if (!ctx) return;
  playTone(ctx, 660, 0,    0.12, 0.2, 'sine');
  playTone(ctx, 440, 0.14, 0.14, 0.18, 'sine');
  setTimeout(() => ctx.close().catch(() => {}), 500);
}

/** Suara orang lain join room */
export function playMemberJoinSound() {
  const ctx = createAudioContext();
  if (!ctx) return;
  playTone(ctx, 880, 0, 0.08, 0.15, 'sine');
  setTimeout(() => ctx.close().catch(() => {}), 300);
}

/** Suara orang lain leave room */
export function playMemberLeaveSound() {
  const ctx = createAudioContext();
  if (!ctx) return;
  playTone(ctx, 440, 0, 0.08, 0.15, 'sine');
  setTimeout(() => ctx.close().catch(() => {}), 300);
}
