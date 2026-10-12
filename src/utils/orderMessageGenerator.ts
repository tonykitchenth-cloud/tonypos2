import { CartItem, CustomerProfile, Language, StoreSettings } from '../types';

export interface GenerateOrderMessageParams {
  settings?: StoreSettings;
  customer: CustomerProfile;
  items: CartItem[];
  subtotal?: number;
  total?: number;
  lang: Language;
}

/**
 * Generates clean, price-free order message for LINE and WhatsApp handoff.
 *
 * Format:
 * [Customer Name]
 * [Address]
 * [Phone Number]
 *
 * ========================
 *
 * [Order Type]
 *
 * * [Food Name] [Quantity]
 *   + [Option]
 *   + [Option]
 */
export function generateOrderMessage({
  customer,
  items,
  lang,
}: GenerateOrderMessageParams): string {
  const isEn = lang === 'en';

  // 1. Customer Information Lines
  const customerLines: string[] = [];
  if (customer.name && customer.name.trim()) {
    customerLines.push(customer.name.trim());
  }
  if (customer.deliveryAddress && customer.deliveryAddress.trim()) {
    customerLines.push(customer.deliveryAddress.trim());
  }
  if (customer.phone && customer.phone.trim()) {
    customerLines.push(customer.phone.trim());
  }
  const customerInfoBlock = customerLines.join('\n');

  // 2. Order Type (Strictly translated per language)
  let orderTypeStr: string;
  if (customer.orderType === 'delivery') {
    orderTypeStr = isEn ? 'Delivery' : 'จัดส่ง';
  } else {
    orderTypeStr = isEn ? 'Pickup' : 'รับเองที่ร้าน';
  }

  // 3. Formatted Items with pure Options & Special Requests (No prices, No group headers)
  const itemsBlock = items
    .map(item => {
      const foodName = (isEn ? item.menuItemName.en : item.menuItemName.th)
        || item.menuItemName[lang]
        || item.menuItemName.en
        || item.menuItemName.th;

      const itemLine = `* ${foodName} ${item.quantity}`;
      const optionLines: string[] = [];

      // Add selected modifier options
      if (Array.isArray(item.selectedModifiers) && item.selectedModifiers.length > 0) {
        for (const mod of item.selectedModifiers) {
          const optName = (isEn ? mod.optionName.en : mod.optionName.th)
            || mod.optionName[lang]
            || mod.optionName.en
            || mod.optionName.th;
          if (optName && optName.trim()) {
            optionLines.push(`  + ${optName.trim()}`);
          }
        }
      }

      // Add item-level special request if provided
      if (item.specialRequest && item.specialRequest.trim()) {
        optionLines.push(`  + ${item.specialRequest.trim()}`);
      }

      if (optionLines.length > 0) {
        return `${itemLine}\n${optionLines.join('\n')}`;
      }

      return itemLine;
    })
    .join('\n\n');

  return `${customerInfoBlock}\n\n========================\n\n${orderTypeStr}\n\n${itemsBlock}`;
}

/**
 * Builds the WhatsApp click-to-chat URL with prefilled text.
 * Properly encodes URL characters including '+' and Unicode Thai characters.
 */
export function buildWhatsAppUrl(intlNumber: string, message: string): string {
  const cleanNumber = intlNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

/**
 * Builds the LINE contact URL
 */
export function buildLineUrl(lineId: string): string {
  const cleanId = lineId.replace(/[@~]/g, '');
  return `https://line.me/ti/p/~${cleanId}`;
}
