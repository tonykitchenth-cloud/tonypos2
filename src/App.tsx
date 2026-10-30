import React from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { OfflineNotice } from './components/OfflineNotice';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { Header } from './components/Header';
import { StoreBanner } from './components/StoreBanner';
import { SearchBar } from './components/SearchBar';
import { CategoryNav } from './components/CategoryNav';
import { MenuFeed } from './components/MenuFeed';
import { MenuItemCustomizerModal } from './components/MenuItemCustomizerModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { CustomerOrderStatusModal } from './components/CustomerOrderStatusModal';
import { ActiveOrderFloatingBanner } from './components/ActiveOrderFloatingBanner';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { ClosedStoreModal } from './components/ClosedStoreModal';
import { OwnerAccessModal } from './components/owner/OwnerAccessModal';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { formatCurrency } from './utils/pricing';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MainCustomerView: React.FC = () => {
  const {
    cartTotalQuantity,
    cartSubtotal,
    setIsCartOpen,
    isCartOpen,
    isCheckoutOpen,
    customizingItem,
    settings,
    activeOrderId,
    setActiveOrderId,
    isOrderConfirmationOpen,
    setIsOrderConfirmationOpen,
    pendingOrderToConfirm,
    setPendingOrderToConfirm,
    isOrderStatusOpen,
    setIsOrderStatusOpen,
    t,
  } = useRestaurant();

  const isModalOrDrawerActive =
    isCartOpen ||
    isCheckoutOpen ||
    Boolean(customizingItem) ||
    isOrderConfirmationOpen ||
    isOrderStatusOpen;

  const handleOrderConfirmed = (orderId: string) => {
    setActiveOrderId(orderId);
    setIsOrderConfirmationOpen(false);
    setPendingOrderToConfirm(null);
    setIsOrderStatusOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col selection:bg-[#E65100]/20 selection:text-[#E65100] pb-24">
      {/* 0. Offline Network Indicator */}
      <OfflineNotice />

      {/* 1. Header (Logo 5-tap trigger, Brand, Language Switcher, Profile, Fav, Cart) */}
      <Header />

      {/* PWA Discreet Add to Home Screen Banner (suppressed during checkout/ordering modals) */}
      {!isModalOrDrawerActive && <PWAInstallBanner />}

      {/* 2. Store Status Banner & Quick Contacts */}
      <StoreBanner />

      {/* 3. Search Bar */}
      <SearchBar />

      {/* 4. Category Nav Tabs */}
      <CategoryNav />

      {/* 5. Customer Homepage Menu Feed (COMPACT, STRICTLY NO PRICE ON HOMEPAGE CARDS) */}
      <main className="flex-1">
        <MenuFeed />
      </main>

      {/* 6. Active In-App Order Floating Status Banner (when customer has an active order) */}
      <ActiveOrderFloatingBanner onOpenStatus={() => setIsOrderStatusOpen(true)} />

      {/* 7. Mobile Sticky Bottom Floating Cart Bar */}
      <AnimatePresence>
        {cartTotalQuantity > 0 && !isModalOrDrawerActive && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-30"
          >
            <button
              type="button"
              id="sticky-cart-bar-btn"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#1A1A1A] text-white p-3.5 rounded-2xl shadow-xl hover:bg-black active:scale-[0.99] transition-all flex items-center justify-between gap-3 border border-white/10"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E65100] flex items-center justify-center text-white text-xs font-black">
                  {cartTotalQuantity}
                </div>
                <div className="text-left leading-tight">
                  <span className="text-[11px] text-gray-400 font-medium block">
                    {t('yourCart')} ({cartTotalQuantity} {cartTotalQuantity > 1 ? t('items') : t('item')})
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {formatCurrency(cartSubtotal, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#E65100]">
                <span>{t('cart')}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Drawers & Modals */}
      <MenuItemCustomizerModal />
      <CartDrawer />
      <CheckoutModal />
      <OrderConfirmationModal
        isOpen={isOrderConfirmationOpen}
        orderParams={pendingOrderToConfirm}
        onClose={() => {
          setIsOrderConfirmationOpen(false);
          setPendingOrderToConfirm(null);
        }}
        onOrderConfirmed={handleOrderConfirmed}
      />
      <CustomerOrderStatusModal
        isOpen={isOrderStatusOpen}
        orderId={activeOrderId}
        onClose={() => setIsOrderStatusOpen(false)}
      />
      <OrderSuccessModal />
      <FavoritesDrawer />
      <CustomerProfileModal />
      <ClosedStoreModal />
      <OwnerAccessModal />
      <OwnerDashboard />
    </div>
  );
};

export default function App() {
  return (
    <RestaurantProvider>
      <MainCustomerView />
    </RestaurantProvider>
  );
}
