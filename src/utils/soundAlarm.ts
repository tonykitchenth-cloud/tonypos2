import { NotificationSoundType } from '../types';

let audioCtx: AudioContext | null = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;
let isCurrentlyAlarming = false;
let isSilencedForSession = false;

const STORAGE_KEY_VOLUME = 'tk_sound_volume';
const STORAGE_KEY_UNLOCKED = 'tk_audio_unlocked';

export function getMasterVolume(): number {
  if (typeof window === 'undefined') return 1.0;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1.0) {
        return parsed;
      }
    }
  } catch {}
  return 1.0;
}

export function setMasterVolume(volume: number): void {
  const safeVol = Math.max(0, Math.min(1.0, volume));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(safeVol));
    } catch {}
  }
}

export function isAudioUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true';
  } catch {
    return false;
  }
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API error:', err);
    return null;
  }
}

/**
 * Unlocks the Web Audio context during a user gesture (tap/click),
 * allowing future programmatic alarms on mobile/desktop browsers.
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
    }
    return ctx.state === 'running';
  } catch (err) {
    console.warn('Could not resume AudioContext:', err);
    return false;
  }
}

/**
 * Plays a single loud synthesized acoustic sound using the Web Audio API
 */
export function playNotificationSound(
  soundType: NotificationSoundType = 'sound1',
  customVolume?: number
): void {
  if (isSilencedForSession && !isCurrentlyAlarming) {
    // If user silenced current session and not alarming
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = customVolume !== undefined ? customVolume : getMasterVolume();
  if (vol <= 0.01) return; // Muted

  try {
    const now = ctx.currentTime;

    if (soundType === 'sound1') {
      // Sound 1: Loud, Distinct Kitchen Two-Tone Chime (E5 -> C5) with harmonics
      // Note 1 (E5: 659.25Hz + overtone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle'; // Richer, punchier tone for kitchen environment
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.45 * vol, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Note 2 (C5: 523.25Hz + overtone)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.18);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.55 * vol, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.85);

    } else if (soundType === 'sound2') {
      // Sound 2: Restaurant Service Bell (880Hz + higher harmonics)
      const freqs = [880, 1760, 2640];
      const gains = [0.5 * vol, 0.25 * vol, 0.12 * vol];

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(gains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.1);
      });

    } else if (soundType === 'sound3') {
      // Sound 3: Kitchen Alert Pulse (Three high-visibility beeps at 880Hz)
      [0, 0.15, 0.30].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square'; // Piercing, high-visibility square wave with soft gain
        osc.frequency.setValueAtTime(880, now + offset);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.25 * vol, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.10);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.10);
      });
    }
  } catch (err) {
    console.warn('Failed to play synthesized sound:', err);
  }
}

/**
 * Starts continuous repeating alarm loop for incoming pending orders.
 * Repeats every 3.5 seconds until explicitly stopped.
 * Guards against duplicate intervals and audio overlap.
 */
export function startContinuousOrderAlarm(soundType: NotificationSoundType = 'sound1'): void {
  // If user explicitly silenced this specific alarm session, do not sound
  if (isSilencedForSession) return;

  // If already actively alarming, do not create duplicate intervals
  if (isCurrentlyAlarming && alarmIntervalId) return;

  isCurrentlyAlarming = true;

  // Unlock / resume AudioContext
  unlockAudioContext().catch(() => {});

  // Play immediately
  playNotificationSound(soundType);

  // Repeat every 3.5s
  if (alarmIntervalId) clearInterval(alarmIntervalId);
  alarmIntervalId = setInterval(() => {
    if (isCurrentlyAlarming && !isSilencedForSession) {
      playNotificationSound(soundType);
    } else {
      stopContinuousOrderAlarm();
    }
  }, 3500);
}

/**
 * Stops continuous alarm loop immediately (e.g. when Owner accepts all pending orders)
 */
export function stopContinuousOrderAlarm(): void {
  isCurrentlyAlarming = false;
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

/**
 * Silences the current active alarm session (Owner clicked "Mute" on the banner/modal).
 * Does NOT disable sound permanently; when a new order arrives, it will un-silence.
 */
export function silenceCurrentAlarm(): void {
  isSilencedForSession = true;
  stopContinuousOrderAlarm();
}

/**
 * Resets the silence flag when a brand new pending order arrives.
 */
export function resetAlarmSilence(): void {
  isSilencedForSession = false;
}

export function isAlarmPlaying(): boolean {
  return isCurrentlyAlarming;
}

export function isAlarmSilenced(): boolean {
  return isSilencedForSession;
}

/**
 * Safely requests browser push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

/**
 * Sends a native system notification if permitted
 */
export function showSystemNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
    });
  } catch (err) {
    console.warn('Could not dispatch native Notification:', err);
  }
}
