import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { X, ExternalLink, Compass, Globe, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LineBrowserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}

export const LineBrowserGuideModal: React.FC<LineBrowserGuideModalProps> = ({ isOpen, onClose, isIOS }) => {
  const { language, t } = useRestaurant();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            id="close-line-guide-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center space-y-2 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#06C755] mx-auto flex items-center justify-center border border-emerald-100 shadow-xs">
              <ExternalLink className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-[#1A1A1A]">
              {t('lineModalTitle')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('lineModalDesc')}
            </p>
          </div>

          {/* Platform specific instruction */}
          <div className="space-y-3 mb-6">
            {isIOS ? (
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {t('lineStepIOS')}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Android (Chrome)</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {t('lineStepAndroid')}
                </p>
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
              <strong>{language === 'th' ? 'หมายเหตุ:' : 'Note:'}</strong>{' '}
              {language === 'th'
                ? 'คุณสามารถสั่งอาหารในหน้านี้ต่อได้ทันทีโดยไม่จำเป็นต้องติดตั้งแอปครับ'
                : 'You can also continue ordering directly on this page without installing.'}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            id="line-guide-got-it-btn"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-[#1A1A1A] text-white font-extrabold text-xs sm:text-sm hover:bg-black transition-all active:scale-[0.99] cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'th' ? 'เข้าใจแล้ว / สั่งอาหารต่อ' : 'Got it / Continue'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
