import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '@/services';
import { useUser } from './AuthContext';
import { useToast } from './ToastContext';

const EventsContext = createContext(null);

/**
 * One real-time listener for the signed-in user's events, shared by the
 * sidebar event switcher, dashboard, events list, calendar and analytics.
 */
export function EventsProvider({ children }) {
  const user = useUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    setLoading(true);
    // Never leave pages on a skeleton forever: if Firestore hasn't answered in
    // 8 seconds (offline, blocked, or a stale tab), stop loading and say so.
    const slow = setTimeout(() => {
      setLoading((still) => {
        if (still) setError(new Error('Firestore is taking too long to respond. Check your internet connection, then refresh the page.'));
        return false;
      });
    }, 8000);
    const unsub = backend.subscribeEvents(
      user.uid,
      (list) => {
        clearTimeout(slow);
        setEvents(list);
        setLoading(false);
        setError(null);
      },
      (e) => {
        clearTimeout(slow);
        setError(e);
        setLoading(false);
      },
    );
    return () => {
      clearTimeout(slow);
      unsub();
    };
  }, [user.uid]);

  useEffect(() => backend.subscribeActivity(user.uid, setActivity), [user.uid]);

  /**
   * Events this user unlocked with an event password (view-only).
   * If the admin removes them, Firestore stops returning the event and it drops out of the list.
   */
  const [viewingIds, setViewingIds] = useState([]);
  const [viewingMap, setViewingMap] = useState({});
  useEffect(() => backend.subscribeViewing(user.uid, setViewingIds), [user.uid]);
  const viewingKey = viewingIds.join('|');
  useEffect(() => {
    const ids = viewingKey ? viewingKey.split('|') : [];
    setViewingMap((m) => Object.fromEntries(Object.entries(m).filter(([k]) => ids.includes(k))));
    const unsubs = ids.map((id) =>
      backend.subscribeEvent(
        id,
        (e) => setViewingMap((m) => ({ ...m, [id]: e })),
        () => setViewingMap((m) => ({ ...m, [id]: null })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [viewingKey]);
  const viewing = useMemo(
    () =>
      viewingIds
        .map((id) => viewingMap[id])
        .filter((e) => e && !e.memberIds.includes(user.uid))
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [viewingIds, viewingMap, user.uid],
  );

  /**
   * Auto-join: when someone is invited as a co-organizer (by email), the event
   * shows up here the next time they're signed in, and they're added to it.
   */
  const toast = useToast();
  const joining = useRef(new Set());
  useEffect(() => {
    if (!user.email) return;
    return backend.subscribeInvites(user.email, (invited) => {
      for (const ev of invited) {
        if (ev.memberIds.includes(user.uid) || joining.current.has(ev.id)) continue;
        joining.current.add(ev.id);
        backend
          .acceptInvite(ev.id, { uid: user.uid, email: user.email, name: user.displayName })
          .then(() => {
            toast.success(`You joined “${ev.title}”`, 'You were invited as a co-organizer.');
            void backend.logActivity(user.uid, { eventId: ev.id, eventTitle: ev.title, text: 'Joined as co-organizer', kind: 'team' });
          })
          .catch((e) => toast.error(`Could not join “${ev.title}”`, e.message))
          .finally(() => joining.current.delete(ev.id));
      }
    });
  }, [user.uid, user.email, user.displayName, toast]);

  // Tell the user when Firestore can't reach Google's servers (see confirmed() in firestoreBackend).
  useEffect(() => {
    let warned = false;
    const onSync = (e) => {
      const { status, message } = e.detail ?? {};
      if (status === 'slow' && !warned) {
        warned = true;
        toast.warning(
          'Saved on this device — waiting to sync',
          'Firestore is not responding. Check your internet, and turn off ad-blockers for localhost. Your changes upload automatically when connected.',
        );
      } else if (status === 'synced' && warned) {
        warned = false;
        toast.success('Synced', 'Your changes are saved to Firestore.');
      } else if (status === 'error') {
        toast.error('Firestore could not save a change', message);
      }
    };
    window.addEventListener('eventflow:sync', onSync);
    return () => window.removeEventListener('eventflow:sync', onSync);
  }, [toast]);

  const log = useCallback((entry) => void backend.logActivity(user.uid, entry).catch(() => undefined), [user.uid]);

  /** admin = created the event · organizer = invited by the admin (can edit) · viewer = joined with the password (read-only) */
  const roleOf = useCallback((e) => (e.ownerId === user.uid ? 'admin' : e.memberIds?.includes(user.uid) ? 'organizer' : 'viewer'), [user.uid]);
  const value = useMemo(() => ({ events, viewing, loading, error, activity, log, roleOf }), [events, viewing, loading, error, activity, log, roleOf]);
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used inside <EventsProvider>');
  return ctx;
}
