import { isFirebaseConfigured } from './firebase';
import { createFirestoreBackend } from './firestoreBackend';
import { createSampleBackend } from './sampleBackend';
import { createFirebaseAuth, createSampleAuth } from './auth';

/** Chosen once at startup: real Firebase when configured, otherwise Sample Data Mode. */
export const backend = isFirebaseConfigured ? createFirestoreBackend() : createSampleBackend();
export const authBackend = isFirebaseConfigured ? createFirebaseAuth() : createSampleAuth();
export const dataMode = backend.mode;

export * from './types';
