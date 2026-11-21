import { describe, expect, it } from 'vitest';
import { conflictIndex, detectConflicts } from './conflicts';

const event = { startDate: '2026-12-01', endDate: '2026-12-02', dailyStart: '09:00', dailyEnd: '18:00' };

const s = (id, over = {}) => ({
  id,
  title: id,
  description: '',
  type: 'talk',
  day: '2026-12-01',
  start: '10:00',
  end: '11:00',
  roomId: 'r1',
  speakerIds: [],
  ...over,
});

describe('detectConflicts', () => {
  it('returns no conflicts for a clean schedule', () => {
    expect(detectConflicts([s('a'), s('b', { start: '11:00', end: '12:00' })], event)).toEqual([]);
  });

  it('flags two sessions in the same room at overlapping times', () => {
    const c = detectConflicts([s('a'), s('b', { start: '10:30', end: '11:30' })], event);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe('room');
    expect(c[0].sessionIds).toEqual(['a', 'b']);
  });

  it('does not flag back-to-back sessions (end == start)', () => {
    expect(detectConflicts([s('a'), s('b', { start: '11:00', end: '11:30' })], event)).toHaveLength(0);
  });

  it('does not flag the same room on different days', () => {
    expect(detectConflicts([s('a'), s('b', { day: '2026-12-02' })], event)).toHaveLength(0);
  });

  it('flags a speaker booked in two rooms simultaneously', () => {
    const c = detectConflicts([s('a', { speakerIds: ['sp1'] }), s('b', { roomId: 'r2', speakerIds: ['sp1'] })], event);
    expect(c.map((x) => x.kind)).toEqual(['speaker']);
  });

  it('flags sessions outside daily event hours', () => {
    const c = detectConflicts([s('a', { start: '08:00', end: '09:30' }), s('b', { start: '17:30', end: '18:30', roomId: 'r2' })], event);
    expect(c.filter((x) => x.kind === 'hours')).toHaveLength(2);
  });

  it('flags sessions outside the event dates', () => {
    expect(detectConflicts([s('a', { day: '2026-12-05' })], event)[0].kind).toBe('dates');
  });

  it('flags invalid ranges and skips them for overlap checks', () => {
    const c = detectConflicts([s('a', { start: '12:00', end: '11:00' }), s('b')], event);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe('invalid');
  });

  it('ignores unassigned rooms for room conflicts', () => {
    expect(detectConflicts([s('a', { roomId: null }), s('b', { roomId: null })], event)).toHaveLength(0);
  });

  it('indexes conflicts by session id', () => {
    const idx = conflictIndex(detectConflicts([s('a', { speakerIds: ['x'] }), s('b', { speakerIds: ['x'] })], event));
    expect(idx.get('a')).toHaveLength(2); // room + speaker
    expect(idx.get('b')).toHaveLength(2);
  });
});
