import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { CustomerProfile, OrderType } from '../types';
import { X, User, Phone, MapPin, Check, Save, Smartphone, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { IOSInstallGuideModal } from './IOSInstallGuideModal';
import { AndroidInstallGuideModal } from './AndroidInstallGuideModal';
import { LineBrowserGuideModal } from './LineBrowserGuideModal';

import { loadCustomerProfile, saveCustomerProfile } from '../utils/storage';

export const CustomerProfileModal: React.FC = () => {
  const {
    isCustomerProfileOpen,
    setIsCustomerProfileOpen,
    customerProfile,
    updateCustomerProfile,
    customerOrderHistory,
    setIsCustomerOrderHistoryOpen,
    language,
    t,
  } = useRestaurant();

  const {
    isInstalled,
    isIOS,
    isAndroid,
    isLineBrowser,
    supportsNativePrompt,
    installNativePrompt,
  } = usePWAInstall();

  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showLineGuide, setShowLineGuide] = useState(false);

  const [name, setName] = useState<string>(customerProfile.name || '');
  const [phone, setPhone] = useState<string>(customerProfile.phone || '');
  const [address, setAddress] = useState<string>(customerProfile.deliveryAddress || '');
  const [orderType, setOrderType] = useState<OrderType>(customerProfile.orderType || 'pickup');
  const [notes, setNotes] = useState<string>(customerProfile.notes || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync profile data whenever modal opens or customerProfile changes
  React.useEffect(() => {
    if (isCustomerProfileOpen) {
      const current = (customerProfile?.name || customerProfile?.phone) ? customerProfile : loadCustomerProfile();
      setName(current.name || '');
      setPhone(current.phone || '');
      setAddress(current.deliveryAddress || '');
      setOrderType(current.orderType || 'pickup');
      setNotes(current.notes || '');
    }
  }, [isCustomerProfileOpen, customerProfile]);

  if (!isCustomerProfileOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CustomerProfile = {
      name: name.trim(),
      phone: phone.trim(),
      deliveryAddress: address.trim(),
      orderType,
      notes: notes.trim(),
    };
    saveCustomerProfile(updated);
    updateCustomerProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsCustomerProfileOpen(false);
    }, 1200);
  };

  const handleInstallClick = async () => {
    if (isLineBrowser) {
      setShowLineGuide(true);
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (supportsNativePrompt) {
      const outcome = await installNativePrompt();
      if (outcome === 'unavailable') {
        setShowAndroidGuide(true);
      }
      return;
    }
    setShowAndroidGuide(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#E65100]">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-[#1A1A1A]">
                {t('customerDetails')}
              </h2>
            </div>
            <button
              type="button"
              id="close-profile-modal-btn"
              onClick={() => setIsCustomerProfileOpen(false)}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Order History Quick Link */}
          <div className="mb-4">
            <button
              type="button"
              id="profile-order-history-btn"
              onClick={() => {
                setIsCustomerProfileOpen(false);
                setIsCustomerOrderHistoryOpen(true);
              }}
              className="w-full p-3 rounded-2xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200/80 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-[#1A1A1A] block">
                    {language === 'th' ? 'ประวัติรายการสั่งซื้อของฉัน' : 'My Order History'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {language === 'th'
                      ? `บันทึกไว้ในเครื่อง ${customerOrderHistory.length} รายการ (ดูใบเสร็จหลักฐาน)`
                      : `${customerOrderHistory.length} saved on device (view receipts)`}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#E65100] group-hover:translate-x-0.5 transition-transform">
                &gt;
              </span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5 text-xs">
            {/* Name */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                {t('fullName')}
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('fullNamePlaceholder')}
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                {t('phoneNumber')}
              </label>
              <input
                id="profile-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phoneNumberPlaceholder')}
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
              />
            </div>

            {/* Default Delivery Address */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                {t('deliveryAddress')}
              </label>
              <textarea
                id="profile-address-input"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('deliveryAddressPlaceholder')}
                className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100] resize-none"
              />
            </div>

            {/* Default Order Method */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">
                {t('orderType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="profile-method-pickup"
                  onClick={() => setOrderType('pickup')}
                  className={`py-2 px-3 rounded-xl border font-bold transition-all ${
                    orderType === 'pickup'
                      ? 'bg-orange-50 border-[#E65100] text-[#E65100]'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {t('pickup')}
                </button>
                <button
                  type="button"
                  id="profile-method-delivery"
                  onClick={() => setOrderType('delivery')}
                  className={`py-2 px-3 rounded-xl border font-bold transition-all ${
                    orderType === 'delivery'
                      ? 'bg-orange-50 border-[#E65100] text-[#E65100]'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {t('delivery')}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center pt-1">
              {t('savedLocallyNotice')}
            </p>

            {/* PWA Add to Home Screen Option */}
            {!isInstalled && (
              <button
                type="button"
                id="profile-install-pwa-btn"
                onClick={handleInstallClick}
                className="w-full py-2.5 px-3 rounded-2xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-[#E65100] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>{t('addToHomeScreen')}</span>
              </button>
            )}

            <button
              type="submit"
              id="save-profile-btn"
              className={`w-full py-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1A1A1A] text-white hover:bg-black'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'th' ? 'บันทึกเรียบร้อย' : 'Saved Successfully'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('saveChanges')}</span>
                </>
              )}
            </button>
          </form>

          {/* Modal Guides */}
          <IOSInstallGuideModal
            isOpen={showIOSGuide}
            onClose={() => setShowIOSGuide(false)}
          />
          <AndroidInstallGuideModal
            isOpen={showAndroidGuide}
            onClose={() => setShowAndroidGuide(false)}
          />
          <LineBrowserGuideModal
            isOpen={showLineGuide}
            onClose={() => setShowLineGuide(false)}
            isIOS={isIOS}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
