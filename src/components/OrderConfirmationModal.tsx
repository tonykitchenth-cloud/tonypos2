import React, { useState, useEffect, useId } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { CreateOrderParams, createRestaurantOrder } from '../utils/orderSync';
import {
  Timer,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  Receipt,
  MapPin,
  CreditCard,
  Banknote,
  Loader2,
  X,
  Phone,
  User,
} from 'lucide-react';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  orderParams: CreateOrderParams | null;
  onClose: () => void;
  onOrderConfirmed: (orderId: string) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  orderParams,
  onClose,
  onOrderConfirmed,
}) => {
  const { t, language, clearCart, storeAvailability } = useRestaurant();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset timer whenever modal is opened with new order params
  useEffect(() => {
    if (isOpen && orderParams) {
      setSecondsRemaining(60);
      setIsExpired(false);
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen, orderParams]);

  // 60-second countdown effect
  useEffect(() => {
    if (!isOpen || isExpired || isSubmitting) return;

    if (secondsRemaining <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, secondsRemaining, isExpired, isSubmitting]);

  if (!isOpen || !orderParams) return null;

  const handleConfirmOrder = async () => {
    if (isSubmitting || isExpired) return;

    // Safety check: is store still open?
    if (!storeAvailability.isOpen) {
      setErrorMessage(t('storeClosedCannotOrder'));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const createdOrder = await createRestaurantOrder(orderParams);

      // Successfully created! Clear cart and notify parent
      clearCart();
      onOrderConfirmed(createdOrder.id);
    } catch (err: any) {
      console.error('Failed to create order in Firestore:', err);
      setErrorMessage(err?.message || 'Failed to submit order. Please check network connection and try again.');
      setIsSubmitting(false);
    }
  };

  const timerPercentage = (secondsRemaining / 60) * 100;
  const isUrgent = secondsRemaining <= 15;

  return (
    <div
      id="order-confirmation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black animate-fade-in"
    >
      <div
        className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-500">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {t('confirmOrderTitle')}
              </h3>
              <p className="text-xs text-neutral-400">
                {t('confirmOrderNotice')}
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              id="btn-close-confirm-modal"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {isExpired ? (
            /* Expired State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-white">
                  {t('confirmationExpiredTitle')}
                </h4>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  {t('confirmationExpiredDesc')}
                </p>
              </div>
              <button
                id="btn-return-checkout-expired"
                onClick={onClose}
                className="py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-bold text-sm transition-colors shadow-lg shadow-orange-500/20"
              >
                {t('returnToCheckout')}
              </button>
            </div>
          ) : (
            <>
              {/* 60s Countdown Timer Banner */}
              <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-bold text-base transition-colors ${
                      isUrgent
                        ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
                        : 'bg-orange-500/20 border border-orange-500/30 text-orange-400'
                    }`}
                  >
                    00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {t('confirmOrderTimeNotice')}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {isUrgent ? 'Hurry! Window expiring soon' : 'Please verify items before confirming'}
                    </p>
                  </div>
                </div>

                {/* Linear progress meter */}
                <div className="w-20 sm:w-28 bg-neutral-800 h-2 rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      isUrgent ? 'bg-red-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${timerPercentage}%` }}
                  />
                </div>
              </div>

              {/* Error notification if any */}
              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {/* Order Info & Customer Box */}
              <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-neutral-400">
                  <span className="font-semibold text-neutral-300 uppercase tracking-wide">
                    {t('customerDetails')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 capitalize font-semibold">
                    {orderParams.orderType === 'pickup' ? t('pickup') : t('delivery')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <div>
                      <span className="text-neutral-500 block text-[10px]">{t('fullName')}</span>
                      <span className="font-medium text-white">{orderParams.customer.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <div>
                      <span className="text-neutral-500 block text-[10px]">{t('phoneNumber')}</span>
                      <span className="font-medium text-white">{orderParams.customer.phone}</span>
                    </div>
                  </div>
                </div>

                {orderParams.orderType === 'delivery' && orderParams.customer.deliveryAddress && (
                  <div className="pt-2 border-t border-neutral-800/60 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-neutral-500 block text-[10px]">{t('deliveryAddress')}</span>
                      <span className="font-medium text-neutral-200">{orderParams.customer.deliveryAddress}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    {orderParams.paymentMethod === 'qr_payment' ? (
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {t('paymentMethod')}:
                  </span>
                  <span className="font-semibold text-white">
                    {orderParams.paymentMethod === 'qr_payment' ? t('qrPayment') : t('cash')}
                  </span>
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs text-neutral-400 font-semibold uppercase tracking-wide">
                  <span>{t('items')} ({orderParams.items.length})</span>
                  <span>{t('total')}</span>
                </div>

                <div className="space-y-2.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {orderParams.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs text-neutral-300">
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <span className="text-orange-400 font-bold">{item.quantity}×</span>
                          <span>{item.name?.[language] || item.name?.en || (typeof item.name === 'string' ? item.name : '')}</span>
                        </div>
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="text-[11px] text-neutral-400 pl-4 space-y-0.5 mt-0.5">
                            {item.selectedModifiers.map((mod, mIdx) => (
                              <div key={mIdx}>
                                + {mod.optionName?.[language] || mod.optionName?.en || (typeof mod.optionName === 'string' ? mod.optionName : '')}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.specialRequest && (
                          <p className="text-[11px] text-amber-300/80 italic pl-4 mt-0.5">
                            "{item.specialRequest}"
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-white whitespace-nowrap">
                        ฿{item.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
                  <span>{t('total')}</span>
                  <span className="text-lg text-orange-400 font-mono">฿{orderParams.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Cannot cancel disclaimer */}
              <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
                {t('cannotCancelNotice')}
              </p>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!isExpired && (
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row gap-3">
            <button
              id="btn-confirm-order-submit"
              type="button"
              disabled={isSubmitting || isExpired}
              onClick={handleConfirmOrder}
              className="flex-1 py-3.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('orderCreating')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>{t('confirmOrderBtn')}</span>
                </>
              )}
            </button>
            <button
              id="btn-confirm-order-back"
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('goBackBtn')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
