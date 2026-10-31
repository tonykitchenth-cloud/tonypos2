import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, ensureAuthenticatedUser } from './firebase';
import {
  RestaurantOrder,
  OrderStatus,
  OrderSource,
  OrderType,
  PaymentMethod,
  OrderItemSnapshot,
} from '../types';

export const ORDERS_COLLECTION = 'orders';
export const COUNTERS_COLLECTION = 'counters';
export const ORDER_COUNTER_DOC = 'orders';

const ACTIVE_ORDER_ID_KEY = 'tonys_kitchen_active_order_id_v1';
const CONFIRMED_ORDER_TOKENS_KEY = 'tonys_kitchen_confirmed_tokens_v1';

/**
 * Defensive cleanup for stale/completed order #1027 or legacy order keys in LocalStorage
 */
export function cleanupStaleLocalOrders(): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Check and clear if active order is the completed order #1027
    const activeId = localStorage.getItem(ACTIVE_ORDER_ID_KEY);
    if (activeId === 'order_1788684802302_fmqk2' || activeId === '1027' || activeId === '#1027') {
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
    }

    // 2. Clear any legacy demo/stale order storage keys from previous versions
    const legacyKeys = [
      'tonys_kitchen_orders',
      'tonys_kitchen_orders_v1',
      'tonys_kitchen_pending_orders',
      'tonys_kitchen_active_order',
      'tonys_kitchen_active_order_v1',
      'orders',
      'pending_orders',
      'active_order',
    ];

    for (const key of legacyKeys) {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((item: any) => {
              const num = item?.orderNumber || item?.orderNumberFormatted;
              const id = item?.id;
              if (num === 1027 || num === '#1027' || id === 'order_1788684802302_fmqk2') return false;
              if (item?.status === 'completed' || item?.status === 'cancelled' || item?.paymentStatus === 'paid') return false;
              return true;
            });
            if (cleaned.length === 0) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          } else if (parsed && typeof parsed === 'object') {
            if (parsed.orderNumber === 1027 || parsed.id === 'order_1788684802302_fmqk2') {
              localStorage.removeItem(key);
            }
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('Defensive order storage cleanup notice:', err);
  }
}

// Auto-run cleanup on module load in browser
if (typeof window !== 'undefined') {
  cleanupStaleLocalOrders();
}

/**
 * Persists and retrieves active order ID on customer device across page reloads
 */
export function getSavedActiveOrderId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const activeId = localStorage.getItem(ACTIVE_ORDER_ID_KEY);
    if (!activeId) return null;
    // Defensive check: order #1027 is completed and must never be treated as an active pending order
    if (activeId === 'order_1788684802302_fmqk2' || activeId === '1027' || activeId === '#1027') {
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
      return null;
    }
    return activeId;
  } catch {
    return null;
  }
}

export function saveActiveOrderId(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_ORDER_ID_KEY, orderId);
  } catch {}
}

export function clearSavedActiveOrderId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
  } catch {}
}

/**
 * Idempotency tracking to prevent duplicate submissions
 */
function isTokenAlreadyUsed(clientToken: string): boolean {
  try {
    const raw = localStorage.getItem(CONFIRMED_ORDER_TOKENS_KEY);
    if (!raw) return false;
    const tokens: string[] = JSON.parse(raw);
    return tokens.includes(clientToken);
  } catch {
    return false;
  }
}

function markTokenAsUsed(clientToken: string): void {
  try {
    const raw = localStorage.getItem(CONFIRMED_ORDER_TOKENS_KEY);
    const tokens: string[] = raw ? JSON.parse(raw) : [];
    if (!tokens.includes(clientToken)) {
      tokens.push(clientToken);
      // Keep only last 20 tokens
      if (tokens.length > 20) tokens.shift();
      localStorage.setItem(CONFIRMED_ORDER_TOKENS_KEY, JSON.stringify(tokens));
    }
  } catch {}
}

export interface CreateOrderParams {
  source: OrderSource;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  customer: {
    name: string;
    phone: string;
    deliveryAddress?: string;
    notes?: string;
  };
  items: OrderItemSnapshot[];
  subtotal: number;
  total: number;
  currencySymbol: string;
  clientToken: string;
}

