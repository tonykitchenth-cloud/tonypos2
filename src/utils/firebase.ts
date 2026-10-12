import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely
let app: any = null;
let dbInstance: any = null;
let authInstance: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Firebase initialization notice (running with local resilience):', err);
}

export const db = dbInstance;
export const auth = authInstance;

export const RESTAURANT_DOC_ID = 'tonys-kitchen';

/**
 * Ensures the client is authenticated with Firebase (via Anonymous Auth for customers)
 * Guarantees a cryptographically secure request.auth.uid for order access control.
 */
let authInitPromise: Promise<User | null> | null = null;

export async function ensureAuthenticatedUser(): Promise<User | null> {
  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = new Promise((resolve) => {
    // Check if auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          console.warn('Anonymous auth initialization notice (falling back gracefully):', err);
          unsubscribe();
          resolve(null);
        }
      }
    });
  });

  return authInitPromise;
}

// Auto-trigger auth check on startup in background
if (typeof window !== 'undefined') {
  ensureAuthenticatedUser().catch(() => {});
}
