import { NotificationSoundType } from '../types';
import { getBaseAppPath } from './navigation';

let audioCtx: AudioContext | null = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;
let isCurrentlyAlarming = false;
let isSilencedForSession = false;
let htmlAudioInstance: HTMLAudioElement | null = null;

const STORAGE_KEY_VOLUME = 'tk_sound_volume';
const STORAGE_KEY_UNLOCKED = 'tk_audio_unlocked';

/**
 * Resolves absolute URL for audio sound files, correctly handling GitHub Pages subpaths and /owner routes.
 */
export function getSoundAssetUrl(fileName: string = 'new-order.mp3'): string {
  const basePath = getBaseAppPath();
  return `${basePath}sounds/${fileName}`;
}

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
  let success = false;

  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // Play a 1-sample silent buffer to unlock iOS Safari Web Audio engine
      const silentBuf = ctx.createBuffer(1, 1, 22050);
      const srcNode = ctx.createBufferSource();
      srcNode.buffer = silentBuf;
      srcNode.connect(ctx.destination);
      srcNode.start(0);
      success = ctx.state === 'running';
    } catch (err) {
      console.warn('Could not resume AudioContext:', err);
    }
  }

  // Pre-load and prime HTML5 audio instance
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
      if (!htmlAudioInstance) {
        htmlAudioInstance = new Audio();
        htmlAudioInstance.preload = 'auto';
      }
      htmlAudioInstance.src = getSoundAssetUrl('new-order.mp3');
      htmlAudioInstance.load();

      // Prime playback and immediately pause to satisfy autoplay permission
      const primePromise = htmlAudioInstance.play();
      if (primePromise !== undefined) {
        primePromise
          .then(() => {
            htmlAudioInstance?.pause();
            if (htmlAudioInstance) htmlAudioInstance.currentTime = 0;
          })
          .catch(() => {});
      }
    } catch {}
  }

  return success;
}

// Global user-gesture listener to auto-unlock audio on the first tap/click anywhere
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    unlockAudioContext().catch(() => {});
  };
  ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, handleUserGesture, { capture: true, passive: true });
  });
}

function playHtmlAudioFallback(vol: number): void {
  if (typeof window === 'undefined') return;
  try {
    const audioUrl = getSoundAssetUrl('new-order.mp3');

    if (!htmlAudioInstance) {
      htmlAudioInstance = new Audio();
      htmlAudioInstance.preload = 'auto';
    }
    if (htmlAudioInstance.src !== audioUrl) {
      htmlAudioInstance.src = audioUrl;
    }
    htmlAudioInstance.volume = Math.max(0, Math.min(1.0, vol));
    htmlAudioInstance.currentTime = 0;
    const playPromise = htmlAudioInstance.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Autoplay policy might hold until user gesture
        console.warn('HTML Audio playback pending user interaction:', err);
      });
    }
  } catch (err) {
    console.warn('HTML Audio fallback error:', err);
  }
}

function playSynthesizedTone(ctx: AudioContext, soundType: NotificationSoundType, vol: number): void {
  const now = ctx.currentTime;

  if (soundType === 'sound1') {
    // Sound 1: Loud, Distinct Kitchen Two-Tone Chime (E5 -> C5) with rich triangle tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.55 * vol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.18);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.65 * vol, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.85);

  } else if (soundType === 'sound2') {
    // Sound 2: Restaurant Service Bell (880Hz + higher harmonics)
    const freqs = [880, 1760, 2640];
    const gains = [0.55 * vol, 0.28 * vol, 0.14 * vol];

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
    // Sound 3: Kitchen Alert Pulse (Three energetic beeps)
    [0, 0.15, 0.30].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.3 * vol, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.10);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.10);
    });
  }
}

/**
 * Plays a loud new order notification sound using Dual Audio Engine:
 * 1. HTML5 Audio File playback (/sounds/new-order.mp3)
 * 2. Web Audio API synthesized harmonics
 */
export async function playNotificationSound(
  soundType: NotificationSoundType = 'sound1',
  customVolume?: number
): Promise<void> {
  const vol = customVolume !== undefined ? customVolume : getMasterVolume();
  if (vol <= 0.01) return; // Muted

  // 1. Trigger HTML Audio file (works across all browsers with preloaded asset)
  playHtmlAudioFallback(vol);

  // 2. ALSO trigger Web Audio API for rich acoustic chime
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      playSynthesizedTone(ctx, soundType, vol);
    } catch (err) {
      console.warn('Web Audio synthesis error:', err);
    }
  }
}

/**
 * Plays a pleasant, friendly rising chime for customer when their order is ready
 */
export function playCustomerReadySound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // Note 1 (G5: 783.99Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2 (C6: 1046.5Hz celebration bell)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.16);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.4, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.9);
  } catch (err) {
    console.warn('Customer chime error:', err);
  }
}

/**
 * Starts continuous repeating alarm loop for incoming pending orders.
 * Repeats every 3.5 seconds until explicitly stopped.
 */
export function startContinuousOrderAlarm(soundType: NotificationSoundType = 'sound1'): void {
  // If user explicitly silenced this specific alarm session, do not sound
  if (isSilencedForSession) return;

  // Clean up any stale interval
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  isCurrentlyAlarming = true;

  // Play immediately
  playNotificationSound(soundType).catch(() => {});

  // Repeat every 3.5s
  alarmIntervalId = setInterval(() => {
    if (isCurrentlyAlarming && !isSilencedForSession) {
      playNotificationSound(soundType).catch(() => {});
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
