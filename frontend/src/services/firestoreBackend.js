import {
  addDoc,
  arrayRemove,
  arrayUnion,
  deleteField,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { requireFirebase } from './firebase';
import { AllocationError } from './types';
import { DIRECTORY_FIELDS, WrongPasswordError, directoryEntry } from './directory';

const SUB_KEYS = ['rooms', 'speakers', 'sessions', 'tasks', 'resources', 'allocations', 'attendees', 'team', 'messages', 'notifications', 'viewers'];

/** Turn Firestore errors into messages a person can act on. */
const toError = (e) => {
  const msg = String(e?.message ?? e);
  if (/database .*does not exist/i.test(msg)) {
    return new Error(
      'Your Firestore database has not been created yet. Open Firebase Console → Firestore Database → Create database (keep the ID "(default)").',
    );
  }
  if (/permission-denied|insufficient permissions/i.test(msg)) {
    return new Error('Firestore blocked this (missing or insufficient permissions). Publish frontend/firestore.rules in Firebase Console → Firestore → Rules.');
  }
  return e instanceof Error ? e : new Error(msg);
};

/**
 * Firestore saves to this device instantly, but the promise only resolves once
 * Google's servers confirm. If the connection is slow or blocked, waiting would
 * leave buttons spinning forever. So: wait up to 5s; after that carry on (the
 * write is already saved locally and syncs when it can) and tell the UI.
 * Real errors (e.g. permission denied) are still thrown or reported.
 */
async function confirmed(write) {
  let timer;
  const slow = new Promise((resolve) => {
    timer = setTimeout(() => resolve('slow'), 5000);
  });
  const result = await Promise.race([write.then(() => 'ok'), slow])
    .catch((e) => {
      throw toError(e);
    })
    .finally(() => clearTimeout(timer));
  if (result === 'slow') {
    window.dispatchEvent(new CustomEvent('eventflow:sync', { detail: { status: 'slow' } }));
    write.then(
      () => window.dispatchEvent(new CustomEvent('eventflow:sync', { detail: { status: 'synced' } })),
      (e) => window.dispatchEvent(new CustomEvent('eventflow:sync', { detail: { status: 'error', message: toError(e).message } })),
    );
  }
}

/** Strip `undefined` (Firestore rejects it) and the id field before writing. */
function clean(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined && k !== 'id') out[k] = v;
  return out;
}

