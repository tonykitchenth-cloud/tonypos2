import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useRestaurant } from '../context/RestaurantContext';
import { IOSInstallGuideModal } from './IOSInstallGuideModal';
import { AndroidInstallGuideModal } from './AndroidInstallGuideModal';
import { LineBrowserGuideModal } from './LineBrowserGuideModal';
import { Smartphone, Download, X, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLogoUrl } from '../utils/navigation';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    isLineBrowser,
    supportsNativePrompt,
    isDismissed,
    installNativePrompt,
    dismissGuidance,
  } = usePWAInstall();

  const { t } = useRestaurant();

  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);

  // 1. Hide if already installed as PWA standalone
  if (isInstalled) {
    return null;
  }

  // 2. Hide if customer dismissed the guidance
  if (isDismissed) {
    return null;
  }

  const handleActionClick = async () => {
    if (isLineBrowser) {
      setShowLineModal(true);
      return;
    }

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (supportsNativePrompt) {
      const outcome = await installNativePrompt();
      if (outcome === 'unavailable') {
        setShowAndroidModal(true);
      }
      return;
    }

    // Android fallback or other modern desktop/mobile
    setShowAndroidModal(true);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          id="pwa-install-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="max-w-4xl mx-auto px-4 mt-2.5 mb-2"
        >
          {isLineBrowser ? (
            /* Special Discreet LINE In-App Browser Guidance Banner */
            <div className="bg-[#1C1C1C] text-white p-3 sm:p-4 rounded-3xl shadow-sm border border-emerald-500/30 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {t('lineBannerTitle')}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-white mt-1 leading-snug">
                      {t('pwaHeroTitle')}
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                      {t('lineBannerDesc')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="pwa-dismiss-btn"
                  onClick={dismissGuidance}
                  className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={t('dismissInstall')}
                  aria-label={t('dismissInstall')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action row */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  id="line-open-external-btn"
                  onClick={handleActionClick}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('lineOpenExternalBtn')}</span>
                </button>

                <button
                  type="button"
                  id="pwa-continue-ordering-btn"
                  onClick={dismissGuidance}
                  className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {t('pwaContinueOrdering')}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Customer Ordering Installation Banner / Card */
            <div className="bg-[#1A1A1A] text-white p-3.5 sm:p-4 rounded-3xl shadow-sm border border-[#E65100]/30 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* TK App Icon */}
                  <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-[#D4AF37]/40 mt-0.5 overflow-hidden p-0.5">
                    <img
                      src={getLogoUrl()}
                      alt="Tony's Kitchen"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                      {t('pwaHeroTitle')}
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                      {t('pwaHeroDesc')}
                    </p>

                    <div className="flex items-center gap-1.5 text-[10px] text-[#D4AF37] font-semibold mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('pwaFreeBadge')}</span>
                    </div>
                  </div>
                </div>

                {/* Top-Right Dismiss Button */}
                <button
                  type="button"
                  id="pwa-dismiss-btn"
                  onClick={dismissGuidance}
                  className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={t('dismissInstall')}
                  aria-label={t('dismissInstall')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  id="pwa-install-action-btn"
                  onClick={handleActionClick}
                  className="px-4 py-2 rounded-xl bg-[#E65100] hover:bg-[#D84315] active:scale-95 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {supportsNativePrompt ? (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('installAppBtn')}</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{t('howToInstallBtn')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="pwa-continue-ordering-btn"
                  onClick={dismissGuidance}
                  className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer underline-offset-2 hover:underline"
                >
                  {t('pwaContinueOrdering')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 1. iOS Safari Tutorial Modal */}
      <IOSInstallGuideModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

      {/* 2. Android Chrome Manual Menu Guide Modal */}
      <AndroidInstallGuideModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />

      {/* 3. LINE In-App Browser Guidance Modal */}
      <LineBrowserGuideModal
        isOpen={showLineModal}
        onClose={() => setShowLineModal(false)}
        isIOS={isIOS}
      />
    </>
  );
};
