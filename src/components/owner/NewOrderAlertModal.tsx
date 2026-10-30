import React, { useState } from 'react';
import { RestaurantOrder, Language } from '../../types';
import {
  Bell,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  ShoppingBag,
  User,
  CheckCircle2,
} from 'lucide-react';
import { notificationSoundService } from '../../services/notificationSoundService';
import { silenceCurrentAlarm, resetAlarmSilence } from '../../utils/soundAlarm';

interface NewOrderAlertModalProps {
  orders: RestaurantOrder[];
  language: Language;
  onViewOrder: (order: RestaurantOrder) => void;
  onDismissOrder: (orderId: string) => void;
  onDismissAll: () => void;
}

export const NewOrderAlertModal: React.FC<NewOrderAlertModalProps> = ({
  orders,
  language,
  onViewOrder,
  onDismissOrder,
  onDismissAll,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => notificationSoundService.isMuted());

  if (!orders || orders.length === 0) {
    return null;
  }

  // Ensure currentIndex stays within bounds
  const safeIndex = Math.min(currentIndex, orders.length - 1);
  const activeOrder = orders[safeIndex] || orders[0];

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    if (newMuted) {
      silenceCurrentAlarm();
    } else {
      resetAlarmSilence();
    }
    notificationSoundService.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : orders.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < orders.length - 1 ? prev + 1 : 0));
  };

  const formattedOrderNumber =
    activeOrder.orderNumberFormatted ||
    `#TK-${String(activeOrder.orderNumber || 0).padStart(6, '0')}`;

  const isThai = language === 'th';

  return (
    <div
      id="new-order-alert-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-labelledby="new-order-alert-title"
    >
      <div className="relative w-full max-w-md bg-[#1A1A1A] text-white rounded-3xl border-2 border-[#E65100] shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E65100] via-[#D4AF37] to-[#E65100]" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E65100]/20 border border-[#E65100]/50 flex items-center justify-center text-[#E65100] shadow-inner animate-bounce">
              <Bell className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2
                id="new-order-alert-title"
                className="text-base font-black tracking-wide text-white uppercase flex items-center gap-2"
              >
                <span>{isThai ? 'มีออเดอร์ใหม่เข้ามา!' : 'NEW ORDER'}</span>
                {orders.length > 1 && (
                  <span className="bg-[#E65100] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {safeIndex + 1} / {orders.length}
                  </span>
                )}
              </h2>
              <span className="text-xs font-extrabold text-[#D4AF37] block">
                {formattedOrderNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick sound mute/unmute */}
            <button
              type="button"
              id="alert-toggle-mute-btn"
              onClick={handleToggleMute}
              title={isMuted ? (isThai ? 'เปิดเสียง' : 'Unmute Sound') : (isThai ? 'ปิดเสียง' : 'Mute Sound')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Dismiss current */}
            <button
              type="button"
              id="alert-close-btn"
              onClick={() => onDismissOrder(activeOrder.id)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multiple Orders Navigation */}
        {orders.length > 1 && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-xl text-xs text-gray-400">
            <span>
              {isThai ? `มีออเดอร์ใหม่ ${orders.length} รายการ` : `${orders.length} New Orders in Queue`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 hover:bg-white/10 rounded-lg text-white cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-[#E65100]">
                {safeIndex + 1} of {orders.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 hover:bg-white/10 rounded-lg text-white cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Order Details Body */}
        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-3.5 text-xs">
          {/* Customer */}
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block flex items-center gap-1">
              <User className="w-3 h-3 text-[#D4AF37]" />
              {isThai ? 'ลูกค้า:' : 'Customer:'}
            </span>
            <p className="font-bold text-white text-sm mt-0.5">
              {activeOrder.customer?.name || (isThai ? 'ลูกค้าทั่วไป' : 'Customer')}
            </p>
            {activeOrder.customer?.phone && (
              <span className="text-gray-400 text-[11px] block mt-0.5">
                📞 {activeOrder.customer.phone}
              </span>
            )}
          </div>

          {/* Items List */}
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-[#E65100]" />
              {isThai ? 'รายการ:' : 'Items:'}
            </span>
            <div className="mt-1 space-y-1 max-h-36 overflow-y-auto pr-1">
              {activeOrder.items?.map((item, idx) => {
                const itemName =
                  typeof item.name === 'object'
                    ? item.name[language] || item.name.en || 'Dish'
                    : String(item.name || 'Dish');
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-0.5 text-gray-200 border-b border-white/5 last:border-0"
                  >
                    <span className="font-semibold">
                      <span className="text-[#E65100] font-bold mr-1.5">{item.quantity} ×</span>
                      {itemName}
                    </span>
                    <span className="text-gray-400 font-medium">
                      {activeOrder.currencySymbol || '฿'}{item.subtotal || item.unitPrice * item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Price */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="font-black text-gray-300 uppercase tracking-wider text-xs">
              {isThai ? 'ยอดรวม:' : 'Total:'}
            </span>
            <span className="text-lg font-black text-[#D4AF37]">
              {activeOrder.currencySymbol || '฿'}{activeOrder.total}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary View Order CTA */}
          <button
            type="button"
            id="alert-view-order-btn"
            onClick={() => onViewOrder(activeOrder)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#E65100] hover:bg-[#D84315] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
          >
            <Eye className="w-4 h-4" />
            <span>{isThai ? 'ดูออเดอร์' : 'VIEW ORDER'}</span>
          </button>

          {/* Dismiss Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="alert-dismiss-btn"
              onClick={() => onDismissOrder(activeOrder.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              {isThai ? 'ปิด' : 'DISMISS'}
            </button>

            {orders.length > 1 && (
              <button
                type="button"
                id="alert-dismiss-all-btn"
                onClick={onDismissAll}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                {isThai ? 'ปิดทั้งหมด' : 'DISMISS ALL'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
