import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { CheckCircle2, Copy, ExternalLink, MessageCircle, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrderSuccessModal: React.FC = () => {
  const { lastOrderInfo, setLastOrderInfo, settings, language, t } = useRestaurant();
  const [copied, setCopied] = useState(false);

  if (!lastOrderInfo) return null;

  const isWhatsApp = lastOrderInfo.channel === 'whatsapp';

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(lastOrderInfo.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      console.warn('Clipboard write failed');
    }
  };

  const handleClose = () => {
    setLastOrderInfo(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative"
        >
          {/* Close button */}
          <button
            type="button"
            id="close-success-modal-btn"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success Icon Header */}
          <div className="text-center space-y-2 mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A]">
              {t('orderReadyTitle')}
            </h2>
            <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
              {isWhatsApp ? t('whatsAppSuccessMsg') : t('lineSuccessMsg')}
            </p>
          </div>

          {/* Order Message Preview Box */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3 mb-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pb-1.5 border-b border-gray-200">
              <span>{language === 'th' ? 'ข้อความออเดอร์ที่ถูกส่ง' : 'Generated Order Message'}</span>
              <button
                type="button"
                id="copy-order-text-btn"
                onClick={handleCopyText}
                className="text-[#E65100] hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? t('copiedSuccess') : t('copyOrderAgain')}</span>
              </button>
            </div>
            <pre className="text-[11px] text-gray-700 font-sans whitespace-pre-wrap pt-2 leading-relaxed">
              {lastOrderInfo.message}
            </pre>
          </div>

          {/* Direct Launch Actions */}
          <div className="space-y-2">
            {isWhatsApp && lastOrderInfo.whatsAppUrl && (
              <a
                href={lastOrderInfo.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#1EBE5D] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('openWhatsAppDirect')}</span>
              </a>
            )}

            {!isWhatsApp && (
              <>
                <button
                  type="button"
                  id="re-copy-btn"
                  onClick={handleCopyText}
                  className="w-full py-3 px-4 rounded-xl bg-orange-50 text-[#E65100] border border-[#E65100]/30 text-xs font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? t('copiedSuccess') : t('copyOrderAgain')}</span>
                </button>

                {lastOrderInfo.lineUrl && (
                  <a
                    href={lastOrderInfo.lineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#06C755] text-white text-xs font-bold hover:bg-[#05B34C] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('openLineDirect')}</span>
                  </a>
                )}
              </>
            )}

            <button
              type="button"
              id="back-to-menu-btn"
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-colors"
            >
              {t('backToMenu')}
            </button>
          </div>

          {/* Confirmation disclaimer */}
          <p className="text-[10px] text-gray-400 text-center mt-3 leading-tight">
            {t('orderHandoffNotice')}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
