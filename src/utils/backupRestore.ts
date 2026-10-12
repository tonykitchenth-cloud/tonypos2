import {
  AppStateData,
  StoreSettings,
  Category,
  MenuItem,
  ModifierGroup,
  RestaurantOrder,
  AppBackupPayload,
  BackupMetadata,
  BackupValidationResult,
  Language,
} from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { cleanExpiredHolidays } from './availabilityEngine';

export const CURRENT_BACKUP_VERSION = 1;
export const APP_IDENTIFIER = "Tony's Kitchen";
export const BACKUP_SCHEMA_VERSION = 1;

/**
 * Creates a clean, safe, and structured JSON backup of the restaurant application data.
 * Zero-cost, 100% client-side compatible (no Firebase Storage or paid cloud required).
 */
export function createAppBackup(
  state: AppStateData,
  ordersArchive?: RestaurantOrder[]
): { jsonString: string; payload: AppBackupPayload } {
  const nowIso = new Date().toISOString();

  // Defensive clean-up of special holidays before backup
  const cleanedHolidays = cleanExpiredHolidays(state.settings?.specialHolidays || []);

  const cleanSettings: StoreSettings = {
    ...defaultSettings,
    ...(state.settings || {}),
    specialHolidays: cleanedHolidays,
    emergencyClose: {
      ...defaultSettings.emergencyClose,
      ...(state.settings?.emergencyClose || {}),
    },
    channels: {
      ...defaultSettings.channels,
      ...(state.settings?.channels || {}),
    },
  };

  const cleanCategories: Category[] = Array.isArray(state.categories)
    ? state.categories.map((c) => ({
        id: String(c.id || ''),
        name: {
          en: String(c.name?.en || ''),
          th: String(c.name?.th || ''),
        },
        displayOrder: Number(c.displayOrder) || 0,
        visible: Boolean(c.visible !== false),
      }))
    : [];

  const cleanMenuItems: MenuItem[] = Array.isArray(state.menuItems)
    ? state.menuItems.map((m) => ({
        id: String(m.id || ''),
        categoryId: String(m.categoryId || ''),
        name: {
          en: String(m.name?.en || ''),
          th: String(m.name?.th || ''),
        },
        description: {
          en: String(m.description?.en || ''),
          th: String(m.description?.th || ''),
        },
        imageUrl: String(m.imageUrl || ''),
        basePrice: typeof m.basePrice === 'number' ? m.basePrice : Number(m.basePrice) || 0,
        availability: m.availability || 'available',
        outUntilDate: m.outUntilDate ? String(m.outUntilDate) : undefined,
        isSignature: Boolean(m.isSignature),
        isPopular: Boolean(m.isPopular),
        displayOrder: Number(m.displayOrder) || 0,
        modifierGroupIds: Array.isArray(m.modifierGroupIds) ? m.modifierGroupIds.map(String) : [],
      }))
    : [];

  const cleanModifierGroups: ModifierGroup[] = Array.isArray(state.modifierGroups)
    ? state.modifierGroups.map((g) => ({
        id: String(g.id || ''),
        name: {
          en: String(g.name?.en || ''),
          th: String(g.name?.th || ''),
        },
        required: Boolean(g.required),
        minSelections: Number(g.minSelections) || 0,
        maxSelections: Number(g.maxSelections) || 1,
        displayOrder: Number(g.displayOrder) || 0,
        enabled: Boolean(g.enabled !== false),
        options: Array.isArray(g.options)
          ? g.options.map((opt) => ({
              id: String(opt.id || ''),
              name: {
                en: String(opt.name?.en || ''),
                th: String(opt.name?.th || ''),
              },
              priceAdjustment: Number(opt.priceAdjustment) || 0,
              availability: opt.availability || 'available',
              outUntilDate: opt.outUntilDate ? String(opt.outUntilDate) : undefined,
              displayOrder: Number(opt.displayOrder) || 0,
            }))
          : [],
      }))
    : [];

  // Safe read-only snapshot of orders for audit record (stripped of non-serializables)
  const safeOrdersArchive: RestaurantOrder[] = Array.isArray(ordersArchive)
    ? ordersArchive.map((o) => ({
        id: String(o.id || ''),
        orderNumber: Number(o.orderNumber) || 0,
        orderNumberFormatted: String(o.orderNumberFormatted || `#${o.orderNumber || ''}`),
        source: o.source || 'in_app',
        status: o.status || 'completed',
        orderType: o.orderType || 'pickup',
        paymentMethod: o.paymentMethod || 'cash',
        paymentStatus: o.paymentStatus || 'pending',
        customer: {
          name: String(o.customer?.name || ''),
          phone: String(o.customer?.phone || ''),
          deliveryAddress: o.customer?.deliveryAddress ? String(o.customer.deliveryAddress) : '',
          notes: o.customer?.notes ? String(o.customer.notes) : '',
        },
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal) || 0,
        total: Number(o.total) || 0,
        currencySymbol: String(o.currencySymbol || '฿'),
        createdAt: String(o.createdAt || nowIso),
        acceptedAt: o.acceptedAt ? String(o.acceptedAt) : undefined,
        onTheWayAt: o.onTheWayAt ? String(o.onTheWayAt) : undefined,
        completedAt: o.completedAt ? String(o.completedAt) : undefined,
        cancelledAt: o.cancelledAt ? String(o.cancelledAt) : undefined,
        cancelReason: o.cancelReason ? String(o.cancelReason) : undefined,
      }))
    : [];

  const metadata: BackupMetadata = {
    app: APP_IDENTIFIER,
    backupVersion: CURRENT_BACKUP_VERSION,
    createdAt: nowIso,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    sections: [
      'settings',
      'categories',
      'menuItems',
      'modifierGroups',
      'storeHours',
      'specialHolidays',
      'metadata',
    ],
    metrics: {
      menuItemsCount: cleanMenuItems.length,
      categoriesCount: cleanCategories.length,
      modifierGroupsCount: cleanModifierGroups.length,
      holidaysCount: cleanSettings.specialHolidays.length,
      ordersCount: safeOrdersArchive.length,
    },
  };

  const payload: AppBackupPayload = {
    app: APP_IDENTIFIER,
    backupVersion: CURRENT_BACKUP_VERSION,
    createdAt: nowIso,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    metadata,
    data: {
      settings: cleanSettings,
      categories: cleanCategories,
      menuItems: cleanMenuItems,
      modifierGroups: cleanModifierGroups,
      ordersArchive: safeOrdersArchive,
    },
  };

  // Test serialization and verification round-trip
  const jsonString = JSON.stringify(payload, null, 2);
  try {
    JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Backup serialization safety check failed: corrupted output generated.');
  }

  return { jsonString, payload };
}

