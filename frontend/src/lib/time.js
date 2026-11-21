import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** "09:30" → 570 */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 570 → "09:30" */
export function fromMinutes(mins) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime(hhmm) {
  const mins = toMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isoPlusDays(days, from = new Date()) {
  return format(addDays(from, days), 'yyyy-MM-dd');
}

/** All yyyy-MM-dd days between start and end inclusive. */
export function eventDays(event) {
  const start = parseISO(event.startDate);
  const n = Math.max(0, differenceInCalendarDays(parseISO(event.endDate), start));
  return Array.from({ length: Math.min(n + 1, 31) }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
}

export function eventStatus(event, today = todayISO()) {
  if (event.endDate < today) return 'completed';
  if (event.startDate > today) return 'upcoming';
  return 'active';
}

export function daysUntil(iso) {
  return differenceInCalendarDays(parseISO(iso), new Date());
}

export function prettyDate(iso, pattern = 'MMM d, yyyy') {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function dateRange(event) {
  if (event.startDate === event.endDate) return prettyDate(event.startDate, 'EEE, MMM d, yyyy');
  const sameYear = event.startDate.slice(0, 4) === event.endDate.slice(0, 4);
  return `${prettyDate(event.startDate, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${prettyDate(event.endDate)}`;
}

export function relativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return format(ts, 'MMM d');
}
