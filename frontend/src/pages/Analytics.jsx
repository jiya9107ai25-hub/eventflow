import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  ComposedChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Users } from 'lucide-react';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/ui';
import { StatCard } from '@/components/common/StatCard';
import { ChartTooltip, CHART_COLORS } from '@/components/common/ChartTooltip';
import { useEvents } from '@/context/EventsContext';
import { useEventsOverview } from '@/hooks/useEventsOverview';
import { overview, registrationSeries } from '@/lib/analytics';
import { daysUntil, prettyDate } from '@/lib/time';
import { pct } from '@/lib/utils';
import { TICKET_LABEL } from '@/lib/constants';

const short = (t) => t.replace(/^Sample:\s*/, '');
const axis = { tickLine: false, axisLine: false, fontSize: 12, stroke: 'hsl(var(--muted-foreground))' };

export default function Analytics() {
  const { events, loading, error } = useEvents();
  const [scope, setScope] = useState('all');
  const scoped = useMemo(() => (scope === 'all' ? events : events.filter((e) => e.id === scope)), [events, scope]);
  const { byEvent, loading: snapLoading } = useEventsOverview(scoped);
  const o = useMemo(() => overview(scoped, byEvent), [scoped, byEvent]);

  const regSeries = useMemo(
    () =>
      registrationSeries(
        scoped.flatMap((e) => (byEvent[e.id]?.attendees ?? []).map((a) => a.createdAt)),
        21,
      ),
    [scoped, byEvent],
  );

  // Attendees by type (student / parent / faculty …) — planning numbers, no attendance tracking.
  const attendeeStatus = useMemo(() => {
    const all = scoped.flatMap((e) => byEvent[e.id]?.attendees ?? []);
    return Object.entries(TICKET_LABEL)
      .map(([k, label]) => ({ name: label, value: all.filter((a) => (a.ticketType ?? 'general') === k).length }))
      .filter((d) => d.value > 0);
  }, [scoped, byEvent]);

  const volunteers = useMemo(
    () =>
      scoped
        .map((e) => {
          const people = (byEvent[e.id]?.resources ?? []).filter((r) => r.category === 'people');
          const req = people.reduce((s, r) => s + r.required, 0);
          const alloc = people.reduce((s, r) => s + r.allocated, 0);
          return { name: short(e.title), Allocated: alloc, Missing: Math.max(0, req - alloc) };
        })
        .filter((r) => r.Allocated + r.Missing > 0),
    [scoped, byEvent],
  );

  const totalTasks = o.taskTotals.todo + o.taskTotals.in_progress + o.taskTotals.done;
  const completion = pct(o.taskTotals.done, totalTasks);

  if (loading) return <Skeleton className="h-96" />;
  if (error && events.length === 0)
    return (
      <EmptyState
        icon={<AlertTriangle className="h-7 w-7" />}
        title="Could not load your events"
        description={error.message}
        action={<Button onClick={() => window.location.reload()}>Refresh</Button>}
      />
    );
  if (events.length === 0)
    return (
      <EmptyState
        icon={<BarChart3 className="h-7 w-7" />}
        title="No data yet"
        description="Analytics are calculated from your events: attendees, tasks, resources and schedule. Create an event to see charts here."
        action={<ButtonLink to="/app/events/new">Create an event</ButtonLink>}
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & reports"
        description="Live insights derived from your events' tasks, resources and attendees."
        actions={
          <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Analytics scope" className="w-56">
            <option value="all">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Task completion"
          value={`${completion}%`}
          icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
          tone="success"
          hint={`${o.taskTotals.done} of ${totalTasks} tasks`}
        />
        <StatCard label="Attendees" value={o.attendeesTotal} icon={<Users className="h-[18px] w-[18px]" />} tone="accent" hint="Imported or added" />
        <StatCard
          label="Resource shortages"
          value={o.shortages.length}
          icon={<AlertTriangle className="h-[18px] w-[18px]" />}
          tone="warning"
          hint={`${o.shortages.reduce((s, x) => s + x.missing, 0)} units missing`}
        />
        <StatCard
          label="Open deadlines"
          value={o.deadlines.length}
          icon={<Clock className="h-[18px] w-[18px]" />}
          hint={`${o.deadlines.filter((d) => daysUntil(d.task.dueDate) < 0).length} overdue`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Attendee registrations</CardTitle>
              <CardDescription>Cumulative registrations, last 21 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {snapLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={regSeries}>
                  <defs>
                    <linearGradient id="reg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" {...axis} interval="preserveStartEnd" />
                  <YAxis {...axis} allowDecimals={false} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" name="Total" stroke={CHART_COLORS[0]} strokeWidth={2.5} fill="url(#reg)" />
                  <Bar dataKey="daily" name="New" fill={CHART_COLORS[1]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Overall task completion</CardTitle>
              <CardDescription>Across selected events</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="72%"
                outerRadius="100%"
                data={[{ name: 'Done', value: completion, fill: CHART_COLORS[2] }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: 'hsl(var(--muted))' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-bold">{completion}%</span>
              <span className="text-xs text-muted-foreground">
                {o.taskTotals.in_progress} in progress · {o.taskTotals.todo} to do
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Event completion progress</CardTitle>
              <CardDescription>Tasks done and resources allocated per event</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={o.progress.map((p) => ({ name: short(p.event.title), Tasks: p.taskPct, Resources: p.resourcePct }))} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} domain={[0, 100]} unit="%" width={44} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Tasks" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Resources" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attendees by type</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={attendeeStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                  {attendeeStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-xs capitalize">
              {attendeeStatus.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Volunteer & people allocation</CardTitle>
              <CardDescription>Volunteers, mentors, judges and other people resources</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {volunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No people resources defined yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volunteers} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" {...axis} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axis} width={110} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Allocated" stackId="v" fill={CHART_COLORS[1]} />
                  <Bar dataKey="Missing" stackId="v" fill={CHART_COLORS[4]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Event distribution</CardTitle>
              <CardDescription>By category</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={o.distribution}>
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                  {o.distribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Resource shortages</CardTitle>
              <CardDescription>Everything not yet fully allocated</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {o.shortages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shortages. Everything is allocated.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 font-medium">Resource</th>
                      <th className="font-medium">Event</th>
                      <th className="text-right font-medium">Allocated</th>
                      <th className="text-right font-medium">Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.shortages.map(({ resource, event, missing, pct: p }) => (
                      <tr key={resource.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{resource.name}</td>
                        <td>
                          <Link className="hover:underline" to={`/app/events/${event.id}/resources`}>
                            {short(event.title)}
                          </Link>
                        </td>
                        <td className="text-right">
                          {resource.allocated}/{resource.required} <span className="text-muted-foreground">({p}%)</span>
                        </td>
                        <td className="text-right">
                          <Badge tone={p < 50 ? 'danger' : 'warning'}>
                            {missing} {resource.unit}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming deadlines</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {o.deadlines.slice(0, 7).map(({ task, event }) => {
                const d = daysUntil(task.dueDate);
                return (
                  <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{task.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {prettyDate(task.dueDate, 'MMM d')} · {short(event.title)}
                      </span>
                    </span>
                    <Badge tone={d < 0 ? 'danger' : d <= 3 ? 'warning' : 'muted'}>{d < 0 ? 'Overdue' : `${d}d`}</Badge>
                  </li>
                );
              })}
              {o.deadlines.length === 0 && <p className="text-sm text-muted-foreground">No open deadlines.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
