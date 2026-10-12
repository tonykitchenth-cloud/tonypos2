import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Search, X, AlertTriangle } from 'lucide-react';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, settings, storeAvailability, language, setIsClosedModalOpen, t } = useRestaurant();

  const isEmergencyClose = Boolean(settings.emergencyClose?.enabled);
  const emergencyReason =
    (language === 'th' ? settings.emergencyClose?.reasonTh : settings.emergencyClose?.reasonEn) ||
    (language === 'th' ? storeAvailability.reasonTh : storeAvailability.reasonEn) ||
    (language === 'th'
      ? 'ทางร้านขออภัยในความไม่สะดวก ขณะนี้ปิดบริการชั่วคราวกรณีพิเศษ'
      : 'We are temporarily closed due to an emergency or private event.');

  if (isEmergencyClose) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-1" id="emergency-close-banner-container">
        <div
          onClick={() => setIsClosedModalOpen(true)}
          className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg border-2 border-red-400 flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 transition-all"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
              <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-200">
                {language === 'th' ? '🚨 ประกาศปิดร้านชั่วคราวกรณีพิเศษ' : '🚨 EMERGENCY CLOSURE NOTICE'}
              </div>
              <div className="text-sm sm:text-base md:text-lg font-black text-white leading-snug drop-shadow-xs">
                {emergencyReason}
              </div>
            </div>
          </div>
          <div className="shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
            <span>{language === 'th' ? 'ดูรายละเอียด' : 'Details'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-1">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          id="menu-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-white pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200/80 text-xs sm:text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100] transition-all shadow-2xs"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('clearSearch')}
            aria-label={t('clearSearch')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
