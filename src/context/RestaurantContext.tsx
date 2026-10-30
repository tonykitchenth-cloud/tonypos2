import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AppStateData,
  CartItem,
  Category,
  CustomerProfile,
  Language,
  MenuItem,
  ModifierGroup,
  StoreAvailabilityResult,
  StoreSettings,
  RestaurantOrder,
  PaymentMethod,
  NotificationSoundType,
} from '../types';
import {
  loadAppState,
  saveAppState,
  loadCart,
  saveCart,
  loadFavorites,
  saveFavorites,
  loadCustomerProfile,
  saveCustomerProfile,
  loadLanguage,
  saveLanguage,
  resetToDemoState,
  STORAGE_KEYS,
  SYNC_BROADCAST_CHANNEL,
} from '../utils/storage';
import { createAppBackup, validateBackupPayload } from '../utils/backupRestore';
import { checkStoreAvailability, cleanExpiredHolidays } from '../utils/availabilityEngine';
import {
  subscribeToSharedRestaurantState,
  updateSharedRestaurantState,
  testConnection,
} from '../utils/sharedSync';
import {
  CreateOrderParams,
  getSavedActiveOrderId,
  saveActiveOrderId,
  clearSavedActiveOrderId,
  subscribeToAllOrders,
  subscribeToOrder,
  cleanupStaleLocalOrders,
} from '../utils/orderSync';
import {
  startContinuousOrderAlarm,
  stopContinuousOrderAlarm,
  isAlarmPlaying as checkAlarmPlaying,
  silenceCurrentAlarm,
  resetAlarmSilence,
  isAlarmSilenced,
  showSystemNotification,
  playCustomerReadySound,
} from '../utils/soundAlarm';
import { notificationSoundService } from '../services/notificationSoundService';
import { t, translations } from '../i18n/translations';

interface RestaurantContextType {
  // Localization
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;

  // Store & Catalog Data
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  modifierGroups: ModifierGroup[];
  setModifierGroups: React.Dispatch<React.SetStateAction<ModifierGroup[]>>;

  // Store Availability
  storeAvailability: StoreAvailabilityResult;
  refreshAvailability: () => void;

  // Cart Management
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartItem: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  cartTotalQuantity: number;
  cartSubtotal: number;

  // Favorites
  favorites: string[];
  toggleFavorite: (menuItemId: string) => void;
  isFavorite: (menuItemId: string) => boolean;

  // Customer Profile & Payment Method
  customerProfile: CustomerProfile;
  updateCustomerProfile: (profile: Partial<CustomerProfile>) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;

  // Navigation & Filtering State
  activeCategoryId: string;
  setActiveCategoryId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Modals & Drawers
  customizingItem: MenuItem | null;
  setCustomizingItem: (item: MenuItem | null) => void;
  editingCartItem: CartItem | null;
  setEditingCartItem: (item: CartItem | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isFavoritesOpen: boolean;
  setIsFavoritesOpen: (open: boolean) => void;
  isCustomerProfileOpen: boolean;
  setIsCustomerProfileOpen: (open: boolean) => void;
  isClosedModalOpen: boolean;
  setIsClosedModalOpen: (open: boolean) => void;

  // In-App Order Confirmation & Live Status
  activeOrderId: string | null;
  setActiveOrderId: (orderId: string | null) => void;
  isOrderConfirmationOpen: boolean;
  setIsOrderConfirmationOpen: (open: boolean) => void;
  pendingOrderToConfirm: CreateOrderParams | null;
  setPendingOrderToConfirm: (params: CreateOrderParams | null) => void;
  isOrderStatusOpen: boolean;
  setIsOrderStatusOpen: (open: boolean) => void;

  // Real-time Orders Feed & Alarm for Owner Dashboard
  allOrders: RestaurantOrder[];
  pendingOrdersCount: number;
  isAlarmActive: boolean;
  muteAlarm: () => void;

  // Owner Mode
  isOwnerMode: boolean;
  setIsOwnerMode: (open: boolean) => void;
  isOwnerAccessModalOpen: boolean;
  setIsOwnerAccessModalOpen: (open: boolean) => void;

  // Order Success / Handoff
  lastOrderInfo: {
    message: string;
    channel: 'whatsapp' | 'line';
    whatsAppUrl?: string;
    lineUrl?: string;
  } | null;
  setLastOrderInfo: (info: { message: string; channel: 'whatsapp' | 'line'; whatsAppUrl?: string; lineUrl?: string } | null) => void;

  // Data Actions
  resetDemoData: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistent core state
  const [appState, setAppState] = useState<AppStateData>(() => loadAppState());
  const [language, setLanguageState] = useState<Language>(() => loadLanguage());
  const [cart, setCartState] = useState<CartItem[]>(() => loadCart());
  const [favorites, setFavoritesState] = useState<string[]>(() => loadFavorites());
  const [customerProfile, setCustomerProfileState] = useState<CustomerProfile>(() => loadCustomerProfile());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // In-App Customer Active Order Tracking
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(() => getSavedActiveOrderId());
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState<boolean>(false);
  const [isOrderConfirmationOpen, setIsOrderConfirmationOpen] = useState<boolean>(false);
  const [pendingOrderToConfirm, setPendingOrderToConfirm] = useState<CreateOrderParams | null>(null);

  // Real-time Orders for Owner Dashboard & Alert Alarm
  const [allOrders, setAllOrders] = useState<RestaurantOrder[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const previousPendingCountRef = useRef<number>(0);

  // Dynamic UI filters
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals and Drawers
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState<boolean>(false);
  const [isClosedModalOpen, setIsClosedModalOpen] = useState<boolean>(false);

  // Owner Portal - Persist authentication session across browser refreshes
  const [isOwnerMode, setIsOwnerModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('tk_owner_session_v1') === 'true';
    } catch {
      return false;
    }
  });