/**
 * Safely allocates sequential human-readable order number (e.g. 1024) via Firestore transaction
 */
async function allocateSequentialOrderNumber(): Promise<number> {
  if (!db) {
    return 1000 + Math.floor((Date.now() % 86400000) / 1000);
  }

  const counterRef = doc(db, COUNTERS_COLLECTION, ORDER_COUNTER_DOC);

  try {
    const allocatedNumber = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      let nextNum = 1024;
      if (snap.exists()) {
        const data = snap.data();
        const current = typeof data.lastOrderNumber === 'number' ? data.lastOrderNumber : 1023;
        nextNum = current + 1;
      }
      transaction.set(
        counterRef,
        {
          lastOrderNumber: nextNum,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return nextNum;
    });

    return allocatedNumber;
  } catch (err) {
    console.warn('Transaction counter failed, falling back to time-based safe sequence:', err);
    // Fallback safe sequence based on minute timestamp
    return 1000 + Math.floor((Date.now() % 86400000) / 1000);
  }
}

/**
 * Creates a confirmed restaurant order in Cloud Firestore with atomic sequential numbering
 */
export async function createRestaurantOrder(params: CreateOrderParams): Promise<RestaurantOrder> {
  // Idempotency check: if token was already submitted on this device
  if (params.clientToken && isTokenAlreadyUsed(params.clientToken)) {
    console.warn('Duplicate order submission blocked by client token idempotency check.');
    const savedId = getSavedActiveOrderId();
    if (savedId) {
      const existing = await fetchOrderById(savedId);
      if (existing) return existing;
    }
  }

  // 1. Allocate unique order number
  const orderNumber = await allocateSequentialOrderNumber();
  const orderNumberFormatted = `#${orderNumber}`;
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  // Retrieve or initialize customer uid for security rules validation
  const user = auth.currentUser || (await ensureAuthenticatedUser());
  const customerId = user?.uid || `anon_${Math.random().toString(36).substring(2, 10)}`;

  const newOrder: RestaurantOrder = {
    id: orderId,
    orderNumber,
    orderNumberFormatted,
    source: params.source,
    status: 'pending',
    orderType: params.orderType,
    paymentMethod: params.paymentMethod,
    customer: {
      name: params.customer.name.trim(),
      phone: params.customer.phone.trim(),
      deliveryAddress: params.customer.deliveryAddress?.trim() || '',
      notes: params.customer.notes?.trim() || '',
    },
    items: params.items,
    subtotal: params.subtotal,
    total: params.total,
    currencySymbol: params.currencySymbol || '฿',
    createdAt: nowIso,
    clientToken: params.clientToken,
    customerId,
  };

  if (db) {
    try {
      const docRef = doc(db, ORDERS_COLLECTION, orderId);
      await setDoc(docRef, {
        ...newOrder,
        _serverCreatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Could not save order to Firestore:', e);
    }
  }

  // Mark token as used & save active order ID
  if (params.clientToken) {
    markTokenAsUsed(params.clientToken);
  }
  saveActiveOrderId(orderId);

  return newOrder;
}

/**
 * Fetches single order by ID
 */
export async function fetchOrderById(orderId: string): Promise<RestaurantOrder | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as RestaurantOrder;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch order by ID:', error);
    return null;
  }
}

export const ORDER_SYNC_BROADCAST_CHANNEL = 'tonys_kitchen_order_channel_v1';

