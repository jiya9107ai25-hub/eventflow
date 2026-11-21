import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui';
import { EventWizard } from '@/features/events/EventWizard';
import { useEmail } from '@/features/alerts/useEmail';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { backend } from '@/services';

export default function CreateEvent() {
  const user = useUser();
  const { events, log } = useEvents();
  const toast = useToast();
  const navigate = useNavigate();
  const { send } = useEmail();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Create a new event" description="Fill in the six steps — you can change everything later." />

      <EventWizard
        otherEvents={events}
        submitLabel="Create event"
        onCancel={() => navigate(-1)}
        onSubmit={async (values, { emailClashAlert, clashes, viewerPassword }) => {
          try {
            const id = await backend.createEvent(user.uid, values, { name: user.displayName, email: user.email });
            log({ eventId: id, eventTitle: values.title, text: `Created event “${values.title}”`, kind: 'event' });
            if (viewerPassword && viewerPassword.length >= 4) {
              await backend.setEventPassword(id, viewerPassword).catch((e) => toast.error('Event created, but the password was not saved', e.message));
            }
            toast.success('Event created', 'Your workspace is ready — let’s set it up.');
            if (emailClashAlert && user.email) {
              const now = Date.now();
              void send({
                event: { ...values, id, ownerId: user.uid, memberIds: [user.uid], createdAt: now, updatedAt: now },
                to: [user.email],
                template: 'date-clash',
                data: { clashes: clashes.map((c) => c.message) },
              });
            }
            navigate(`/app/events/${id}`);
          } catch (e) {
            toast.error('Could not create event', e.message);
          }
        }}
      />
    </div>
  );
}