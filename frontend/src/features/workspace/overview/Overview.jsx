import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarX2,
  Boxes,
  CalendarRange,
  CheckCircle2,
  Circle,
  Clock,
  DoorOpen,
  KanbanSquare,
  MapPin,
  Mic2,
  UserCog,
  Users,
} from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@/components/ui';
import { StatCard } from '@/components/common/StatCard';
import { AiBriefing } from '@/features/ai/AiBriefing';
import { useWorkspace, useWorkspaceEvent } from '../WorkspaceContext';
import { detectConflicts } from '@/lib/conflicts';
import { useEventAlerts } from '@/features/alerts/useEventAlerts';
import { CATEGORY_META, REQUIREMENT_META, SESSION_TYPE_META } from '@/lib/constants';
import { dateRange, daysUntil, eventDays, formatTime, prettyDate, todayISO } from '@/lib/time';
import { cn, pct } from '@/lib/utils';

export default function Overview() {
  const event = useWorkspaceEvent();
  const { rooms, speakers, sessions, tasks, resources, attendees, team, canEdit } = useWorkspace();

  const conflicts = useMemo(() => detectConflicts(sessions, event, rooms, speakers), [sessions, event, rooms, speakers]);
  const { clashes } = useEventAlerts();
  const done = tasks.filter((t) => t.status === 'done').length;
  const req = resources.reduce((s, r) => s + r.required, 0);
  const alloc = resources.reduce((s, r) => s + Math.min(r.allocated, r.required), 0);
  const activeAttendees = attendees.length;
  const d = daysUntil(event.startDate);
  const r = event.requirements;

  /** Guided setup — only shows steps for modules this event needs. */
  const checklist = [
    { show: true, done: true, label: 'Create the event', to: '' },
    { show: r.includes('rooms'), done: rooms.length > 0, label: 'Add rooms or halls', to: 'speakers' },
    { show: r.includes('speakers'), done: speakers.length > 0, label: 'Add speakers', to: 'speakers' },
    { show: r.includes('sessions'), done: sessions.length > 0, label: 'Build the schedule', to: 'schedule' },
    { show: r.some((k) => REQUIREMENT_META[k].resource), done: resources.length > 0, label: 'Define resources & volunteers', to: 'resources' },
    { show: true, done: team.length > 0, label: 'Invite your team', to: 'team' },
    { show: true, done: tasks.length > 0, label: 'Plan tasks', to: 'tasks' },
    { show: r.includes('attendees'), done: attendees.length > 0, label: 'Add or import attendees', to: 'attendees' },
  ].filter((c) => c.show);
  const setupPct = pct(checklist.filter((c) => c.done).length, checklist.length);

  const today = todayISO();
  const nextSessions = [...sessions]
    .filter((s) => s.day >= today)
    .sort((a, b) => `${a.day}${a.start}`.localeCompare(`${b.day}${b.start}`))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={d > 0 ? 'Days to go' : d === 0 ? 'Starts' : 'Status'}
          value={d > 0 ? d : d === 0 ? 'Today' : event.endDate < today ? 'Done' : 'Live'}
          icon={<Clock className="h-[18px] w-[18px]" />}
          hint={dateRange(event)}
        />
        <StatCard
          label={canEdit ? 'Attendees' : 'Expected attendees'}
          value={`${canEdit ? activeAttendees : event.expectedAttendees}`}
          icon={<Users className="h-[18px] w-[18px]" />}
          tone="accent"
          hint={canEdit ? `${pct(activeAttendees, event.expectedAttendees)}% of ${event.expectedAttendees} expected` : 'Planned size of the event'}
        />
        <StatCard
          label="Tasks completed"
          value={`${done}/${tasks.length}`}
          icon={<KanbanSquare className="h-[18px] w-[18px]" />}
          tone="success"
          hint={`${pct(done, tasks.length)}% complete`}
        />
        <StatCard
          label="Resources allocated"
          value={`${pct(alloc, req)}%`}
          icon={<Boxes className="h-[18px] w-[18px]" />}
          tone="warning"
          hint={`${resources.filter((x) => x.allocated < x.required).length} item(s) short`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {canEdit && (
          <>
            <AiBriefing />
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Setup progress</CardTitle>
                  <CardDescription>Follow these steps to get {event.title} ready.</CardDescription>
                </div>
                <Badge tone={setupPct === 100 ? 'success' : 'default'}>{setupPct}%</Badge>
              </CardHeader>
              <CardContent>
                <Progress value={setupPct} className="mb-4" label="Setup progress" tone={setupPct === 100 ? 'success' : 'primary'} />
                <ul className="grid gap-2 sm:grid-cols-2">
                  {checklist.map((c) => (
                    <li key={c.label}>
                      <Link
                        to={c.to}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg border p-3 text-sm transition hover:border-primary/40 hover:bg-muted/50',
                          c.done && 'border-transparent bg-muted/40',
                        )}
                      >
                        {c.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
                        <span className={cn('flex-1 font-medium', c.done && 'text-muted-foreground line-through decoration-1')}>{c.label}</span>
                        {!c.done && <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Event information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{event.description}</p>
            <dl className="space-y-2.5 border-t pt-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium">{CATEGORY_META[event.category].label}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Dates</dt>
                <dd className="text-right font-medium">{dateRange(event)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Hours</dt>
                <dd className="font-medium">
                  {formatTime(event.dailyStart)} – {formatTime(event.dailyEnd)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium">{eventDays(event).length} day(s)</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Venue
                </dt>
                <dd className="text-right font-medium">
                  {event.venue}, {event.city}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-1.5 border-t pt-3">
              {event.requirements.map((k) => (
                <Badge key={k} tone="muted">
                  {REQUIREMENT_META[k].label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Next sessions</CardTitle>
            </div>
            <Link to="schedule" className="text-sm font-medium text-primary hover:underline">
              Open scheduler
            </Link>
          </CardHeader>
          <CardContent>
            {nextSessions.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="h-4 w-4" /> No upcoming sessions.{' '}
                <Link to="schedule" className="font-medium text-primary hover:underline">
                  Create one
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {nextSessions.map((s) => (
                  <li key={s.id} className={cn('flex items-center justify-between gap-3 rounded-lg border-l-4 px-3 py-2.5', SESSION_TYPE_META[s.type].color)}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {prettyDate(s.day, 'EEE, MMM d')} · {formatTime(s.start)}–{formatTime(s.end)}
                        {s.roomId && (
                          <>
                            {' '}
                            · <DoorOpen className="inline h-3 w-3" /> {rooms.find((x) => x.id === s.roomId)?.name}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Mic2 className="h-3.5 w-3.5" /> {s.speakerIds.length}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Health check</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link
              to="schedule"
              className={cn('flex items-center gap-3 rounded-lg p-3', conflicts.length ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success')}
            >
              {conflicts.length ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              <span className="font-medium">{conflicts.length ? `${conflicts.length} scheduling conflict(s)` : 'No scheduling conflicts'}</span>
            </Link>
            {canEdit && (
              <Link
                to="alerts"
                className={cn('flex items-center gap-3 rounded-lg p-3', clashes.length ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success')}
              >
                <CalendarX2 className="h-5 w-5" />
                <span className="font-medium">{clashes.length ? `Date clash with ${clashes.length} other event(s)` : 'No date clashes'}</span>
              </Link>
            )}
            <Link
              to="resources"
              className={cn(
                'flex items-center gap-3 rounded-lg p-3',
                resources.some((x) => x.allocated < x.required) ? 'bg-warning/10 text-amber-700 dark:text-amber-400' : 'bg-success/10 text-success',
              )}
            >
              <Boxes className="h-5 w-5" />
              <span className="font-medium">{resources.filter((x) => x.allocated < x.required).length} resource shortage(s)</span>
            </Link>
            <Link to="tasks" className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length} overdue task(s)</span>
            </Link>
            {canEdit && (
              <Link to="team" className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <UserCog className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{team.length} team member(s)</span>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
