import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/**
 * Firebase is configured purely from Vite env variables (see frontend/.env).
 * Nothing is hard-coded. If the variables are missing, the app falls back to
 * clearly-labelled Sample Data Mode so the UI can still be explored.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  // Offline persistence (IndexedDB) shared across tabs → snappy reloads & offline edits.
  // Uses the "(default)" database unless VITE_FIREBASE_DATABASE_ID names another one.
  const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID?.trim() || '(default)';
  db = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    },
    databaseId,
  );
}

export function requireFirebase() {
  if (!app || !auth || !db) throw new Error('Firebase is not configured. Add your keys to frontend/.env.');
  return { app, auth, db };
}
