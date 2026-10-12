import React, { useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Heart, ShoppingBag, User, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    settings,
    cartTotalQuantity,
    favorites,
    setIsCartOpen,
    setIsFavoritesOpen,
    setIsCustomerProfileOpen,
    setIsOwnerAccessModalOpen,
    t,
  } = useRestaurant();

  // Hidden 5-tap owner trigger: 5 taps within 2.5 seconds
  const tapTimesRef = useRef<number[]>([]);

  const handleLogoTap = () => {
    const now = Date.now();
    // Keep only taps within the last 2500ms
    const recentTaps = tapTimesRef.current.filter(time => now - time <= 2500);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 5) {
      tapTimesRef.current = [];
      setIsOwnerAccessModalOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left & Center: Logo & Brand Name */}
        <div className="flex items-center gap-3">
          <button
            id="owner-trigger-logo"
            type="button"
            onClick={handleLogoTap}
            title="Tony's Kitchen"
            className="relative group cursor-pointer focus:outline-none"
            aria-label="Restaurant Logo"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-[#E65100]/20 bg-[#1A1A1A] flex items-center justify-center transition-transform active:scale-95">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.restaurantName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to stylized initial
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[#E65100] font-black text-lg">TK</span>
              )}
            </div>
          </button>

          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-[#1A1A1A] flex items-center gap-1.5 leading-none">
              <span>{settings.restaurantName}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E65100]"></span>
            </h1>
            <p className="text-[11px] text-gray-500 font-medium tracking-wide mt-0.5">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Right Action Icons: Language Switcher, Profile, Favorites, Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Switcher */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-full text-xs font-semibold">
            <button
              id="lang-btn-en"
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
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
              className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
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
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('customerInfo')}
            aria-label={t('customerInfo')}
          >
            <User className="w-5 h-5" />
          </button>

          {/* Favorites Drawer Trigger */}
          <button
            id="favorites-btn"
            type="button"
            onClick={() => setIsFavoritesOpen(true)}
            className="relative w-9 h-9 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('favorites')}
            aria-label={t('favorites')}
          >
            <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'text-[#E65100] fill-[#E65100]' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E65100]" />
            )}
          </button>

          {/* Cart Trigger */}
          <button
            id="view-cart-btn"
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 bg-[#E65100] text-white px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm hover:bg-[#D84315] active:scale-95 transition-all shadow-sm"
            aria-label={t('cart')}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden xs:inline">{t('cart')}</span>
            <AnimatePresence mode="wait">
              {cartTotalQuantity > 0 && (
                <motion.span
                  key={cartTotalQuantity}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="bg-[#1A1A1A] text-white text-[11px] px-1.5 py-0.2 rounded-full font-black ml-0.5"
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
