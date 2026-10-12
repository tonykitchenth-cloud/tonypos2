import { NotificationSoundType } from '../types';

let audioCtx: AudioContext | null = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;
let isCurrentlyAlarming = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
}

/**
 * Unlocks the Web Audio context during a user gesture (tap/click),
 * allowing future programmatic alarms on mobile browsers.
 */
export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays a single synthesized acoustic sound using the Web Audio API
 */
export function playNotificationSound(soundType: NotificationSoundType = 'sound1'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (soundType === 'sound1') {
      // Sound 1: Elegant Two-Tone Chime (E5 -> C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.22); // C5
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.35, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.9);
    } else if (soundType === 'sound2') {
      // Sound 2: Kitchen Service Bell (880Hz + high harmonics)
      const freqs = [880, 1760, 2640];
      const gains = [0.35, 0.15, 0.08];

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(gains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } else if (soundType === 'sound3') {
      // Sound 3: Alert Double Beep (784Hz energetic pulses)
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now + offset); // G5
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    }
  } catch (err) {
    console.warn('Failed to play synthesized sound:', err);
  }
}

/**
 * Starts continuous alarm loop for incoming unaccepted orders.
 * Repeats every 3.2 seconds until explicitly stopped.
 */
export function startContinuousOrderAlarm(soundType: NotificationSoundType = 'sound1'): void {
  if (isCurrentlyAlarming) return;
  isCurrentlyAlarming = true;

  // Play immediately
  playNotificationSound(soundType);

  // Repeat every 3.2s
  if (alarmIntervalId) clearInterval(alarmIntervalId);
  alarmIntervalId = setInterval(() => {
    if (isCurrentlyAlarming) {
      playNotificationSound(soundType);
    } else {
      if (alarmIntervalId) clearInterval(alarmIntervalId);
      alarmIntervalId = null;
    }
  }, 3200);
}

/**
 * Stops continuous alarm loop immediately (e.g. when Owner accepts order)
 */
export function stopContinuousOrderAlarm(): void {
  isCurrentlyAlarming = false;
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

export function isAlarmPlaying(): boolean {
  return isCurrentlyAlarming;
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
