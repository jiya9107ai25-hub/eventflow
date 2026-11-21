/**
 * Calendar helpers shared by email invites and the Google Calendar sync.
 * Event times are stored as local "yyyy-MM-dd" + "HH:mm" strings.
 */

const compact = (day, time = '00:00') => `${day.replace(/-/g, '')}T${time.replace(':', '')}00`;

function escapeIcs(text = '') {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold long lines to 75 octets as required by RFC 5545. */
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

/** "Add to Google Calendar" template link — works without any API keys. */
export function googleCalendarLink({ title, details = '', location = '', day, start, endDay, end, timeZone }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${compact(day, start)}/${compact(endDay ?? day, end)}`,
    details,
    location,
  });
  if (timeZone) params.set('ctz', timeZone);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an .ics file containing the event (one entry spanning its dates) and
 * every scheduled session. Uses TZID so calendars show the right local time.
 */
export function buildIcs({ event, sessions = [], rooms = [], timeZone = 'UTC' }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const roomName = (id) => rooms.find((r) => r.id === id)?.name ?? '';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventFlow//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];

  const vevent = (uid, title, day, start, endDay, end, location, description) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}@eventflow`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${timeZone}:${compact(day, start)}`,
      `DTEND;TZID=${timeZone}:${compact(endDay, end)}`,
      fold(`SUMMARY:${escapeIcs(title)}`),
      fold(`LOCATION:${escapeIcs(location)}`),
      fold(`DESCRIPTION:${escapeIcs(description)}`),
      'END:VEVENT',
    );
  };

  vevent(event.id ?? 'event', event.title, event.startDate, event.dailyStart, event.endDate, event.dailyEnd, `${event.venue}, ${event.city}`, event.description);
  for (const s of sessions) {
    const room = roomName(s.roomId);
    vevent(`${event.id ?? 'event'}-${s.id}`, `${s.title} · ${event.title}`, s.day, s.start, s.day, s.end, [room, event.venue].filter(Boolean).join(', '), s.description ?? '');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
