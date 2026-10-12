import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { MenuItem } from '../types';
import { isMenuItemAvailable } from '../utils/availabilityEngine';
import { Heart, Plus, Sparkles, Flame, ImageOff } from 'lucide-react';
import { motion } from 'motion/react';

export const MenuFeed: React.FC = () => {
  const {
    menuItems,
    categories,
    activeCategoryId,
    searchQuery,
    language,
    toggleFavorite,
    isFavorite,
    setCustomizingItem,
    storeAvailability,
    setIsClosedModalOpen,
    t,
  } = useRestaurant();

  // Filter items based on Category, Search Query, and Visibility
  const filteredItems = menuItems.filter((item) => {
    // Hidden items are omitted from customer feed
    if (item.availability === 'hidden') return false;

    // Category filter
    if (activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) {
      return false;
    }

    // Search query filter (matches EN/TH names and descriptions)
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const matchEnName = (item.name?.en || (typeof item.name === 'string' ? item.name : '')).toLowerCase().includes(q);
      const matchThName = (item.name?.th || '').toLowerCase().includes(q);
      const matchEnDesc = (item.description?.en || (typeof item.description === 'string' ? item.description : '')).toLowerCase().includes(q);
      const matchThDesc = (item.description?.th || '').toLowerCase().includes(q);
      if (!matchEnName && !matchThName && !matchEnDesc && !matchThDesc) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => a.displayOrder - b.displayOrder);

  // Group items by category if "all" is active and not searching
  const isGroupingByCategory = activeCategoryId === 'all' && searchQuery.trim().length === 0;

  const handleSelectItem = (item: MenuItem) => {
    const { isAvailable } = isMenuItemAvailable(item);
    if (!isAvailable) return;
    setCustomizingItem(item);
  };

  if (filteredItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 mx-auto flex items-center justify-center text-[#E65100] mb-3">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[#1A1A1A]">{t('noDishesFound')}</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
          {t('noDishesMatching')}
        </p>
      </div>
    );
  }

  // Render list of compact items
  const renderItemCard = (item: MenuItem) => {
    const { isAvailable, status } = isMenuItemAvailable(item);
    const fav = isFavorite(item.id);

    // Primary name based on active language
    const primaryName = item.name?.[language] || item.name?.en || (typeof item.name === 'string' ? item.name : 'Dish');
    const description = item.description?.[language] || item.description?.en || (typeof item.description === 'string' ? item.description : '');

    return (
      <div
        key={item.id}
        id={`dish-card-${item.id}`}
        onClick={() => isAvailable && handleSelectItem(item)}
        className={`group bg-white rounded-2xl p-3 border border-gray-100/90 shadow-2xs transition-all duration-200 flex items-center gap-3.5 relative overflow-hidden ${
          isAvailable ? 'cursor-pointer hover:border-[#E65100]/30 hover:shadow-xs' : 'opacity-70 bg-gray-50/70'
        }`}
      >
        {/* Compact Food Image */}
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <ImageOff className="w-6 h-6" />
          </div>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={primaryName}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`relative z-1 w-full h-full object-cover transition-transform duration-300 ${
                isAvailable ? 'group-hover:scale-105' : 'grayscale'
              }`}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}

          {/* Badges on image */}
          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-2">
            {item.isSignature && (
              <span className="bg-[#E65100] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5" />
                <span>{t('signatureTag')}</span>
              </span>
            )}
            {item.isPopular && !item.isSignature && (
              <span className="bg-[#D4AF37] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                {t('popularTag')}
              </span>
            )}
          </div>

          {/* Stock state overlay if not available */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-1 text-center">
              <span className="text-white text-[10px] font-bold leading-tight">
                {status === 'out_today' && t('outOfStock')}
                {status === 'out_until_date' && t('outUntilDate')}
                {status === 'out_indefinitely' && t('outOfStockIndefinite')}
              </span>
            </div>
          )}
        </div>

        {/* Food Info & Details - STRICTLY NO PRICE DISPLAYED */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Main Title */}
          <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] group-hover:text-[#E65100] transition-colors line-clamp-1 leading-snug">
            {primaryName}
          </h3>

          {/* Description below name with line clamp */}
          <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed font-normal">
            {description}
          </p>
        </div>

        {/* Action Controls: Favorite + Select/Add [+] */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
          {/* Favorite toggle button */}
          <button
            type="button"
            id={`fav-btn-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
            className="p-1.5 rounded-full text-gray-400 hover:text-[#E65100] hover:bg-orange-50 transition-colors"
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle Favorite"
          >
            <Heart className={`w-4 h-4 ${fav ? 'text-[#E65100] fill-[#E65100]' : ''}`} />
          </button>

          {/* Select [+] Button */}
          {isAvailable ? (
            <button
              type="button"
              id={`select-btn-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectItem(item);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center group-hover:bg-[#E65100] active:scale-95 transition-all shadow-xs"
              aria-label={`Select ${primaryName}`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <div className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-400">
              {t('outOfStock')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {isGroupingByCategory ? (
        // Grouped by Category with Section Headers
        categories
          .filter(cat => cat.visible !== false)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((cat) => {
            const catItems = filteredItems.filter(i => i.categoryId === cat.id);
            if (catItems.length === 0) return null;
            const catName = cat.name?.[language] || cat.name?.en || (typeof cat.name === 'string' ? cat.name : 'Category');

            return (
              <section key={cat.id} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-200/60 pb-1.5">
                  <h2 className="text-sm font-extrabold text-[#1A1A1A] uppercase tracking-wider">
                    {catName}
                  </h2>
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.2 rounded-full">
                    {catItems.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catItems.map(renderItemCard)}
                </div>
              </section>
            );
          })
      ) : (
        // Filtered view (Specific category or search query)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map(renderItemCard)}
        </div>
      )}
    </div>
  );
};
