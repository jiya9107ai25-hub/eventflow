import { useCallback, useEffect, useState } from 'react';

const key = (uid, eventId) => `eventflow-lastread-${uid}-${eventId}`;
const EVT = 'eventflow:lastread';

/** Per-user, per-event "last read" marker → unread message count. */
export function useUnread(uid, eventId, messages) {
  const read = () => Number(localStorage.getItem(key(uid, eventId)) ?? 0);
  const [lastRead, setLastRead] = useState(read);

  useEffect(() => {
    setLastRead(read());
    const sync = () => setLastRead(read());
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, eventId]);

  const markRead = useCallback(() => {
    localStorage.setItem(key(uid, eventId), String(Date.now()));
    window.dispatchEvent(new Event(EVT));
  }, [uid, eventId]);

  const unread = messages.filter((m) => m.createdAt > lastRead && m.authorId !== uid).length;
  return { unread, lastRead, markRead };
}
