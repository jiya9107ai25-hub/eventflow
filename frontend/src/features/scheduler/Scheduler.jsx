import { useCallback, useMemo, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CalendarPlus, CalendarRange, CheckCircle2, ChevronDown, DoorOpen, LayoutList, Mic2, Plus, Rows3 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { conflictIndex, detectConflicts } from '@/lib/conflicts';
import { SESSION_TYPE_META, sessionTypeLabel } from '@/lib/constants';
import { eventDays, formatTime, prettyDate } from '@/lib/time';
import { cn } from '@/lib/utils';
import { SessionDialog } from './SessionDialog';
import { TimelineGrid } from './TimelineGrid';

export default function Scheduler() {
  const event = useWorkspaceEvent();
  const { sessions: liveSessions, rooms, speakers, loading, add, update, remove, canEdit } = useWorkspace();
  const toast = useToast();
  const days = eventDays(event);
  const [day, setDay] = useState(days[0] ?? event.startDate);
  const [view, setView] = useState('timeline');
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState({ open: false, editing: null });
  const [toDelete, setToDelete] = useState(null);
  const [showConflicts, setShowConflicts] = useState(true);

  /**
   * Optimistic UI: drag-and-drop writes go to a local override map first so the
   * block lands instantly; the live listener then confirms (or we roll back).
   */
  const [overrides, setOverrides] = useState({});
  const sessions = useMemo(() => liveSessions.map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s)), [liveSessions, overrides]);

  const conflicts = useMemo(() => detectConflicts(sessions, event, rooms, speakers), [sessions, event, rooms, speakers]);
  const conflictsById = useMemo(() => conflictIndex(conflicts), [conflicts]);
  const daySessions = useMemo(() => sessions.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start)), [sessions, day]);
  const outsideDates = sessions.filter((s) => !days.includes(s.day));

  const handleMove = useCallback(
    async (id, patch) => {
      setOverrides((o) => ({ ...o, [id]: patch }));
      const ok = await update('sessions', id, patch, 'Rescheduled a session');
      setOverrides((o) => {
        const { [id]: _drop, ...rest } = o;
        return rest;
      });
      if (ok) toast.success('Session moved', `${formatTime(patch.start)} – ${formatTime(patch.end)}`);
    },
    [update, toast],
  );

  const save = async (v, id) => {
    const ok = id ? await update('sessions', id, v, `Updated session “${v.title}”`) : !!(await add('sessions', v, `Added session “${v.title}”`));
    if (ok) {
      toast.success(id ? 'Session updated' : 'Session added', v.title);
      setDialog({ open: false, editing: null });
      if (v.day !== day) setDay(v.day);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const s = sessions.find((x) => x.id === toDelete);
    if (await remove('sessions', toDelete, `Deleted session “${s?.title}”`)) toast.success('Session deleted');
    setToDelete(null);
    setDialog({ open: false, editing: null });
  };

  // View-only users can look at the schedule but not open the editor.
  const openNew = (defaults) => canEdit && setDialog({ open: true, editing: null, defaults: { day, ...defaults } });
  const openEdit = (s) => canEdit && setDialog({ open: true, editing: s });

  if (loading.sessions || loading.rooms) return <Skeleton className="h-[520px]" />;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Event days" className="scrollbar-thin flex gap-1.5 overflow-x-auto">
          {days.map((d, i) => {
            const count = sessions.filter((s) => s.day === d).length;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={day === d}
                onClick={() => startTransition(() => setDay(d))}
                className={cn(
                  'flex shrink-0 flex-col items-start rounded-lg border px-3.5 py-2 text-left transition',
                  day === d ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted',
                )}
              >
                <span className={cn('text-xs font-semibold', day === d ? 'text-primary' : 'text-muted-foreground')}>Day {i + 1}</span>
                <span className="text-sm font-medium">{prettyDate(d, 'EEE, MMM d')}</span>
                <span className="text-[11px] text-muted-foreground">
                  {count} session{count === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-lg border bg-muted/50 p-1" role="group" aria-label="Schedule view">
            <button
              onClick={() => setView('timeline')}
              aria-pressed={view === 'timeline'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                view === 'timeline' ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
            >
              <Rows3 className="h-4 w-4" /> By room
            </button>
            <button
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                view === 'list' ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
            >
              <LayoutList className="h-4 w-4" /> By time
            </button>
          </div>
          {canEdit && (
            <Button onClick={() => openNew()}>
              <Plus className="h-4 w-4" /> Session
            </Button>
          )}
        </div>
      </div>

      {/* Conflict alerts */}
      <AnimatePresence initial={false}>
        {conflicts.length > 0 ? (
          <motion.div
            key="conflicts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-danger/30 bg-danger/5"
            role="alert"
          >
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setShowConflicts((s) => !s)} aria-expanded={showConflicts}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/15 text-danger">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-danger">
                  {conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} detected
                </span>
                <span className="block text-xs text-muted-foreground">Click a conflict to open the session. Conflicting sessions are outlined in red.</span>
              </span>
              <ChevronDown className={cn('h-4 w-4 transition', showConflicts && 'rotate-180')} />
            </button>
            {showConflicts && (
              <ul className="space-y-1 border-t border-danger/20 px-4 py-3">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-danger/10"
                      onClick={() => {
                        const s = sessions.find((x) => x.id === c.sessionIds[0]);
                        if (s) {
                          setDay(s.day);
                          setDialog({ open: true, editing: s });
                        }
                      }}
                    >
                      <Badge tone="danger" className="capitalize">
                        {c.kind}
                      </Badge>
                      <span>{c.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : sessions.length > 0 ? (
          <motion.p
            key="ok"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success"
          >
            <CheckCircle2 className="h-4 w-4" /> No conflicts — every room, speaker and time slot checks out.
          </motion.p>
        ) : null}
      </AnimatePresence>

      {outsideDates.length > 0 && (
        <p className="rounded-lg bg-warning/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          {outsideDates.length} session(s) fall outside the event dates and are hidden from the timeline. Open them from the conflict list to fix.
        </p>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-7 w-7" />}
          title="Build your schedule"
          description={
            rooms.length
              ? 'Add your first session, then drag sessions between rooms and times to reschedule.'
              : 'Tip: add rooms first (Speakers & Rooms tab) so sessions can be placed on the room timeline.'
          }
          action={
            canEdit && (
              <Button onClick={() => openNew()}>
                <CalendarPlus className="h-4 w-4" /> Add first session
              </Button>
            )
          }
        />
      ) : (
        <div className={cn('transition-opacity', isPending && 'opacity-60')}>
          {view === 'timeline' ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {canEdit
                  ? 'Drag to move between rooms and times (snaps to 15 min). Double-click an empty slot to add a session. Keyboard: focus a session, Space to pick up, arrows to move, Space to drop.'
                  : 'View only — the schedule by room and time.'}
              </p>
              <TimelineGrid
                event={event}
                rooms={rooms}
                speakers={speakers}
                sessions={daySessions}
                conflictsById={conflictsById}
                onMove={handleMove}
                onEdit={openEdit}
                readOnly={!canEdit}
                onCreateAt={(roomId, start) => {
                  const [h, m] = start.split(':').map(Number);
                  openNew({ roomId, start, end: `${String(Math.min(23, (h ?? 0) + 1)).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}` });
                }}
              />
            </>
          ) : (
            <AgendaList sessions={daySessions} conflictsById={conflictsById} rooms={rooms} speakers={speakers} onEdit={openEdit} />
          )}
          {daySessions.length === 0 && view === 'list' && <p className="py-10 text-center text-sm text-muted-foreground">No sessions on this day.</p>}
        </div>
      )}

      <SessionDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, editing: null })}
        event={event}
        rooms={rooms}
        speakers={speakers}
        sessions={sessions}
        editing={dialog.editing}
        defaults={dialog.defaults}
        onSave={save}
        onDelete={(id) => setToDelete(id)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete session?"
        description="This removes the session from the schedule."
      />
    </div>
  );
}

function AgendaList({ sessions: list, conflictsById: cmap, onEdit, rooms, speakers }) {
  return (
    <ol className="relative space-y-3 border-l-2 border-dashed pl-6">
      {list.map((s) => {
        const room = rooms.find((r) => r.id === s.roomId);
        const names = s.speakerIds.map((id) => speakers.find((x) => x.id === id)?.name).filter(Boolean);
        const conflict = cmap.has(s.id);
        return (
          <li key={s.id} className="relative">
            <span className={cn('absolute -left-[31px] top-4 h-3 w-3 rounded-full border-2 border-card', conflict ? 'bg-danger' : 'bg-primary')} />
            <button
              onClick={() => onEdit(s)}
              className={cn(
                'w-full rounded-xl border border-l-4 bg-card p-4 text-left shadow-soft transition hover:shadow-lift',
                SESSION_TYPE_META[s.type].color,
                conflict && 'ring-2 ring-danger/60',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{s.title}</p>
                <div className="flex gap-1.5">
                  {conflict && (
                    <Badge tone="danger">
                      <AlertTriangle className="h-3 w-3" /> Conflict
                    </Badge>
                  )}
                  <Badge tone="muted">{sessionTypeLabel(s)}</Badge>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatTime(s.start)} – {formatTime(s.end)}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-3.5 w-3.5" /> {room?.name ?? 'Unassigned'}
                </span>
                {names.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Mic2 className="h-3.5 w-3.5" /> {names.join(', ')}
                  </span>
                )}
              </div>
              {s.description && <p className="mt-2 text-sm">{s.description}</p>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
