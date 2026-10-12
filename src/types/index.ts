export type Language = 'en' | 'th';

export type AvailabilityStatus = 
  | 'available' 
  | 'out_today' 
  | 'out_until_date' 
  | 'out_indefinitely' 
  | 'hidden';

export interface ModifierOption {
  id: string;
  name: {
    en: string;
    th: string;
  };
  priceAdjustment: number; // e.g. 0, 20, 40
  availability: AvailabilityStatus;
  outUntilDate?: string; // ISO date string if out_until_date
  displayOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: {
    en: string;
    th: string;
  };
  required: boolean;
  minSelections: number;
  maxSelections: number; // 1 for radio, >1 for checkboxes
  displayOrder: number;
  enabled: boolean;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: {
    en: string;
    th: string;
  };
  description: {
    en: string;
    th: string;
  };
  imageUrl: string;
  basePrice: number; // Internal base price (e.g. 120)
  availability: AvailabilityStatus;
  outUntilDate?: string; // ISO date string
  isSignature?: boolean;
  isPopular?: boolean;
  displayOrder: number;
  modifierGroupIds: string[]; // IDs of ModifierGroups attached to this dish
}

export interface Category {
  id: string;
  name: {
    en: string;
    th: string;
  };
  displayOrder: number;
  visible: boolean;
}

export interface SelectedModifier {
  groupId: string;
  groupName: {
    en: string;
    th: string;
  };
  optionId: string;
  optionName: {
    en: string;
    th: string;
  };
  priceAdjustment: number;
}

export interface CartItem {
  id: string; // Unique cart line ID (UUID / timestamp-based)
  menuItemId: string;
  menuItemName: {
    en: string;
    th: string;
  };
  imageUrl: string;
  basePrice: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  specialRequest?: string;
  unitPrice: number; // basePrice + sum of modifier adjustments
  subtotal: number;  // unitPrice * quantity
}

export type OrderType = 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'qr_payment';
export type OrderSource = 'in_app' | 'line' | 'whatsapp';
export type OrderStatus = 'pending' | 'accepted' | 'on_the_way' | 'completed' | 'cancelled';
export type NotificationSoundType = 'sound1' | 'sound2' | 'sound3';

export interface OrderItemModifier {
  groupId: string;
  groupName: {
    en: string;
    th: string;
  };
  optionId: string;
  optionName: {
    en: string;
    th: string;
  };
  priceAdjustment: number;
}

export interface OrderItemSnapshot {
  menuItemId: string;
  name: {
    en: string;
    th: string;
  };
  imageUrl?: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  selectedModifiers: OrderItemModifier[];
  specialRequest?: string;
}

export interface RestaurantOrder {
  id: string;
  orderNumber: number;
  orderNumberFormatted: string;
  source: OrderSource;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'pending' | 'paid';
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
  createdAt: string; // ISO string
  acceptedAt?: string;
  onTheWayAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  clientToken?: string;
  customerId?: string;
}

export interface CustomerProfile {
  name: string;
  phone: string;
  deliveryAddress: string;
  orderType: OrderType;
  notes?: string;
}

export interface DailySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JS Date standard)
  dayName: string;   // 'Monday', etc.
  isOpen: boolean;
  openTime: string;  // "10:00"
  closeTime: string; // "21:00"
}

export interface SpecialHoliday {
  id: string;
  name: string;
  startDate: string; // "YYYY-MM-DDTHH:mm"
  endDate: string;   // "YYYY-MM-DDTHH:mm"
  enabled: boolean;
}

export interface StoreSettings {
  restaurantName: string;
  logoUrl: string;
  phone: string;
  phoneDisplay: string;
  lineId: string;
  whatsAppNumber: string; // e.g. "+66 84 153 6498"
  whatsAppIntlNumber: string; // e.g. "66841536498" (digits only for wa.me)
  emergencyClose: {
    enabled: boolean;
    reasonEn: string;
    reasonTh: string;
  };
  schedule: DailySchedule[];
  specialHolidays: SpecialHoliday[];
  channels: {
    whatsApp: boolean;
    line: boolean;
    pickup: boolean;
    delivery: boolean;
  };
  timezone: string; // "Asia/Bangkok"
  currencySymbol: string; // "฿"
  currencyCode: string; // "THB"
  ownerPasscodeHash: string; // simple hash/pin for Phase 1 local auth
  notificationSound?: NotificationSoundType;
  taglineEn?: string;
  taglineTh?: string;
  address?: string;
  defaultLanguage?: Language;
}

export interface StoreAvailabilityResult {
  isOpen: boolean;
  reasonEn: string;
  reasonTh: string;
  closedType?: 'emergency' | 'holiday' | 'weekly' | 'hours';
  nextOpenFormatted?: {
    en: string;
    th: string;
  };
}

export interface AppStateData {
  version: number;
  settings: StoreSettings;
  categories: Category[];
  menuItems: MenuItem[];
  modifierGroups: ModifierGroup[];
}

export interface BackupMetadata {
  app: string;
  backupVersion: number;
  createdAt: string;
  schemaVersion: number;
  sections: string[];
  metrics: {
    menuItemsCount: number;
    categoriesCount: number;
    modifierGroupsCount: number;
    ordersCount?: number;
    holidaysCount?: number;
  };
}

export interface AppBackupPayload {
  app: string;
  backupVersion: number;
  createdAt: string;
  schemaVersion: number;
  metadata: BackupMetadata;
  data: {
    settings: StoreSettings;
    categories: Category[];
    menuItems: MenuItem[];
    modifierGroups: ModifierGroup[];
    ordersArchive?: RestaurantOrder[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  state?: AppStateData;
  metadata?: BackupMetadata;
  ordersArchive?: RestaurantOrder[];
}
