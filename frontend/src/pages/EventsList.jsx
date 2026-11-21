import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Plus, Search, SearchX } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, Input, PageHeader, Select, Skeleton } from '@/components/ui';
import { EventCard } from '@/components/common/EventCard';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { useEventsOverview } from '@/hooks/useEventsOverview';
import { useDebounce } from '@/hooks/useDebounce';
import { eventProgress } from '@/lib/analytics';
import { clashMap } from '@/lib/eventClashes';
import { CATEGORY_META } from '@/lib/constants';
import { eventStatus } from '@/lib/time';
import { cn } from '@/lib/utils';
import { backend } from '@/services';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

export default function EventsList() {
  const { events, loading } = useEvents();
  const { byEvent } = useEventsOverview(events);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('date');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const status = params.get('status') ?? 'all';
  const clashes = useMemo(() => clashMap(events), [events]);
  const debounced = useDebounce(query, 200);
  const deferredEvents = useDeferredValue(events);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    const list = deferredEvents
      .filter((e) => status === 'all' || eventStatus(e) === status)
      .filter((e) => category === 'all' || e.category === category)
      .filter((e) => !term || `${e.title} ${e.description} ${e.city} ${e.venue}`.toLowerCase().includes(term))
      .map((e) => eventProgress(e, byEvent[e.id]));
    return list.sort((a, b) =>
      sort === 'title'
        ? a.event.title.localeCompare(b.event.title)
        : sort === 'readiness'
          ? b.readiness - a.readiness
          : a.event.startDate.localeCompare(b.event.startDate),
    );
  }, [deferredEvents, status, category, debounced, sort, byEvent]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const title = events.find((e) => e.id === toDelete)?.title;
      await backend.deleteEvent(toDelete);
      toast.success('Event deleted', title);
      setToDelete(null);
    } catch (e) {
      toast.error('Could not delete event', e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Events"
        description="Every event has its own workspace. Pick one to manage it."
        actions={
          <Button onClick={() => navigate('/app/events/new')}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="inline-flex w-fit rounded-lg border bg-muted/50 p-1">
          {TABS.map((t) => {
            const count = t.key === 'all' ? events.length : events.filter((e) => eventStatus(e) === t.key).length;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={status === t.key}
                onClick={() => setParams(t.key === 'all' ? {} : { status: t.key })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  status === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label} <span className="ml-1 text-xs opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" className="pl-9" aria-label="Search events" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="sm:w-40">
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort events" className="sm:w-40">
            <option value="date">Sort: Date</option>
            <option value="title">Sort: Title</option>
            <option value="readiness">Sort: Readiness</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title="No events yet"
          description="Create your first event to get started."
          action={
            <Button onClick={() => navigate('/app/events/new')}>
              <Plus className="h-4 w-4" /> Create event
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-7 w-7" />}
          title="No matching events"
          description="Try a different search or filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setParams({});
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div
                key={p.event.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <EventCard progress={p} onDelete={setToDelete} clashCount={clashes.get(p.event.id)?.length ?? 0} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this event?"
        description="This permanently removes the event and all of its sessions, tasks, resources, attendees and messages."
        confirmLabel="Delete event"
      />
    </div>
  );
}
