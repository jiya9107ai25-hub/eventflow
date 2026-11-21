import { useCallback, useState } from 'react';
import { api, ApiError, eventPayload } from '@/services/api';
import { backend } from '@/services';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { dateRange } from '@/lib/time';

/**
 * Sends an email through the backend, records it in the event's
 * `notifications` history and shows an "email sent" alert (toast).
 */
export function useEmail() {
  const user = useUser();
  const toast = useToast();
  const { log } = useEvents();
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async ({ event, to, template, data = {}, calendar, quiet }) => {
      const recipients = [...new Set(to.map((t) => t.trim().toLowerCase()).filter(Boolean))];
      if (!recipients.length) {
        toast.warning('Add at least one recipient');
        return null;
      }
      setSending(true);
      try {
        const res = await api.sendEmail({ to: recipients, template, data: { ...data, event: eventPayload(event, dateRange(event)) }, calendar });
        await backend
          .addSub(event.id, 'notifications', {
            template,
            subject: res.subject,
            to: recipients,
            status: res.status,
            ...(res.previewUrl ? { previewUrl: res.previewUrl } : {}),
            sentBy: user.displayName,
            createdAt: Date.now(),
          })
          .catch(() => undefined);
        log({ eventId: event.id, eventTitle: event.title, text: `Emailed “${res.subject}” to ${recipients.length} recipient(s)`, kind: 'message' });
        if (!quiet) {
          if (res.status === 'sent') toast.success(`Email sent to ${recipients.length} recipient(s)`, res.subject);
          else
            toast.toast({
              kind: 'info',
              title: 'Email ready (preview mode)',
              description: 'No email provider is configured on the backend, so it was saved as a preview.',
              action: res.previewUrl ? { label: 'View email', href: res.previewUrl } : undefined,
            });
        }
        return res;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Unexpected error';
        await backend
          .addSub(event.id, 'notifications', {
            template,
            subject: `Failed: ${template}`,
            to: recipients,
            status: 'failed',
            error: msg,
            sentBy: user.displayName,
            createdAt: Date.now(),
          })
          .catch(() => undefined);
        toast.error('Email not sent', msg);
        return null;
      } finally {
        setSending(false);
      }
    },
    [toast, user.displayName, log],
  );

  return { send, sending };
}
