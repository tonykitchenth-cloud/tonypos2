import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantOrder } from '../types';
import { subscribeToOrder } from '../utils/orderSync';
import { Receipt, ChevronRight, Clock, CheckCircle2, Bike, Store } from 'lucide-react';

interface ActiveOrderFloatingBannerProps {
  onOpenStatus: (orderId: string) => void;
}

export const ActiveOrderFloatingBanner: React.FC<ActiveOrderFloatingBannerProps> = ({ onOpenStatus }) => {
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

  if (!order || order.status === 'completed' || order.status === 'cancelled') {
    return null;
  }

  const isDelivery = order.orderType === 'delivery';
  const isPending = order.status === 'pending';
  const isAccepted = order.status === 'accepted';
  const isOnTheWay = order.status === 'on_the_way';

  const statusLabel = isOnTheWay
    ? (isDelivery ? t('statusStepOnTheWay') : t('statusStepYourFoodReady'))
    : isAccepted
    ? t('statusStepAccepted')
    : t('statusStepConfirmed');

  return (
    <div
      id="active-order-floating-banner"
      onClick={() => onOpenStatus(order.id)}
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-40 bg-neutral-900/95 border border-orange-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-md cursor-pointer hover:border-orange-500 transition-all transform hover:-translate-y-0.5 group animate-slide-up"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
            {isOnTheWay ? (
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
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {t('activeOrderBanner')}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-mono text-[11px] font-bold">
                {order.orderNumberFormatted}
              </span>
            </div>
            <p className="text-xs text-orange-300/90 font-medium">
              {statusLabel} • <span className="text-neutral-400">฿{order.total.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:text-orange-300 shrink-0">
          <span>{t('trackOrder')}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
