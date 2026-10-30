import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Dedicated separate preference key to avoid interfering with any existing LocalStorage keys
const DISMISS_PREFERENCE_KEY = 'tk_pwa_install_guide_dismissed_v2';

export interface PWAInstallState {
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isLineBrowser: boolean;
  supportsNativePrompt: boolean;
  isDismissed: boolean;
  installNativePrompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismissGuidance: () => void;
  resetDismissal: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [isChrome, setIsChrome] = useState<boolean>(false);
  const [isLineBrowser, setIsLineBrowser] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect Standalone / Installed Display Mode
    // Use capability and matchMedia checks first
    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandaloneDisplay);

    // 2. Check dismissal preference from separate key
    try {
      const storedDismissal = localStorage.getItem(DISMISS_PREFERENCE_KEY);
      if (storedDismissal === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Fallback for private browsing mode restrictions
    }

    // 3. User Agent & Environment Analysis
    const ua = (window.navigator.userAgent || '').toLowerCase();

    // LINE In-App Browser detection (very common in Thailand when links are shared in LINE chats)
    // LINE user agent contains 'line/' or 'line ' or '; line'
    const hasLineIdentifier = /line\/|line\s|;\sline/i.test(ua) || (ua.includes('line') && !ua.includes('online'));
    setIsLineBrowser(hasLineIdentifier);

    // iOS Detection (supports iPadOS 13+ with desktop UA)
    const isAppleMobile =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isAppleMobile);

    // Android Detection
    const isAndroidDevice = /android/.test(ua);
    setIsAndroid(isAndroidDevice);

    // Safari Detection (WebKit without Chrome/CriOS/Firefox/LINE wrapper)
    const isAppleSafari =
      isAppleMobile &&
      /safari/.test(ua) &&
      !/chrome|crios|fxios|edgios|line/i.test(ua);
    setIsSafari(isAppleSafari);

    // Chrome Detection
    const isGoogleChrome =
      /chrome|crios/.test(ua) &&
      !/edg|opr|line/i.test(ua);
    setIsChrome(isGoogleChrome);

    // 4. Native beforeinstallprompt listener (Android Chrome / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_PREFERENCE_KEY);
      } catch {
        // no-op
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger native prompt strictly after customer taps button
  const installNativePrompt = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      return 'unavailable';
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.warn('Native PWA install prompt error:', err);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  // Remember dismissal using new separate preference key
  const dismissGuidance = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_PREFERENCE_KEY, 'true');
    } catch {
      // no-op
    }
  }, []);

  const resetDismissal = useCallback(() => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(DISMISS_PREFERENCE_KEY);
    } catch {
      // no-op
    }
  }, []);

  return {
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isLineBrowser,
    supportsNativePrompt: Boolean(deferredPrompt),
    isDismissed,
    installNativePrompt,
    dismissGuidance,
    resetDismissal,
  };
}
