import { AppStateData, CartItem, CustomerProfile, Language } from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { demoCategories, demoMenuItems, demoModifierGroups } from '../data/demoData';
import { cleanExpiredHolidays } from './availabilityEngine';

export const APP_DATA_VERSION = 1;

export const STORAGE_KEYS = {
  APP_STATE: `tonys_kitchen_app_state_v${APP_DATA_VERSION}`,
  CART: `tonys_kitchen_cart_v${APP_DATA_VERSION}`,
  FAVORITES: `tonys_kitchen_favorites_v${APP_DATA_VERSION}`,
  CUSTOMER_PROFILE: `tonys_kitchen_customer_profile_v${APP_DATA_VERSION}`,
  LANGUAGE: `tonys_kitchen_language_v${APP_DATA_VERSION}`,
};

export const SYNC_BROADCAST_CHANNEL = 'tonys_kitchen_shared_sync_channel';

export function broadcastStateChange(type: 'APP_STATE_UPDATED' | 'CART_UPDATED' = 'APP_STATE_UPDATED'): void {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(SYNC_BROADCAST_CHANNEL);
      channel.postMessage({ type, timestamp: Date.now() });
      channel.close();
    }
  } catch (error) {
    // Non-critical, fallback to storage event
  }
}

export const defaultAppState: AppStateData = {
  version: APP_DATA_VERSION,
  settings: {
    ...defaultSettings,
    specialHolidays: cleanExpiredHolidays(defaultSettings.specialHolidays || []),
  },
  categories: demoCategories,
  menuItems: demoMenuItems,
  modifierGroups: demoModifierGroups,
};

export const defaultCustomerProfile: CustomerProfile = {
  name: '',
  phone: '',
  deliveryAddress: '',
  orderType: 'pickup',
  notes: '',
};

/**
 * Loads and validates persistent App State (Settings, Menu, Categories, Modifiers)
 * Automatically cleans out any expired special holiday events.
 */
export function loadAppState(): AppStateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!raw) {
      saveAppState(defaultAppState);
      return defaultAppState;
    }
    const parsed = JSON.parse(raw);
    
    // Schema validation and recovery
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Corrupted state detected in localStorage. Reverting to default app state.');
      return defaultAppState;
    }

    const rawHolidays = Array.isArray(parsed.settings?.specialHolidays)
      ? parsed.settings.specialHolidays
      : (defaultSettings.specialHolidays || []);

    const cleanedHolidays = cleanExpiredHolidays(rawHolidays);

    const storedLogo = parsed.settings?.logoUrl;
    const isOldLogo = !storedLogo || (typeof storedLogo === 'string' && storedLogo.includes('images.unsplash.com/photo-1555396273-367ea4eb4db5'));
    const resolvedLogo = isOldLogo ? defaultSettings.logoUrl : storedLogo;

    const validatedState: AppStateData = {
      version: parsed.version || APP_DATA_VERSION,
      settings: {
        ...defaultSettings,
        ...(parsed.settings || {}),
        logoUrl: resolvedLogo,
        specialHolidays: cleanedHolidays,
        emergencyClose: {
          ...defaultSettings.emergencyClose,
          ...(parsed.settings?.emergencyClose || {}),
        },
        channels: {
          ...defaultSettings.channels,
          ...(parsed.settings?.channels || {}),
        },
      },
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 
        ? parsed.categories 
        : demoCategories,
      menuItems: Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0 
        ? parsed.menuItems 
        : demoMenuItems,
      modifierGroups: Array.isArray(parsed.modifierGroups) && parsed.modifierGroups.length > 0 
        ? parsed.modifierGroups 
        : demoModifierGroups,
    };

    // If any expired holidays were cleaned, re-persist updated state immediately
    if (rawHolidays.length !== cleanedHolidays.length) {
      saveAppState(validatedState);
    }

    return validatedState;
  } catch (error) {
    console.error('Failed to load app state from localStorage:', error);
    return defaultAppState;
  }
}

export function saveAppState(state: AppStateData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
    broadcastStateChange('APP_STATE_UPDATED');
  } catch (error) {
    console.error('Failed to save app state to localStorage:', error);
  }
}

