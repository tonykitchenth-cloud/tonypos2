import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { IOSInstallGuideModal } from './IOSInstallGuideModal';
import { AndroidInstallGuideModal } from './AndroidInstallGuideModal';
import { DesktopPOSInstallGuideModal } from './DesktopPOSInstallGuideModal';
import { LineBrowserGuideModal } from './LineBrowserGuideModal';
import { Download } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstalled,
    isIOS,
    isDesktopPOS,
    isLineBrowser,
    isInAppBrowser,
    supportsNativePrompt,
    installNativePrompt,
  } = usePWAInstall();

  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showAndroidModal, setShowAndroidModal] = useState<boolean>(false);
  const [showDesktopModal, setShowDesktopModal] = useState<boolean>(false);
  const [showInAppModal, setShowInAppModal] = useState<boolean>(false);

  // 1. Hide completely if app is already running in standalone / installed mode
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    // 1. In-app browsers (LINE, Facebook, Instagram, etc.) cannot install directly
    if (isInAppBrowser || isLineBrowser) {
      setShowInAppModal(true);
      return;
    }

    // 2. iOS / iPadOS Safari (WebKit does not support beforeinstallprompt)
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // 3. Android Chrome / Chromium / Desktop POS with native prompt available
    if (supportsNativePrompt) {
      const outcome = await installNativePrompt();
      if (outcome === 'unavailable') {
        if (isDesktopPOS) {
          setShowDesktopModal(true);
        } else {
          setShowAndroidModal(true);
        }
      }
      return;
    }

    // 4. Desktop POS / PC Chrome fallback
    if (isDesktopPOS) {
      setShowDesktopModal(true);
      return;
    }

    // 5. Android Chrome fallback
    setShowAndroidModal(true);
  };

  return (
    <>
      {/* Single INSTALL APP Button Container - Elegant, theme-matched */}
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-1 flex items-center justify-end">
        <button
          type="button"
          id="pwa-install-app-btn"
          onClick={handleInstallClick}
          aria-label="INSTALL APP"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E65100] hover:bg-[#D84315] active:scale-95 text-white text-xs sm:text-sm font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#E65100]/20 select-none"
        >
          <Download className="w-4 h-4" />
          <span>INSTALL APP</span>
        </button>
      </div>

      {/* 1. iOS / iPadOS Safari Tutorial Modal */}
      <IOSInstallGuideModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

      {/* 2. Android Chrome Manual Menu Guide Modal */}
      <AndroidInstallGuideModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />

      {/* 3. Desktop / POS Machine Google Chrome Guide Modal */}
      <DesktopPOSInstallGuideModal
        isOpen={showDesktopModal}
        onClose={() => setShowDesktopModal(false)}
      />

      {/* 4. In-App Browser (LINE / Facebook) Guidance Modal */}
      <LineBrowserGuideModal
        isOpen={showInAppModal}
        onClose={() => setShowInAppModal(false)}
        isIOS={isIOS}
      />
    </>
  );
};
