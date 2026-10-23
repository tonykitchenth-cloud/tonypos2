import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { formatCurrency } from '../utils/pricing';
import { X, Plus, Minus, Trash2, Edit3, ShoppingBag, ArrowRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    cartTotalQuantity,
    cartSubtotal,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    setCustomizingItem,
    setEditingCartItem,
    setIsCheckoutOpen,
    menuItems,
    storeAvailability,
    setIsClosedModalOpen,
    language,
    settings,
    t,
  } = useRestaurant();

  const [confirmingClear, setConfirmingClear] = useState(false);

  if (!isCartOpen) return null;

  const handleEditItem = (cartItem: any) => {
    const originalMenuItem = menuItems.find(m => m.id === cartItem.menuItemId);
    if (originalMenuItem) {
      setEditingCartItem(cartItem);
      setCustomizingItem(originalMenuItem);
      setIsCartOpen(false);
    }
  };

  const handleProceedCheckout = () => {
    if (!storeAvailability.isOpen) {
      setIsClosedModalOpen(true);
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleBackToMenu = () => {
    setIsCartOpen(false);
    const categoryElem = document.getElementById('category-nav-bar');
    if (categoryElem) {
      categoryElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
        {/* Backdrop click to close */}
        <div
          className="absolute inset-0"
          onClick={() => setIsCartOpen(false)}
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#F8F9FA] h-full flex flex-col shadow-2xl z-10 overflow-hidden"
        >
          {/* Drawer Header with prominent Back to Menu and Close */}
          <div className="bg-white px-4 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="cart-back-to-menu-header-btn"
                onClick={handleBackToMenu}
                className="p-1.5 -ml-1.5 text-gray-500 hover:text-[#E65100] hover:bg-orange-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                title={t('backToMenuCategories')}
                aria-label={t('backToMenuCategories')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <ShoppingBag className="w-5 h-5 text-[#E65100]" />
              <h2 className="text-base font-extrabold text-[#1A1A1A]">
                {t('yourCart')}
              </h2>
              {cartTotalQuantity > 0 && (
                <span className="bg-[#1A1A1A] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {cartTotalQuantity}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <button
                  type="button"
                  id="clear-cart-btn"
                  onClick={() => setConfirmingClear(true)}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                  title={t('clearCart')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                id="close-cart-btn"
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clear Cart Confirmation Dialog */}
          {confirmingClear && (
            <div className="bg-rose-50 p-3 mx-4 mt-3 rounded-2xl border border-rose-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-rose-700 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('confirmClearCart')}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="px-2.5 py-1 bg-white text-gray-700 rounded-lg font-bold hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  id="confirm-clear-action-btn"
                  onClick={() => {
                    clearCart();
                    setConfirmingClear(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
                >
                  {t('clearCart')}
                </button>
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-[#E65100]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A]">
                  {t('cartEmpty')}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                  {t('cartEmptyDesc')}
                </p>
                <button
                  type="button"
                  id="cart-empty-browse-menu-btn"
                  onClick={handleBackToMenu}
                  className="mt-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-xs font-extrabold rounded-full hover:bg-black transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('backToMenuCategories')}</span>
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const itemName = item.menuItemName[language] || item.menuItemName.en;

                return (
                  <div
                    key={item.id}
                    id={`cart-item-${item.id}`}
                    className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-2xs space-y-2.5"
                  >
                    {/* Item header: Name, edit & remove, Subtotal */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {item.imageUrl && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={itemName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] truncate">
                            {itemName}
                          </h4>
                          <span className="text-[11px] text-gray-500 font-semibold">
                            {formatCurrency(item.unitPrice, settings.currencySymbol)} {t('unitPrice')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-[#E65100] block">
                          {formatCurrency(item.subtotal, settings.currencySymbol)}
                        </span>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title={t('editItem')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title={t('removeItem')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selected Modifiers breakdown */}
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-2 text-[11px] text-gray-600 space-y-1">
                        {item.selectedModifiers.map((mod, i) => {
                          const groupName = mod.groupName[language] || mod.groupName.en;
                          const optName = mod.optionName[language] || mod.optionName.en;
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-gray-500 font-medium">
                                {groupName}: <strong className="text-gray-800">{optName}</strong>
                              </span>
                              {mod.priceAdjustment > 0 && (
                                <span className="font-bold text-[#E65100]">
                                  +{formatCurrency(mod.priceAdjustment, settings.currencySymbol)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Special Request */}
                    {item.specialRequest && (
                      <div className="text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg italic">
                        <strong>{t('specialNotes')}</strong> "{item.specialRequest}"
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {t('items')}:
                      </span>
                      <div className="flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200/60">
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50 shadow-xs"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-[#1A1A1A]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50 shadow-xs"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Quick Add More Dishes Button inside the list */}
            {cart.length > 0 && (
              <button
                type="button"
                id="cart-list-add-more-btn"
                onClick={handleBackToMenu}
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#E65100]/40 hover:bg-orange-50/50 text-gray-700 hover:text-[#E65100] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
              >
                <Plus className="w-4 h-4 text-[#E65100]" />
                <span>{t('backToMenuCategories')}</span>
              </button>
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="bg-white p-4 border-t border-gray-100 shadow-xl space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-medium block">
                    {t('total')} ({cartTotalQuantity} {cartTotalQuantity > 1 ? t('items') : t('item')})
                  </span>
                  <span className="text-xl font-black text-[#1A1A1A]">
                    {formatCurrency(cartSubtotal, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  id="proceed-checkout-btn"
                  onClick={handleProceedCheckout}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#E65100] text-white font-extrabold text-sm hover:bg-[#D84315] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('checkoutButton')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="cart-back-to-menu-btn"
                  onClick={handleBackToMenu}
                  className="w-full py-2.5 px-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[#1A1A1A] font-bold text-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                  <span>{t('backToMenuCategories')}</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
