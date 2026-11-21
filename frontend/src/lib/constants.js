import { Briefcase, CalendarClock, Code2, Mic2, PartyPopper, Sparkles } from 'lucide-react';

export const CATEGORY_META = {
  conference: { label: 'Conference', icon: Mic2, hint: 'Speakers, halls, multi-track sessions' },
  hackathon: { label: 'Hackathon', icon: Code2, hint: 'Mentors, judges, teams, demos' },
  festival: { label: 'Festival', icon: PartyPopper, hint: 'Volunteers, stalls, activities' },
  workshop: { label: 'Workshop', icon: Briefcase, hint: 'Trainers, rooms, materials' },
  meetup: { label: 'Meetup', icon: CalendarClock, hint: 'Small talks, networking' },
  other: { label: 'Other', icon: Sparkles, hint: 'Anything else you are planning' },
};

/** Suggested requirement modules per category — pre-selected in the creation wizard. */
export const CATEGORY_DEFAULT_REQUIREMENTS = {
  conference: ['sessions', 'speakers', 'rooms', 'attendees', 'volunteers', 'equipment', 'catering'],
  hackathon: ['sessions', 'rooms', 'attendees', 'mentors', 'judges', 'equipment', 'catering'],
  festival: ['sessions', 'volunteers', 'equipment', 'catering', 'budget', 'attendees'],
  workshop: ['sessions', 'speakers', 'rooms', 'attendees', 'equipment'],
  meetup: ['sessions', 'speakers', 'attendees', 'catering'],
  other: ['sessions', 'attendees'],
};

export const REQUIREMENT_META = {
  sessions: { label: 'Sessions & schedule' },
  speakers: { label: 'Speakers' },
  rooms: { label: 'Rooms & halls' },
  attendees: { label: 'Attendee registration' },
  volunteers: { label: 'Volunteers', resource: { category: 'people', unit: 'people' } },
  mentors: { label: 'Mentors', resource: { category: 'people', unit: 'people' } },
  judges: { label: 'Judges', resource: { category: 'people', unit: 'people' } },
  equipment: { label: 'Equipment', resource: { category: 'equipment', unit: 'units' } },
  catering: { label: 'Catering', resource: { category: 'catering', unit: 'meals' } },
  budget: { label: 'Budget tracking' },
};

export const THEMES = {
  indigo: { label: 'Indigo', gradient: 'from-indigo-500 via-violet-500 to-sky-500', swatch: '#6366f1' },
  ocean: { label: 'Ocean', gradient: 'from-sky-500 via-cyan-500 to-teal-400', swatch: '#0ea5e9' },
  sunset: { label: 'Sunset', gradient: 'from-orange-400 via-rose-500 to-fuchsia-500', swatch: '#f43f5e' },
  forest: { label: 'Forest', gradient: 'from-emerald-500 via-teal-500 to-lime-400', swatch: '#10b981' },
  rose: { label: 'Rose', gradient: 'from-pink-500 via-rose-400 to-amber-300', swatch: '#ec4899' },
  slate: { label: 'Slate', gradient: 'from-slate-700 via-slate-600 to-indigo-500', swatch: '#475569' },
};

export const TASK_STATUS = {
  todo: { label: 'To Do', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', dot: 'bg-sky-500' },
  done: { label: 'Completed', dot: 'bg-emerald-500' },
};

export const PRIORITY_META = {
  low: { label: 'Low', tone: 'muted' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  urgent: { label: 'Urgent', tone: 'danger' },
};

export const SESSION_TYPE_META = {
  keynote: { label: 'Keynote', color: 'border-l-violet-500 bg-violet-500/10' },
  talk: { label: 'Talk', color: 'border-l-indigo-500 bg-indigo-500/10' },
  workshop: { label: 'Workshop', color: 'border-l-sky-500 bg-sky-500/10' },
  panel: { label: 'Panel', color: 'border-l-amber-500 bg-amber-500/10' },
  break: { label: 'Break', color: 'border-l-slate-400 bg-slate-500/10' },
  judging: { label: 'Judging', color: 'border-l-rose-500 bg-rose-500/10' },
  other: { label: 'Other (type your own)', color: 'border-l-emerald-500 bg-emerald-500/10' },
};

/** Display label for a session's type — uses the custom text when type is "other". */
export const sessionTypeLabel = (s) =>
  s.type === 'other' ? s.customType?.trim() || 'Other' : (SESSION_TYPE_META[s.type] ?? SESSION_TYPE_META.other).label;

/** Who an attendee is (stored as `ticketType`). Planning only — no check-in or attendance status. */
export const TICKET_LABEL = {
  student: 'Student',
  parent: 'Parent',
  faculty: 'Faculty / staff',
  guest: 'Guest',
  speaker: 'Speaker',
  vip: 'VIP',
  general: 'General',
};
export const ATTENDEE_TYPES = Object.keys(TICKET_LABEL);

export const RESOURCE_CATEGORY_LABEL = {
  people: 'People',
  equipment: 'Equipment',
  catering: 'Catering',
  venue: 'Venue',
  other: 'Other',
};