  const setIsOwnerMode = useCallback((val: boolean) => {
    setIsOwnerModeState(val);
    if (typeof window !== 'undefined') {
      try {
        if (val) {
          sessionStorage.setItem('tk_owner_session_v1', 'true');
        } else {
          sessionStorage.removeItem('tk_owner_session_v1');
        }
      } catch {}
    }
  }, []);

  const [isOwnerAccessModalOpen, setIsOwnerAccessModalOpen] = useState<boolean>(false);

  const setActiveOrderId = useCallback((orderId: string | null) => {
    setActiveOrderIdState(orderId);
    if (orderId) {
      saveActiveOrderId(orderId);
    } else {
      clearSavedActiveOrderId();
    }
  }, []);

  // Last order handoff result (for LINE/WhatsApp)
  const [lastOrderInfo, setLastOrderInfo] = useState<{
    message: string;
    channel: 'whatsapp' | 'line';
    whatsAppUrl?: string;
    lineUrl?: string;
  } | null>(null);

  // Translation helper bound to current language
  const translate = useCallback(
    (key: keyof typeof translations['en']) => t(language, key),
    [language]
  );

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    saveLanguage(newLang);
  }, []);

  // Save appState to local storage fallback
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Real-time Firestore Orders Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAllOrders(
      (orders) => {
        setAllOrders(orders);
      },
      (err) => {
        console.warn('Orders sync notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Pending orders calculation: all genuine orders with status === 'pending'
  const pendingOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (
        o.status === 'completed' ||
        o.status === 'cancelled' ||
        o.paymentStatus === 'paid' ||
        o.orderNumber === 1027 ||
        o.orderNumberFormatted === '#1027' ||
        o.id === 'order_1788684802302_fmqk2'
      ) {
        return false;
      }
      return o.status === 'pending';
    });
  }, [allOrders]);

  const pendingOrdersCount = pendingOrders.length;

  // Defensive cleanup: only clear legacy mock order #1027.
  // CRITICAL FIX: NEVER clear completed or cancelled customer orders automatically!
  // Customer must see the friendly Order Ready confirmation until they dismiss it or place a new order.
  useEffect(() => {
    if (!activeOrderId) return;
    if (
      activeOrderId === 'order_1788684802302_fmqk2' ||
      activeOrderId === '1027' ||
      activeOrderId === '#1027'
    ) {
      setActiveOrderId(null);
    }
  }, [activeOrderId, setActiveOrderId]);

  // Customer auto-popup when restaurant completes the order:
  // Immediately pops up CustomerOrderStatusModal when status changes to 'completed'
  const completedOrderPopupShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeOrderId) return;

    const unsubscribe = subscribeToOrder(
      activeOrderId,
      (liveOrder) => {
        if (liveOrder.status === 'completed') {
          if (completedOrderPopupShownRef.current !== liveOrder.id) {
            completedOrderPopupShownRef.current = liveOrder.id;
            // 🚀 AUTOMATICALLY POP UP FOR CUSTOMER!
            setIsOrderStatusOpen(true);
            // Play pleasant customer celebration chime
            playCustomerReadySound();
          }
        }
      },
      (err) => {
        console.warn('Customer active order tracking notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeOrderId]);

  // Real-Time Loud Repeating Notification Sound Alarm for Owner Dashboard
  useEffect(() => {
    const isOwnerRoute =
      typeof window !== 'undefined' &&
      (window.location.pathname.includes('/owner') || window.location.hash.includes('/owner'));
    const isOwnerActive = isOwnerMode || isOwnerRoute;

    if (!isOwnerActive) {
      stopContinuousOrderAlarm();
      setIsAlarmActive(false);
      return;
    }

    if (pendingOrdersCount > 0) {
      // If new pending orders arrive, un-silence and trigger notification
      if (pendingOrdersCount > previousPendingCountRef.current) {
        resetAlarmSilence();
        const latestOrder = pendingOrders[0];
        const customerName = latestOrder?.customer?.name || 'Customer';
        showSystemNotification(
          `Tony's Kitchen - New Order ${latestOrder?.orderNumberFormatted || ''}`,
          `Incoming Order from ${customerName} (฿${latestOrder?.total || 0})`
        );
      }

      // If not manually silenced for this batch, start loud continuous repeating alarm
      if (!isAlarmSilenced()) {
        startContinuousOrderAlarm(appState.settings?.notificationSound || 'sound1');
        setIsAlarmActive(true);
      }
    } else {
      // All pending orders accepted/cancelled -> immediately stop alarm
      stopContinuousOrderAlarm();
      resetAlarmSilence();
      setIsAlarmActive(false);
    }

    previousPendingCountRef.current = pendingOrdersCount;
  }, [pendingOrdersCount, isOwnerMode, pendingOrders, appState.settings?.notificationSound]);

  // Silences current pending alarm session without disabling sound for future orders
  const muteAlarm = useCallback(() => {
    silenceCurrentAlarm();
    stopContinuousOrderAlarm();
    setIsAlarmActive(false);
  }, []);

  // Synchronize Shared Menu/Store State across all devices via Cloud Firestore & local broadcast
  useEffect(() => {
    // Test initial server connection handshake
    testConnection().catch(() => {});

    // 1. Subscribe to Cloud Firestore real-time updates (cross-device sync across Internet)
    const unsubscribeFirestore = subscribeToSharedRestaurantState(
      (remoteState) => {
        setAppState((prevState) => {
          // Prevent unnecessary state churn if deeply equal
          if (JSON.stringify(prevState) === JSON.stringify(remoteState)) {
            return prevState;
          }
          saveAppState(remoteState);
          return remoteState;
        });
      },
      (err) => {
        console.warn('Firestore sync listener notice:', err);
      }
    );

    // 2. Local storage event listener (for local multi-tab fallbacks)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.APP_STATE && e.newValue) {
        try {
          const fresh = loadAppState();
          setAppState(fresh);
        } catch (err) {
          console.error('Failed to sync app state from storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 3. BroadcastChannel support for instant sub-millisecond tab sync
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel(SYNC_BROADCAST_CHANNEL);
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'APP_STATE_UPDATED') {
            const fresh = loadAppState();
            setAppState(fresh);
          }
        };
      } catch (err) {
        // Fallback to storage event
      }
    }

    return () => {
      unsubscribeFirestore();
      window.removeEventListener('storage', handleStorageChange);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, []);

  // Compute Store Availability
  const [availabilityTick, setAvailabilityTick] = useState<number>(0);
  const storeAvailability = useMemo(() => {
    return checkStoreAvailability(appState.settings);
  }, [appState.settings, availabilityTick]);

  // Check store availability periodically (every 60 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setAvailabilityTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const refreshAvailability = useCallback(() => {
    setAvailabilityTick(prev => prev + 1);
  }, []);

  // Auto cleanup expired special holidays periodically or on settings change
  useEffect(() => {
    const currentHolidays = appState.settings.specialHolidays || [];
    const cleaned = cleanExpiredHolidays(currentHolidays);
    if (cleaned.length !== currentHolidays.length) {
      setAppState(prev => {
        const updated: AppStateData = {
          ...prev,
          settings: {
            ...prev.settings,
            specialHolidays: cleaned,
          },
        };
        saveAppState(updated);
        return updated;
      });
    }
  }, [availabilityTick, appState.settings.specialHolidays]);

  // Settings Updater
  const updateSettings = useCallback(async (newSettings: Partial<StoreSettings>): Promise<void> => {
    let stateToSync: AppStateData | null = null;
    setAppState(prev => {
      let holidays = prev.settings.specialHolidays || [];
      if (newSettings.specialHolidays !== undefined) {
        holidays = cleanExpiredHolidays(newSettings.specialHolidays);
      } else {
        holidays = cleanExpiredHolidays(holidays);
      }

      const updated: AppStateData = {
        ...prev,
        settings: {
          ...prev.settings,
          ...newSettings,
          specialHolidays: holidays,
        },
      };
      stateToSync = updated;
      saveAppState(updated);
      return updated;
    });

    if (stateToSync) {
      await updateSharedRestaurantState(stateToSync);
    }
  }, []);

  // Setters for Categories, MenuItems, ModifierGroups with Firestore persistence
  const setCategories: React.Dispatch<React.SetStateAction<Category[]>> = useCallback((action) => {
    setAppState(prev => {
      const nextCats = typeof action === 'function' ? action(prev.categories) : action;
      const updated = { ...prev, categories: nextCats };
      saveAppState(updated);
      updateSharedRestaurantState(updated).catch(err => {
        console.error('Failed to sync categories to Firestore:', err);
      });
      return updated;
    });
  }, []);

  const setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>> = useCallback((action) => {
    setAppState(prev => {
      const nextItems = typeof action === 'function' ? action(prev.menuItems) : action;
      const updated = { ...prev, menuItems: nextItems };
      saveAppState(updated);
      updateSharedRestaurantState(updated).catch(err => {
        console.error('Failed to sync menuItems to Firestore:', err);
      });
      return updated;
    });
  }, []);

  const setModifierGroups: React.Dispatch<React.SetStateAction<ModifierGroup[]>> = useCallback((action) => {
    setAppState(prev => {
      const nextGroups = typeof action === 'function' ? action(prev.modifierGroups) : action;
      const updated = { ...prev, modifierGroups: nextGroups };
      saveAppState(updated);
      updateSharedRestaurantState(updated).catch(err => {
        console.error('Failed to sync modifierGroups to Firestore:', err);
      });
      return updated;
    });
  }, []);

  // Cart operations
  const addToCart = useCallback((newItem: CartItem) => {
    setCartState(prevCart => {
      // Check if an identical item exists (same menuItemId, same modifiers, same specialRequest)
      const existingIdx = prevCart.findIndex(cartItem => {
        if (cartItem.menuItemId !== newItem.menuItemId) return false;
        if ((cartItem.specialRequest || '').trim() !== (newItem.specialRequest || '').trim()) return false;
        if (cartItem.selectedModifiers.length !== newItem.selectedModifiers.length) return false;
        
        const mods1 = [...cartItem.selectedModifiers].map(m => `${m.groupId}:${m.optionId}`).sort().join('|');
        const mods2 = [...newItem.selectedModifiers].map(m => `${m.groupId}:${m.optionId}`).sort().join('|');
        return mods1 === mods2;
      });

      let updatedCart: CartItem[];
      if (existingIdx >= 0) {
        // Increment quantity of existing line
        const existing = prevCart[existingIdx];
        const newQty = existing.quantity + newItem.quantity;
        const newSubtotal = existing.unitPrice * newQty;
        const updatedItem: CartItem = {
          ...existing,
          quantity: newQty,
          subtotal: newSubtotal,
        };
        updatedCart = [
          ...prevCart.slice(0, existingIdx),
          updatedItem,
          ...prevCart.slice(existingIdx + 1),
        ];
      } else {
        // Append as a new cart line
        updatedCart = [...prevCart, newItem];
      }

      saveCart(updatedCart);
      return updatedCart;
    });
  }, []);

  const updateCartItem = useCallback((updatedItem: CartItem) => {
    setCartState(prevCart => {
      const nextCart = prevCart.map(item => item.id === updatedItem.id ? updatedItem : item);
      saveCart(nextCart);
      return nextCart;
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCartState(prevCart => {
      const nextCart = prevCart.filter(item => item.id !== cartItemId);
      saveCart(nextCart);
      return nextCart;
    });
  }, []);

  const updateCartItemQuantity = useCallback((cartItemId: string, delta: number) => {
    setCartState(prevCart => {
      const nextCart = prevCart.map(item => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            subtotal: item.unitPrice * newQty,
          };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);

      saveCart(nextCart);
      return nextCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartState([]);
    saveCart([]);
  }, []);

  const cartTotalQuantity = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  // Favorites operations
  const toggleFavorite = useCallback((menuItemId: string) => {
    setFavoritesState(prev => {
      const next = prev.includes(menuItemId)
        ? prev.filter(id => id !== menuItemId)
        : [...prev, menuItemId];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((menuItemId: string) => {
    return favorites.includes(menuItemId);
  }, [favorites]);

  // Customer Profile
  const updateCustomerProfile = useCallback((updates: Partial<CustomerProfile>) => {
    setCustomerProfileState(prev => {
      const next = { ...prev, ...updates };
      saveCustomerProfile(next);
      return next;
    });
  }, []);

  // Demo Reset & Data Export/Import
  const resetDemoData = useCallback(() => {
    const fresh = resetToDemoState();
    setAppState(fresh);
    saveAppState(fresh);
    updateSharedRestaurantState(fresh).catch(e => console.error('Failed to sync demo reset to Firestore:', e));
    clearCart();
    setFavoritesState([]);
    saveFavorites([]);
  }, [clearCart]);

  const exportDataJson = useCallback(() => {
    const backup = createAppBackup(appState, allOrders);
    return backup.jsonString;
  }, [appState, allOrders]);

  const importDataJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      const validation = validateBackupPayload(parsed);

      if (validation.isValid && parsed.payload) {
        // Standardized AppBackupPayload structure
        const p = parsed.payload;
        const nextState: AppStateData = {
          version: p.version || 1,
          settings: p.settings,
          categories: p.categories,
          menuItems: p.menuItems,
          modifierGroups: p.modifierGroups || [],
        };
        setAppState(nextState);
        saveAppState(nextState);
        updateSharedRestaurantState(nextState).catch(e => console.error('Failed to sync imported backup to Firestore:', e));
        return true;
      }

      if (validation.isValid && parsed.settings && Array.isArray(parsed.categories)) {
        // Direct root schema structure
        const nextState: AppStateData = {
          version: parsed.version || 1,
          settings: parsed.settings,
          categories: parsed.categories,
          menuItems: parsed.menuItems,
          modifierGroups: parsed.modifierGroups || [],
        };
        setAppState(nextState);
        saveAppState(nextState);
        updateSharedRestaurantState(nextState).catch(e => console.error('Failed to sync imported backup to Firestore:', e));
        return true;
      }

      // Legacy fallback
      if (parsed && parsed.settings && Array.isArray(parsed.categories) && Array.isArray(parsed.menuItems)) {
        setAppState(parsed);
        saveAppState(parsed);
        updateSharedRestaurantState(parsed).catch(e => console.error('Failed to sync imported data to Firestore:', e));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        language,
        setLanguage,
        t: translate,
        settings: appState.settings,
        updateSettings,
        categories: appState.categories,
        setCategories,
        menuItems: appState.menuItems,
        setMenuItems,
        modifierGroups: appState.modifierGroups,
        setModifierGroups,
        storeAvailability,
        refreshAvailability,
        cart,
        addToCart,
        updateCartItem,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        cartTotalQuantity,
        cartSubtotal,
        favorites,
        toggleFavorite,
        isFavorite,
        customerProfile,
        updateCustomerProfile,
        paymentMethod,
        setPaymentMethod,
        activeCategoryId,
        setActiveCategoryId,
        searchQuery,
        setSearchQuery,
        customizingItem,
        setCustomizingItem,
        editingCartItem,
        setEditingCartItem,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isFavoritesOpen,
        setIsFavoritesOpen,
        isCustomerProfileOpen,
        setIsCustomerProfileOpen,
        isClosedModalOpen,
        setIsClosedModalOpen,
        activeOrderId,
        setActiveOrderId,
        isOrderConfirmationOpen,
        setIsOrderConfirmationOpen,
        pendingOrderToConfirm,
        setPendingOrderToConfirm,
        isOrderStatusOpen,
        setIsOrderStatusOpen,
        allOrders,
        pendingOrdersCount,
        isAlarmActive,
        muteAlarm,
        isOwnerMode,
        setIsOwnerMode,
        isOwnerAccessModalOpen,
        setIsOwnerAccessModalOpen,
        lastOrderInfo,
        setLastOrderInfo,
        resetDemoData,
        exportDataJson,
        importDataJson,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = (): RestaurantContextType => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
