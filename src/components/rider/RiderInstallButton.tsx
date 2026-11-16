import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { RiderInstallModal } from './RiderInstallModal';
import { Download, Smartphone, CheckCircle2, X } from 'lucide-react';

interface RiderInstallButtonProps {
  variant?: 'header' | 'banner';
  className?: string;
}

export const RiderInstallButton: React.FC<RiderInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language } = useRestaurant();
  const { isInstalled, isIOS, supportsNativePrompt, installNativePrompt } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // If already running in standalone/installed mode, hide button & banner automatically
  if (isInstalled) {
    return null;
  }

  if (variant === 'banner' && bannerDismissed && !showModal) {
    return null;
  }

  const handleInstallClick = async () => {
    if (supportsNativePrompt) {
      const outcome = await installNativePrompt();
      if (outcome === 'accepted') {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
        return;
      }
      if (outcome === 'unavailable') {
        setShowModal(true);
        return;
      }
      return;
    }

    // Native prompt unavailable (e.g. iOS Safari, In-App browser, or already dismissed): show mobile guide modal
    setShowModal(true);
  };

  const handleTriggerNative = async () => {
    if (supportsNativePrompt) {
      const outcome = await installNativePrompt();
      if (outcome === 'accepted') {
        setShowModal(false);
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          id="btn-install-rider-app-header"
          onClick={handleInstallClick}
          className={`px-2.5 sm:px-3 py-1.5 rounded-full bg-[#E65100] hover:bg-[#D84315] text-white text-[11px] sm:text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border border-orange-400/30 select-none shrink-0 ${className}`}
          title={language === 'th' ? 'ติดตั้งแอป Rider บนมือถือ' : 'Install Rider App'}
        >
          {installedSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>{language === 'th' ? 'ติดตั้งแล้ว!' : 'Installed!'}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'th' ? 'ติดตั้งแอป' : 'Install App'}</span>
            </>
          )}
        </button>
      )}

      {variant === 'banner' && !bannerDismissed && (
        <div
          className={`p-3.5 bg-gradient-to-r from-orange-600/20 via-neutral-900 to-orange-600/15 border border-orange-500/40 rounded-2xl flex items-center justify-between gap-3 text-white shadow-lg ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">
                {language === 'th' ? 'ติดตั้งแอป Rider บนมือถือ' : 'Install Rider Mobile App'}
              </p>
              <p className="text-[11px] text-neutral-400 leading-snug">
                {isIOS
                  ? (language === 'th'
                      ? 'เพิ่มลงหน้าจอโฮม iPhone / iPad เปิดรับงานได้ทันที'
                      : 'Add to iPhone / iPad Home Screen for full-screen mode')
                  : (language === 'th'
                      ? 'รองรับ Android และ iOS เปิดใช้งานเต็มจอทันที'
                      : 'Install on Android & iOS for quick 1-tap access')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-install-rider-app-banner"
              onClick={handleInstallClick}
              className="px-3 py-2 rounded-xl bg-[#E65100] hover:bg-[#D84315] active:scale-95 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ติดตั้งแอป' : 'Install'}</span>
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss install banner"
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Install Guide Modal */}
      <RiderInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        supportsNativePrompt={supportsNativePrompt}
        onTriggerNativePrompt={handleTriggerNative}
      />
    </>
  );
};
