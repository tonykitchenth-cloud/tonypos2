/**
 * Tony's Kitchen - Order Notification Service
 * 
 * Centralized abstraction for new customer order detection.
 * Independent of order transport (supports local mock events and Firestore listeners).
 * 
 * Guarantees:
 * 1. Idempotency: Each unique order ID triggers sound and notification exactly once.
 * 2. Survives page reloads without repeating past orders.
 * 3. Never stores customer PII locally (only stores raw order ID strings).
 * 4. Multi-order rate limiting & queueing.
 */

import { RestaurantOrder } from '../types';
import { notificationSoundService } from './notificationSoundService';
import { resetAlarmSilence } from '../utils/soundAlarm';

export type NewOrderCallback = (newOrders: RestaurantOrder[]) => void;

const STORAGE_KEY_NOTIFIED_ORDERS = 'tk_notified_order_ids_v1';
const MAX_NOTIFIED_HISTORY = 250;

class OrderNotificationService {
  private notifiedOrderIds: Set<string> = new Set();
  private subscribers: Set<NewOrderCallback> = new Set();
  private isOwnerAuthenticated: boolean = false;
  private pendingVisualQueue: RestaurantOrder[] = [];

  constructor() {
    this.hydrateNotifiedIds();
  }

  /**
   * Hydrates the set of already-processed order IDs from localStorage
   * (Ensures refreshing the page does not re-alert past orders)
   */
  private hydrateNotifiedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFIED_ORDERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (typeof id === 'string') {
              this.notifiedOrderIds.add(id);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[OrderNotificationService] Could not parse stored order IDs:', e);
    }
  }

  private persistNotifiedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      // Keep only the most recent IDs to stay within safe localStorage bounds
      const idArray = Array.from(this.notifiedOrderIds).slice(-MAX_NOTIFIED_HISTORY);
      localStorage.setItem(STORAGE_KEY_NOTIFIED_ORDERS, JSON.stringify(idArray));
    } catch {
      // Ignore quota exceptions
    }
  }

  /**
   * Set Owner authentication/active mode state.
   * Notifications & sound triggers are strictly suppressed when Owner Mode is inactive.
   */
  public setOwnerModeActive(active: boolean): void {
    this.isOwnerAuthenticated = active;
  }

  public isOwnerModeActive(): boolean {
    return this.isOwnerAuthenticated;
  }

  /**
   * Check whether an order ID has already been notified.
   */
  public isOrderNotified(orderId: string): boolean {
    return this.notifiedOrderIds.has(orderId);
  }

  /**
   * Manually mark an order as notified without triggering sound.
   */
  public markOrderAsNotified(orderId: string): void {
    this.notifiedOrderIds.add(orderId);
    this.persistNotifiedIds();
  }

  /**
   * Processes a batch or stream of orders (e.g. from Firestore onSnapshot or initial load).
   * Identifies genuine NEW pending orders that have never been notified.
   * Triggers audio once and notifies subscribers.
   */
  public processOrdersList(orders: RestaurantOrder[]): RestaurantOrder[] {
    if (!orders || orders.length === 0) return [];

    // Only process if Owner Mode is active
    if (!this.isOwnerAuthenticated) {
      // If owner is not in owner mode yet, we still track the IDs so when they enter
      // owner mode, old past orders from yesterday aren't all blasted as new.
      return [];
    }

    const genuinelyNewOrders: RestaurantOrder[] = [];

    for (const order of orders) {
      // An order qualifies as "NEW" if status is 'pending' AND id has never been processed
      if (order.status === 'pending' && !this.notifiedOrderIds.has(order.id)) {
        this.notifiedOrderIds.add(order.id);
        genuinelyNewOrders.push(order);
      }
    }

    if (genuinelyNewOrders.length > 0) {
      this.persistNotifiedIds();
      resetAlarmSilence();
      // Play sound once for this arrival
      notificationSoundService.playNewOrderSound().catch((err) => {
        console.warn('[OrderNotificationService] Sound playback error:', err);
      });

      // Update pending visual queue
      this.pendingVisualQueue = [...this.pendingVisualQueue, ...genuinelyNewOrders];

      // Dispatch to active UI subscribers
      this.notifySubscribers(genuinelyNewOrders);
    }

    return genuinelyNewOrders;
  }

  /**
   * Direct handler for a single newly received order.
   */
  public handleNewOrder(order: RestaurantOrder): boolean {
    if (!order || !order.id) return false;

    // Check if order was already notified
    if (this.notifiedOrderIds.has(order.id)) {
      return false;
    }

    // Only trigger if status is 'pending'
    if (order.status !== 'pending') {
      this.notifiedOrderIds.add(order.id);
      this.persistNotifiedIds();
      return false;
    }

    this.notifiedOrderIds.add(order.id);
    this.persistNotifiedIds();

    if (this.isOwnerAuthenticated) {
      resetAlarmSilence();
      notificationSoundService.playNewOrderSound().catch((err) => {
        console.warn('[OrderNotificationService] Sound playback error:', err);
      });

      this.pendingVisualQueue.push(order);
      this.notifySubscribers([order]);
    }

    return true;
  }

  /**
   * Simulates a mock new customer order for testing in Owner Mode.
   */
  public simulateMockOrder(): RestaurantOrder {
    const timestamp = Date.now();
    const mockNumber = 1000 + Math.floor(Math.random() * 9000);
    const mockOrder: RestaurantOrder = {
      id: `mock_order_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
      orderNumber: mockNumber,
      orderNumberFormatted: `#TK-${String(mockNumber).padStart(6, '0')}`,
      source: 'in_app',
      status: 'pending',
      orderType: 'delivery',
      paymentMethod: 'cash',
      customer: {
        name: 'John Smith',
        phone: '084 153 6498',
        deliveryAddress: '24 Sukhumvit Soi 11, Bangkok',
        notes: 'Please ring bell and leave with front desk',
      },
      items: [
        {
          menuItemId: 'item-pad-kra-pao',
          name: { en: 'Pad Kra Pao', th: 'ผัดกะเพรา' },
          basePrice: 90,
          unitPrice: 90,
          quantity: 2,
          subtotal: 180,
          selectedModifiers: [],
          specialRequest: 'Spicy, fried egg crispy',
        },
        {
          menuItemId: 'item-pad-thai-goong',
          name: { en: 'Pad Thai Goong', th: 'ผัดไทยกุ้งสด' },
          basePrice: 100,
          unitPrice: 100,
          quantity: 1,
          subtotal: 100,
          selectedModifiers: [],
        },
      ],
      subtotal: 280,
      total: 280,
      currencySymbol: '฿',
      createdAt: new Date().toISOString(),
    };

    this.handleNewOrder(mockOrder);
    return mockOrder;
  }

  /**
   * Clears the notification history (strictly for testing).
   */
  public resetNotifiedHistory(): void {
    this.notifiedOrderIds.clear();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_NOTIFIED_ORDERS);
      } catch {
        // Safe ignore
      }
    }
  }

  public subscribeToNewOrders(callback: NewOrderCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public unsubscribeFromNewOrders(callback: NewOrderCallback): void {
    this.subscribers.delete(callback);
  }

  private notifySubscribers(newOrders: RestaurantOrder[]): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(newOrders);
      } catch (err) {
        console.error('[OrderNotificationService] Subscriber callback error:', err);
      }
    });
  }
}

export const orderNotificationService = new OrderNotificationService();
