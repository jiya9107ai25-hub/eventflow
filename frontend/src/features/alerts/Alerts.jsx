import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, Boxes, CalendarClock, CalendarX2, CheckCircle2, Clock, ExternalLink, Eye, Mail, MailCheck, MailX, Send } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Skeleton, Textarea } from '@/components/ui';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useCollection } from '@/hooks/useCollection';
import { useUser } from '@/context/AuthContext';
import { relativeTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useEmail } from './useEmail';
import { useEventAlerts } from './useEventAlerts';

const TEMPLATES = [
  { id: 'alert-digest', label: 'Alert digest', desc: 'All open conflicts, clashes, shortages and overdue tasks', icon: BellRing },
  { id: 'event-invite', label: 'Invitation', desc: 'Event details + Google Calendar link + .ics attachment', icon: CalendarClock },
  { id: 'event-reminder', label: 'Reminder', desc: 'Upcoming-event reminder with calendar attachment', icon: Clock },
];

const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'muted' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Alerts() {
  const event = useWorkspaceEvent();
  const user = useUser();
  const { team, sessions, rooms } = useWorkspace();
  const alerts = useEventAlerts();
  const { send, sending } = useEmail();
  const history = useCollection(event.id, 'notifications', { orderBy: 'createdAt', limitLast: 50 });

  const [template, setTemplate] = useState('alert-digest');
  const [selected, setSelected] = useState(() => new Set(user.email ? [user.email] : []));
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');

  const people = useMemo(() => {
    const list = [
      { key: user.email, name: `${user.displayName} (you)`, sub: user.email },
      ...team.map((m) => ({ key: m.email, name: m.name, sub: `${m.role} · ${m.email}` })),
    ];
    return list.filter((p, i, arr) => p.key && arr.findIndex((x) => x.key.toLowerCase() === p.key.toLowerCase()) === i);
  }, [team, user]);

  const customList = custom
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = customList.filter((e) => !EMAIL_RE.test(e));
  const recipients = [...selected, ...customList.filter((e) => EMAIL_RE.test(e))];

  const toggle = (email) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(email) ? n.delete(email) : n.add(email);
      return n;
    });

  const onSend = async () => {
    const withCalendar = template !== 'alert-digest';
    const res = await send({
      event,
      to: recipients,
      template: template === 'event-reminder' ? 'event-invite' : template,
      data:
        template === 'alert-digest'
          ? { ...alerts.digest, note: message }
          : {
              message,
              kind: template === 'event-reminder' ? 'reminder' : 'invite',
              sessions: [...sessions].sort((a, b) => `${a.day}${a.start}`.localeCompare(`${b.day}${b.start}`)).map((s) => `${s.day} ${s.start} — ${s.title}`),
            },
      calendar: withCalendar ? { sessions, rooms } : undefined,
    });
    if (res) {
      setMessage('');
      setCustom('');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="space-y-4 xl:col-span-3">
        <div className={cn('flex items-center gap-3 rounded-xl border p-4', alerts.total ? 'border-danger/30 bg-danger/5' : 'border-success/30 bg-success/5')}>
          {alerts.total ? <AlertTriangle className="h-5 w-5 text-danger" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
          <p className="text-sm font-medium">
            {alerts.total ? `${alerts.total} item(s) need attention. Send a digest email to your team on the right.` : 'No open alerts for this event.'}
          </p>
        </div>

        <Section
          icon={<CalendarX2 className="h-4 w-4" />}
          title="Date clashes with your other events"
          count={alerts.clashes.length}
          to={`/app/events/${event.id}/edit`}
        >
          <ul className="space-y-2">
            {alerts.clashes.map((c) => (
              <li key={c.other.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                <span>{c.message}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone={SEVERITY_TONE[c.severity]} className="capitalize">
                    {c.severity}
                  </Badge>
                  <Link to={`/app/events/${c.other.id}`} className="text-muted-foreground hover:text-primary" aria-label={`Open ${c.other.title}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<AlertTriangle className="h-4 w-4" />} title="Scheduling conflicts" count={alerts.conflicts.length} to="../schedule">
          <ul className="space-y-1.5 text-sm">
            {alerts.conflicts.map((c, i) => (
              <li key={i} className="flex gap-2">
                <Badge tone="danger" className="capitalize">
                  {c.kind}
                </Badge>
                {c.message}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Boxes className="h-4 w-4" />} title="Resource shortages" count={alerts.shortages.length} to="../resources">
          <ul className="space-y-1.5 text-sm">
            {alerts.shortages.map((r) => (
              <li key={r.id}>
                <b>{r.name}</b>: {r.allocated}/{r.required} {r.unit} — {r.required - r.allocated} short
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Clock className="h-4 w-4" />} title="Overdue tasks" count={alerts.overdue.length} to="../tasks">
          <ul className="space-y-1.5 text-sm">
            {alerts.digest?.overdue.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Send email
              </CardTitle>
              <CardDescription>Email alerts, invitations or reminders to your team.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div role="radiogroup" aria-label="Email type" className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={template === t.id}
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40',
                    template === t.id && 'border-primary bg-primary/5 ring-2 ring-primary/15',
                  )}
                >
                  <t.icon className={cn('mt-0.5 h-4 w-4', template === t.id ? 'text-primary' : 'text-muted-foreground')} />
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Recipients</p>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-1.5 scrollbar-thin">
                {people.map((p) => (
                  <label key={p.key} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted">
                    <input type="checkbox" checked={selected.has(p.key)} onChange={() => toggle(p.key)} className="accent-[hsl(var(--primary))]" />
                    <Avatar name={p.name} size={24} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.sub}</span>
                    </span>
                  </label>
                ))}
                {team.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Add team members in the Team tab to email them quickly.</p>}
              </div>
              <Input
                className="mt-2"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Other emails, comma separated"
                aria-label="Other recipient emails"
                aria-invalid={invalid.length > 0}
              />
              {invalid.length > 0 && <p className="mt-1 text-xs text-danger">Invalid: {invalid.join(', ')}</p>}
            </div>

            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional personal message"
              aria-label="Message"
              maxLength={1000}
            />

            <Button className="w-full" onClick={onSend} loading={sending} disabled={!recipients.length || invalid.length > 0}>
              <Send className="h-4 w-4" /> Send to {recipients.length} recipient{recipients.length === 1 ? '' : 's'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Email history</CardTitle>
              <CardDescription>Every email sent for this event</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {history.loading ? (
              <Skeleton className="h-24" />
            ) : history.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails sent yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...history.data].reverse().map((n) => (
                  <li key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                    {n.status === 'sent' ? (
                      <MailCheck className="mt-0.5 h-4 w-4 text-success" />
                    ) : n.status === 'preview' ? (
                      <Eye className="mt-0.5 h-4 w-4 text-sky-500" />
                    ) : (
                      <MailX className="mt-0.5 h-4 w-4 text-danger" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{n.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        To {n.to.join(', ')} · {relativeTime(n.createdAt)} · by {n.sentBy}
                      </p>
                      {n.error && <p className="text-xs text-danger">{n.error}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={n.status === 'sent' ? 'success' : n.status === 'preview' ? 'info' : 'danger'} className="capitalize">
                        {n.status}
                      </Badge>
                      {n.previewUrl && (
                        <a href={n.previewUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                          View
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ icon, title, count, children, to }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', count ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success')}>
            {count ? icon : <CheckCircle2 className="h-4 w-4" />}
          </span>
          <CardTitle>{title}</CardTitle>
          <Badge tone={count ? 'danger' : 'success'}>{count}</Badge>
        </div>
        {to && count > 0 && (
          <Link to={to} className="text-sm font-medium text-primary hover:underline">
            Fix
          </Link>
        )}
      </CardHeader>
      <CardContent>{count ? children : <p className="text-sm text-muted-foreground">Nothing here — all clear.</p>}</CardContent>
    </Card>
  );
}
