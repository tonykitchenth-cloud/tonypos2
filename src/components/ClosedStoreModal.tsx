import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { X, Clock, AlertCircle, Calendar, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DAY_NAMES_MAP: Record<number, { en: string; th: string }> = {
  0: { en: 'Sunday', th: 'วันอาทิตย์' },
  1: { en: 'Monday', th: 'วันจันทร์' },
  2: { en: 'Tuesday', th: 'วันอังคาร' },
  3: { en: 'Wednesday', th: 'วันพุธ' },
  4: { en: 'Thursday', th: 'วันพฤหัสบดี' },
  5: { en: 'Friday', th: 'วันศุกร์' },
  6: { en: 'Saturday', th: 'วันเสาร์' },
};

export const ClosedStoreModal: React.FC = () => {
  const {
    isClosedModalOpen,
    setIsClosedModalOpen,
    storeAvailability,
    settings,
    language,
    t,
  } = useRestaurant();

  if (!isClosedModalOpen) return null;

  const currentReason = language === 'th' ? storeAvailability.reasonTh : storeAvailability.reasonEn;
  const nextOpen = storeAvailability.nextOpenFormatted
    ? (language === 'th' ? storeAvailability.nextOpenFormatted.th : storeAvailability.nextOpenFormatted.en)
    : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsClosedModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1A1A1A]">
                {t('closedNotice')}
              </h2>
              <p className="text-xs text-rose-600 font-semibold mt-0.5">
                {currentReason}
              </p>
            </div>
          </div>

          {/* Next Opening Time Pill */}
          {nextOpen && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 mb-4 flex items-center gap-3 text-amber-900">
              <Calendar className="w-5 h-5 text-[#E65100] shrink-0" />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80 block">
                  {t('nextOpeningAt')}
                </span>
                <span className="text-sm font-extrabold text-[#1A1A1A]">
                  {nextOpen}
                </span>
              </div>
            </div>
          )}

          {/* Ordering paused message */}
          <p className="text-xs text-gray-600 leading-relaxed mb-5">
            {t('orderingPausedNotice')}
          </p>

          {/* Weekly Schedule Preview */}
          <div className="bg-gray-50 rounded-2xl p-3.5 mb-5 border border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>{language === 'th' ? 'เวลาทำการประจำสัปดาห์' : 'Weekly Operating Schedule'}</span>
            </h3>
            <div className="space-y-1.5 text-xs">
              {settings.schedule.map((sched) => {
                const dayLabel = DAY_NAMES_MAP[sched.dayOfWeek]?.[language] || sched.dayName;
                const isTuesday = sched.dayOfWeek === 2;
                return (
                  <div
                    key={sched.dayOfWeek}
                    className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                      isTuesday && !sched.isOpen
                        ? 'bg-rose-50 text-[#DC2626] font-bold border border-rose-100'
                        : !sched.isOpen
                        ? 'bg-rose-50/50 text-rose-700 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className={isTuesday && !sched.isOpen ? 'text-[#DC2626]' : ''}>{dayLabel}</span>
                    <span className="font-semibold">
                      {sched.isOpen ? `${sched.openTime} - ${sched.closeTime}` : (language === 'th' ? 'หยุดประจำสัปดาห์ (ปิด)' : 'Closed (Weekly)')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <a
              href={`tel:${settings.phone}`}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              <Phone className="w-4 h-4 text-[#E65100]" />
              <span>{t('callStore')}</span>
            </a>
            <button
              type="button"
              onClick={() => setIsClosedModalOpen(false)}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-colors"
            >
              {t('startOrdering')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
