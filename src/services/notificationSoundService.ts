/**
 * Tony's Kitchen - Custom Order Notification Sound Service
 * 
 * Reusable, robust browser audio service for Owner / Merchant order notifications.
 * Handles:
 * - HTMLAudioElement with preloading and error safety
 * - Browser Autoplay Policy unlocking via explicit Owner interaction
 * - Web Audio API synthesized chime fallback if audio asset is missing/unsupported
 * - Non-overlapping playback queue / cooldown to prevent sound clipping & cacophony
 * - Mute/Unmute state persistence in localStorage
 */

import { getBaseAppPath } from '../utils/navigation';

export type AudioPlayStatus = 'idle' | 'playing' | 'unlocked' | 'blocked' | 'file_warning';

export interface SoundStatusDetail {
  isUnlocked: boolean;
  isEnabled: boolean;
  isMuted: boolean;
  volume: number;
  soundFile: string;
  playStatus: AudioPlayStatus;
  warningMessage: string | null;
  lastPlayedAt: number | null;
}

const STORAGE_KEY_SOUND_ENABLED = 'tk_notification_sound_enabled';
const STORAGE_KEY_SOUND_VOLUME = 'tk_sound_volume';
const STORAGE_KEY_AUDIO_UNLOCKED = 'tk_audio_unlocked';
const STORAGE_KEY_SOUND_MUTED = 'tk_notification_sound_muted';

const getSoundUrl = (fileName: string) => {
  const basePath = getBaseAppPath();
  return `${basePath}sounds/${fileName}`;
};

const DEFAULT_SOUND_FILE = getSoundUrl('new-order.mp3');
const FALLBACK_SOUND_FILE = getSoundUrl('new-order.wav');
const MIN_PLAY_INTERVAL_MS = 1400; // Cooldown to prevent deafening audio bursts when multiple orders arrive

class NotificationSoundService {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private isEnabled: boolean = true;
  private isMutedState: boolean = false;
  private soundFile: string = DEFAULT_SOUND_FILE;
  private playStatus: AudioPlayStatus = 'idle';
  private warningMessage: string | null = null;
  private lastPlayedAt: number | null = null;
  private listeners: Set<(status: SoundStatusDetail) => void> = new Set();
  private isInitialized: boolean = false;

  private volume: number = 1.0;

  constructor() {
    this.hydrateFromStorage();
  }

  /**
   * Load non-sensitive preferences from localStorage
   */
  private hydrateFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const enabledVal = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
      if (enabledVal !== null) {
        this.isEnabled = enabledVal === 'true';
      }

      const unlockedVal = localStorage.getItem(STORAGE_KEY_AUDIO_UNLOCKED);
      if (unlockedVal !== null) {
        this.isUnlocked = unlockedVal === 'true';
      }

      const mutedVal = localStorage.getItem(STORAGE_KEY_SOUND_MUTED);
      if (mutedVal !== null) {
        this.isMutedState = mutedVal === 'true';
      }

