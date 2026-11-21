/**
 * Public summary of an event shown in "All events" (eventDirectory collection).
 * Only these fields are visible to every signed-in user — the schedule, people
 * and resources stay private until someone has the event password.
 */
export function directoryEntry(event) {
  const owner = event.members?.[event.ownerId];
  return {
    title: event.title,
    category: event.category,
    startDate: event.startDate,
    endDate: event.endDate,
    venue: event.venue ?? '',
    city: event.city ?? '',
    theme: event.theme ?? 'indigo',
    ownerId: event.ownerId,
    ownerName: owner?.name ?? 'Event admin',
    updatedAt: Date.now(),
  };
}

export const DIRECTORY_FIELDS = ['title', 'category', 'startDate', 'endDate', 'venue', 'city', 'theme'];

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password. Ask the event admin for the correct one.');
    this.name = 'WrongPasswordError';
  }
}
