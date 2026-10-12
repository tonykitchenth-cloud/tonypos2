import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Clock, Phone, MessageSquare, ExternalLink, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { buildLineUrl, buildWhatsAppUrl } from '../utils/orderMessageGenerator';

export const StoreBanner: React.FC = () => {
  const { settings, storeAvailability, setIsClosedModalOpen, language, t } = useRestaurant();
  const isOpen = storeAvailability.isOpen;

  const currentReason = language === 'th' ? storeAvailability.reasonTh : storeAvailability.reasonEn;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-1">
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100/80 shadow-xs">
        {/* Top Line: Status Badge + Hours Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                isOpen
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {isOpen ? t('storeOpen') : t('storeClosed')}
            </span>

            <div>
              <div className="text-xs text-gray-700 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{t('operatingHours')}</span>
              </div>
              <div className="text-[11px] text-[#DC2626] font-bold pl-4.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] inline-block shrink-0" />
                <span>{t('closedTuesdays')}</span>
              </div>
            </div>
          </div>

          {/* Quick detail trigger if closed */}
          {!isOpen && (
            <button
              type="button"
              onClick={() => setIsClosedModalOpen(true)}
              className="text-xs font-semibold text-[#E65100] hover:underline flex items-center gap-0.5"
            >
              <span>{currentReason}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Line: Direct Contact Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-xs text-gray-600">
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Phone */}
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex items-center gap-1.5 text-gray-700 hover:text-[#E65100] transition-colors font-semibold"
            >
              <Phone className="w-3.5 h-3.5 text-[#E65100]" />
              <span>{settings.phoneDisplay || settings.phone}</span>
            </a>

            {/* LINE */}
            <a
              href={buildLineUrl(settings.lineId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#06C755] hover:opacity-80 transition-opacity font-semibold"
            >
              <span className="bg-[#06C755] text-white text-[9px] font-black px-1 rounded">LINE</span>
              <span>{settings.lineId}</span>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${settings.whatsAppIntlNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#25D366] hover:opacity-80 transition-opacity font-semibold"
            >
              <span className="bg-[#25D366] text-white text-[9px] font-black px-1 rounded">WA</span>
              <span>{settings.whatsAppNumber}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
