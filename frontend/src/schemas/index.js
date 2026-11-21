import { z } from 'zod';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Tell us your name'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Z]/, 'Include an uppercase letter').regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

/* Event wizard — validated one step at a time. */
export const eventBasicsSchema = z.object({
  title: z.string().trim().min(3, 'Give your event a title (3+ characters)').max(80),
  description: z.string().trim().min(10, 'Add a short description (10+ characters)').max(1000),
  category: z.enum(['conference', 'hackathon', 'festival', 'workshop', 'meetup', 'other']),
});

export const eventScheduleSchema = z
  .object({
    startDate: z.string().min(1, 'Pick a start date'),
    endDate: z.string().min(1, 'Pick an end date'),
    dailyStart: time,
    dailyEnd: time,
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: 'End date must be on or after the start date' })
  .refine((v) => v.dailyEnd > v.dailyStart, { path: ['dailyEnd'], message: 'Daily end must be after daily start' });

export const eventVenueSchema = z.object({
  venue: z.string().trim().min(2, 'Where is it happening?'),
  city: z.string().trim().min(2, 'Add a city'),
  expectedAttendees: z.coerce.number().int().min(1, 'At least 1 attendee').max(100000),
});

export const sessionSchema = z
  .object({
    title: z.string().trim().min(2, 'Session title required'),
    description: z.string().max(500).default(''),
    type: z.enum(['keynote', 'talk', 'workshop', 'panel', 'break', 'judging', 'other']),
    customType: z.string().trim().max(40, 'Keep it under 40 characters').default(''),
    day: z.string().min(1, 'Pick a day'),
    start: time,
    end: time,
    roomId: z.string().nullable(),
    speakerIds: z.array(z.string()),
  })
  .refine((v) => v.end > v.start, { path: ['end'], message: 'End time must be after start time' })
  .refine((v) => v.type !== 'other' || v.customType.length >= 2, { path: ['customType'], message: 'Type the session type, e.g. Registration' });

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Task title required').max(120),
  description: z.string().max(1000).default(''),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeId: z.string().nullable(),
  dueDate: z.string().nullable(),
});

export const resourceSchema = z
  .object({
    name: z.string().trim().min(2, 'Name the resource'),
    category: z.enum(['people', 'equipment', 'catering', 'venue', 'other']),
    unit: z.string().trim().min(1, 'Unit required (e.g. people, units)'),
    required: z.coerce.number().int().min(1, 'Need at least 1'),
    allocated: z.coerce.number().int().min(0),
  })
  .refine((v) => v.allocated <= v.required, { path: ['allocated'], message: 'Cannot allocate more than required' });

export const roomSchema = z.object({
  name: z.string().trim().min(1, 'Room name required'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  location: z.string().default(''),
});

export const speakerSchema = z.object({
  name: z.string().trim().min(2, 'Name required'),
  title: z.string().trim().min(1, 'Title required'),
  company: z.string().default(''),
  email: z.union([z.string().email('Invalid email'), z.literal('')]),
  bio: z.string().max(600).default(''),
});

const ATTENDEE_TYPE_VALUES = ['student', 'parent', 'faculty', 'guest', 'speaker', 'vip', 'general'];
const TYPE_ALIASES = {
  students: 'student',
  parents: 'parent',
  staff: 'faculty',
  teacher: 'faculty',
  teachers: 'faculty',
  professor: 'faculty',
  guests: 'guest',
  speakers: 'speaker',
};

export const attendeeSchema = z.object({
  name: z.string().trim().min(2, 'Name required'),
  email: z.string().trim().email('Invalid email'),
  organization: z.string().default(''),
  ticketType: z.enum(ATTENDEE_TYPE_VALUES),
});

export const attendeeCsvRowSchema = z.object({
  name: z.string().trim().min(2, 'name is required'),
  email: z.string().trim().email('invalid email'),
  organization: z.string().trim().optional().default(''),
  ticketType: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().toLowerCase() : 'general'))
    .transform((v) => TYPE_ALIASES[v] ?? v)
    .pipe(z.enum(ATTENDEE_TYPE_VALUES, { errorMap: () => ({ message: `type must be one of: ${ATTENDEE_TYPE_VALUES.join(', ')}` }) })),
});

export const teamSchema = z.object({
  name: z.string().trim().min(2, 'Name required'),
  email: z.string().trim().email('Invalid email'),
  role: z.string().trim().min(2, 'Role required'),
  responsibilities: z.string().default(''),
});
