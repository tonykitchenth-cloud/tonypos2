import React, { useRef, useEffect, useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CategoryNav: React.FC = () => {
  const {
    categories,
    setCategories,
    menuItems,
    activeCategoryId,
    setActiveCategoryId,
    language,
  } = useRestaurant();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);

  // Visible categories sorted by displayOrder
  const visibleCategories = [...categories]
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

  // Move category using left / right arrow buttons
  const moveCategory = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visibleCategories.length) return;

    const list = [...visibleCategories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = categories.map(cat => {
      const idx = list.findIndex(c => c.id === cat.id);
      if (idx !== -1) {
        return { ...cat, displayOrder: idx + 1 };
      }
      return cat;
    });

    setCategories(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === dropIndex) return;

    const list = [...visibleCategories];
    const [removed] = list.splice(draggedCatIndex, 1);
    list.splice(dropIndex, 0, removed);

    const updated = categories.map(cat => {
      const idx = list.findIndex(c => c.id === cat.id);
      if (idx !== -1) {
        return { ...cat, displayOrder: idx + 1 };
      }
      return cat;
    });

    setCategories(updated);
    setDraggedCatIndex(null);
  };

  return (
    <div id="category-nav-bar" className="sticky top-[53px] sm:top-[61px] z-30 bg-[#F8F9FA]/95 backdrop-blur-md py-2 sm:py-2.5 border-b border-gray-200/60 shadow-2xs w-full max-w-full overflow-hidden">
      <div className="max-w-4xl mx-auto px-2.5 sm:px-4">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
        >
          {/* Dynamic Categories - Reorderable via Mouse Drag & Drop AND Left-Right Arrow Buttons */}
          {visibleCategories.map((cat, idx) => {
            const isSelected = activeCategoryId === cat.id;
            const catName = cat.name?.[language] || cat.name?.en || (typeof cat.name === 'string' ? cat.name : 'Category');
            const count = getItemCount(cat.id);
            const isDragged = draggedCatIndex === idx;

            return (
              <div
                key={cat.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                className={`shrink-0 flex items-center rounded-full transition-all select-none cursor-grab active:cursor-grabbing ${
                  isDragged ? 'opacity-40 ring-2 ring-[#E65100]' : ''
                } ${
                  isSelected
                    ? 'bg-[#E65100] text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-50'
                }`}
              >
                {/* Left Arrow Button */}
                <button
                  type="button"
                  title={language === 'th' ? 'เลื่อนซ้าย' : 'Move Left'}
                  disabled={idx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCategory(idx, 'left');
                  }}
                  className="px-1.5 py-2 text-inherit disabled:opacity-20 cursor-pointer rounded-l-full hover:bg-black/10 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Main Category Click Button */}
                <button
                  id={`cat-tab-${cat.id}`}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="px-2 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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

                {/* Right Arrow Button */}
                <button
                  type="button"
                  title={language === 'th' ? 'เลื่อนขวา' : 'Move Right'}
                  disabled={idx === visibleCategories.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCategory(idx, 'right');
                  }}
                  className="px-1.5 py-2 text-inherit disabled:opacity-20 cursor-pointer rounded-r-full hover:bg-black/10 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
