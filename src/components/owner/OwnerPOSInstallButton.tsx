import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { OwnerPOSInstallModal } from './OwnerPOSInstallModal';
import { Download, Monitor, CheckCircle2 } from 'lucide-react';

interface OwnerPOSInstallButtonProps {
  variant?: 'header' | 'card' | 'banner';
  className?: string;
}

export const OwnerPOSInstallButton: React.FC<OwnerPOSInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language } = useRestaurant();
  const { isInstalled, supportsNativePrompt, installNativePrompt } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  // If already running standalone / installed, do not show button
  if (isInstalled) {
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

    // Native prompt not captured: show visual guide for POS device
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
          id="btn-install-pos-app-header"
          onClick={handleInstallClick}
          className={`px-3 py-1.5 rounded-full bg-[#E65100] hover:bg-[#D84315] text-white text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border border-[#E65100]/30 select-none ${className}`}
          title={language === 'th' ? 'ติดตั้งแอปบนหน้าจอเครื่อง POS' : 'Install POS App'}
        >
          {installedSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>{language === 'th' ? 'ติดตั้งเรียบร้อย!' : 'Installed!'}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ติดตั้งแอป POS' : 'Install POS App'}</span>
            </>
          )}
        </button>
      )}

      {variant === 'card' && (
        <button
          type="button"
          id="btn-install-pos-app-card"
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 hover:text-orange-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${className}`}
        >
          <Monitor className="w-4 h-4" />
          <span>
            {language === 'th'
              ? 'ติดตั้งแอปลงหน้าจอเครื่อง POS'
              : 'Install App on POS Screen'}
          </span>
        </button>
      )}

      {variant === 'banner' && (
        <div className={`p-3 bg-gradient-to-r from-orange-600/20 via-orange-500/10 to-orange-600/20 border border-orange-500/30 rounded-2xl flex items-center justify-between gap-3 text-white ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {language === 'th' ? 'ใช้งานเต็มจอบนเครื่อง POS' : 'Run Full-Screen on POS'}
              </p>
              <p className="text-[10px] text-neutral-400">
                {language === 'th'
                  ? 'ติดตั้งไอคอนแอปบนหน้าจอหลักของเครื่อง POS'
                  : 'Add Tony\'s Kitchen app icon to POS home screen'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-[#E65100] hover:bg-[#D84315] text-white font-extrabold text-xs shadow-sm cursor-pointer shrink-0"
          >
            {language === 'th' ? 'ติดตั้ง' : 'Install'}
          </button>
        </div>
      )}

      {/* Guide Modal */}
      <OwnerPOSInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        supportsNativePrompt={supportsNativePrompt}
        onTriggerNativePrompt={handleTriggerNative}
      />
    </>
  );
};
