import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantOrder } from '../types';
import { subscribeToOrder } from '../utils/orderSync';
import { Receipt, ChevronRight, Clock, CheckCircle2, Bike, Store, Sparkles } from 'lucide-react';

interface ActiveOrderFloatingBannerProps {
  onOpenStatus: (orderId: string) => void;
}

export const ActiveOrderFloatingBanner: React.FC<ActiveOrderFloatingBannerProps> = ({
  onOpenStatus,
}) => {
  const { activeOrderId, t, language } = useRestaurant();
  const [order, setOrder] = useState<RestaurantOrder | null>(null);

  useEffect(() => {
    if (!activeOrderId) {
      setOrder(null);
      return;
    }

    const unsubscribe = subscribeToOrder(activeOrderId, (liveOrder) => {
      setOrder(liveOrder);
    });

    return () => {
      unsubscribe();
    };
  }, [activeOrderId]);

  if (!order || order.status === 'cancelled') {
    return null;
  }

  const isDelivery = order.orderType === 'delivery';
  const isCompleted = order.status === 'completed';
  const isAccepted = order.status === 'accepted';
  const isOnTheWay = order.status === 'on_the_way';

  const statusLabel = isCompleted
    ? t('orderReadyHeadline')
    : isOnTheWay
    ? isDelivery
      ? t('statusStepOnTheWay')
      : t('statusStepYourFoodReady')
    : isAccepted
    ? t('statusStepAccepted')
    : t('statusStepConfirmed');

  return (
    <div
      id="active-order-floating-banner"
      onClick={() => onOpenStatus(order.id)}
      className={`fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-40 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-md cursor-pointer transition-all transform hover:-translate-y-0.5 group animate-slide-up border ${
        isCompleted
          ? 'bg-neutral-950/95 border-emerald-500/60 hover:border-emerald-400 shadow-emerald-500/20'
          : 'bg-neutral-900/95 border-orange-500/40 hover:border-orange-500 shadow-orange-500/10'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isCompleted
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-orange-500/20 border-orange-500/30 text-orange-400'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 stroke-[2.5] text-emerald-400" />
            ) : isOnTheWay ? (
              isDelivery ? (
                <Bike className="w-5 h-5 animate-bounce text-orange-400" />
              ) : (
                <Store className="w-5 h-5 animate-pulse text-orange-400" />
              )
            ) : isAccepted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-400 animate-spin" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                {isCompleted ? (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{t('orderReadyHeadline')}</span>
                  </>
                ) : (
                  <span>{t('activeOrderBanner')}</span>
                )}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-[11px] font-bold ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-orange-500/20 text-orange-400'
                }`}
              >
                {order.orderNumberFormatted}
              </span>
            </div>
            <p
              className={`text-xs font-medium ${
                isCompleted ? 'text-emerald-300/90' : 'text-orange-300/90'
              }`}
            >
              {statusLabel} • <span className="text-neutral-400">฿{order.total.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1 text-xs font-bold group-hover:underline shrink-0 ${
            isCompleted ? 'text-emerald-400' : 'text-orange-400'
          }`}
        >
          <span>{isCompleted ? (language === 'th' ? 'ดูรายละเอียด' : 'View') : t('trackOrder')}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
