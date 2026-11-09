import React, { useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Heart, ShoppingBag, User, Globe, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { navigateTo, getLogoUrl } from '../utils/navigation';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    settings,
    cartTotalQuantity,
    favorites,
    customerOrderHistory,
    setIsCartOpen,
    setIsFavoritesOpen,
    setIsCustomerProfileOpen,
    setIsCustomerOrderHistoryOpen,
    setIsOwnerAccessModalOpen,
    t,
  } = useRestaurant();

  // Logo click scrolls back to top smoothly (owner access is isolated via direct /owner link)
  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs w-full max-w-full overflow-hidden">
      <div className="max-w-4xl mx-auto px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left: Logo & Brand Name (No hidden owner triggers, fully customer-safe) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          <button
            id="brand-logo-btn"
            type="button"
            onClick={handleLogoClick}
            title="Tony's Kitchen"
            className="relative group cursor-pointer focus:outline-none shrink-0"
            aria-label="Restaurant Logo"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-2 ring-[#E65100]/25 bg-white flex items-center justify-center transition-transform active:scale-95 shadow-xs">
              <img
                src={getLogoUrl(settings.logoUrl)}
                alt={settings.restaurantName}
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </button>

          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-sm xs:text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-[#1A1A1A] flex items-center gap-1.5 leading-tight truncate">
              <span className="truncate">{settings.restaurantName}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E65100] shrink-0"></span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium tracking-wide mt-0.5 truncate hidden xs:block">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Right Action Icons: Language Switcher, Profile, Order History, Favorites, Cart */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-full text-[11px] sm:text-xs font-semibold">
            <button
              id="lang-btn-en"
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full transition-all flex items-center gap-0.5 sm:gap-1 ${
                language === 'en'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              aria-label="Switch to English"
            >
              <span>🇬🇧</span>
              <span className="hidden sm:inline">EN</span>
            </button>
            <button
              id="lang-btn-th"
              type="button"
              onClick={() => setLanguage('th')}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full transition-all flex items-center gap-0.5 sm:gap-1 ${
                language === 'th'
                  ? 'bg-white text-[#1A1A1A] shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              aria-label="เปลี่ยนเป็นภาษาไทย"
            >
              <span>🇹🇭</span>
              <span className="hidden sm:inline">ไทย</span>
            </button>
          </div>

          {/* Customer Profile Trigger */}
          <button
            id="customer-profile-btn"
            type="button"
            onClick={() => setIsCustomerProfileOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            title={t('customerInfo')}
            aria-label={t('customerInfo')}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Order History Trigger */}
          <button
            id="order-history-btn"
            type="button"
            onClick={() => setIsCustomerOrderHistoryOpen(true)}
            className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            title={language === 'th' ? 'ประวัติรายการสั่งซื้อ' : 'Order History'}
            aria-label="Order History"
          >
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            {customerOrderHistory.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#E65100] text-white text-[9px] sm:text-[10px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs">
                {customerOrderHistory.length > 9 ? '9+' : customerOrderHistory.length}
              </span>
            )}
          </button>

          {/* Favorites Drawer Trigger */}
          <button
            id="favorites-btn"
            type="button"
            onClick={() => setIsFavoritesOpen(true)}
            className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            title={t('favorites')}
            aria-label={t('favorites')}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${favorites.length > 0 ? 'text-[#E65100] fill-[#E65100]' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E65100]" />
            )}
          </button>

          {/* Cart Trigger */}
          <button
            id="view-cart-btn"
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1 sm:gap-1.5 bg-[#E65100] text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm hover:bg-[#D84315] active:scale-95 transition-all shadow-sm shrink-0"
            aria-label={t('cart')}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">{t('cart')}</span>
            <AnimatePresence mode="wait">
              {cartTotalQuantity > 0 && (
                <motion.span
                  key={cartTotalQuantity}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-black ml-0.5"
                >
                  {cartTotalQuantity}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
};