/**
 * Validates a backup JSON string or parsed object before committing any state change.
 * Prevents partial state writes and ensures atomic safety.
 */
export function validateBackupPayload(rawInput: unknown, lang: Language = 'en'): BackupValidationResult {
  if (!rawInput) {
    return {
      isValid: false,
      error: lang === 'th' ? 'ไฟล์สำรองข้อมูลว่างเปล่า' : 'Backup data is empty.',
    };
  }

  let parsed: any = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return {
        isValid: false,
        error: lang === 'th' ? 'รูปแบบ JSON ไม่ถูกต้อง' : 'Invalid JSON format or syntax error.',
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      error: lang === 'th' ? 'โครงสร้างไฟล์สำรองข้อมูลไม่ถูกต้อง' : 'Invalid backup data structure.',
    };
  }

  // 1. Version validation
  const version = parsed.backupVersion !== undefined ? parsed.backupVersion : parsed.version;
  if (version !== undefined && version !== CURRENT_BACKUP_VERSION) {
    return {
      isValid: false,
      error:
        lang === 'th'
          ? `เวอร์ชันของไฟล์สำรอง (v${version}) ไม่รองรับในแอปเวอร์ชันนี้`
          : `This backup version (v${version}) is not supported by this app version.`,
    };
  }

  // 2. App identifier validation (if provided)
  const appIdentifier = (parsed.app || parsed.metadata?.app || '').trim().toLowerCase();
  if (appIdentifier && !appIdentifier.includes('tony') && !appIdentifier.includes('kitchen')) {
    return {
      isValid: false,
      error:
        lang === 'th'
          ? "ไฟล์สำรองนี้ไม่ใช่ของร้าน Tony's Kitchen"
          : "This backup file does not belong to Tony's Kitchen.",
    };
  }

  // 3. Extract core data block (support both versioned { data: { ... } } and legacy direct { settings, categories... })
  const sourceData = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

  // Validate settings
  if (!sourceData.settings || typeof sourceData.settings !== 'object') {
    return {
      isValid: false,
      error:
        lang === 'th'
          ? 'ข้อมูลการตั้งค่าร้านค้า (settings) ขาดหายไปหรือไม่ถูกต้อง'
          : 'Missing or malformed store settings in backup.',
    };
  }

  // Validate categories
  if (!Array.isArray(sourceData.categories) || sourceData.categories.length === 0) {
    return {
      isValid: false,
      error:
        lang === 'th'
          ? 'ข้อมูลหมวดหมู่อาหาร (categories) ขาดหายไปหรือไม่ถูกต้อง'
          : 'Missing or empty categories list in backup.',
    };
  }

  // Validate menu items
  if (!Array.isArray(sourceData.menuItems) || sourceData.menuItems.length === 0) {
    return {
      isValid: false,
      error:
        lang === 'th'
          ? 'ข้อมูลรายการอาหาร (menuItems) ขาดหายไปหรือไม่ถูกต้อง'
          : 'Missing or empty menu items list in backup.',
    };
  }

  // Validate modifier groups
  if (!Array.isArray(sourceData.modifierGroups)) {
    return {
      isValid: false,
      error:
        lang === 'th'
          ? 'ข้อมูลตัวเลือกเพิ่มเติม (modifierGroups) ไม่ถูกต้อง'
          : 'Malformed modifier groups in backup.',
    };
  }

  // Construct sanitized state object
  const cleanedHolidays = cleanExpiredHolidays(sourceData.settings.specialHolidays || []);

  const sanitizedState: AppStateData = {
    version: CURRENT_BACKUP_VERSION,
    settings: {
      ...defaultSettings,
      ...sourceData.settings,
      specialHolidays: cleanedHolidays,
      emergencyClose: {
        ...defaultSettings.emergencyClose,
        ...(sourceData.settings.emergencyClose || {}),
      },
      channels: {
        ...defaultSettings.channels,
        ...(sourceData.settings.channels || {}),
      },
    },
    categories: sourceData.categories,
    menuItems: sourceData.menuItems,
    modifierGroups: sourceData.modifierGroups,
  };

  const metadata: BackupMetadata = parsed.metadata || {
    app: APP_IDENTIFIER,
    backupVersion: CURRENT_BACKUP_VERSION,
    createdAt: parsed.createdAt || new Date().toISOString(),
    schemaVersion: BACKUP_SCHEMA_VERSION,
    sections: ['settings', 'categories', 'menuItems', 'modifierGroups'],
    metrics: {
      menuItemsCount: sanitizedState.menuItems.length,
      categoriesCount: sanitizedState.categories.length,
      modifierGroupsCount: sanitizedState.modifierGroups.length,
      holidaysCount: sanitizedState.settings.specialHolidays.length,
      ordersCount: Array.isArray(sourceData.ordersArchive) ? sourceData.ordersArchive.length : 0,
    },
  };

  return {
    isValid: true,
    state: sanitizedState,
    metadata,
    ordersArchive: Array.isArray(sourceData.ordersArchive) ? sourceData.ordersArchive : undefined,
  };
}

/**
 * Helper to download backup file to local machine with clean naming.
 */
export function downloadBackupFile(jsonString: string, appName = 'tonys_kitchen'): void {
  if (typeof window === 'undefined') return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appName}_backup_v${CURRENT_BACKUP_VERSION}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
