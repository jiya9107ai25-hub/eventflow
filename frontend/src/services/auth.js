import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile } from 'firebase/auth';
import { requireFirebase } from './firebase';

/* ---------------- Firebase Authentication ---------------- */

const FIREBASE_ERRORS = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account exists with this email.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection.',
};

function friendly(e) {
  const code = e?.code ?? '';
  return new Error(FIREBASE_ERRORS[code] ?? (e instanceof Error ? e.message : 'Something went wrong.'));
}

export function createFirebaseAuth() {
  const { auth } = requireFirebase();
  const map = (u) => ({
    uid: u.uid,
    email: u.email ?? '',
    displayName: u.displayName || (u.email ?? 'Organizer').split('@')[0],
  });
  return {
    mode: 'firebase',
    // Firebase persists sessions in IndexedDB by default (browserLocalPersistence).
    onChange: (cb) => onAuthStateChanged(auth, (u) => cb(u ? map(u) : null)),
    async signIn(email, password) {
      try {
        return map((await signInWithEmailAndPassword(auth, email, password)).user);
      } catch (e) {
        throw friendly(e);
      }
    },
    async signUp(name, email, password) {
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        return { ...map(user), displayName: name };
      } catch (e) {
        throw friendly(e);
      }
    },
    signOut: () => fbSignOut(auth),
    getIdToken: async () => (auth.currentUser ? auth.currentUser.getIdToken() : null),
  };
}

/* ---------------- Sample-mode auth (no Firebase project) ---------------- */

const USERS_KEY = 'eventflow-sample-users';
const SESSION_KEY = 'eventflow-sample-session';
export const DEMO_EMAIL = 'demo@eventflow.app';
export const DEMO_PASSWORD = 'Demo1234';

async function hash(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`eventflow:${text}`));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(text);
}
const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}');
  } catch {
    return {};
  }
};

export function createSampleAuth() {
  const subs = new Set();
  const current = () => {
    const id = localStorage.getItem(SESSION_KEY);
    const u = Object.values(readUsers()).find((x) => x.uid === id);
    return u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
  };
  const notify = () => subs.forEach((cb) => cb(current()));
  const delay = () => new Promise((r) => setTimeout(r, 450));

  return {
    mode: 'sample',
    onChange(cb) {
      subs.add(cb);
      setTimeout(() => cb(current()), 120);
      return () => subs.delete(cb);
    },
    async signIn(email, password) {
      await delay();
      const users = readUsers();
      const key = email.trim().toLowerCase();
      if (key === DEMO_EMAIL && !users[key]) {
        users[key] = { uid: 'demo-user', email: DEMO_EMAIL, displayName: 'Demo Organizer', pw: await hash(DEMO_PASSWORD) };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      const u = users[key];
      if (!u || u.pw !== (await hash(password))) throw new Error('Incorrect email or password.');
      localStorage.setItem(SESSION_KEY, u.uid);
      notify();
      return { uid: u.uid, email: u.email, displayName: u.displayName };
    },
    async signUp(name, email, password) {
      await delay();
      const users = readUsers();
      const key = email.trim().toLowerCase();
      if (users[key]) throw new Error('An account with this email already exists.');
      const user = { uid: `u-${Date.now().toString(36)}`, email: key, displayName: name, pw: await hash(password) };
      users[key] = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(SESSION_KEY, user.uid);
      notify();
      return { uid: user.uid, email: user.email, displayName: name };
    },
    getIdToken: async () => null,
    async signOut() {
      localStorage.removeItem(SESSION_KEY);
      notify();
    },
  };
}