export function createFirestoreBackend() {
  const { db } = requireFirebase();
  const sub = (eventId, key) => collection(db, 'events', eventId, key);

  return {
    mode: 'firebase',

    async saveProfile(profile) {
      await confirmed(setDoc(doc(db, 'users', profile.uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true }));
    },

    subscribeEvents(uid, cb, onError) {
      const q = query(collection(db, 'events'), where('memberIds', 'array-contains', uid));
      return onSnapshot(
        q,
        (snap) => {
          const events = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          events.sort((a, b) => a.startDate.localeCompare(b.startDate));
          cb(events);
        },
        (e) => onError?.(toError(e)),
      );
    },

    subscribeEvent(eventId, cb, onError) {
      return onSnapshot(
        doc(db, 'events', eventId),
        (snap) => cb(snap.exists() ? { ...snap.data(), id: snap.id } : null),
        (e) => onError?.(toError(e)),
      );
    },

    async createEvent(uid, input, profile) {
      const now = Date.now();
      const members = profile ? { [uid]: { name: profile.name, email: profile.email.toLowerCase(), joinedAt: now } } : {};
      const ref = doc(collection(db, 'events'));
      const data = clean({ ...input, ownerId: uid, memberIds: [uid], members, invites: [], createdAt: now, updatedAt: now });
      await confirmed(setDoc(ref, data));
      // List it in "All events" (title, dates and venue only).
      await confirmed(setDoc(doc(db, 'eventDirectory', ref.id), { ...directoryEntry({ ...data, id: ref.id }), hasPassword: false }));
      return ref.id;
    },

    subscribeInvites(email, cb) {
      const q = query(collection(db, 'events'), where('invites', 'array-contains', email.toLowerCase()));
      return onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        () => cb([]),
      );
    },

    async inviteOrganizer(eventId, email) {
      await confirmed(updateDoc(doc(db, 'events', eventId), { invites: arrayUnion(email.trim().toLowerCase()), updatedAt: Date.now() }));
    },

    async revokeInvite(eventId, email) {
      await confirmed(updateDoc(doc(db, 'events', eventId), { invites: arrayRemove(email.toLowerCase()), updatedAt: Date.now() }));
    },

    async acceptInvite(eventId, user) {
      await confirmed(
        updateDoc(doc(db, 'events', eventId), {
          memberIds: arrayUnion(user.uid),
          invites: arrayRemove(user.email.toLowerCase()),
          [`members.${user.uid}`]: { name: user.name, email: user.email.toLowerCase(), joinedAt: Date.now() },
          updatedAt: Date.now(),
        }),
      );
    },

    async removeMember(eventId, uid) {
      await confirmed(updateDoc(doc(db, 'events', eventId), { memberIds: arrayRemove(uid), [`members.${uid}`]: deleteField(), updatedAt: Date.now() }));
    },

    async transferOwnership(eventId, newOwnerId) {
      await confirmed(updateDoc(doc(db, 'events', eventId), { ownerId: newOwnerId, updatedAt: Date.now() }));
    },

    async upsertMemberInfo(eventId, uid, info) {
      await confirmed(updateDoc(doc(db, 'events', eventId), { [`members.${uid}`]: info }));
    },

    async updateEvent(eventId, patch) {
      await confirmed(updateDoc(doc(db, 'events', eventId), clean({ ...patch, updatedAt: Date.now() })));
      const pub = Object.fromEntries(Object.entries(patch).filter(([k]) => DIRECTORY_FIELDS.includes(k)));
      if (Object.keys(pub).length) await confirmed(setDoc(doc(db, 'eventDirectory', eventId), { ...clean(pub), updatedAt: Date.now() }, { merge: true }));
    },

    /* ---------------- Role-based access: directory + event password ---------------- */

    /** Make sure an event (e.g. one created before this feature) is listed in "All events". */
    async syncDirectory(event) {
      await confirmed(setDoc(doc(db, 'eventDirectory', event.id), directoryEntry(event), { merge: true }));
    },

    subscribeDirectory(cb, onError) {
      return onSnapshot(
        collection(db, 'eventDirectory'),
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => a.startDate.localeCompare(b.startDate))),
        (e) => onError?.(toError(e)),
      );
    },

    /** Admin only: set (or clear with null) the password people need to view the event. */
    async setEventPassword(eventId, password) {
      if (password) await confirmed(setDoc(doc(db, 'eventAccess', eventId), { password, updatedAt: Date.now() }));
      else await confirmed(deleteDoc(doc(db, 'eventAccess', eventId)));
      await confirmed(setDoc(doc(db, 'eventDirectory', eventId), { hasPassword: !!password, updatedAt: Date.now() }, { merge: true }));
    },

    /** Admin only (Firestore rules block everyone else). */
    async getEventPassword(eventId) {
      const snap = await getDoc(doc(db, 'eventAccess', eventId));
      return snap.exists() ? snap.data().password : null;
    },

    /**
     * Join an event as a view-only member. The Firestore rules compare the password
     * in this document with the admin's password — a wrong password is rejected by the server.
     */
    async joinEvent(eventId, password, user) {
      try {
        await setDoc(doc(db, 'events', eventId, 'viewers', user.uid), {
          uid: user.uid,
          name: user.name,
          email: user.email.toLowerCase(),
          password,
          joinedAt: Date.now(),
        });
      } catch (e) {
        if (String(e?.code ?? e).includes('permission-denied')) throw new WrongPasswordError();
        throw toError(e);
      }
      await setDoc(doc(db, 'users', user.uid, 'viewing', eventId), { eventId, joinedAt: Date.now() });
    },

    async leaveViewing(eventId, uid) {
      await confirmed(deleteDoc(doc(db, 'events', eventId, 'viewers', uid)));
      await confirmed(deleteDoc(doc(db, 'users', uid, 'viewing', eventId)));
    },

    subscribeViewers(eventId, cb) {
      return onSnapshot(
        collection(db, 'events', eventId, 'viewers'),
        (snap) => cb(snap.docs.map((d) => ({ uid: d.id, name: d.data().name, email: d.data().email, joinedAt: d.data().joinedAt }))),
        () => cb([]),
      );
    },

    async removeViewer(eventId, uid) {
      await confirmed(deleteDoc(doc(db, 'events', eventId, 'viewers', uid)));
    },

    /** IDs of events this user has unlocked with a password. */
    subscribeViewing(uid, cb) {
      return onSnapshot(
        collection(db, 'users', uid, 'viewing'),
        (snap) => cb(snap.docs.map((d) => d.id)),
        () => cb([]),
      );
    },

    async deleteEvent(eventId) {
      // Firestore doesn't cascade: remove each sub-collection in batches of ≤ 500 first.
      for (const key of SUB_KEYS) {
        const snap = await getDocs(sub(eventId, key));
        for (let i = 0; i < snap.docs.length; i += 450) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
          await confirmed(batch.commit());
        }
      }
      // Directory + password first: the rules check you are the admin, which needs the event to still exist.
      await confirmed(deleteDoc(doc(db, 'eventDirectory', eventId))).catch(() => undefined);
      await confirmed(deleteDoc(doc(db, 'eventAccess', eventId))).catch(() => undefined);
      await confirmed(deleteDoc(doc(db, 'events', eventId)));
    },

    subscribeSub(eventId, key, cb, opts, onError) {
      const constraints = [];
      if (opts?.orderBy) constraints.push(orderBy(opts.orderBy));
      if (opts?.orderBy && opts.limitLast) constraints.push(limitToLast(opts.limitLast));
      return onSnapshot(
        query(sub(eventId, key), ...constraints),
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        (e) => onError?.(toError(e)),
      );
    },

    async addSub(eventId, key, data) {
      const ref = doc(sub(eventId, key));
      await confirmed(setDoc(ref, clean(data)));
      return ref.id;
    },

    async addSubBatch(eventId, key, items) {
      for (let i = 0; i < items.length; i += 450) {
        const batch = writeBatch(db);
        for (const item of items.slice(i, i + 450)) batch.set(doc(sub(eventId, key)), clean(item));
        await confirmed(batch.commit());
      }
    },

    async updateSub(eventId, key, id, patch) {
      await confirmed(updateDoc(doc(db, 'events', eventId, key, id), clean(patch)));
    },

    async removeSub(eventId, key, id) {
      await confirmed(deleteDoc(doc(db, 'events', eventId, key, id)));
    },

    /**
     * Transaction: read the resource, check capacity, then increment + record
     * the allocation atomically. If two organisers claim the last volunteer slot
     * at the same moment, Firestore retries one transaction, which then fails
     * the capacity check instead of over-allocating.
     */
    async claimResource(eventId, resourceId, assignee, quantity) {
      const resRef = doc(db, 'events', eventId, 'resources', resourceId);
      const allocRef = doc(sub(eventId, 'allocations'));
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(resRef);
        if (!snap.exists()) throw new AllocationError('This resource no longer exists.');
        const { required, allocated, name } = snap.data();
        if (allocated + quantity > required) {
          throw new AllocationError(`Only ${Math.max(0, required - allocated)} ${name} slot(s) left.`);
        }
        tx.update(resRef, { allocated: allocated + quantity });
        tx.set(allocRef, { resourceId, assignee, quantity, createdAt: Date.now() });
      });
    },

    async releaseAllocation(eventId, allocation) {
      const resRef = doc(db, 'events', eventId, 'resources', allocation.resourceId);
      const allocRef = doc(db, 'events', eventId, 'allocations', allocation.id);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(resRef);
        if (snap.exists()) {
          const allocated = snap.data().allocated;
          tx.update(resRef, { allocated: Math.max(0, allocated - allocation.quantity) });
        }
        tx.delete(allocRef);
      });
    },

    subscribeActivity(uid, cb) {
      const q = query(collection(db, 'users', uid, 'activity'), orderBy('createdAt', 'desc'), limit(25));
      return onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        () => cb([]),
      );
    },

    async logActivity(uid, entry) {
      await confirmed(addDoc(collection(db, 'users', uid, 'activity'), { ...entry, createdAt: Date.now() }));
    },
  };
}
