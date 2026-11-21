import { useEffect, useState } from 'react';
import { backend } from '@/services';

/**
 * Subscribe to an event sub-collection with a real-time listener.
 * The listener is torn down automatically on unmount or when inputs change,
 * which is what keeps each event's data isolated when switching workspaces.
 */
export function useCollection(eventId, key, opts) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  const orderBy = opts?.orderBy;
  const limitLast = opts?.limitLast;

  const enabled = opts?.enabled !== false;

  useEffect(() => {
    if (!eventId) return;
    if (!enabled) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return backend.subscribeSub(
      eventId,
      key,
      (data) => setState({ data, loading: false, error: null }),
      { orderBy, limitLast },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
  }, [eventId, key, orderBy, limitLast, enabled]);

  return state;
}
