import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { EventDoc } from '@/types';
import { toMinutes } from './time';

export interface EventClash {
  other: Pick<EventDoc, 'id' | 'title' | 'startDate' | 'endDate' | 'venue' | 'city' | 'dailyStart' | 'dailyEnd'>;
  overlapDays: number;
  sameVenue: boolean;
  sameCity: boolean;
  hoursOverlap: boolean;
  /** high: same venue · medium: same city or overlapping hours · low: dates overlap only */
  severity: 'high' | 'medium' | 'low';
  message: string;
}

type Draft = Pick<EventDoc, 'startDate' | 'endDate' | 'venue' | 'city' | 'dailyStart' | 'dailyEnd'> & { id?: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const known = (s: string) => !!s.trim() && norm(s) !== 'to be confirmed';

/**
 * Find the user's other events whose dates overlap this one.
 * Pure + unit-tested (eventClashes.test.ts). Used by the creation wizard,
 * event cards, the Alerts tab and the date-clash email.
 */
export function detectEventClashes(event: Draft, others: EventDoc[]): EventClash[] {
  return others
    .filter((o) => o.id !== event.id && o.startDate <= event.endDate && event.startDate <= o.endDate)
    .map((o) => {
      const start = o.startDate > event.startDate ? o.startDate : event.startDate;
      const end = o.endDate < event.endDate ? o.endDate : event.endDate;
      const overlapDays = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
      const sameVenue = known(event.venue) && norm(o.venue) === norm(event.venue) && norm(o.city) === norm(event.city);
      const sameCity = known(event.city) && norm(o.city) === norm(event.city);
      const hoursOverlap = toMinutes(o.dailyStart) < toMinutes(event.dailyEnd) && toMinutes(event.dailyStart) < toMinutes(o.dailyEnd);
      const severity: EventClash['severity'] = sameVenue && hoursOverlap ? 'high' : sameCity || hoursOverlap ? 'medium' : 'low';
      const where = sameVenue ? ` at the same venue (${o.venue})` : sameCity ? ` in ${o.city}` : '';
      return {
        other: o,
        overlapDays,
        sameVenue,
        sameCity,
        hoursOverlap,
        severity,
        message: `Overlaps “${o.title}”${where} for ${overlapDays} day${overlapDays === 1 ? '' : 's'}${hoursOverlap ? ' with overlapping hours' : ''}.`,
      };
    })
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity]);
}

/** event id → clashes, for every event in the list. */
export function clashMap(events: EventDoc[]) {
  return new Map(events.map((e) => [e.id, detectEventClashes(e, events)]));
}
