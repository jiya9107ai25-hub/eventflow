import { useEffect, useMemo, useState } from 'react';
import { backend } from '@/services';

/**
 * Fan-out listeners: for each of the user's events, subscribe to the
 * sub-collections the dashboard and analytics need. Listeners are diffed by
 * event id so adding/removing an event only opens/closes its own listeners.
 */
export function useEventsOverview(events) {
  const [data, setData] = useState({});
  const ids = useMemo(
    () =>
      events
        .map((e) => e.id)
        .sort()
        .join('|'),
    [events],
  );

  useEffect(() => {
    const list = ids ? ids.split('|') : [];
    const unsubs = [];
    const keys = ['tasks', 'resources', 'sessions', 'attendees'];
    for (const id of list) {
      for (const key of keys) {
        unsubs.push(backend.subscribeSub(id, key, (items) => setData((d) => ({ ...d, [id]: { ...d[id], [key]: items } }))));
      }
    }
    setData((d) => Object.fromEntries(Object.entries(d).filter(([k]) => list.includes(k))));
    return () => unsubs.forEach((u) => u());
  }, [ids]);

  const loading = events.some((e) => !data[e.id] || Object.keys(data[e.id]).length < 4);
  return { byEvent: data, loading };
}
