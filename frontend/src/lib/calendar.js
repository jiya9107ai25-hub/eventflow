/**
 * Zero-setup calendar integration:
 *  - "Add to Google Calendar" template links (no API key, no login)
 *  - .ics download that works with Google, Outlook and Apple Calendar
 * Full two-way sync of all sessions uses the backend's Google OAuth flow instead.
 */

const compact = (day, time) => `${day.replace(/-/g, '')}T${time.replace(':', '')}00`;
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function googleCalendarUrl(opts) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${compact(opts.day, opts.start)}/${compact(opts.endDay ?? opts.day, opts.end)}`,
    details: opts.details ?? '',
    location: opts.location ?? '',
    ctz: tz(),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export const eventGoogleUrl = (e) =>
  googleCalendarUrl({
    title: e.title,
    details: `${e.description}\n\n${window.location.origin}/app/events/${e.id}`,
    location: `${e.venue}, ${e.city}`,
    day: e.startDate,
    start: e.dailyStart,
    endDay: e.endDate,
    end: e.dailyEnd,
  });

export const sessionGoogleUrl = (e, s, room) =>
  googleCalendarUrl({
    title: `${s.title} · ${e.title}`,
    details: s.description,
    location: [room?.name, e.venue, e.city].filter(Boolean).join(', '),
    day: s.day,
    start: s.start,
    end: s.end,
  });

const esc = (t = '') => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function buildIcs(e, sessions, rooms) {
  const zone = tz();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventFlow//EN', 'CALSCALE:GREGORIAN'];
  const add = (uid, title, d1, t1, d2, t2, loc, desc) =>
    out.push(
      'BEGIN:VEVENT',
      `UID:${uid}@eventflow`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${zone}:${compact(d1, t1)}`,
      `DTEND;TZID=${zone}:${compact(d2, t2)}`,
      `SUMMARY:${esc(title)}`,
      `LOCATION:${esc(loc)}`,
      `DESCRIPTION:${esc(desc)}`,
      'END:VEVENT',
    );
  add(e.id, e.title, e.startDate, e.dailyStart, e.endDate, e.dailyEnd, `${e.venue}, ${e.city}`, e.description);
  for (const s of sessions)
    add(
      `${e.id}-${s.id}`,
      `${s.title} · ${e.title}`,
      s.day,
      s.start,
      s.day,
      s.end,
      [rooms.find((r) => r.id === s.roomId)?.name, e.venue].filter(Boolean).join(', '),
      s.description,
    );
  out.push('END:VCALENDAR');
  return out.join('\r\n');
}

export function downloadIcs(e, sessions, rooms) {
  const url = URL.createObjectURL(new Blob([buildIcs(e, sessions, rooms)], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
