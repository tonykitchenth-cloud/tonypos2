import { CartItem, SelectedModifier } from '../types';

/**
 * Calculates the unit price for a menu item given its base price and selected modifiers.
 */
export function calculateItemUnitPrice(basePrice: number, selectedModifiers: SelectedModifier[]): number {
  const modifiersTotal = selectedModifiers.reduce((sum, mod) => sum + (mod.priceAdjustment || 0), 0);
  return Math.max(0, basePrice + modifiersTotal);
}

/**
 * Calculates line subtotal.
 */
export function calculateLineSubtotal(unitPrice: number, quantity: number): number {
  return unitPrice * Math.max(1, quantity);
}

/**
 * Computes overall cart totals.
 */
export function calculateCartTotals(items: CartItem[]) {
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = subtotal; // Delivery/tax can be added if needed in future
  return {
    totalQuantity,
    subtotal,
    total,
  };
}

/**
 * Formats a currency number (e.g. ฿120 or ฿120.00 if decimal)
 */
export function formatCurrency(amount: number, symbol: string = '฿'): string {
  if (isNaN(amount)) return `${symbol}0`;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
