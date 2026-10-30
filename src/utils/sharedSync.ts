import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
} from 'firebase/firestore';
import { db, RESTAURANT_DOC_ID } from './firebase';
import { AppStateData } from '../types';
import { defaultAppState } from './storage';
import { cleanExpiredHolidays } from './availabilityEngine';
import { defaultSettings } from '../data/defaultSettings';
import { demoCategories, demoMenuItems, demoModifierGroups } from '../data/demoData';

export const RESTAURANT_COLLECTION = 'restaurants';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore on startup
 */
export async function testConnection(): Promise<boolean> {
  if (!db) return false;
  const path = `${RESTAURANT_COLLECTION}/${RESTAURANT_DOC_ID}`;
  try {
    const docRef = doc(db, RESTAURANT_COLLECTION, RESTAURANT_DOC_ID);
    await getDocFromServer(docRef);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is currently in offline mode. Falling back to cache/local state.');
    } else {
      console.info('Initial Firestore handshake notice (will connect via snapshot listener):', error);
    }
    return false;
  }
}

/**
 * Validates and sanitizes restaurant data loaded from Firestore or fallback
 */
export function sanitizeAppState(data: any): AppStateData {
  if (!data || typeof data !== 'object') {
    return defaultAppState;
  }

  const rawHolidays = Array.isArray(data.settings?.specialHolidays)
    ? data.settings.specialHolidays
    : defaultSettings.specialHolidays || [];

  const cleanedHolidays = cleanExpiredHolidays(rawHolidays);

  const rawLogo = data.settings?.logoUrl;
  const isOldLogo = !rawLogo || (typeof rawLogo === 'string' && rawLogo.includes('images.unsplash.com/photo-1555396273-367ea4eb4db5'));
  const resolvedLogo = isOldLogo ? defaultSettings.logoUrl : rawLogo;

  return {
    version: data.version || 1,
    settings: {
      ...defaultSettings,
      ...(data.settings || {}),
      logoUrl: resolvedLogo,
      specialHolidays: cleanedHolidays,
      emergencyClose: {
        ...defaultSettings.emergencyClose,
        ...(data.settings?.emergencyClose || {}),
      },
      channels: {
        ...defaultSettings.channels,
        ...(data.settings?.channels || {}),
      },
    },
    categories: Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories
      : demoCategories,
    menuItems: Array.isArray(data.menuItems) && data.menuItems.length > 0
      ? data.menuItems
      : demoMenuItems,
    modifierGroups: Array.isArray(data.modifierGroups) && data.modifierGroups.length > 0
      ? data.modifierGroups
      : demoModifierGroups,
  };
}

/**
 * Loads shared restaurant state from Firestore.
 * If the document does not exist yet, initializes it with existing default/demo state.
 */
export async function getSharedRestaurantState(): Promise<AppStateData> {
  if (!db) return defaultAppState;
  const path = `${RESTAURANT_COLLECTION}/${RESTAURANT_DOC_ID}`;
  try {
    const docRef = doc(db, RESTAURANT_COLLECTION, RESTAURANT_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return sanitizeAppState(data);
    } else {
      // First-time boot: seed Firestore with initial default data
      await setDoc(docRef, {
        ...defaultAppState,
        restaurantId: RESTAURANT_DOC_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return defaultAppState;
    }
  } catch (error) {
    console.warn('Could not fetch from Firestore, using offline fallback:', error);
    return defaultAppState;
  }
}

/**
 * Updates shared restaurant state on Firestore (real-time sync to all devices).
 */
export async function updateSharedRestaurantState(state: AppStateData): Promise<void> {
  if (!db) return;
  const path = `${RESTAURANT_COLLECTION}/${RESTAURANT_DOC_ID}`;
  try {
    const docRef = doc(db, RESTAURANT_COLLECTION, RESTAURANT_DOC_ID);
    await setDoc(docRef, {
      ...state,
      restaurantId: RESTAURANT_DOC_ID,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to real-time updates from Cloud Firestore.
 * Fires whenever the Owner adds, edits, or deletes dishes, categories, modifiers, or updates availability.
 */
export function subscribeToSharedRestaurantState(
  onUpdate: (state: AppStateData) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) return () => {};
  const path = `${RESTAURANT_COLLECTION}/${RESTAURANT_DOC_ID}`;
  try {
    const docRef = doc(db, RESTAURANT_COLLECTION, RESTAURANT_DOC_ID);
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const clean = sanitizeAppState(data);
          onUpdate(clean);
        } else {
          // Initialize if missing
          setDoc(docRef, {
            ...defaultAppState,
            restaurantId: RESTAURANT_DOC_ID,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((e) => console.error('Failed auto-init Firestore:', e));
        }
      },
      (err) => {
        console.warn('Firestore subscription notice:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.warn('Failed to establish Firestore real-time listener:', error);
    return () => {};
  }
}
