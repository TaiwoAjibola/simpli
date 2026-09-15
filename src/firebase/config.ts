import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('Firebase API key is missing. Check your environment variables.');
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Firestore persistence: persistentLocalCache with single-tab manager.
// Previous config used `tabSettings: { cacheSizeBytes }` (wrong shape for
// v12) and no tabManager, which threw "Failed to obtain exclusive access
// to the persistence layer" when a second tab was opened. Fix: use
// correct `cacheSizeBytes` at top level + `persistentSingleTabManager`
// with `forceOwningTab: false` so the SDK gracefully falls back to memory
// cache in a second tab instead of throwing failed-precondition. QUIC
// errors below are transient network retries (WebChannel reconnects
// automatically via long-polling) and are not caused by persistence.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwningTab: false }),
    cacheSizeBytes: 104857600,
  }),
});
export const functions = getFunctions(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
