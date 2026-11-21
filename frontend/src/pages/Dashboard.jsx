import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity as ActivityIcon,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  PlayCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Progress, Skeleton } from '@/components/ui';
import { StatCard } from '@/components/common/StatCard';
import { MonthCalendar } from '@/components/common/MonthCalendar';
import { SampleBadge } from '@/components/common/SampleBadge';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useEventsOverview } from '@/hooks/useEventsOverview';
import { overview } from '@/lib/analytics';
import { THEMES } from '@/lib/constants';
import { daysUntil, eventDays, formatTime, prettyDate, relativeTime, todayISO } from '@/lib/time';
import { ChartTooltip, CHART_COLORS } from '@/components/common/ChartTooltip';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const user = useUser();
  const { events, loading, activity } = useEvents();
  const { byEvent, loading: snapLoading } = useEventsOverview(events);
  const navigate = useNavigate();

  const o = useMemo(() => overview(events, byEvent), [events, byEvent]);

  const calendarItems = useMemo(
    () => [
      ...events.flatMap((e) =>
        eventDays(e).map((d) => ({
          id: `${e.id}-${d}`,
          day: d,
          label: e.title,
          color: THEMES[e.theme].swatch,
          kind: 'event',
          onClick: () => navigate(`/app/events/${e.id}`),
        })),
      ),
      ...o.deadlines.map(({ task, event }) => ({
        id: task.id,
        day: task.dueDate,
        label: task.title,
        color: '#f59e0b',
        kind: 'deadline',
        onClick: () => navigate(`/app/events/${event.id}/tasks`),
      })),
    ],
    [events, o.deadlines, navigate],
  );

  const firstName = user.displayName.split(' ')[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <WelcomeBanner name={firstName} subtitle="Let’s get your first event off the ground." />
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title="No events yet"
          description="Create an event to get a dedicated workspace for its schedule, people, resources, tasks and chat. You can also describe it to the AI planner and it will draft everything for you."
          action={
            <>
              <Button onClick={() => navigate('/app/events/new')}>
                <Plus className="h-4 w-4" /> Create your first event
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const nextEvent = events.find((e) => e.endDate >= todayISO());
  const taskChart = o.progress.map((p) => ({ name: p.event.title.replace(/^Sample:\s*/, ''), Done: p.tasksDone, Open: p.tasksTotal - p.tasksDone }));

  return (
    <div className="space-y-6">
      <WelcomeBanner
        name={firstName}
        subtitle={
          nextEvent
            ? daysUntil(nextEvent.startDate) > 0
              ? `${nextEvent.title} starts in ${daysUntil(nextEvent.startDate)} day${daysUntil(nextEvent.startDate) === 1 ? '' : 's'}. You have ${o.deadlines.length} open deadline${o.deadlines.length === 1 ? '' : 's'}.`
              : `${nextEvent.title} is live today. Good luck!`
            : 'All your events are wrapped up. Time to plan the next one?'
        }
        action={
          nextEvent && (
            <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25" onClick={() => navigate(`/app/events/${nextEvent.id}`)}>
              Open {nextEvent.title.replace(/^Sample:\s*/, '')} <ArrowRight className="h-4 w-4" />
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={o.counts.total}
          icon={<Layers className="h-[18px] w-[18px]" />}
          hint={`${o.attendeesTotal} attendees across all events`}
          onClick={() => navigate('/app/events')}
        />
        <StatCard
          label="Upcoming"
          value={o.counts.upcoming}
          icon={<CalendarClock className="h-[18px] w-[18px]" />}
          tone="accent"
          hint="Scheduled in the future"
          onClick={() => navigate('/app/events?status=upcoming')}
        />
        <StatCard
          label="Active"
          value={o.counts.active}
          icon={<PlayCircle className="h-[18px] w-[18px]" />}
          tone="success"
          hint="Happening right now"
          onClick={() => navigate('/app/events?status=active')}
        />
        <StatCard
          label="Completed"
          value={o.counts.completed}
          icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
          tone="warning"
          hint="Wrapped up"
          onClick={() => navigate('/app/events?status=completed')}
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/app/events/new')}>
          <Plus className="h-4 w-4" /> New event
        </Button>
        {nextEvent && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/app/events/${nextEvent.id}/schedule`)}>
            <CalendarDays className="h-4 w-4" /> Open scheduler
          </Button>
        )}
        {nextEvent && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/app/events/${nextEvent.id}/tasks`)}>
            <CheckCircle2 className="h-4 w-4" /> Task board
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => navigate('/app/analytics')}>
          <BarChart3 className="h-4 w-4" /> Analytics
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Event progress</CardTitle>
              <CardDescription>Readiness = 60% tasks done + 40% resources allocated</CardDescription>
            </div>
            <Link to="/app/events" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {o.progress
              .filter((p) => p.event.endDate >= todayISO())
              .slice(0, 5)
              .map((p) => (
                <Link key={p.event.id} to={`/app/events/${p.event.id}`} className="block rounded-lg p-2 transition hover:bg-muted/60">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: THEMES[p.event.theme].swatch }} />
                      <span className="truncate text-sm font-medium">{p.event.title}</span>
                      {p.event.isSample && <SampleBadge className="hidden sm:inline-flex" />}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.tasksDone}/{p.tasksTotal} tasks · {p.resourcePct}% resources
                    </span>
                  </div>
                  <Progress
                    value={snapLoading ? 0 : p.readiness}
                    tone={p.readiness >= 75 ? 'success' : p.readiness >= 40 ? 'primary' : 'warning'}
                    label={`${p.event.title} readiness`}
                  />
                </Link>
              ))}
            {o.progress.every((p) => p.event.endDate < todayISO()) && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="pt-5">
            <MonthCalendar items={calendarItems} compact onSelectDay={() => navigate('/app/calendar')} />
          </CardContent>
        </Card>

        {/* Task chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Tasks by event</CardTitle>
              <CardDescription>Completed vs open tasks</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="Done" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 4, 4]} />
                <Bar dataKey="Open" stackId="a" fill="hsl(var(--muted-foreground) / 0.25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Event mix</CardTitle>
              <CardDescription>By category</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={o.distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                  {o.distribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="-mt-4 flex flex-wrap justify-center gap-3 text-xs">
              {o.distribution.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming sessions */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming sessions</CardTitle>
              <CardDescription>Next on the schedule</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {o.upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>
            ) : (
              <ul className="space-y-3">
                {o.upcomingSessions.slice(0, 5).map(({ session, event }) => (
                  <li key={session.id}>
                    <Link to={`/app/events/${event.id}/schedule`} className="flex gap-3 rounded-lg p-1 transition hover:bg-muted/60">
                      <div className="w-12 shrink-0 rounded-lg bg-muted py-1.5 text-center">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">{prettyDate(session.day, 'MMM')}</p>
                        <p className="text-sm font-bold leading-none">{prettyDate(session.day, 'd')}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{session.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatTime(session.start)} · {event.title.replace(/^Sample:\s*/, '')}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Deadlines</CardTitle>
              <CardDescription>Open tasks by due date</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {o.deadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due. Nice!</p>
            ) : (
              <ul className="space-y-2.5">
                {o.deadlines.slice(0, 6).map(({ task, event }) => {
                  const d = daysUntil(task.dueDate);
                  return (
                    <li key={task.id}>
                      <Link
                        to={`/app/events/${event.id}/tasks`}
                        className="flex items-center justify-between gap-2 rounded-lg p-1 transition hover:bg-muted/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{task.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{event.title.replace(/^Sample:\s*/, '')}</span>
                        </span>
                        <Badge tone={d < 0 ? 'danger' : d <= 3 ? 'warning' : 'muted'}>{d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : `${d}d`}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Resources + activity */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Resource allocation</CardTitle>
              <CardDescription>Biggest shortages first</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {o.shortages.length === 0 ? (
              <p className="text-sm text-muted-foreground">All resources fully allocated.</p>
            ) : (
              o.shortages.slice(0, 5).map(({ resource, event, pct, missing }) => (
                <Link key={resource.id} to={`/app/events/${event.id}/resources`} className="block">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">
                      {resource.name} <span className="text-muted-foreground">· {event.title.replace(/^Sample:\s*/, '')}</span>
                    </span>
                    <span className={pct < 50 ? 'text-danger' : 'text-muted-foreground'}>{missing} short</span>
                  </div>
                  <Progress value={pct} tone={pct < 50 ? 'danger' : pct < 80 ? 'warning' : 'success'} label={`${resource.name} allocation`} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-primary" /> Recent activity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Activity from your events will appear here.</p>
            ) : (
              <ol className="relative grid gap-x-8 gap-y-3 border-l pl-5 md:grid-cols-2 md:border-l-0 md:pl-0">
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id} className="relative flex items-start gap-3 md:pl-5">
                    <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-primary md:left-0" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{a.text}</span>
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {relativeTime(a.createdAt)} ·{' '}
                        <Link to={`/app/events/${a.eventId}`} className="truncate hover:underline">
                          {a.eventTitle}
                        </Link>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WelcomeBanner({ name, subtitle, action }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 p-6 text-white shadow-lift sm:p-8">
      <div className="grid-bg absolute inset-0 opacity-15" />
      <Sparkles className="absolute right-6 top-6 h-24 w-24 opacity-10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-white/80">
            <CalendarCheck className="h-4 w-4" /> {prettyDate(todayISO(), 'EEEE, MMMM d')}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            {greeting()}, {name} 👋
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/85">{subtitle}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
