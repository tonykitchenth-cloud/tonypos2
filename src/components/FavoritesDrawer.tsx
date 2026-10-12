import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { isMenuItemAvailable } from '../utils/availabilityEngine';
import { X, Heart, Plus, Trash2, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FavoritesDrawer: React.FC = () => {
  const {
    isFavoritesOpen,
    setIsFavoritesOpen,
    favorites,
    toggleFavorite,
    menuItems,
    setCustomizingItem,
    language,
    t,
  } = useRestaurant();

  if (!isFavoritesOpen) return null;

  const favoritedItems = menuItems.filter(item => favorites.includes(item.id));

  const handleSelectItem = (item: any) => {
    const { isAvailable } = isMenuItemAvailable(item);
    if (!isAvailable) return;
    setCustomizingItem(item);
    setIsFavoritesOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
        <div
          className="absolute inset-0"
          onClick={() => setIsFavoritesOpen(false)}
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#F8F9FA] h-full flex flex-col shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-white px-4 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#E65100] fill-[#E65100]" />
              <h2 className="text-base font-extrabold text-[#1A1A1A]">
                {t('favoritesTitle')}
              </h2>
              {favorites.length > 0 && (
                <span className="bg-[#1A1A1A] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {favorites.length}
                </span>
              )}
            </div>
            <button
              type="button"
              id="close-favorites-btn"
              onClick={() => setIsFavoritesOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close favorites"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Body - STRICTLY NO PRICE ON HOMEPAGE/LIST CARD */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {favoritedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A]">
                  {t('noFavorites')}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                  {t('noFavoritesDesc')}
                </p>
              </div>
            ) : (
              favoritedItems.map((item) => {
                const { isAvailable, status } = isMenuItemAvailable(item);
                const primaryName = item.name?.[language] || item.name?.en || (typeof item.name === 'string' ? item.name : 'Dish');
                const description = item.description?.[language] || item.description?.en || (typeof item.description === 'string' ? item.description : '');

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-3 border border-gray-200/80 shadow-2xs flex items-center gap-3 relative"
                  >
                    {/* Compact Image */}
                    <div className="w-18 h-18 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={primaryName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageOff className="w-5 h-5" />
                        </div>
                      )}
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold p-1 text-center">
                          {status === 'out_today' ? t('outOfStock') : t('outOfStockIndefinite')}
                        </div>
                      )}
                    </div>

                    {/* Details (No price) */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] truncate">
                        {primaryName}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                        {description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-500 rounded-md transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {isAvailable && (
                        <button
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="w-7 h-7 rounded-full bg-[#E65100] text-white flex items-center justify-center hover:bg-[#D84315] shadow-xs"
                          title="Order"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
