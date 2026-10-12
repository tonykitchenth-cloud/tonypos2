import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { CartItem, MenuItem, ModifierGroup, ModifierOption, SelectedModifier } from '../types';
import { calculateItemUnitPrice, calculateLineSubtotal, formatCurrency } from '../utils/pricing';
import { isModifierOptionAvailable } from '../utils/availabilityEngine';
import { X, Plus, Minus, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const MenuItemCustomizerModal: React.FC = () => {
  const {
    customizingItem,
    setCustomizingItem,
    editingCartItem,
    setEditingCartItem,
    modifierGroups,
    addToCart,
    updateCartItem,
    setIsCartOpen,
    storeAvailability,
    setIsClosedModalOpen,
    language,
    settings,
    t,
  } = useRestaurant();

  const activeItem: MenuItem | null = customizingItem || null;
  const isEditing = Boolean(editingCartItem);

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedModifiersMap, setSelectedModifiersMap] = useState<Record<string, string[]>>({});
  const [specialRequest, setSpecialRequest] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const lastTargetKeyRef = useRef<string | null>(null);

  // Attached modifier groups for this specific dish
  const attachedGroups: ModifierGroup[] = useMemo(() => {
    if (!activeItem) return [];
    return (activeItem.modifierGroupIds || [])
      .map(id => modifierGroups.find(g => g.id === id && g.enabled !== false))
      .filter((g): g is ModifierGroup => Boolean(g))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [activeItem, modifierGroups]);

  // Initialize or hydrate state ONLY when opening or switching items
  useEffect(() => {
    if (!activeItem) {
      lastTargetKeyRef.current = null;
      return;
    }

    const currentTargetKey = editingCartItem
      ? `edit_${editingCartItem.id}`
      : `item_${activeItem.id}`;

    // Prevent resetting user selections if already customizing the exact same item
    if (lastTargetKeyRef.current === currentTargetKey) {
      return;
    }

    lastTargetKeyRef.current = currentTargetKey;

    if (editingCartItem) {
      // Hydrate from existing cart line item
      setQuantity(editingCartItem.quantity || 1);
      setSpecialRequest(editingCartItem.specialRequest || '');

      const initialMap: Record<string, string[]> = {};
      editingCartItem.selectedModifiers.forEach(m => {
        if (!initialMap[m.groupId]) {
          initialMap[m.groupId] = [];
        }
        initialMap[m.groupId].push(m.optionId);
      });
      setSelectedModifiersMap(initialMap);
    } else {
      // Fresh customization: auto-select default 1st available option for required single-select groups
      setQuantity(1);
      setSpecialRequest('');
      const defaultMap: Record<string, string[]> = {};

      attachedGroups.forEach(group => {
        if (group.required && group.maxSelections === 1) {
          const firstAvail = group.options
            .filter(opt => isModifierOptionAvailable(opt).isAvailable)
            .sort((a, b) => a.displayOrder - b.displayOrder)[0];
          if (firstAvail) {
            defaultMap[group.id] = [firstAvail.id];
          }
        }
      });
      setSelectedModifiersMap(defaultMap);
    }
    setValidationError(null);
  }, [activeItem, editingCartItem, attachedGroups]);

  if (!activeItem) return null;

  const handleOptionToggle = (group: ModifierGroup, option: ModifierOption) => {
    setValidationError(null);
    const groupId = group.id;
    const optionId = option.id;
    const current = selectedModifiersMap[groupId] || [];

    if (group.maxSelections === 1) {
      // Single selection (Radio behavior)
      if (group.required) {
        setSelectedModifiersMap(prev => ({ ...prev, [groupId]: [optionId] }));
      } else {
        // Toggle on/off if optional
        const isSelected = current.includes(optionId);
        setSelectedModifiersMap(prev => ({
          ...prev,
          [groupId]: isSelected ? [] : [optionId],
        }));
      }
    } else {
      // Multi-selection (Checkbox behavior)
      const isSelected = current.includes(optionId);
      if (isSelected) {
        setSelectedModifiersMap(prev => ({
          ...prev,
          [groupId]: current.filter(id => id !== optionId),
        }));
      } else {
        if (current.length >= group.maxSelections) {
          return; // Max reached
        }
        setSelectedModifiersMap(prev => ({
          ...prev,
          [groupId]: [...current, optionId],
        }));
      }
    }
  };

  // Convert selected map to SelectedModifier[] objects
  const compiledModifiers: SelectedModifier[] = [];
  attachedGroups.forEach(group => {
    const selectedIds = selectedModifiersMap[group.id] || [];
    selectedIds.forEach(optId => {
      const opt = group.options.find(o => o.id === optId);
      if (opt) {
        compiledModifiers.push({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          priceAdjustment: opt.priceAdjustment || 0,
        });
      }
    });
  });

  const unitPrice = calculateItemUnitPrice(activeItem.basePrice, compiledModifiers);
  const subtotal = calculateLineSubtotal(unitPrice, quantity);

  const handleClose = () => {
    lastTargetKeyRef.current = null;
    setCustomizingItem(null);
    setEditingCartItem(null);
  };

  const handleAddToCart = () => {
    // 1. Check Store Status
    if (!storeAvailability.isOpen) {
      setIsClosedModalOpen(true);
      return;
    }

    // 2. Validate all attached groups
    for (const group of attachedGroups) {
      const selected = selectedModifiersMap[group.id] || [];
      const groupName = group.name?.[language] || group.name?.en || (typeof group.name === 'string' ? group.name : 'Modifier');

      if (group.required && selected.length < (group.minSelections || 1)) {
        setValidationError(
          language === 'th'
            ? `กรุณาเลือก "${groupName}" ให้ครบถ้วน`
            : `Please make a selection for "${groupName}".`
        );
        return;
      }
      if (selected.length < group.minSelections) {
        setValidationError(
          language === 'th'
            ? `กรุณาเลือก "${groupName}" อย่างน้อย ${group.minSelections} รายการ`
            : `Please select at least ${group.minSelections} for "${groupName}".`
        );
        return;
      }
    }

    const cartItemPayload: CartItem = {
      id: editingCartItem ? editingCartItem.id : `cart_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      menuItemId: activeItem.id,
      menuItemName: activeItem.name,
      imageUrl: activeItem.imageUrl,
      basePrice: activeItem.basePrice,
      quantity,
      selectedModifiers: compiledModifiers,
      specialRequest: specialRequest.trim(),
      unitPrice,
      subtotal,
    };

    if (isEditing) {
      updateCartItem(cartItemPayload);
    } else {
      addToCart(cartItemPayload);
    }

    handleClose();
    setIsCartOpen(true);
  };

  const primaryName = activeItem.name?.[language] || activeItem.name?.en || (typeof activeItem.name === 'string' ? activeItem.name : 'Dish');
  const description = activeItem.description?.[language] || activeItem.description?.en || (typeof activeItem.description === 'string' ? activeItem.description : '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-lg sm:rounded-3xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* Modal Header with Close button */}
          <div className="relative shrink-0 border-b border-gray-100 bg-white px-4 py-3.5 flex items-center justify-between z-10">
            <h2 className="text-sm sm:text-base font-extrabold text-[#1A1A1A]">
              {isEditing ? t('updateCartItem') : t('customizeTitle')}
            </h2>
            <button
              id="close-customizer-btn"
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Customization Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Dish Overview Card */}
            <div className="flex gap-3.5 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
              {activeItem.imageUrl && (
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                  <img
                    src={activeItem.imageUrl}
                    alt={primaryName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#1A1A1A] leading-snug">
                  {primaryName}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-3">
                  {description}
                </p>
              </div>
            </div>

            {/* Validation Banner if missing required options */}
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Dynamic Modifier Groups */}
            {attachedGroups.map((group) => {
              const groupName = group.name?.[language] || group.name?.en || (typeof group.name === 'string' ? group.name : 'Modifier');
              const selectedIds = selectedModifiersMap[group.id] || [];

              return (
                <div
                  key={group.id}
                  id={`mod-group-${group.id}`}
                  className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-2xs space-y-2.5"
                >
                  {/* Group Title & Badges */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1A1A]">
                        {groupName}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {group.maxSelections === 1
                          ? group.required ? (language === 'th' ? 'เลือก 1 ตัวเลือก' : 'Select 1 option') : (language === 'th' ? 'เลือกได้ 1 ตัวเลือก (หรือไม่เลือก)' : 'Optional (Choose 1)')
                          : `${t('selectUpTo')} ${group.maxSelections}`}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        group.required
                          ? 'bg-orange-50 text-[#E65100] border border-orange-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {group.required ? t('requiredBadge') : t('optionalBadge')}
                    </span>
                  </div>

                  {/* Options List */}
                  <div className="space-y-1.5 pt-1">
                    {group.options
                      .filter(opt => opt.availability !== 'hidden')
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((option) => {
                        const { isAvailable } = isModifierOptionAvailable(option);
                        const isSelected = selectedIds.includes(option.id);
                        const optName = option.name?.[language] || option.name?.en || (typeof option.name === 'string' ? option.name : 'Option');
                        const priceDelta = option.priceAdjustment || 0;
                        const isRadio = group.maxSelections === 1;
                        const inputId = `input-${option.id}`;
                        const optionRowId = `mod-option-${option.id}`;

                        return (
                          <label
                            key={option.id}
                            id={optionRowId}
                            htmlFor={inputId}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                              !isAvailable
                                ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                                : isSelected
                                ? 'bg-orange-50/60 border-[#E65100] shadow-xs cursor-pointer'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Form Input for native behavior, accessibility, & test automation */}
                              <input
                                type={isRadio ? 'radio' : 'checkbox'}
                                id={inputId}
                                name={`mod-group-${group.id}`}
                                value={option.id}
                                checked={isSelected}
                                disabled={!isAvailable}
                                onChange={() => {
                                  if (isAvailable) {
                                    handleOptionToggle(group, option);
                                  }
                                }}
                                className="sr-only"
                              />

                              {/* Custom Radio / Checkbox Indicator */}
                              <div
                                className={`w-4.5 h-4.5 flex items-center justify-center transition-colors shrink-0 ${
                                  isRadio ? 'rounded-full border' : 'rounded-md border'
                                } ${
                                  isSelected
                                    ? 'bg-[#E65100] border-[#E65100] text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                                aria-hidden="true"
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <span
                                className={`text-xs font-semibold ${
                                  isSelected ? 'text-[#1A1A1A] font-bold' : 'text-gray-700'
                                }`}
                              >
                                {optName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Price adjustment */}
                              <span
                                id={`price-mod-${option.id}`}
                                className={`text-xs font-bold ${
                                  priceDelta > 0
                                    ? 'text-[#E65100]'
                                    : 'text-gray-400'
                                }`}
                              >
                                {priceDelta > 0 ? `+${formatCurrency(priceDelta, settings.currencySymbol)}` : t('modifierPriceFree')}
                              </span>

                              {!isAvailable && (
                                <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                                  {t('outOfStock')}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              );
            })}

            {/* Special Request Input */}
            <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-2xs space-y-1.5">
              <label
                htmlFor="special-request-input"
                className="text-xs font-bold text-[#1A1A1A] block"
              >
                {t('specialRequest')}
              </label>
              <textarea
                id="special-request-input"
                name="specialRequest"
                rows={2}
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder={t('specialRequestPlaceholder')}
                className="w-full bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/80 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100] transition-all resize-none"
              />
            </div>
          </div>

          {/* Modal Footer: Quantity, Live Subtotal & Add to Cart Button */}
          <div className="shrink-0 bg-white border-t border-gray-100 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              {/* Quantity Selector */}
              <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200/60">
                <button
                  type="button"
                  id="qty-minus-btn"
                  data-testid="qty-minus-btn"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                  className="w-7 h-7 rounded-full bg-white text-gray-700 flex items-center justify-center disabled:opacity-40 shadow-xs hover:bg-gray-50 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  id="qty-value"
                  data-testid="quantity-value"
                  className="w-8 text-center text-xs font-black text-[#1A1A1A]"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  id="qty-plus-btn"
                  data-testid="qty-plus-btn"
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="w-7 h-7 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-xs hover:bg-gray-50 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Live Subtotal Display */}
              <div className="text-right">
                <span className="text-[11px] text-gray-400 font-medium block">
                  {t('subtotal')}
                </span>
                <span
                  id="customizer-subtotal"
                  data-testid="customizer-subtotal"
                  className="text-lg font-black text-[#1A1A1A]"
                >
                  {formatCurrency(subtotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              id="confirm-add-cart-btn"
              data-testid="confirm-add-cart-btn"
              type="button"
              onClick={handleAddToCart}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#E65100] text-white font-extrabold text-sm hover:bg-[#D84315] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span id="confirm-add-cart-text">
                {isEditing ? t('updateCartItem') : t('addToCart')} • {formatCurrency(subtotal, settings.currencySymbol)}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
