import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarDays, Crown, Eye, Globe, KeyRound, Lock, MapPin, Pencil, Search, UserRound } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState, FormField, Input, PageHeader, Skeleton } from '@/components/ui';
import { PasswordInput } from '@/components/common/PasswordInput';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { backend } from '@/services';
import { CATEGORY_META, THEMES } from '@/lib/constants';
import { dateRange } from '@/lib/time';
import { cn } from '@/lib/utils';

/**
 * "All events": every event created on EventFlow, by anyone.
 * Everyone can see the title, date and venue. To open an event you must be
 * its admin, an organizer the admin invited, or know the event password
 * (which gives view-only access).
 */
export default function BrowseEvents() {
  const user = useUser();
  const { events, viewing } = useEvents();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const term = useDeferredValue(q.trim().toLowerCase());
  const [unlock, setUnlock] = useState(null);

  useEffect(
    () =>
      backend.subscribeDirectory(
        (items) => {
          setList(items);
          setError(null);
        },
        (e) => {
          setError(e);
          setList([]);
        },
      ),
    [],
  );

  /** My access to an event: admin / organizer / viewer / locked. */
  const accessOf = useMemo(() => {
    const mine = new Map(events.map((e) => [e.id, e.ownerId === user.uid ? 'admin' : 'organizer']));
    for (const v of viewing) if (!mine.has(v.id)) mine.set(v.id, 'viewer');
    return (id) => mine.get(id) ?? 'locked';
  }, [events, viewing, user.uid]);

  const shown = useMemo(() => (list ?? []).filter((e) => !term || `${e.title} ${e.venue} ${e.city} ${e.ownerName}`.toLowerCase().includes(term)), [list, term]);

  return (
    <div>
      <PageHeader
        title="All events"
        description="Every event planned on EventFlow. Open your own events, or enter an event's password to view someone else's plan (read-only)."
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, venue, city or admin"
          className="pl-9"
          aria-label="Search events"
        />
      </div>

      {list === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<Lock className="h-7 w-7" />} title="Could not load events" description={error.message} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-7 w-7" />}
          title={q ? 'No events match your search' : 'No events yet'}
          description={q ? 'Try a different word.' : 'Events appear here as soon as someone creates one.'}
          action={!q && <Button onClick={() => navigate('/app/events/new')}>Create an event</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((e, i) => {
            const access = accessOf(e.id);
            const Cat = CATEGORY_META[e.category]?.icon ?? CalendarDays;
            return (
              <motion.article
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft"
              >
                <div className={cn('relative h-16 bg-gradient-to-br', THEMES[e.theme]?.gradient ?? THEMES.indigo.gradient)}>
                  <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur">
                    <Cat className="h-4 w-4" />
                  </span>
                  <div className="absolute right-3 top-3">
                    <AccessBadge access={access} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="truncate font-semibold">{e.title}</h3>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {dateRange(e)}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {[e.venue, e.city].filter(Boolean).join(', ') || 'Venue to be confirmed'}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <UserRound className="h-3.5 w-3.5 shrink-0" /> Admin: {e.ownerName}
                    </p>
                  </div>
                  <div className="mt-4 pt-1">
                    {access === 'locked' ? (
                      e.hasPassword ? (
                        <Button variant="outline" className="w-full" onClick={() => setUnlock(e)}>
                          <KeyRound className="h-4 w-4" /> Enter password to view
                        </Button>
                      ) : (
                        <p className="flex items-center justify-center gap-1.5 rounded-md bg-muted py-2 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> Private — the admin hasn't shared a password
                        </p>
                      )
                    ) : (
                      <Button className="w-full" onClick={() => navigate(`/app/events/${e.id}`)}>
                        {access === 'viewer' ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} Open event
                      </Button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <UnlockDialog entry={unlock} onClose={() => setUnlock(null)} />
    </div>
  );
}

function AccessBadge({ access }) {
  const map = {
    admin: { label: 'Admin', icon: Crown, cls: 'bg-amber-300 text-amber-950' },
    organizer: { label: 'Organizer', icon: Pencil, cls: 'bg-white text-indigo-700' },
    viewer: { label: 'View only', icon: Eye, cls: 'bg-sky-200 text-sky-900' },
    locked: { label: 'Locked', icon: Lock, cls: 'bg-black/40 text-white' },
  };
  const m = map[access];
  const Icon = m.icon;
  return (
    <Badge className={cn('gap-1 border-0 shadow-sm', m.cls)}>
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

function UnlockDialog({ entry, onClose }) {
  const user = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (entry) {
      setPassword('');
      setError('');
    }
  }, [entry]);

  const submit = async (ev) => {
    ev?.preventDefault();
    if (!password.trim()) return setError('Enter the event password');
    setBusy(true);
    setError('');
    try {
      await backend.joinEvent(entry.id, password.trim(), { uid: user.uid, name: user.displayName, email: user.email });
      toast.success(`You can now view “${entry.title}”`, 'View-only access — only the admin and organizers can edit.');
      onClose();
      navigate(`/app/events/${entry.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!entry}
      onClose={onClose}
      title={entry ? `Open “${entry.title}”` : ''}
      description="Ask the event admin for the password. You'll get view-only access to the plan."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            <KeyRound className="h-4 w-4" /> Unlock
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <FormField label="Event password" htmlFor="unlock-pw" error={error}>
          <PasswordInput id="unlock-pw" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" autoFocus />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
