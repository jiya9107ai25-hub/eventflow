import { describe, expect, it } from 'vitest';
import { detectEventClashes } from './eventClashes';
import { buildIcs, googleCalendarUrl } from './calendar';

const ev = (id, over = {}) => ({
  id,
  ownerId: 'u',
  memberIds: ['u'],
  title: id,
  description: 'd',
  category: 'meetup',
  startDate: '2026-12-10',
  endDate: '2026-12-11',
  dailyStart: '09:00',
  dailyEnd: '17:00',
  venue: 'Hall A',
  city: 'Pune',
  expectedAttendees: 10,
  theme: 'indigo',
  requirements: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('detectEventClashes', () => {
  it('ignores the event itself and non-overlapping events', () => {
    const a = ev('a');
    expect(detectEventClashes(a, [a, ev('b', { startDate: '2026-12-12', endDate: '2026-12-13' })])).toEqual([]);
  });

  it('flags same venue + overlapping hours as high severity', () => {
    const [c] = detectEventClashes(ev('a'), [ev('b', { startDate: '2026-12-11', endDate: '2026-12-14' })]);
    expect(c.severity).toBe('high');
    expect(c.overlapDays).toBe(1);
    expect(c.message).toMatch(/same venue/);
  });

  it('flags same city different venue as medium, other cities with separate hours as low', () => {
    expect(detectEventClashes(ev('a'), [ev('b', { venue: 'Hall B' })])[0].severity).toBe('medium');
    expect(detectEventClashes(ev('a'), [ev('c', { venue: 'X', city: 'Delhi', dailyStart: '18:00', dailyEnd: '21:00' })])[0].severity).toBe('low');
  });

  it('does not treat "To be confirmed" venues as the same venue', () => {
    const [c] = detectEventClashes(ev('a', { venue: 'To be confirmed' }), [ev('b', { venue: 'To be confirmed' })]);
    expect(c.sameVenue).toBe(false);
  });

  it('sorts by severity', () => {
    const list = detectEventClashes(ev('a'), [ev('low', { city: 'Delhi', venue: 'Y', dailyStart: '18:00', dailyEnd: '20:00' }), ev('high')]);
    expect(list.map((c) => c.other.id)).toEqual(['high', 'low']);
  });
});

describe('calendar helpers', () => {
  it('builds a Google Calendar template URL', () => {
    const url = googleCalendarUrl({ title: 'Talk', day: '2026-12-10', start: '09:30', end: '10:15' });
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('dates=20261210T093000%2F20261210T101500');
  });

  it('builds an ics with one VEVENT per session plus the event', () => {
    const e = ev('a');
    const ics = buildIcs(
      e,
      [{ id: 's', title: 'Keynote', description: '', type: 'keynote', day: '2026-12-10', start: '09:00', end: '10:00', roomId: null, speakerIds: [] }],
      [],
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('SUMMARY:Keynote · a');
  });
});
