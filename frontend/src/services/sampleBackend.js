import { uid as makeId } from '@/lib/utils';
import { AllocationError } from './types';
import { DIRECTORY_FIELDS, WrongPasswordError, directoryEntry } from './directory';

/**
 * SAMPLE DATA MODE backend.
 * Used only when Firebase env variables are not set, so the UI can be explored
 * without a cloud project. It mirrors the Firestore backend's behaviour
 * (async writes, snapshot-style listeners, atomic allocation) on top of a
 * local store. Data written here is visibly labelled "Sample data mode" in the UI.
 * The `storage` event gives cross-tab "real-time" updates for demoing chat.
 */

const STORAGE_KEY = 'eventflow-sample-db-v1';

const empty = () => ({ users: {}, events: {}, subs: {}, activity: {}, directory: {}, access: {}, viewing: {} });

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

export function createSampleBackend(latency = 180) {
  let store = load();
  const listeners = new Set();

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      /* storage full / private mode — keep in memory */
    }
  };
  const emit = (topic) => listeners.forEach((l) => (l.topic === topic || l.topic === '*' ? l.fire() : undefined));
  const emitAll = () => listeners.forEach((l) => l.fire());
  const wait = () => new Promise((r) => setTimeout(r, latency / 3));

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        store = load();
        emitAll();
      }
    });
  }

  const listen = (topic, fire) => {
    const entry = { topic, fire };
    listeners.add(entry);
    const t = setTimeout(fire, latency); // simulate first network snapshot
    return () => {
      clearTimeout(t);
      listeners.delete(entry);
    };
  };

  const bucket = (eventId, key) => {
    const k = `${eventId}/${key}`;
    store.subs[k] ??= {};
    return store.subs[k];
  };
  const need = (eventId) => {
    const ev = store.events[eventId];
    if (!ev) throw new Error('Event not found');
    return ev;
  };
  const commit = (topic) => {
    persist();
    emit(topic);
  };

  return {
    mode: 'sample',

    async saveProfile(profile) {
      store.users[profile.uid] = profile;
      persist();
    },

    subscribeEvents(uid, cb) {
      return listen('events', () => {
        const list = Object.values(store.events).filter((e) => e.memberIds.includes(uid));
        cb(list.sort((a, b) => a.startDate.localeCompare(b.startDate)));
      });
    },

    subscribeEvent(eventId, cb) {
      return listen('events', () => cb(store.events[eventId] ? { ...store.events[eventId] } : null));
    },

    async createEvent(uid, input, profile) {
      await wait();
      const id = makeId();
      const now = Date.now();
      const members = profile ? { [uid]: { name: profile.name, email: profile.email.toLowerCase(), joinedAt: now } } : {};
      store.events[id] = { ...input, id, ownerId: uid, memberIds: [uid], members, invites: [], createdAt: now, updatedAt: now };
      store.directory[id] = { ...directoryEntry(store.events[id]), hasPassword: false };
      commit('events');
      emit('directory');
      return id;
    },

    subscribeInvites(email, cb) {
      const e = email.toLowerCase();
      return listen('events', () => cb(Object.values(store.events).filter((ev) => (ev.invites ?? []).includes(e))));
    },

    async inviteOrganizer(eventId, email) {
      await wait();
      const ev = need(eventId);
      const e = email.trim().toLowerCase();
      ev.invites = [...new Set([...(ev.invites ?? []), e])];
      ev.updatedAt = Date.now();
      commit('events');
    },

    async revokeInvite(eventId, email) {
      await wait();
      const ev = need(eventId);
      ev.invites = (ev.invites ?? []).filter((x) => x !== email.toLowerCase());
      commit('events');
    },

    async acceptInvite(eventId, user) {
      await wait();
      const ev = need(eventId);
      const e = user.email.toLowerCase();
      if (!(ev.invites ?? []).includes(e)) throw new Error('This invitation is no longer valid.');
      ev.memberIds = [...new Set([...ev.memberIds, user.uid])];
      ev.invites = (ev.invites ?? []).filter((x) => x !== e);
      ev.members = { ...ev.members, [user.uid]: { name: user.name, email: e, joinedAt: Date.now() } };
      commit('events');
    },

    async removeMember(eventId, uid) {
      await wait();
      const ev = need(eventId);
      if (ev.ownerId === uid) throw new Error('Transfer the admin role before removing the admin.');
      ev.memberIds = ev.memberIds.filter((x) => x !== uid);
      const { [uid]: _gone, ...rest } = ev.members ?? {};
      ev.members = rest;
      commit('events');
    },

    async transferOwnership(eventId, newOwnerId) {
      await wait();
      const ev = need(eventId);
      if (!ev.memberIds.includes(newOwnerId)) throw new Error('The new admin must already be an organizer of this event.');
      ev.ownerId = newOwnerId;
      commit('events');
    },

    async upsertMemberInfo(eventId, uid, info) {
      const ev = store.events[eventId];
      if (!ev) return;
      ev.members = { ...ev.members, [uid]: info };
      commit('events');
    },

    async updateEvent(eventId, patch) {
      await wait();
      const ev = store.events[eventId];
      if (!ev) throw new Error('Event not found');
      store.events[eventId] = { ...ev, ...patch, updatedAt: Date.now() };
      if (store.directory[eventId]) {
        for (const k of DIRECTORY_FIELDS) if (k in patch) store.directory[eventId][k] = patch[k];
      }
      commit('events');
      emit('directory');
    },

    /* ---------------- Role-based access: directory + event password ---------------- */

    async syncDirectory(event) {
      store.directory[event.id] = { hasPassword: !!store.access[event.id], ...store.directory[event.id], ...directoryEntry(event) };
      commit('directory');
    },

    subscribeDirectory(cb) {
      return listen('directory', () =>
        cb(
          Object.entries(store.directory)
            .map(([id, d]) => ({ ...d, id }))
            .sort((a, b) => a.startDate.localeCompare(b.startDate)),
        ),
      );
    },

    async setEventPassword(eventId, password) {
      await wait();
      if (password) store.access[eventId] = { password };
      else delete store.access[eventId];
      if (store.directory[eventId]) store.directory[eventId].hasPassword = !!password;
      commit('directory');
    },

    async getEventPassword(eventId) {
      return store.access[eventId]?.password ?? null;
    },

    async joinEvent(eventId, password, user) {
      await wait();
      const pw = store.access[eventId]?.password;
      if (!pw || pw !== password) throw new WrongPasswordError();
      bucket(eventId, 'viewers')[user.uid] = { uid: user.uid, name: user.name, email: user.email.toLowerCase(), joinedAt: Date.now() };
      (store.viewing[user.uid] ??= {})[eventId] = { joinedAt: Date.now() };
      persist();
      emit(`${eventId}/viewers`);
      emit('viewing');
    },

    async leaveViewing(eventId, uid) {
      await wait();
      delete bucket(eventId, 'viewers')[uid];
      if (store.viewing[uid]) delete store.viewing[uid][eventId];
      persist();
      emit(`${eventId}/viewers`);
      emit('viewing');
    },

    subscribeViewers(eventId, cb) {
      return listen(`${eventId}/viewers`, () => cb(Object.entries(bucket(eventId, 'viewers')).map(([uid, d]) => ({ ...d, uid }))));
    },

    async removeViewer(eventId, uid) {
      await wait();
      delete bucket(eventId, 'viewers')[uid];
      persist();
      emit(`${eventId}/viewers`);
      emit('viewing');
    },

    subscribeViewing(uid, cb) {
      // Only events whose viewer record still exists (the admin may have removed this user).
      return listen('viewing', () => cb(Object.keys(store.viewing[uid] ?? {}).filter((id) => store.events[id] && bucket(id, 'viewers')[uid])));
    },

    async deleteEvent(eventId) {
      await wait();
      delete store.events[eventId];
      delete store.directory[eventId];
      delete store.access[eventId];
      for (const k of Object.keys(store.subs)) if (k.startsWith(`${eventId}/`)) delete store.subs[k];
      persist();
      emitAll();
    },

    subscribeSub(eventId, key, cb, opts) {
      const topic = `${eventId}/${key}`;
      return listen(topic, () => {
        let items = Object.entries(bucket(eventId, key)).map(([id, d]) => ({ ...d, id }));
        if (opts?.orderBy) {
          const f = opts.orderBy;
          items.sort((a, b) => {
            const av = a[f];
            const bv = b[f];
            return av < bv ? -1 : av > bv ? 1 : 0;
          });
          if (opts.limitLast) items = items.slice(-opts.limitLast);
        }
        cb(items);
      });
    },

    async addSub(eventId, key, data) {
      await wait();
      const id = makeId();
      bucket(eventId, key)[id] = { ...data };
      commit(`${eventId}/${key}`);
      return id;
    },

    async addSubBatch(eventId, key, items) {
      await wait();
      const b = bucket(eventId, key);
      for (const item of items) b[makeId()] = { ...item };
      commit(`${eventId}/${key}`);
    },

    async updateSub(eventId, key, id, patch) {
      await wait();
      const b = bucket(eventId, key);
      if (!b[id]) throw new Error('Item not found');
      b[id] = { ...b[id], ...patch };
      commit(`${eventId}/${key}`);
    },

    async removeSub(eventId, key, id) {
      await wait();
      delete bucket(eventId, key)[id];
      commit(`${eventId}/${key}`);
    },

    async claimResource(eventId, resourceId, assignee, quantity) {
      await wait();
      // JS is single-threaded, so this read-check-write block is atomic.
      const res = bucket(eventId, 'resources')[resourceId];
      if (!res) throw new AllocationError('This resource no longer exists.');
      if (res.allocated + quantity > res.required) {
        throw new AllocationError(`Only ${Math.max(0, res.required - res.allocated)} ${res.name} slot(s) left.`);
      }
      res.allocated += quantity;
      bucket(eventId, 'allocations')[makeId()] = { resourceId, assignee, quantity, createdAt: Date.now() };
      persist();
      emit(`${eventId}/resources`);
      emit(`${eventId}/allocations`);
    },

    async releaseAllocation(eventId, allocation) {
      await wait();
      const res = bucket(eventId, 'resources')[allocation.resourceId];
      if (res) res.allocated = Math.max(0, res.allocated - allocation.quantity);
      delete bucket(eventId, 'allocations')[allocation.id];
      persist();
      emit(`${eventId}/resources`);
      emit(`${eventId}/allocations`);
    },

    subscribeActivity(uid, cb) {
      return listen('activity', () => cb([...(store.activity[uid] ?? [])].slice(0, 25)));
    },

    async logActivity(uid, entry) {
      const list = (store.activity[uid] ??= []);
      list.unshift({ ...entry, id: makeId(), createdAt: Date.now() });
      store.activity[uid] = list.slice(0, 60);
      commit('activity');
    },
  };
}
