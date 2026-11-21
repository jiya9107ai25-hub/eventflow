import { eventStatus, todayISO } from './time';
import { pct } from './utils';
import { CATEGORY_META } from './constants';

export function eventProgress(event, snap) {
  const tasks = snap?.tasks ?? [];
  const resources = snap?.resources ?? [];
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const req = resources.reduce((s, r) => s + r.required, 0);
  const alloc = resources.reduce((s, r) => s + Math.min(r.allocated, r.required), 0);
  const taskPct = pct(tasksDone, tasks.length);
  const resourcePct = pct(alloc, req);
  const hasT = tasks.length > 0;
  const hasR = req > 0;
  const readiness = hasT && hasR ? Math.round(taskPct * 0.6 + resourcePct * 0.4) : hasT ? taskPct : hasR ? resourcePct : 0;
  return {
    event,
    tasksTotal: tasks.length,
    tasksDone,
    taskPct,
    resourcePct,
    attendees: snap?.attendees?.length ?? 0,
    sessions: snap?.sessions?.length ?? 0,
    readiness,
  };
}

export function overview(events, byEvent) {
  const today = todayISO();
  const counts = { total: events.length, upcoming: 0, active: 0, completed: 0 };
  for (const e of events) counts[eventStatus(e, today)]++;

  const progress = events.map((e) => eventProgress(e, byEvent[e.id]));

  const deadlines = events
    .flatMap((e) => (byEvent[e.id]?.tasks ?? []).filter((t) => t.status !== 'done' && t.dueDate).map((t) => ({ task: t, event: e })))
    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));

  const upcomingSessions = events
    .flatMap((e) => (byEvent[e.id]?.sessions ?? []).filter((s) => s.day >= today).map((s) => ({ session: s, event: e })))
    .sort((a, b) => `${a.session.day}${a.session.start}`.localeCompare(`${b.session.day}${b.session.start}`));

  const shortages = events
    .flatMap((e) =>
      (byEvent[e.id]?.resources ?? [])
        .filter((r) => r.allocated < r.required)
        .map((r) => ({ resource: r, event: e, missing: r.required - r.allocated, pct: pct(r.allocated, r.required) })),
    )
    .sort((a, b) => a.pct - b.pct);

  const distribution = Object.entries(
    events.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([k, v]) => ({ name: CATEGORY_META[k].label, value: v }));

  const allTasks = events.flatMap((e) => byEvent[e.id]?.tasks ?? []);
  const taskTotals = {
    todo: allTasks.filter((t) => t.status === 'todo').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    done: allTasks.filter((t) => t.status === 'done').length,
  };

  const attendeesTotal = progress.reduce((s, p) => s + p.attendees, 0);

  return { counts, progress, deadlines, upcomingSessions, shortages, distribution, taskTotals, attendeesTotal };
}

/** Group attendee createdAt timestamps into a cumulative daily series. */
export function registrationSeries(timestamps, days = 14) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = end.getTime() - days * 86400_000;
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(start + (i + 1) * 86400_000);
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, ts: d.getTime(), daily: 0, total: 0 };
  });
  let before = 0;
  for (const t of timestamps) {
    if (t <= start) {
      before++;
      continue;
    }
    const idx = Math.min(days - 1, Math.floor((t - start) / 86400_000));
    buckets[idx].daily++;
  }
  let running = before;
  for (const b of buckets) {
    running += b.daily;
    b.total = running;
  }
  return buckets;
}