      const volVal = localStorage.getItem(STORAGE_KEY_SOUND_VOLUME);
      if (volVal !== null) {
        const parsed = parseFloat(volVal);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1.0) {
          this.volume = parsed;
        }
      }
    } catch {
      // Ignore localStorage access failures in restricted iframes
    }
  }

  /**
   * Initialize audio element and event listeners
   */
  public initialize(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    try {
      this.setupAudioElement();
    } catch (err) {
      console.warn('[NotificationSoundService] Initial audio element setup error:', err);
    }
  }

  private setupAudioElement(): void {
    if (typeof window === 'undefined') return;

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = 'auto';
      this.audioElement.src = this.soundFile;

      // Handle loading errors gracefully (missing file, network 404, or unsupported codec)
      this.audioElement.addEventListener('error', () => {
        const error = this.audioElement?.error;
        console.warn('[NotificationSoundService] Audio file error on', this.soundFile, error);
        this.playStatus = 'file_warning';
        this.warningMessage = `Audio file not found or invalid format (${this.soundFile}). Using acoustic chime fallback.`;
        this.notifyListeners();
      });

      this.audioElement.addEventListener('canplaythrough', () => {
        if (this.playStatus === 'file_warning') {
          this.playStatus = this.isUnlocked ? 'unlocked' : 'idle';
          this.warningMessage = null;
          this.notifyListeners();
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.playStatus = this.isUnlocked ? 'unlocked' : 'idle';
        this.notifyListeners();
      });
    }
  }

  /**
   * Unlocks browser audio during an explicit Owner user interaction.
   * Plays a subtle verification sound and activates both HTMLAudioElement and WebAudio API.
   */
  public async unlockAudio(): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Window is undefined' };
    }

    this.initialize();
    this.isEnabled = true;
    this.isMutedState = false;
    this.saveToStorage(STORAGE_KEY_SOUND_ENABLED, 'true');
    this.saveToStorage(STORAGE_KEY_SOUND_MUTED, 'false');

    let audioContextUnlocked = false;
    let htmlAudioUnlocked = false;

    // 1. Unlock Web Audio Context
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        if (!this.audioContext) {
          this.audioContext = new AudioCtxClass();
        }
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        audioContextUnlocked = this.audioContext.state === 'running';
      }
    } catch (err) {
      console.warn('[NotificationSoundService] Web Audio unlock error:', err);
    }

    // 2. Unlock HTMLAudioElement with user gesture
    if (this.audioElement) {
      try {
        this.audioElement.muted = true;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          await playPromise;
          this.audioElement.pause();
          this.audioElement.currentTime = 0;
          this.audioElement.muted = false;
          htmlAudioUnlocked = true;
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          this.playStatus = 'blocked';
          this.warningMessage = 'Browser autoplay blocked audio. Please interact with the page.';
          this.notifyListeners();
          return {
            success: false,
            message: 'Browser autoplay blocked audio. Please click again to allow.',
          };
        }
        // If file not found, htmlAudio is still primed for future sources
        htmlAudioUnlocked = true;
      }
    }

    this.isUnlocked = true;
    this.playStatus = 'unlocked';
    this.saveToStorage(STORAGE_KEY_AUDIO_UNLOCKED, 'true');

    // Play a short pleasant test chime to confirm audio readiness
    this.playSynthesizedChime(587.33, 880, 0.25); // D5 -> A5 gentle confirmation

    this.notifyListeners();
    return {
      success: true,
      message: 'Order notification sounds are enabled.',
    };
  }

  /**
   * Play the custom new order sound file (/sounds/new-order.mp3)
   * Falls back to synthesized acoustic chime if audio file is missing or invalid.
   */
  public async playNewOrderSound(): Promise<boolean> {
    if (!this.isEnabled || this.isMutedState) {
      return false;
    }

    const now = Date.now();
    if (this.lastPlayedAt && now - this.lastPlayedAt < MIN_PLAY_INTERVAL_MS) {
      // Cooldown active to prevent jarring sound overlapping
      return false;
    }
    this.lastPlayedAt = now;

    this.initialize();

    // Attempt to play custom sound file first
    let playedCustom = false;
    if (this.audioElement && this.soundFile) {
      try {
        this.audioElement.currentTime = 0;
        this.audioElement.volume = 1.0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          await playPromise;
          this.playStatus = 'playing';
          this.notifyListeners();
          playedCustom = true;
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          this.playStatus = 'blocked';
          this.warningMessage = 'Audio blocked by browser. Click "Enable Order Sounds" to allow.';
          this.notifyListeners();
          return false;
        }
        // Try fallback mp3 if primary wav fails
        if (this.soundFile === DEFAULT_SOUND_FILE) {
          try {
            this.audioElement.src = FALLBACK_SOUND_FILE;
            this.audioElement.currentTime = 0;
            const fallbackPromise = this.audioElement.play();
            if (fallbackPromise !== undefined) {
              await fallbackPromise;
              this.playStatus = 'playing';
              this.notifyListeners();
              playedCustom = true;
            }
          } catch {
            // Proceed to synthesized chime
          }
        }
        if (!playedCustom) {
          this.playStatus = 'file_warning';
          this.warningMessage = `Custom sound file (${this.soundFile}) not playable. Playing fallback kitchen chime.`;
          this.notifyListeners();
        }
      }
    }

    if (!playedCustom) {
      // Graceful fallback: play pleasant two-tone kitchen bell
      this.playSynthesizedChime(659.25, 523.25, 0.4); // E5 -> C5 kitchen chime
    }

    return true;
  }

  /**
   * Synthesized acoustic chime using Web Audio API
   * Used for fallback or test sounds without requiring external files
   */
  private playSynthesizedChime(freq1 = 659.25, freq2 = 523.25, duration = 0.4): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtxClass();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + duration);

      // Note 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq2, now + duration * 0.45);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.35, now + duration * 0.45);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 1.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + duration * 0.45);
      osc2.stop(now + duration * 1.6);
    } catch (e) {
      console.warn('[NotificationSoundService] Synthesized chime failed:', e);
    }
  }

  /**
   * Stop active audio playback immediately
   */
  public stopSound(): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {
        // Safe ignore
      }
    }
    this.playStatus = this.isUnlocked ? 'unlocked' : 'idle';
    this.notifyListeners();
  }

  /**
   * Tests notification sound on demand (Owner control)
   */
  public async testSound(): Promise<{ success: boolean; message: string }> {
    this.initialize();

    if (this.isMutedState) {
      return {
        success: false,
        message: 'Notification sound is currently MUTED. Please unmute first.',
      };
    }

    if (!this.isEnabled) {
      return {
        success: false,
        message: 'Notification sound is currently OFF. Please turn it ON first.',
      };
    }

    // If not yet unlocked, attempt unlock on this click
    if (!this.isUnlocked) {
      await this.unlockAudio();
    }

    // Force play regardless of cooldown
    this.lastPlayedAt = 0;
    const played = await this.playNewOrderSound();

    return {
      success: played,
      message: played ? 'Test sound played successfully.' : 'Could not play audio. Check browser permissions.',
    };
  }

  public setMuted(muted: boolean): void {
    this.isMutedState = muted;
    this.saveToStorage(STORAGE_KEY_SOUND_MUTED, String(muted));
    if (muted) {
      this.stopSound();
    }
    this.notifyListeners();
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveToStorage(STORAGE_KEY_SOUND_ENABLED, String(enabled));
    if (!enabled) {
      this.stopSound();
    }
    this.notifyListeners();
  }

  public isSoundEnabled(): boolean {
    return this.isEnabled;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public getSoundFile(): string {
    return this.soundFile;
  }

  public setSoundFile(filePath: string): void {
    this.soundFile = filePath;
    if (this.audioElement) {
      this.audioElement.src = filePath;
      this.audioElement.load();
    }
    this.notifyListeners();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const safeVol = Math.max(0, Math.min(1.0, vol));
    this.volume = safeVol;
    this.saveToStorage(STORAGE_KEY_SOUND_VOLUME, String(safeVol));
    if (this.audioElement) {
      this.audioElement.volume = safeVol;
    }
    this.notifyListeners();
  }

  public getAudioStatus(): SoundStatusDetail {
    return {
      isUnlocked: this.isUnlocked,
      isEnabled: this.isEnabled,
      isMuted: this.isMutedState,
      volume: this.volume,
      soundFile: this.soundFile,
      playStatus: this.playStatus,
      warningMessage: this.warningMessage,
      lastPlayedAt: this.lastPlayedAt,
    };
  }

  public subscribeStatus(listener: (status: SoundStatusDetail) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAudioStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getAudioStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('[NotificationSoundService] Listener error:', err);
      }
    });
  }

  private saveToStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Safe fallback
    }
  }
}

// Singleton export
export const notificationSoundService = new NotificationSoundService();
