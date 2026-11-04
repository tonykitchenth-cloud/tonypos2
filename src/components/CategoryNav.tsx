import React, { useRef, useEffect } from 'react';
import { useRestaurant } from '../context/RestaurantContext';

export const CategoryNav: React.FC = () => {
  const {
    categories,
    menuItems,
    activeCategoryId,
    setActiveCategoryId,
    language,
  } = useRestaurant();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Visible categories sorted by displayOrder
  const visibleCategories = categories
    .filter(cat => cat.visible !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Ensure active category is valid and not 'all'
  useEffect(() => {
    if (visibleCategories.length > 0 && (!activeCategoryId || activeCategoryId === 'all' || !visibleCategories.some(c => c.id === activeCategoryId))) {
      setActiveCategoryId(visibleCategories[0].id);
    }
  }, [activeCategoryId, visibleCategories, setActiveCategoryId]);

  // Count items per category (only non-hidden items)
  const getItemCount = (catId: string) => {
    return menuItems.filter(i => i.categoryId === catId && i.availability !== 'hidden').length;
  };

  return (
    <div id="category-nav-bar" className="sticky top-[61px] z-30 bg-[#F8F9FA]/95 backdrop-blur-md py-2.5 border-b border-gray-200/60 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
        >
          {/* Dynamic Categories (All Dishes removed per requirement) */}
          {visibleCategories.map((cat) => {
            const isSelected = activeCategoryId === cat.id;
            const catName = cat.name?.[language] || cat.name?.en || (typeof cat.name === 'string' ? cat.name : 'Category');
            const count = getItemCount(cat.id);

            return (
              <button
                key={cat.id}
                id={`cat-tab-${cat.id}`}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#E65100] text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-50'
                }`}
              >
                <span>{catName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
