import { useMemo } from 'react';
import { useEvents } from '@/context/EventsContext';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { detectConflicts } from '@/lib/conflicts';
import { detectEventClashes } from '@/lib/eventClashes';
import { prettyDate, todayISO } from '@/lib/time';

/** Everything that needs an organizer's attention for the current event. */
export function useEventAlerts() {
  const { events } = useEvents();
  const { event, sessions, rooms, speakers, resources, tasks, team } = useWorkspace();

  return useMemo(() => {
    if (!event) return { clashes: [], conflicts: [], shortages: [], overdue: [], total: 0 };
    const today = todayISO();
    const clashes = detectEventClashes(event, events);
    const conflicts = detectConflicts(sessions, event, rooms, speakers);
    const shortages = resources.filter((r) => r.allocated < r.required);
    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today);
    return {
      clashes,
      conflicts,
      shortages,
      overdue,
      total: clashes.length + conflicts.length + shortages.length + overdue.length,
      /** Plain-text lines for the alert-digest email. */
      digest: {
        clashes: clashes.map((c) => c.message),
        conflicts: conflicts.map((c) => c.message),
        shortages: shortages.map((r) => `${r.name}: ${r.allocated}/${r.required} ${r.unit} allocated (${r.required - r.allocated} short)`),
        overdue: overdue.map(
          (t) =>
            `${t.title} — due ${prettyDate(t.dueDate, 'MMM d')}${t.assigneeId ? ` (${team.find((m) => m.id === t.assigneeId)?.name ?? 'assigned'})` : ' (unassigned)'}`,
        ),
      },
    };
  }, [event, events, sessions, rooms, speakers, resources, tasks, team]);
}
