import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { Badge, Dropdown, Progress } from '@/components/ui';
import { CATEGORY_META, THEMES } from '@/lib/constants';
import { dateRange, daysUntil, eventStatus } from '@/lib/time';
import { SampleBadge } from './SampleBadge';
import { useEvents } from '@/context/EventsContext';
import { cn } from '@/lib/utils';

const STATUS_TONE = { upcoming: 'info', active: 'success', completed: 'muted' };

export const EventCard = memo(function EventCard({ progress, onDelete, clashCount = 0 }) {
  const { event } = progress;
  const navigate = useNavigate();
  const { roleOf } = useEvents();
  const isAdmin = roleOf(event) === 'admin';
  const status = eventStatus(event);
  const Cat = CATEGORY_META[event.category].icon;
  const d = daysUntil(event.startDate);

  return (
    <article
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-within:ring-2 focus-within:ring-primary/30"
      onClick={() => navigate(`/app/events/${event.id}`)}
    >
      <div className={cn('relative h-24 bg-gradient-to-br', THEMES[event.theme].gradient)}>
        {event.bannerUrl && <img src={event.bannerUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur">
          <Cat className="h-4 w-4" />
        </div>
        <div className="absolute right-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            label={`Actions for ${event.title}`}
            trigger={
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-white backdrop-blur transition hover:bg-white/30">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            }
            items={[
              { label: 'Edit event', icon: <Pencil className="h-4 w-4" />, onSelect: () => navigate(`/app/events/${event.id}/edit`) },
              ...(onDelete && isAdmin
                ? [{ label: 'Delete event', icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: () => onDelete(event.id) }]
                : []),
            ]}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={STATUS_TONE[status]} className="capitalize">
            {status === 'upcoming' && d > 0 ? `In ${d} day${d === 1 ? '' : 's'}` : status}
          </Badge>
          <Badge tone="muted">{CATEGORY_META[event.category].label}</Badge>
          {event.isSample && <SampleBadge />}
          {!isAdmin && (
            <Badge tone="info" title="You were invited as a co-organizer">
              Shared with you
            </Badge>
          )}
          {clashCount > 0 && status !== 'completed' && (
            <Badge tone="danger" title="Dates overlap your other events">
              Date clash
            </Badge>
          )}
        </div>
        <h3 className="line-clamp-1 font-semibold">
          <button
            className="text-left outline-none after:absolute after:inset-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/app/events/${event.id}`);
            }}
          >
            {event.title}
          </button>
        </h3>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {dateRange(event)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {event.venue}, {event.city}
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {progress.attendees} / {event.expectedAttendees} attendees
          </p>
        </div>
        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium">Readiness</span>
            <span className="text-muted-foreground">{progress.readiness}%</span>
          </div>
          <Progress
            value={progress.readiness}
            tone={progress.readiness >= 75 ? 'success' : progress.readiness >= 40 ? 'primary' : 'warning'}
            label={`${event.title} readiness`}
          />
        </div>
      </div>
    </article>
  );
});
