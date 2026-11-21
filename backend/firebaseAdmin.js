import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

/**
 * Firebase Admin — used to verify Firebase login tokens sent by the frontend.
 * Put the key file from Firebase Console → Project settings → Service accounts →
 * "Generate new private key" next to this file as `serviceAccountKey.json`.
 * (Never commit it — it's in .gitignore.)
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE = path.join(here, 'serviceAccountKey.json');

let app = null;
let tried = false;

export function getAdmin() {
  if (app || tried) return app;
  tried = true;
  try {
    let creds = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); // for hosting (Render etc.)
    else if (fs.existsSync(KEY_FILE)) creds = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    if (!creds) return null;
    app = admin.initializeApp({ credential: admin.credential.cert(creds) });
  } catch (err) {
    console.error('[firebase-admin] could not initialise:', err.message);
    app = null;
  }
  return app;
}

export async function verifyIdToken(idToken) {
  if (!getAdmin()) throw new Error('Firebase Admin is not configured');
  return admin.auth().verifyIdToken(idToken);
}
