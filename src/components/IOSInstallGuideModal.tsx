import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { X, Compass, Share2, PlusSquare, ToggleRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = ({ isOpen, onClose }) => {
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
            id="close-ios-guide-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center space-y-2 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#E65100] mx-auto flex items-center justify-center border border-orange-100 shadow-xs">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-[#1A1A1A]">
              {t('iosInstructionsTitle')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('iosInstructionsDesc')}
            </p>
          </div>

          {/* 4-Step Visual Instructions matching exact requirements */}
          <div className="space-y-2.5 mb-6">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <Compass className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-700 pt-0.5 leading-relaxed">
                <span className="font-bold text-[#1A1A1A] block mb-0.5">
                  {language === 'th' ? 'ขั้นตอนที่ 1' : 'Step 1'}
                </span>
                {t('iosStep1')}
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-700 pt-0.5 leading-relaxed">
                <span className="font-bold text-[#1A1A1A] block mb-0.5">
                  {language === 'th' ? 'ขั้นตอนที่ 2' : 'Step 2'}
                </span>
                {t('iosStep2')}
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E65100] flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-700 pt-0.5 leading-relaxed">
                <span className="font-bold text-[#1A1A1A] block mb-0.5">
                  {language === 'th' ? 'ขั้นตอนที่ 3' : 'Step 3'}
                </span>
                {t('iosStep3')}
              </div>
            </div>

            {/* Step 4 (iOS 16.4+ Web App Option & Add) */}
            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <ToggleRight className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-700 pt-0.5 leading-relaxed">
                <span className="font-bold text-[#1A1A1A] block mb-0.5">
                  {language === 'th' ? 'ขั้นตอนที่ 4' : 'Step 4'}
                </span>
                {t('iosStep4')}
              </div>
            </div>
          </div>

          {/* Understood Button */}
          <button
            type="button"
            id="ios-guide-got-it-btn"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-[#E65100] text-white font-extrabold text-xs sm:text-sm hover:bg-[#D84315] transition-all active:scale-[0.99] cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'th' ? 'เข้าใจแล้ว / ปิด' : 'Got it'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
