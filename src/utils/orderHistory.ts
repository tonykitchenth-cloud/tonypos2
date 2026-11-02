import { RestaurantOrder, OrderStatus } from '../types';

export const CUSTOMER_ORDER_HISTORY_KEY = 'tonys_kitchen_customer_order_history_v2';
export const OWNER_ORDER_HISTORY_KEY = 'tonys_kitchen_owner_order_history_v2';

/**
 * At least 20 orders are guaranteed to be retained on device as proof/ledger.
 * Maximum capacity allows up to 50 orders before FIFO trimming.
 */
export const MIN_ORDER_HISTORY_LIMIT = 20;
export const MAX_ORDER_HISTORY_LIMIT = 50;

/**
 * Retrieves customer's local order history from localStorage.
 * Automatically cleans legacy placeholder data and sorts newest first.
 */
export function getCustomerOrderHistory(): RestaurantOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOMER_ORDER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out corrupted entries and legacy mock order 1027
    const validOrders = parsed.filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      const num = item.orderNumber || item.orderNumberFormatted;
      if (num === 1027 || num === '#1027' || item.id === 'order_1788684802302_fmqk2') return false;
      return Boolean(item.id && (item.items || item.total !== undefined));
    });

    return validOrders.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (err) {
    console.warn('Failed to parse customer order history from localStorage:', err);
    return [];
  }
}

/**
 * Saves or updates an order in the customer's on-device history.
 * Retains at least 20 orders (up to 50 max) as evidence.
 */
export function saveCustomerOrder(order: RestaurantOrder): RestaurantOrder[] {
  if (typeof window === 'undefined' || !order || !order.id) return [];
  try {
    const currentList = getCustomerOrderHistory();

    // Check if order already exists in history
    const existingIndex = currentList.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);

    let updatedList: RestaurantOrder[];
    if (existingIndex >= 0) {
      // Merge updates
      updatedList = [...currentList];
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        ...order,
      };
    } else {
      // Prepend newest order to the top
      updatedList = [order, ...currentList];
    }

    // Sort by createdAt descending
    updatedList.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Trim to MAX_ORDER_HISTORY_LIMIT (50, ensuring well above minimum 20)
    if (updatedList.length > MAX_ORDER_HISTORY_LIMIT) {
      updatedList = updatedList.slice(0, MAX_ORDER_HISTORY_LIMIT);
    }

    localStorage.setItem(CUSTOMER_ORDER_HISTORY_KEY, JSON.stringify(updatedList));

    // Dispatch reactive browser event for instant UI update
    window.dispatchEvent(new CustomEvent('customer_order_history_updated', { detail: order }));

    return updatedList;
  } catch (err) {
    console.warn('Failed to save customer order to localStorage:', err);
    return [];
  }
}

/**
 * Updates status of an existing order in customer's local history.
 */
export function updateCustomerOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: Partial<RestaurantOrder>
): void {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const currentList = getCustomerOrderHistory();
    const index = currentList.findIndex((o) => o.id === orderId);
    if (index === -1) return;

    currentList[index] = {
      ...currentList[index],
      status,
      ...extra,
    };

    localStorage.setItem(CUSTOMER_ORDER_HISTORY_KEY, JSON.stringify(currentList));
    window.dispatchEvent(
      new CustomEvent('customer_order_history_updated', { detail: currentList[index] })
    );
  } catch (err) {
    console.warn('Failed to update customer order status in local history:', err);
  }
}

/**
 * Clears customer order history (optional user action).
 */
export function clearCustomerOrderHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CUSTOMER_ORDER_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent('customer_order_history_updated', { detail: null }));
  } catch (err) {
    console.warn('Failed to clear customer order history:', err);
  }
}

// ============================================================================
// STORE / OWNER ON-DEVICE ORDER HISTORY (BACKUP / EVIDENCE ARCHIVE)
// ============================================================================

/**
 * Retrieves store owner's local order history backup ledger from localStorage.
 */
export function getOwnerOrderHistory(): RestaurantOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OWNER_ORDER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validOrders = parsed.filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      const num = item.orderNumber || item.orderNumberFormatted;
      if (num === 1027 || num === '#1027' || item.id === 'order_1788684802302_fmqk2') return false;
      return Boolean(item.id);
    });

    return validOrders.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (err) {
    console.warn('Failed to parse owner order history from localStorage:', err);
    return [];
  }
}

/**
 * Saves single order into the store owner's on-device history ledger.
 * Retains at least 20 orders (up to 50 max).
 */
export function saveOwnerOrder(order: RestaurantOrder): RestaurantOrder[] {
  if (typeof window === 'undefined' || !order || !order.id) return [];
  try {
    const currentList = getOwnerOrderHistory();
    const existingIndex = currentList.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);

    let updatedList: RestaurantOrder[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        ...order,
      };
    } else {
      updatedList = [order, ...currentList];
    }

    updatedList.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    if (updatedList.length > MAX_ORDER_HISTORY_LIMIT) {
      updatedList = updatedList.slice(0, MAX_ORDER_HISTORY_LIMIT);
    }

    localStorage.setItem(OWNER_ORDER_HISTORY_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('owner_order_history_updated', { detail: order }));

    return updatedList;
  } catch (err) {
    console.warn('Failed to save owner order to localStorage:', err);
    return [];
  }
}

/**
 * Synchronizes a list of orders (e.g. from Firestore snapshot or batch)
 * into the store owner's local device backup ledger.
 * Merges and preserves at least 20 to 50 recent orders on the local machine.
 */
export function syncOwnerOrderHistory(orders: RestaurantOrder[]): RestaurantOrder[] {
  if (typeof window === 'undefined' || !Array.isArray(orders)) return [];
  try {
    const currentList = getOwnerOrderHistory();
    const map = new Map<string, RestaurantOrder>();

    // Add current stored items
    for (const ord of currentList) {
      if (ord && ord.id && ord.orderNumber !== 1027 && ord.orderNumberFormatted !== '#1027') {
        map.set(ord.id, ord);
      }
    }

    // Merge incoming orders
    for (const ord of orders) {
      if (ord && ord.id && ord.orderNumber !== 1027 && ord.orderNumberFormatted !== '#1027') {
        map.set(ord.id, {
          ...(map.get(ord.id) || {}),
          ...ord,
        });
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const trimmed = merged.slice(0, MAX_ORDER_HISTORY_LIMIT);
    localStorage.setItem(OWNER_ORDER_HISTORY_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('owner_order_history_updated', { detail: trimmed }));

    return trimmed;
  } catch (err) {
    console.warn('Failed to sync owner order history in localStorage:', err);
    return [];
  }
}
