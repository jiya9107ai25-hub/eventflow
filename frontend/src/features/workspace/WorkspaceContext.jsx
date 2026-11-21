import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '@/services';
import { useCollection } from '@/hooks/useCollection';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@/context/AuthContext';

const WorkspaceContext = createContext(null);
const PAGE = 30;

const KIND = {
  rooms: 'session',
  speakers: 'session',
  sessions: 'session',
  tasks: 'task',
  resources: 'resource',
  allocations: 'resource',
  attendees: 'attendee',
  team: 'team',
  messages: 'message',
  notifications: 'message',
};

/**
 * Loads one event and all of its sub-collections once, at the workspace level,
 * so switching tabs is instant and every tab sees the same live data.
 * Keyed by eventId in the router, so switching events remounts and fully
 * isolates state between workspaces.
 */
export function WorkspaceProvider({ eventId, children }) {
  const toast = useToast();
  const { log } = useEvents();
  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [messageLimit, setMessageLimit] = useState(PAGE);

  useEffect(
    () =>
      backend.subscribeEvent(
        eventId,
        (e) => {
          setEvent(e);
          setEventLoading(false);
        },
        () => setEventLoading(false),
      ),
    [eventId],
  );

  // Keep this user's name/email on the event so other organizers can see who they are.
  const user = useUser();
  useEffect(() => {
    if (!event || !event.memberIds.includes(user.uid)) return;
    const mine = event.members?.[user.uid];
    if (mine && mine.name === user.displayName && mine.email === user.email.toLowerCase()) return;
    void backend
      .upsertMemberInfo(event.id, user.uid, { name: user.displayName, email: user.email.toLowerCase(), joinedAt: mine?.joinedAt ?? event.createdAt })
      .catch(() => undefined);
  }, [event, user.uid, user.displayName, user.email]);

  // Role-based access: admin and organizers can edit; viewers (joined with the event password) can only look.
  const role = !event ? null : event.ownerId === user.uid ? 'admin' : event.memberIds.includes(user.uid) ? 'organizer' : 'viewer';
  const canEdit = role === 'admin' || role === 'organizer';
  const isMember = canEdit;

  // Keep this event listed in "All events" (also fixes events created before the directory existed).
  const listedRef = useRef(false);
  useEffect(() => {
    if (!event || !isMember || listedRef.current) return;
    listedRef.current = true;
    void backend.syncDirectory(event).catch(() => undefined);
  }, [event, isMember]);

  const rooms = useCollection(eventId, 'rooms');
  const speakers = useCollection(eventId, 'speakers');
  const sessions = useCollection(eventId, 'sessions');
  const tasks = useCollection(eventId, 'tasks');
  const resources = useCollection(eventId, 'resources');
  const allocations = useCollection(eventId, 'allocations');
  // Private to organizers: viewers never load attendee details, the team list or the organizer chat.
  const priv = { enabled: role !== null && isMember };
  const attendees = useCollection(eventId, 'attendees', priv);
  const team = useCollection(eventId, 'team', priv);
  const messages = useCollection(eventId, 'messages', { orderBy: 'createdAt', limitLast: messageLimit, enabled: priv.enabled });

  const logIt = useCallback(
    (key, text) => {
      if (text && event) log({ eventId, eventTitle: event.title, text, kind: KIND[key] });
    },
    [event, eventId, log],
  );

  const add = useCallback(
    async (key, data, logText) => {
      try {
        const id = await backend.addSub(eventId, key, data);
        logIt(key, logText);
        return id;
      } catch (e) {
        toast.error('Could not save', e.message);
        return null;
      }
    },
    [eventId, logIt, toast],
  );

  const update = useCallback(
    async (key, id, patch, logText) => {
      try {
        await backend.updateSub(eventId, key, id, patch);
        logIt(key, logText);
        return true;
      } catch (e) {
        toast.error('Could not update', e.message);
        return false;
      }
    },
    [eventId, logIt, toast],
  );

  const remove = useCallback(
    async (key, id, logText) => {
      try {
        await backend.removeSub(eventId, key, id);
        logIt(key, logText);
        return true;
      } catch (e) {
        toast.error('Could not delete', e.message);
        return false;
      }
    },
    [eventId, logIt, toast],
  );

  const loadOlderMessages = useCallback(() => setMessageLimit((n) => n + PAGE), []);

  const value = useMemo(
    () => ({
      event,
      eventLoading,
      role,
      canEdit,
      rooms: rooms.data,
      speakers: speakers.data,
      sessions: sessions.data,
      tasks: tasks.data,
      resources: resources.data,
      allocations: allocations.data,
      attendees: attendees.data,
      team: team.data,
      messages: messages.data,
      loading: {
        rooms: rooms.loading,
        speakers: speakers.loading,
        sessions: sessions.loading,
        tasks: tasks.loading,
        resources: resources.loading,
        attendees: attendees.loading,
        team: team.loading,
        messages: messages.loading,
      },
      messageLimit,
      loadOlderMessages,
      add,
      update,
      remove,
    }),
    [
      event,
      eventLoading,
      role,
      canEdit,
      rooms,
      speakers,
      sessions,
      tasks,
      resources,
      allocations,
      attendees,
      team,
      messages,
      messageLimit,
      loadOlderMessages,
      add,
      update,
      remove,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}

/** Narrowed hook for tab components rendered only after the event has loaded. */
export function useWorkspaceEvent() {
  const { event } = useWorkspace();
  if (!event) throw new Error('Event not loaded');
  return event;
}
