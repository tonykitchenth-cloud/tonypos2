import React, { useEffect, useState, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantOrder } from '../types';
import { subscribeToOrder } from '../utils/orderSync';
import {
  CheckCircle2,
  Clock,
  Bike,
  Store,
  Phone,
  X,
  Sparkles,
  AlertCircle,
  MapPin,
  CreditCard,
  Banknote,
  Receipt,
  RotateCw,
  Heart,
  ShoppingBag,
} from 'lucide-react';

interface CustomerOrderStatusModalProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
}

export const CustomerOrderStatusModal: React.FC<CustomerOrderStatusModalProps> = ({
  isOpen,
  orderId,
  onClose,
}) => {
  const { t, language, settings, setActiveOrderId } = useRestaurant();
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDefinitiveNotFound, setIsDefinitiveNotFound] = useState<boolean>(false);
  const notFoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
      return;
    }

    if (!orderId) {
      // If we don't have an orderId and we don't already have an order displayed
      if (!order) {
        setLoading(false);
        setIsDefinitiveNotFound(true);
      }
      return;
    }

    setLoading(true);
    setIsDefinitiveNotFound(false);

    if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
    notFoundTimerRef.current = setTimeout(() => {
      // Only mark definitive not found if still no order received after 7 seconds
      setOrder((current) => {
        if (!current) {
          setIsDefinitiveNotFound(true);
          setLoading(false);
        }
        return current;
      });
    }, 7000);

    const unsubscribe = subscribeToOrder(
      orderId,
      (liveOrder) => {
        if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
        setOrder(liveOrder);
        setLoading(false);
        setIsDefinitiveNotFound(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (notFoundTimerRef.current) clearTimeout(notFoundTimerRef.current);
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const isDelivery = order?.orderType === 'delivery';
  const isAccepted =
    order?.status === 'accepted' ||
    order?.status === 'on_the_way' ||
    order?.status === 'completed';
  const isReadyOrOnTheWay =
    order?.status === 'on_the_way' || order?.status === 'completed';
  const isCompleted = order?.status === 'completed';
  const isCancelled = order?.status === 'cancelled';

  const handleClose = () => {
    // When customer explicitly dismisses a completed or cancelled order,
    // clear activeOrderId so customer can place a fresh order next time
    if (isCompleted || isCancelled) {
      setActiveOrderId(null);
    }
    onClose();
  };

  const getStatusBadgeText = () => {
    if (isCancelled) return t('statusStepCancelled');
    if (isCompleted) return t('statusStepCompleted');
    if (order?.status === 'on_the_way') {
      return isDelivery ? t('statusStepOnTheWay') : t('statusStepYourFoodReady');
    }
    if (order?.status === 'accepted') {
      return t('statusStepAccepted');
    }
    return t('statusStepConfirmed');
  };

  return (
    <div
      id="customer-order-status-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 text-white rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E65100]/20 border border-[#E65100]/40 flex items-center justify-center text-[#E65100] shadow-inner">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {t('liveOrderStatusTitle')}
                </h3>
                {order && (
                  <span className="px-2 py-0.5 rounded-full bg-[#E65100]/20 text-orange-400 text-xs font-bold font-mono border border-[#E65100]/40">
                    {order.orderNumberFormatted}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {t('restaurantName')} • {order?.source === 'in_app' ? t('inAppOrderChannel') : order?.source === 'line' ? t('filterSourceLine') : order?.source === 'whatsapp' ? t('filterSourceWhatsApp') : t('directOrderChannel')}
              </p>
            </div>
          </div>
          <button
            id="btn-close-order-status"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {loading && !order ? (
            /* Loading State */
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
              <RotateCw className="w-10 h-10 text-[#E65100] animate-spin" />
              <p className="text-sm font-semibold text-neutral-300">
                {t('loadingOrder') || 'Loading your order...'}
              </p>
              <p className="text-xs text-neutral-500">
                {t('syncingOrder') || 'Updating order status...'}
              </p>
            </div>
          ) : !order && isDefinitiveNotFound ? (
            /* Truly Not Found State (Timeout expired) */
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center mx-auto text-neutral-400">
                <AlertCircle className="w-7 h-7 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  {language === 'th' ? 'ไม่พบข้อมูลออเดอร์' : 'Order Not Found'}
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  {t('orderNotFoundDefinitive')}
                </p>
              </div>
              <a
                href={`tel:${settings.phone || '0841536498'}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{t('callStore')}: {settings.phoneDisplay || settings.phone}</span>
              </a>
            </div>
          ) : order ? (
            <>
              {/* ============================================================== */}
              {/* 🌟 1. SPECIAL ORDER COMPLETED / READY CELEBRATION HERO BANNER */}
              {/* ============================================================== */}
              {isCompleted ? (
                <div
                  id="order-ready-celebration-card"
                  className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-neutral-900 to-neutral-950 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/10 space-y-4 text-center relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Big Glowing Emerald Checkmark */}
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-neutral-950 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                      <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Headline: Your Order Is Ready! */}
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {t('orderReadyHeadline')}
                    </h3>
                    {/* Specific Message for Pickup vs Delivery */}
                    <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed max-w-md mx-auto">
                      {isDelivery
                        ? t('orderReadyDeliveryMessage')
                        : t('orderReadyPickupMessage')}
                    </p>
                  </div>

                  {/* Delivery / Pickup Status Pill */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    {isDelivery ? (
                      <>
                        <Bike className="w-4 h-4 text-emerald-400" />
                        <span>{language === 'th' ? 'ไรเดอร์กำลังนำส่งออเดอร์ถึงคุณ' : 'Food on the way to your address'}</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-4 h-4 text-emerald-400" />
                        <span>{language === 'th' ? 'อาหารพร้อมรับที่เคาน์เตอร์ร้าน' : 'Ready at store pickup counter'}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {/* ============================================================== */}
              {/* 2. ORDER PROGRESS TIMELINE */}
              {/* ============================================================== */}
              <div className="bg-neutral-950/70 rounded-2xl p-4 sm:p-5 border border-neutral-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {t('timelineAndProgress')}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isCancelled
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-extrabold'
                        : order.status === 'on_the_way'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : isAccepted
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 animate-pulse'
                    }`}
                  >
                    {getStatusBadgeText()}
                  </span>
                </div>

                {isCancelled ? (
                  <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300">
                    <p className="font-semibold">{t('statusStepCancelled')}</p>
                    {order.cancelReason && (
                      <p className="mt-1 text-red-400/80">
                        {t('reasonPrefix')} {order.cancelReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 relative pl-3 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
                    {/* Step 1: Order Confirmed */}
                    <div className="flex items-start gap-3 relative">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center z-10 shrink-0 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-white">
                          ✓ {t('orderNumberPrefix')} {order.orderNumberFormatted}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {t('statusStepConfirmed')} •{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Restaurant Accepted */}
                    <div className="flex items-start gap-3 relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 transition-all ${
                          isAccepted
                            ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                        }`}
                      >
                        {isAccepted ? (
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p
                          className={`text-sm font-semibold ${
                            isAccepted ? 'text-white' : 'text-neutral-400'
                          }`}
                        >
                          {isAccepted ? '✓' : '○'} {t('statusStepAccepted')}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {isAccepted
                            ? t('kitchenPreparing')
                            : t('waitingForKitchen')}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: On The Way / Ready For Pickup */}
                    {isDelivery ? (
                      <div className="flex items-start gap-3 relative">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 transition-all ${
                            isReadyOrOnTheWay
                              ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                          }`}
                        >
                          {isReadyOrOnTheWay ? (
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <Bike className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`text-sm font-semibold ${
                              isReadyOrOnTheWay ? 'text-white' : 'text-neutral-400'
                            }`}
                          >
                            {isReadyOrOnTheWay ? '✓' : '○'} {t('statusStepOnTheWay')}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {isReadyOrOnTheWay
                              ? t('driverOnTheWay')
                              : t('willBeDispatchedOncePrepared')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 relative">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 transition-all ${
                            isReadyOrOnTheWay
                              ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                          }`}
                        >
                          {isReadyOrOnTheWay ? (
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <Store className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p
                            className={`text-sm font-semibold ${
                              isReadyOrOnTheWay ? 'text-white' : 'text-neutral-400'
                            }`}
                          >
                            {isReadyOrOnTheWay ? '✓' : '○'} {t('statusStepYourFoodReady')}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {isReadyOrOnTheWay
                              ? t('readyForCustomerPickup')
                              : t('pickUpAtStoreOncePrepared')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cannot Cancel Notice (Only when order is still being prepared) */}
              {!isCompleted && !isCancelled && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{t('cannotCancelNotice')}</p>
                </div>
              )}

              {/* ============================================================== */}
              {/* 3. CUSTOMER & FULFILLMENT SUMMARY CARD */}
              {/* ============================================================== */}
              <div className="bg-neutral-950/50 rounded-2xl p-4 border border-neutral-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-neutral-400">
                  <span className="font-semibold text-neutral-300 uppercase tracking-wide">
                    {t('customerDetails')}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-200 capitalize font-medium">
                    {order.orderType === 'pickup' ? t('pickup') : t('delivery')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div>
                    <span className="text-neutral-500 block">{t('fullName')}</span>
                    <span className="font-medium text-white">{order.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">{t('phoneNumber')}</span>
                    <span className="font-medium text-white">{order.customer.phone}</span>
                  </div>
                </div>

                {isDelivery && order.customer.deliveryAddress && (
                  <div className="pt-2 border-t border-neutral-800/60">
                    <span className="text-neutral-500 flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      {t('deliveryAddress')}
                    </span>
                    <p className="text-neutral-200 font-medium">
                      {order.customer.deliveryAddress}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-1">
                    {order.paymentMethod === 'qr_payment' ? (
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {t('paymentMethod')}
                  </span>
                  <span className="font-semibold text-white">
                    {order.paymentMethod === 'qr_payment'
                      ? t('qrPaymentShort')
                      : t('cashShort')}
                  </span>
                </div>
              </div>

              {/* ============================================================== */}
              {/* 4. ITEMS ORDER SUMMARY BREAKDOWN */}
              {/* ============================================================== */}
              <div className="bg-neutral-950/50 rounded-2xl p-4 border border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs text-neutral-400 font-semibold uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                    <span>{t('items')} ({order.items.length})</span>
                  </span>
                  <span>{t('total')}</span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start text-xs text-neutral-300"
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <span className="text-orange-400 font-bold">{item.quantity}×</span>
                          <span>
                            {item.name?.[language] ||
                              item.name?.en ||
                              (typeof item.name === 'string' ? item.name : '')}
                          </span>
                        </div>
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="text-[11px] text-neutral-400 pl-4 space-y-0.5 mt-0.5">
                            {item.selectedModifiers.map((mod, mIdx) => (
                              <div key={mIdx}>
                                +{' '}
                                {mod.optionName?.[language] ||
                                  mod.optionName?.en ||
                                  (typeof mod.optionName === 'string'
                                    ? mod.optionName
                                    : '')}
                                {mod.priceAdjustment > 0 &&
                                  ` (+฿${mod.priceAdjustment})`}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.specialRequest && (
                          <p className="text-[11px] text-amber-300/90 italic pl-4 mt-0.5">
                            "{item.specialRequest}"
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-white whitespace-nowrap font-mono">
                        ฿{item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
                  <span>{t('total')}</span>
                  <span className="text-lg text-orange-400 font-mono">
                    ฿{order.total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Direct Store Contact Button */}
              <a
                href={`tel:${settings.phone || '0841536498'}`}
                className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-colors shadow-xs"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>
                  {t('callStore')}: {settings.phoneDisplay || settings.phone || '084-153-6498'}
                </span>
              </a>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/90 flex items-center justify-between">
          <button
            id="btn-dismiss-order-status"
            onClick={handleClose}
            className={`w-full py-3 px-4 rounded-2xl font-black text-sm transition-all shadow-lg cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20'
                : 'bg-[#E65100] hover:bg-[#D84315] text-white shadow-orange-500/20'
            }`}
          >
            {isCompleted
              ? language === 'th'
                ? '✓ กลับไปหน้าเมนู / ปิดหน้าต่าง'
                : '✓ Back to Menu / Close'
              : t('backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
};
