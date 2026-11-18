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

// ============================================================================
// ORDER HISTORY DATE PERIOD FILTERING (LOCAL CALENDAR TIME)
// ============================================================================

export type OrderDatePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

/**
 * Returns local calendar start/end millisecond bounds for the requested period.
 * - today: Today 00:00:00.000 -> 23:59:59.999
 * - week: Current Monday 00:00:00.000 -> Sunday 23:59:59.999
 * - month: 1st of current month 00:00:00.000 -> last day of month 23:59:59.999
 * - year: Jan 1 of current year 00:00:00.000 -> Dec 31 23:59:59.999
 * - all: unbounded (null)
 */
export function getOrderDatePeriodBounds(
  period: OrderDatePeriod,
  referenceDate: Date = new Date()
): { start: number | null; end: number | null } {
  if (period === 'all') {
    return { start: null, end: null };
  }

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  if (period === 'today') {
    const start = new Date(year, month, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month, day, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  if (period === 'week') {
    const dayOfWeek = referenceDate.getDay(); // 0 = Sun, 1 = Mon, ...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(year, month, day - diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return { start: monday.getTime(), end: sunday.getTime() };
  }

  if (period === 'month') {
    const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  // period === 'year'
  const start = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
  const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  return { start, end };
}

/**
 * Checks whether an order timestamp falls within the selected OrderDatePeriod
 * using local calendar boundaries.
 */
export function isOrderInDatePeriod(
  dateValue: string | number | Date | undefined | null,
  period: OrderDatePeriod,
  referenceDate: Date = new Date()
): boolean {
  if (period === 'all') return true;
  if (dateValue === undefined || dateValue === null || dateValue === '') return false;

  const timestamp = dateValue instanceof Date ? dateValue.getTime() : new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return false;

  const { start, end } = getOrderDatePeriodBounds(period, referenceDate);
  if (start !== null && timestamp < start) return false;
  if (end !== null && timestamp > end) return false;
  return true;
}

/**
 * Returns a human-readable date range label for UI display.
 */
export function getOrderDatePeriodRangeLabel(
  period: OrderDatePeriod,
  language: 'th' | 'en',
  referenceDate: Date = new Date()
): string {
  const locale = language === 'th' ? 'th-TH' : 'en-US';
  const { start, end } = getOrderDatePeriodBounds(period, referenceDate);

  if (period === 'all' || start === null || end === null) {
    return language === 'th' ? 'ประวัติทั้งหมด' : 'All records';
  }

  if (period === 'today') {
    return new Date(start).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  if (period === 'week') {
    const startStr = new Date(start).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
    });
    const endStr = new Date(end).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${startStr} – ${endStr}`;
  }

  if (period === 'month') {
    return new Date(start).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }

  // year
  return new Date(start).toLocaleDateString(locale, {
    year: 'numeric',
  });
}

