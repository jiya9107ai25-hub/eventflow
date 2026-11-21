import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  BellRing,
  Boxes,
  CalendarDays,
  CalendarRange,
  CalendarX,
  Eye,
  LogOut,
  KanbanSquare,
  LayoutGrid,
  MapPin,
  MessagesSquare,
  Mic2,
  Pencil,
  UserCog,
  Users,
} from 'lucide-react';
import { Badge, Button, EmptyState, Select, Skeleton } from '@/components/ui';
import { SampleBadge } from '@/components/common/SampleBadge';
import { PageLoader } from '@/components/common/PageLoader';
import { WorkspaceProvider, useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useUnread } from '@/features/workspace/useUnread';
import { useEventAlerts } from '@/features/alerts/useEventAlerts';
import { CalendarMenu } from '@/features/calendar/CalendarMenu';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { backend } from '@/services';
import { CATEGORY_META, THEMES } from '@/lib/constants';
import { dateRange, eventStatus, formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';

/* Each workspace module is code-split and only loaded when its tab opens. */
const Overview = lazy(() => import('@/features/workspace/overview/Overview'));
const Scheduler = lazy(() => import('@/features/scheduler/Scheduler'));
const SpeakersRooms = lazy(() => import('@/features/workspace/venue/SpeakersRooms'));
const Attendees = lazy(() => import('@/features/attendees/Attendees'));
const Team = lazy(() => import('@/features/team/Team'));
const Resources = lazy(() => import('@/features/resources/Resources'));
const TaskBoard = lazy(() => import('@/features/tasks/TaskBoard'));
const Chat = lazy(() => import('@/features/chat/Chat'));
const Alerts = lazy(() => import('@/features/alerts/Alerts'));

export default function EventWorkspace() {
  const { eventId = '' } = useParams();
  // key={eventId} remounts the provider so no state can leak between events.
  return (
    <WorkspaceProvider key={eventId} eventId={eventId}>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}

function WorkspaceShell() {
  const { event, eventLoading, messages, role, canEdit } = useWorkspace();
  const { events } = useEvents();
  const toast = useToast();
  const user = useUser();
  const navigate = useNavigate();
  const { unread } = useUnread(user.uid, event?.id ?? '', messages);
  const alerts = useEventAlerts();

  if (eventLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-10 w-full" />
        <PageLoader />
      </div>
    );
  }
  if (!event) {
    return (
      <EmptyState
        icon={<CalendarX className="h-7 w-7" />}
        title="Event not found"
        description="This event doesn't exist or you don't have permission to view it."
        action={<Button onClick={() => navigate('/app/events')}>Back to events</Button>}
      />
    );
  }

  const Cat = CATEGORY_META[event.category].icon;
  const status = eventStatus(event);
  // Viewers (joined with the event password) only see the plan — not attendee details, the team, chat or emails.
  const allTabs = [
    { to: '', label: 'Overview', icon: LayoutGrid, end: true },
    { to: 'schedule', label: 'Schedule', icon: CalendarRange },
    { to: 'speakers', label: 'Speakers & Rooms', icon: Mic2 },
    { to: 'attendees', label: 'Attendees', icon: Users, private: true },
    { to: 'team', label: 'Team', icon: UserCog, private: true },
    { to: 'resources', label: 'Resources', icon: Boxes },
    { to: 'tasks', label: 'Tasks', icon: KanbanSquare },
    { to: 'chat', label: 'Chat', icon: MessagesSquare, badge: unread, private: true },
    { to: 'alerts', label: 'Alerts & Email', icon: BellRing, badge: alerts.total, private: true },
  ];
  const tabs = canEdit ? allTabs : allTabs.filter((t) => !t.private);
  const roleLabel = role === 'admin' ? '👑 Admin' : role === 'organizer' ? 'Organizer' : '👁 View only';

  const leave = async () => {
    try {
      await backend.leaveViewing(event.id, user.uid);
      toast.info('You left this event', 'You can join again with the event password.');
      navigate('/app/browse');
    } catch (e) {
      toast.error('Could not leave', e.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className={cn('relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lift', THEMES[event.theme].gradient)}>
        {event.bannerUrl && <img src={event.bannerUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        <div className="relative flex flex-col gap-5 p-6 sm:p-7 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                <Cat className="h-3.5 w-3.5" /> {CATEGORY_META[event.category].label}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium capitalize backdrop-blur">{status}</span>
              {event.isSample && <SampleBadge className="bg-amber-300 text-amber-950 dark:text-amber-950" />}
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                {roleLabel} · {event.memberIds.length} organizer{event.memberIds.length === 1 ? '' : 's'}
              </span>
            </div>
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{event.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {dateRange(event)} · {formatTime(event.dailyStart)}–{formatTime(event.dailyEnd)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {event.venue}, {event.city}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <CalendarMenu />
            {canEdit && (
              <Select
                aria-label="Switch event"
                value={event.id}
                onChange={(e) => navigate(`/app/events/${e.target.value}`)}
                className="h-9 w-44 border-white/30 bg-white/15 text-white backdrop-blur [&>option]:text-foreground"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </Select>
            )}
            {canEdit ? (
              <Button
                size="sm"
                variant="secondary"
                className="h-9 bg-white/15 text-white hover:bg-white/25"
                onClick={() => navigate(`/app/events/${event.id}/edit`)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            ) : (
              <Button size="sm" variant="secondary" className="h-9 bg-white/15 text-white hover:bg-white/25" onClick={leave}>
                <LogOut className="h-4 w-4" /> Leave
              </Button>
            )}
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-300">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>View only.</b> You opened this event with its password, so you can see the plan but not change it. Only the admin and the organizers they allow
            can edit.
          </p>
        </div>
      )}

      {/* Tabs */}
      <nav aria-label="Event sections" className="scrollbar-thin -mx-4 mb-6 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {tabs.map(({ to, label, icon: Icon, end, badge }) => (
            <li key={label}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-11 items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground',
                    isActive && 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary hover:text-primary',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
                {!!badge && (
                  <Badge tone="danger" className="h-5 min-w-5 justify-center px-1.5" aria-label={`${badge} unread`}>
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="schedule" element={<Scheduler />} />
          <Route path="speakers" element={<SpeakersRooms />} />
          {canEdit && <Route path="attendees" element={<Attendees />} />}
          {canEdit && <Route path="team" element={<Team />} />}
          <Route path="resources" element={<Resources />} />
          <Route path="tasks" element={<TaskBoard />} />
          {canEdit && <Route path="chat" element={<Chat />} />}
          {canEdit && <Route path="alerts" element={<Alerts />} />}
        </Routes>
      </Suspense>
    </div>
  );
}
