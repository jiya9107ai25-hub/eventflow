import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Badge, Card, CardContent, PageHeader } from '@/components/ui';
import { MonthCalendar } from '@/components/common/MonthCalendar';
import { useEvents } from '@/context/EventsContext';
import { useEventsOverview } from '@/hooks/useEventsOverview';
import { SESSION_TYPE_META, THEMES } from '@/lib/constants';
import { eventDays, formatTime, prettyDate, todayISO } from '@/lib/time';

export default function CalendarPage() {
  const { events } = useEvents();
  const { byEvent } = useEventsOverview(events);
  const navigate = useNavigate();
  const [day, setDay] = useState(todayISO());
  const [show, setShow] = useState({ events: true, sessions: true, deadlines: true });

  const items = useMemo(() => {
    const out = [];
    for (const e of events) {
      const color = THEMES[e.theme].swatch;
      if (show.events)
        for (const d of eventDays(e))
          out.push({ id: `${e.id}-${d}`, day: d, label: e.title, color, kind: 'event', onClick: () => navigate(`/app/events/${e.id}`) });
      if (show.sessions)
        for (const s of byEvent[e.id]?.sessions ?? [])
          out.push({
            id: s.id,
            day: s.day,
            label: `${s.start} ${s.title}`,
            color: '#0ea5e9',
            kind: 'session',
            onClick: () => navigate(`/app/events/${e.id}/schedule`),
          });
      if (show.deadlines)
        for (const t of byEvent[e.id]?.tasks ?? [])
          if (t.dueDate && t.status !== 'done')
            out.push({ id: t.id, day: t.dueDate, label: t.title, color: '#f59e0b', kind: 'deadline', onClick: () => navigate(`/app/events/${e.id}/tasks`) });
    }
    return out;
  }, [events, byEvent, show, navigate]);

  const dayEvents = events.filter((e) => e.startDate <= day && e.endDate >= day);
  const daySessions = events
    .flatMap((e) => (byEvent[e.id]?.sessions ?? []).filter((s) => s.day === day).map((s) => ({ s, e })))
    .sort((a, b) => a.s.start.localeCompare(b.s.start));
  const dayTasks = events.flatMap((e) => (byEvent[e.id]?.tasks ?? []).filter((t) => t.dueDate === day && t.status !== 'done').map((t) => ({ t, e })));

  return (
    <div>
      <PageHeader title="Calendar" description="Events, sessions and deadlines across all your workspaces." />
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(show).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm capitalize">
            <input type="checkbox" checked={show[k]} onChange={() => setShow((s) => ({ ...s, [k]: !s[k] }))} className="accent-[hsl(var(--primary))]" /> {k}
          </label>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-5">
            <MonthCalendar items={items} onSelectDay={setDay} selectedDay={day} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-5 pt-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected day</p>
              <h2 className="text-lg font-bold">{prettyDate(day, 'EEEE, MMMM d')}</h2>
            </div>
            {dayEvents.length + daySessions.length + dayTasks.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CalendarDays className="mx-auto mb-2 h-6 w-6" /> Nothing on this day.
              </div>
            )}
            {dayEvents.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Events</h3>
                {dayEvents.map((e) => (
                  <Link key={e.id} to={`/app/events/${e.id}`} className="mb-1.5 flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: THEMES[e.theme].swatch }} /> {e.title}
                  </Link>
                ))}
              </section>
            )}
            {daySessions.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Sessions</h3>
                <ul className="space-y-1.5">
                  {daySessions.map(({ s, e }) => (
                    <li key={s.id} className={`rounded-lg border-l-4 p-2 text-sm ${SESSION_TYPE_META[s.type].color}`}>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(s.start)}–{formatTime(s.end)} · {e.title}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {dayTasks.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Deadlines</h3>
                {dayTasks.map(({ t, e }) => (
                  <Link key={t.id} to={`/app/events/${e.id}/tasks`} className="mb-1.5 flex items-center justify-between rounded-lg p-2 text-sm hover:bg-muted">
                    {t.title} <Badge tone="warning">{t.priority}</Badge>
                  </Link>
                ))}
              </section>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
