import type { EventDoc, Room, Session, Speaker } from '@/types';
import { toMinutes } from './time';

export type ConflictKind = 'room' | 'speaker' | 'hours' | 'dates' | 'invalid';

export interface Conflict {
  kind: ConflictKind;
  sessionIds: string[];
  message: string;
}

function overlaps(a: Session, b: Session) {
  if (a.day !== b.day) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/**
 * Pure scheduling-conflict detector. Runs on every schedule change (memoised by
 * the caller) and is unit-tested in conflicts.test.ts.
 *
 * Detects:
 *  - invalid ranges (end <= start)
 *  - sessions outside the event's daily hours or outside the event's dates
 *  - two sessions in the same room at overlapping times
 *  - a speaker booked into two overlapping sessions
 */
export function detectConflicts(
  sessions: Session[],
  event: Pick<EventDoc, 'startDate' | 'endDate' | 'dailyStart' | 'dailyEnd'>,
  rooms: Room[] = [],
  speakers: Speaker[] = [],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? 'a room';
  const speakerName = (id: string) => speakers.find((s) => s.id === id)?.name ?? 'A speaker';
  const open = toMinutes(event.dailyStart);
  const close = toMinutes(event.dailyEnd);

  for (const s of sessions) {
    if (toMinutes(s.end) <= toMinutes(s.start)) {
      conflicts.push({ kind: 'invalid', sessionIds: [s.id], message: `“${s.title}” ends before it starts.` });
      continue;
    }
    if (s.day < event.startDate || s.day > event.endDate) {
      conflicts.push({ kind: 'dates', sessionIds: [s.id], message: `“${s.title}” is scheduled outside the event dates.` });
    } else if (toMinutes(s.start) < open || toMinutes(s.end) > close) {
      conflicts.push({
        kind: 'hours',
        sessionIds: [s.id],
        message: `“${s.title}” runs outside event hours (${event.dailyStart}–${event.dailyEnd}).`,
      });
    }
  }

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i]!;
      const b = sessions[j]!;
      if (!overlaps(a, b)) continue;
      if (a.roomId && a.roomId === b.roomId) {
        conflicts.push({
          kind: 'room',
          sessionIds: [a.id, b.id],
          message: `“${a.title}” and “${b.title}” overlap in ${roomName(a.roomId)}.`,
        });
      }
      for (const sp of a.speakerIds) {
        if (b.speakerIds.includes(sp)) {
          conflicts.push({
            kind: 'speaker',
            sessionIds: [a.id, b.id],
            message: `${speakerName(sp)} is booked for “${a.title}” and “${b.title}” at the same time.`,
          });
        }
      }
    }
  }
  return conflicts;
}

/** session id → conflicts it participates in */
export function conflictIndex(conflicts: Conflict[]) {
  const map = new Map<string, Conflict[]>();
  for (const c of conflicts) for (const id of c.sessionIds) map.set(id, [...(map.get(id) ?? []), c]);
  return map;
}