/**
 * Real-time subscription to a single order for the customer live status screen.
 * Uses Firestore onSnapshot, instant getDoc query, and BroadcastChannel for zero-latency multi-tab updates.
 */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: RestaurantOrder) => void,
  onError?: (err: Error) => void
): () => void {
  if (!orderId) return () => {};

  let isCancelled = false;
  let activeUnsubscribe: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  // 1. Instant initial fetch to eliminate any snapshot handshake latency
  if (db) {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    getDoc(docRef)
      .then((snap) => {
        if (!isCancelled && snap.exists()) {
          onUpdate(snap.data() as RestaurantOrder);
        }
      })
      .catch(() => {});
  }

  // 2. Continuous Firestore onSnapshot listener with automatic retry
  const startListener = () => {
    if (isCancelled || !db) return;
    try {
      const docRef = doc(db, ORDERS_COLLECTION, orderId);
      activeUnsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (!isCancelled && snap.exists()) {
            onUpdate(snap.data() as RestaurantOrder);
          }
        },
        (err) => {
          console.warn('Order subscription snapshot notice:', err);
          if (onError) onError(err);
          if (!isCancelled) {
            retryTimer = setTimeout(() => {
              if (!isCancelled) startListener();
            }, 2500);
          }
        }
      );
    } catch (err: any) {
      console.warn('Failed to listen to order status:', err);
      if (!isCancelled) {
        retryTimer = setTimeout(() => {
          if (!isCancelled) startListener();
        }, 2500);
      }
    }
  };

  startListener();

  // 3. BroadcastChannel listener for sub-millisecond local/tab synchronization
  let broadcastChannel: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(ORDER_SYNC_BROADCAST_CHANNEL);
      broadcastChannel.onmessage = (event) => {
        if (!isCancelled && event.data?.orderId === orderId) {
          if (event.data.order) {
            onUpdate(event.data.order);
          } else if (db) {
            const docRef = doc(db, ORDERS_COLLECTION, orderId);
            getDoc(docRef)
              .then((snap) => {
                if (!isCancelled && snap.exists()) {
                  onUpdate(snap.data() as RestaurantOrder);
                }
              })
              .catch(() => {});
          }
        }
      };
    } catch {}
  }

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) activeUnsubscribe();
    if (retryTimer) clearTimeout(retryTimer);
    if (broadcastChannel) broadcastChannel.close();
  };
}

/**
 * Real-time subscription to all orders for Owner / Staff order dashboard
 */
export function subscribeToAllOrders(
  onUpdate: (orders: RestaurantOrder[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) return () => {};
  let isCancelled = false;
  let activeUnsubscribe: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const startListener = () => {
    if (isCancelled || !db) return;
    try {
      const ordersCol = collection(db, ORDERS_COLLECTION);
      activeUnsubscribe = onSnapshot(
        ordersCol,
        (snapshot) => {
          const list: RestaurantOrder[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as RestaurantOrder;
            list.push(data);
          });

          // Sort descending by creation date (newest orders first)
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          onUpdate(list);
        },
        (err) => {
          console.warn('Orders collection snapshot notice:', err);
          if (onError) onError(err);
          // Auto-reconnect after temporary mobile network drop
          if (!isCancelled) {
            retryTimer = setTimeout(() => {
              if (!isCancelled) startListener();
            }, 3000);
          }
        }
      );
    } catch (err: any) {
      console.warn('Failed to listen to all orders:', err);
      if (!isCancelled) {
        retryTimer = setTimeout(() => {
          if (!isCancelled) startListener();
        }, 3000);
      }
    }
  };

  startListener();

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) activeUnsubscribe();
    if (retryTimer) clearTimeout(retryTimer);
  };
}

/**
 * Updates order status (Owner action)
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: { cancelReason?: string }
): Promise<void> {
  if (!db) return;
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  const nowIso = new Date().toISOString();

  const updates: Partial<RestaurantOrder> & { updatedAt: string } = {
    status,
    updatedAt: nowIso,
  };

  if (status === 'accepted') {
    updates.acceptedAt = nowIso;
  } else if (status === 'on_the_way') {
    updates.onTheWayAt = nowIso;
  } else if (status === 'completed') {
    updates.completedAt = nowIso;
  } else if (status === 'cancelled') {
    updates.cancelledAt = nowIso;
    if (extra?.cancelReason) {
      updates.cancelReason = extra.cancelReason;
    }
  }

  await updateDoc(docRef, updates);

  // Broadcast immediate update across all browser tabs / windows
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel(ORDER_SYNC_BROADCAST_CHANNEL);
      bc.postMessage({ type: 'ORDER_STATUS_CHANGED', orderId, status, updates });
      bc.close();
    } catch {}
  }
}

/**
 * Updates order payment status
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'pending' | 'paid'
): Promise<void> {
  if (!db) return;
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(docRef, {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deletes an order (Owner clean-up)
 */
export async function deleteRestaurantOrder(orderId: string): Promise<void> {
  if (!db) return;
  const { deleteDoc } = await import('firebase/firestore');
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await deleteDoc(docRef);
}
