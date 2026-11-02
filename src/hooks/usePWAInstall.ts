import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isLineBrowser: boolean;
  isInAppBrowser: boolean;
  supportsNativePrompt: boolean;
  installNativePrompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [isChrome, setIsChrome] = useState<boolean>(false);
  const [isLineBrowser, setIsLineBrowser] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check Standalone / Installed Display Mode strictly via system matchMedia and navigator
    const checkStandalone = (): boolean => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://')
      );
    };

    setIsInstalled(checkStandalone());

    // Listen for display mode changes (e.g. user opens standalone window)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayChange);
    } else if ((mediaQuery as unknown as { addListener?: (cb: (e: MediaQueryListEvent) => void) => void }).addListener) {
      (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handleDisplayChange);
    }

    // 2. User Agent & In-App Browser Analysis
    const ua = (window.navigator.userAgent || '').toLowerCase();

    // In-App browser detection: LINE, Facebook, Instagram, Threads, Twitter, TikTok, WeChat, WebViews
    const isLine = /line\/|line\s|;\sline/i.test(ua) || (ua.includes('line') && !ua.includes('online'));
    const isFacebookOrInsta = /fban|fbav|instagram|threads|fb_iab|fb4a|fbios/i.test(ua);
    const isTwitterOrTikTok = /twitter|tiktok|micromessenger/i.test(ua);
    const isGenericWebView = /webview|;\s*wv/i.test(ua);
    const inApp = isLine || isFacebookOrInsta || isTwitterOrTikTok || isGenericWebView;

    setIsLineBrowser(isLine);
    setIsInAppBrowser(inApp);

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
      !/chrome|crios|fxios|edgios|line|fban|fbav/i.test(ua);
    setIsSafari(isAppleSafari);

    // Chrome Detection
    const isGoogleChrome =
      /chrome|crios/.test(ua) &&
      !/edg|opr|line|fban|fbav/i.test(ua);
    setIsChrome(isGoogleChrome);

    // 3. Native beforeinstallprompt listener (Android Chrome / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default mini-infobar so our custom INSTALL APP button controls the flow
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayChange);
      } else if ((mediaQuery as unknown as { removeListener?: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener) {
        (mediaQuery as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handleDisplayChange);
      }
    };
  }, []);

  // Trigger native prompt strictly after customer taps INSTALL APP button
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
      // User cancelled/dismissed: do NOT mark as installed
      return 'dismissed';
    } catch (err) {
      console.warn('Native PWA install prompt error:', err);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isLineBrowser,
    isInAppBrowser,
    supportsNativePrompt: Boolean(deferredPrompt),
    installNativePrompt,
  };
}
