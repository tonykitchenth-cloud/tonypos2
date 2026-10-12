import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { CustomerProfile, OrderType, PaymentMethod, OrderItemSnapshot } from '../types';
import { formatCurrency } from '../utils/pricing';
import { generateOrderMessage, buildWhatsAppUrl, buildLineUrl } from '../utils/orderMessageGenerator';
import { CreateOrderParams } from '../utils/orderSync';
import {
  X,
  User,
  Phone,
  MapPin,
  FileText,
  ShoppingBag,
  Send,
  AlertCircle,
  Sparkles,
  Check,
  Copy,
  CreditCard,
  Banknote,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartSubtotal,
    customerProfile,
    updateCustomerProfile,
    paymentMethod,
    setPaymentMethod,
    clearCart,
    setLastOrderInfo,
    settings,
    language,
    storeAvailability,
    setIsClosedModalOpen,
    setIsOrderConfirmationOpen,
    setPendingOrderToConfirm,
    t,
  } = useRestaurant();

  const [orderType, setOrderType] = useState<OrderType>(customerProfile.orderType || 'pickup');
  const [name, setName] = useState<string>(customerProfile.name || '');
  const [phone, setPhone] = useState<string>(customerProfile.phone || '');
  const [address, setAddress] = useState<string>(customerProfile.deliveryAddress || '');
  const [notes, setNotes] = useState<string>(customerProfile.notes || '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCheckoutOpen) return null;

  const validate = (): boolean => {
    if (!name.trim()) {
      setErrorMsg(t('missingNameError'));
      return false;
    }
    if (!phone.trim()) {
      setErrorMsg(t('missingPhoneError'));
      return false;
    }
    if (orderType === 'delivery' && !address.trim()) {
      setErrorMsg(t('missingAddressError'));
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleInAppOrderSubmit = () => {
    // 1. Check store availability
    if (!storeAvailability.isOpen) {
      setIsClosedModalOpen(true);
      return;
    }

    // 2. Validate fields
    if (!validate()) return;

    // 3. Save profile details for future visits
    const updatedProfile: CustomerProfile = {
      name: name.trim(),
      phone: phone.trim(),
      deliveryAddress: address.trim(),
      orderType,
      notes: notes.trim(),
    };
    updateCustomerProfile(updatedProfile);

    // 4. Create immutable item snapshots
    const itemSnapshots: OrderItemSnapshot[] = cart.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.menuItemName,
      imageUrl: item.imageUrl,
      basePrice: item.basePrice,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      selectedModifiers: item.selectedModifiers.map((mod) => ({
        groupId: mod.groupId,
        groupName: mod.groupName,
        optionId: mod.optionId,
        optionName: mod.optionName,
        priceAdjustment: mod.priceAdjustment,
      })),
      specialRequest: item.specialRequest,
    }));

    const clientToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const orderParams: CreateOrderParams = {
      source: 'in_app',
      orderType,
      paymentMethod,
      customer: {
        name: updatedProfile.name,
        phone: updatedProfile.phone,
        deliveryAddress: updatedProfile.deliveryAddress,
        notes: updatedProfile.notes,
      },
      items: itemSnapshots,
      subtotal: cartSubtotal,
      total: cartSubtotal,
      currencySymbol: settings.currencySymbol || '฿',
      clientToken,
    };

    // Close checkout and open 60s confirmation modal
    setPendingOrderToConfirm(orderParams);
    setIsCheckoutOpen(false);
    setIsOrderConfirmationOpen(true);
  };

  const handleOrderHandoff = async (channel: 'whatsapp' | 'line') => {
    // 1. Check store availability
    if (!storeAvailability.isOpen) {
      setIsClosedModalOpen(true);
      return;
    }

    // 2. Validate fields
    if (!validate()) return;

    // 3. Save profile details for future visits
    const updatedProfile: CustomerProfile = {
      name: name.trim(),
      phone: phone.trim(),
      deliveryAddress: address.trim(),
      orderType,
      notes: notes.trim(),
    };
    updateCustomerProfile(updatedProfile);

    // 4. Generate structured order message
    const orderMessage = generateOrderMessage({
      settings,
      customer: updatedProfile,
      items: cart,
      subtotal: cartSubtotal,
      total: cartSubtotal,
      lang: language,
    });

    const whatsAppUrl = buildWhatsAppUrl(settings.whatsAppIntlNumber, orderMessage);
    const lineUrl = buildLineUrl(settings.lineId);

    // 5. Channel execution
    if (channel === 'whatsapp') {
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      } catch {}

      setLastOrderInfo({
        message: orderMessage,
        channel: 'whatsapp',
        whatsAppUrl,
      });

      // Launch WhatsApp
      window.open(whatsAppUrl, '_blank');
      setIsCheckoutOpen(false);
      clearCart();
    } else if (channel === 'line') {
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(orderMessage);
      } catch (e) {
        console.warn('Clipboard write failed, fallback provided in success modal', e);
      }

      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      } catch {}

      setLastOrderInfo({
        message: orderMessage,
        channel: 'line',
        lineUrl,
      });

      // Attempt to open LINE chat
      window.open(lineUrl, '_blank');
      setIsCheckoutOpen(false);
      clearCart();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-lg sm:rounded-3xl max-h-[94vh] sm:max-h-[88vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-white px-4 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h2 className="text-base font-extrabold text-[#1A1A1A]">
              {t('checkoutTitle')}
            </h2>
            <button
              id="close-checkout-modal-btn"
              onClick={() => setIsCheckoutOpen(false)}
              className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Error banner */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Order Method Selector: Pickup vs Delivery */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                {t('orderType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="checkout-pickup-btn"
                  onClick={() => setOrderType('pickup')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderType === 'pickup'
                      ? 'border-[#E65100] bg-orange-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1A1A]">
                      {t('pickup')}
                    </span>
                    {orderType === 'pickup' && (
                      <span className="w-4 h-4 rounded-full bg-[#E65100] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {t('pickupDesc')}
                  </p>
                </button>

                <button
                  type="button"
                  id="checkout-delivery-btn"
                  onClick={() => setOrderType('delivery')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderType === 'delivery'
                      ? 'border-[#E65100] bg-orange-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1A1A]">
                      {t('delivery')}
                    </span>
                    {orderType === 'delivery' && (
                      <span className="w-4 h-4 rounded-full bg-[#E65100] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {t('deliveryDesc')}
                  </p>
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                {t('paymentMethod')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="checkout-payment-cash-btn"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'border-[#E65100] bg-orange-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      {t('cashShort')}
                    </span>
                    {paymentMethod === 'cash' && (
                      <span className="w-4 h-4 rounded-full bg-[#E65100] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {t('payWithCashDesc')}
                  </p>
                </button>

                <button
                  type="button"
                  id="checkout-payment-qr-btn"
                  onClick={() => setPaymentMethod('qr_payment')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'qr_payment'
                      ? 'border-[#E65100] bg-orange-50/50 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      {t('qrPaymentShort')}
                    </span>
                    {paymentMethod === 'qr_payment' && (
                      <span className="w-4 h-4 rounded-full bg-[#E65100] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {t('payWithQrDesc')}
                  </p>
                </button>
              </div>
            </div>

            {/* Customer Inputs */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block">
                {t('customerDetails')}
              </span>

              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  {t('fullName')} *
                </label>
                <input
                  id="checkout-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={t('fullNamePlaceholder')}
                  className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  {t('phoneNumber')} *
                </label>
                <input
                  id="checkout-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={t('phoneNumberPlaceholder')}
                  className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
                />
              </div>

              {/* Delivery Address (only if delivery) */}
              {orderType === 'delivery' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">
                    {t('deliveryAddress')} *
                  </label>
                  <textarea
                    id="checkout-address-input"
                    rows={2}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={t('deliveryAddressPlaceholder')}
                    className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100] resize-none"
                  />
                </motion.div>
              )}

              {/* Order Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  {t('orderNotes')}
                </label>
                <input
                  id="checkout-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('orderNotesPlaceholder')}
                  className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
                />
              </div>
            </div>

            {/* Privacy notice */}
            <p className="text-[10px] text-gray-400 text-center leading-tight">
              {t('savedLocallyNotice')}
            </p>
          </div>

          {/* Checkout Footer Actions */}
          <div className="bg-white p-4 border-t border-gray-100 shadow-xl space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-bold text-gray-500">{t('total')}:</span>
              <span className="text-lg font-black text-[#1A1A1A]">
                {formatCurrency(cartSubtotal, settings.currencySymbol)}
              </span>
            </div>

            {/* Primary Action: Direct In-App SEND ORDER Button */}
            <button
              type="button"
              id="btn-send-order-inapp"
              onClick={handleInAppOrderSubmit}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E65100] text-white font-extrabold text-sm hover:bg-[#D84315] active:scale-[0.99] transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="bg-white/20 p-1 rounded-full text-white">
                <Zap className="w-4 h-4 fill-white" />
              </span>
              <div className="text-left">
                <div className="leading-tight">{t('sendOrderDirect')}</div>
                <div className="text-[10px] font-normal opacity-90 leading-tight">
                  {t('sendOrderDirectSubtitle')}
                </div>
              </div>
            </button>

            {/* Separator */}
            {(settings.channels.whatsApp || settings.channels.line) && (
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400">
                  <span className="bg-white px-2">{t('orOrderViaMessaging')}</span>
                </div>
              </div>
            )}

            {/* Secondary Messaging Buttons (WhatsApp & LINE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Send via WhatsApp Button */}
              {settings.channels.whatsApp && (
                <button
                  type="button"
                  id="send-whatsapp-btn"
                  onClick={() => handleOrderHandoff('whatsapp')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#1EBE5D] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('chatWhatsApp')}</span>
                </button>
              )}

              {/* Send via LINE Button */}
              {settings.channels.line && (
                <button
                  type="button"
                  id="send-line-btn"
                  onClick={() => handleOrderHandoff('line')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#06C755] text-white font-bold text-xs hover:bg-[#05B34C] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('chatLine')}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
