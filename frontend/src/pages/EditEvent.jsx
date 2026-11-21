import { useNavigate, useParams } from 'react-router-dom';
import { CalendarX } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { PageLoader } from '@/components/common/PageLoader';
import { EventWizard } from '@/features/events/EventWizard';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { backend } from '@/services';
import { useUser } from '@/context/AuthContext';
import { useEmail } from '@/features/alerts/useEmail';

export default function EditEvent() {
  const { eventId = '' } = useParams();
  const { events, loading, log } = useEvents();
  const toast = useToast();
  const navigate = useNavigate();
  const event = events.find((e) => e.id === eventId);
  const user = useUser();
  const { send } = useEmail();

  if (loading) return <PageLoader />;
  if (!event)
    return (
      <EmptyState
        icon={<CalendarX className="h-7 w-7" />}
        title="Event not found"
        description="It may have been deleted, or you don't have access."
        action={<Button onClick={() => navigate('/app/events')}>Back to events</Button>}
      />
    );

  const { id: _id, ownerId: _o, memberIds: _m, createdAt: _c, updatedAt: _u, isSample: _s, ...initial } = event;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit event" description={event.title} />
      <EventWizard
        key={event.id}
        initial={{ ...initial, bannerUrl: initial.bannerUrl ?? '' }}
        otherEvents={events}
        editingId={event.id}
        submitLabel="Save changes"
        onCancel={() => navigate(`/app/events/${event.id}`)}
        onSubmit={async (values, { emailClashAlert, clashes }) => {
          try {
            await backend.updateEvent(event.id, values);
            log({ eventId: event.id, eventTitle: values.title, text: 'Updated event details', kind: 'event' });
            toast.success('Event updated');
            if (emailClashAlert && user.email)
              void send({ event: { ...event, ...values }, to: [user.email], template: 'date-clash', data: { clashes: clashes.map((c) => c.message) } });
            navigate(`/app/events/${event.id}`);
          } catch (e) {
            toast.error('Could not save changes', e.message);
          }
        }}
      />
    </div>
  );
}
