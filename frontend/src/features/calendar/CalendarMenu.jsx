import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { Dropdown } from '@/components/ui';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { downloadIcs, eventGoogleUrl } from '@/lib/calendar';

/**
 * "Calendar" actions in the event header — no server or Google API keys needed:
 *  1. Add to Google Calendar — pre-filled Google Calendar event page
 *  2. Download .ics — the event + every session, for Google/Outlook/Apple Calendar
 *     (in Google Calendar: Settings → Import & export → Import)
 */
export function CalendarMenu() {
  const event = useWorkspaceEvent();
  const { sessions, rooms } = useWorkspace();
  const toast = useToast();

  return (
    <Dropdown
      label="Calendar options"
      trigger={
        <span className="inline-flex h-9 items-center gap-2 rounded-md bg-white/15 px-3 text-xs font-medium text-white backdrop-blur transition hover:bg-white/25">
          <CalendarPlus className="h-4 w-4" /> Calendar
        </span>
      }
      items={[
        {
          label: 'Add to Google Calendar',
          icon: <ExternalLink className="h-4 w-4" />,
          onSelect: () => window.open(eventGoogleUrl(event), '_blank', 'noopener'),
        },
        {
          label: `Download .ics (event + ${sessions.length} sessions)`,
          icon: <Download className="h-4 w-4" />,
          onSelect: () => {
            downloadIcs(event, sessions, rooms);
            toast.success('Calendar file downloaded', 'Import it in Google Calendar (Settings → Import & export) or open it with Outlook / Apple Calendar.');
          },
        },
      ]}
    />
  );
}