/**
 * Loads Cart items defensively
 */
export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

/**
 * Loads Favorites defensively
 */
export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load favorites from localStorage:', error);
    return [];
  }
}

export function saveFavorites(favorites: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites to localStorage:', error);
  }
}

export const PERMANENT_CUSTOMER_PROFILE_KEYS = [
  STORAGE_KEYS.CUSTOMER_PROFILE,
  'tonys_kitchen_customer_profile_permanent_v1',
  'tonys_kitchen_customer_profile',
  'customer_profile',
];

/**
 * Loads saved Customer Profile with resilient multi-key lookup and order-history recovery.
 * Guaranteed to never lose customer information across page reloads.
 */
export function loadCustomerProfile(): CustomerProfile {
  if (typeof window === 'undefined') return defaultCustomerProfile;

  try {
    let candidate: CustomerProfile | null = null;

    // 1. Check all persistent keys
    for (const key of PERMANENT_CUSTOMER_PROFILE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && (parsed.name || parsed.phone || parsed.deliveryAddress)) {
            candidate = {
              ...defaultCustomerProfile,
              ...parsed,
            };
            break;
          }
        } catch {}
      }
    }

    // 2. Fallback: Recover from customer's latest order in on-device order history
    if (!candidate || (!candidate.name && !candidate.phone)) {
      try {
        const historyRaw = localStorage.getItem('tonys_kitchen_customer_order_history_v2');
        if (historyRaw) {
          const history = JSON.parse(historyRaw);
          if (Array.isArray(history) && history.length > 0) {
            const latest = history[0];
            if (latest?.customer && (latest.customer.name || latest.customer.phone)) {
              candidate = {
                name: latest.customer.name || '',
                phone: latest.customer.phone || '',
                deliveryAddress: latest.customer.deliveryAddress || '',
                orderType: latest.orderType || 'pickup',
                notes: latest.customer.notes || '',
              };
              // Persist recovered profile back into storage immediately
              saveCustomerProfile(candidate);
            }
          }
        }
      } catch {}
    }

    if (candidate) {
      return candidate;
    }

    return defaultCustomerProfile;
  } catch (error) {
    console.error('Failed to load customer profile from localStorage:', error);
    return defaultCustomerProfile;
  }
}

/**
 * Permanently saves customer profile to local storage across multiple fallback keys.
 * Defensively protects existing fields so empty values never overwrite valid saved data.
 */
export function saveCustomerProfile(profile: Partial<CustomerProfile>): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Defensively merge with current stored profile to prevent accidental wiping
    const existing = loadCustomerProfile();
    const merged: CustomerProfile = {
      name: (profile.name !== undefined && profile.name.trim() !== '') ? profile.name.trim() : (existing.name || ''),
      phone: (profile.phone !== undefined && profile.phone.trim() !== '') ? profile.phone.trim() : (existing.phone || ''),
      deliveryAddress: (profile.deliveryAddress !== undefined && profile.deliveryAddress.trim() !== '') ? profile.deliveryAddress.trim() : (existing.deliveryAddress || ''),
      orderType: profile.orderType || existing.orderType || 'pickup',
      notes: (profile.notes !== undefined && profile.notes.trim() !== '') ? profile.notes.trim() : (existing.notes || ''),
    };

    const payload = JSON.stringify(merged);

    // 2. Write to all permanent keys
    for (const key of PERMANENT_CUSTOMER_PROFILE_KEYS) {
      try {
        localStorage.setItem(key, payload);
      } catch {}
    }

    // 3. Dispatch broadcast event for live multi-component synchronization
    window.dispatchEvent(new CustomEvent('customer_profile_updated', { detail: merged }));
  } catch (error) {
    console.error('Failed to save customer profile to localStorage:', error);
  }
}

/**
 * Loads saved language choice (default is English)
 */
export function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (raw === 'th' || raw === 'en') return raw;
    return 'en'; // Default
  } catch {
    return 'en';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (error) {
    console.error('Failed to save language to localStorage:', error);
  }
}

/**
 * Controlled Reset Demo Data function
 */
export function resetToDemoState(): AppStateData {
  saveAppState(defaultAppState);
  return defaultAppState;
}
