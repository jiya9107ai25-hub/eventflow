import { isoPlusDays } from '@/lib/time';

/**
 * SAMPLE EVENTS for demonstrations. Every event created here has `isSample: true`
 * and a "Sample:" title prefix, and the UI shows a "Sample data" badge on it.
 * Seeding goes through the normal DataBackend API, so it works identically
 * against Firestore and Sample Data Mode.
 */

const FIRST = [
  'Aarav',
  'Diya',
  'Kabir',
  'Meera',
  'Rohan',
  'Isha',
  'Vikram',
  'Sara',
  'Arjun',
  'Zoya',
  'Nikhil',
  'Tara',
  'Dev',
  'Anika',
  'Yash',
  'Leah',
  'Omar',
  'Chen',
  'Maya',
  'Felix',
];
const LAST = ['Sharma', 'Iyer', 'Kapoor', 'Menon', 'Das', 'Gupta', 'Reddy', 'Khan', 'Patel', 'Singh', 'Lee', 'Fernandes'];
const ORGS = ['IIT Bombay', 'BITS Pilani', 'Acme Labs', 'NIT Trichy', 'Freelance', 'Zeta Systems', 'VIT Vellore', 'Infra.io'];

function people(n, seed) {
  const tickets = ['student', 'student', 'parent', 'faculty', 'student', 'guest'];
  return Array.from({ length: n }, (_, i) => {
    const f = FIRST[(i * 7 + seed) % FIRST.length];
    const l = LAST[(i * 3 + seed) % LAST.length];
    return {
      name: `${f} ${l}`,
      email: `${f}.${l}${i}@example.com`.toLowerCase(),
      organization: ORGS[(i + seed) % ORGS.length],
      ticketType: tickets[i % tickets.length],
      createdAt: Date.now() - (n - i) * 3600_000 * 5,
    };
  });
}

async function seedHackathon(b, uid) {
  const start = isoPlusDays(9);
  const day2 = isoPlusDays(10);
  const ev = {
    title: 'Sample: HackSphere 2026',
    description:
      'A 36-hour student hackathon focused on climate and civic tech. Teams of up to four build, get mentored and pitch to a panel of judges. (Sample event for demonstration.)',
    category: 'hackathon',
    startDate: start,
    endDate: day2,
    dailyStart: '08:00',
    dailyEnd: '22:00',
    venue: 'Innovation Centre, Block C',
    city: 'Bengaluru',
    expectedAttendees: 240,
    theme: 'indigo',
    requirements: ['sessions', 'rooms', 'speakers', 'attendees', 'mentors', 'judges', 'volunteers', 'equipment', 'catering'],
    isSample: true,
  };
  const id = await b.createEvent(uid, ev);

  const roomIds = await Promise.all([
    b.addSub(id, 'rooms', { name: 'Main Hall', capacity: 300, location: 'Ground floor' }),
    b.addSub(id, 'rooms', { name: 'Lab 1', capacity: 60, location: '1st floor' }),
    b.addSub(id, 'rooms', { name: 'Lab 2', capacity: 60, location: '1st floor' }),
    b.addSub(id, 'rooms', { name: 'Pitch Room', capacity: 80, location: '2nd floor' }),
  ]);
  const spIds = await Promise.all([
    b.addSub(id, 'speakers', {
      name: 'Dr. Neha Kulkarni',
      title: 'Climate Data Scientist',
      company: 'EarthLens',
      email: 'neha@example.com',
      bio: 'Works on satellite data for urban heat mapping.',
    }),
    b.addSub(id, 'speakers', {
      name: 'Arvind Rao',
      title: 'Staff Engineer',
      company: 'Zeta Systems',
      email: 'arvind@example.com',
      bio: 'Distributed systems and developer tooling.',
    }),
    b.addSub(id, 'speakers', {
      name: 'Sofia Mendes',
      title: 'Product Designer',
      company: 'Civic Studio',
      email: 'sofia@example.com',
      bio: 'Designs public-service apps used by millions.',
    }),
    b.addSub(id, 'speakers', {
      name: 'Karan Malhotra',
      title: 'Founder',
      company: 'GreenGrid',
      email: 'karan@example.com',
      bio: 'Built a clean-energy marketplace from a hackathon idea.',
    }),
  ]);
  const [hall, lab1, lab2, pitch] = roomIds;
  const [neha, arvind, sofia, karan] = spIds;

  const sessions = [
    {
      title: 'Opening Keynote: Code for the Climate',
      description: 'Kick-off and problem statements.',
      type: 'keynote',
      day: start,
      start: '09:00',
      end: '10:00',
      roomId: hall,
      speakerIds: [neha],
    },
    {
      title: 'Team Formation & Ideation',
      description: 'Find teammates and lock in an idea.',
      type: 'workshop',
      day: start,
      start: '10:15',
      end: '11:30',
      roomId: hall,
      speakerIds: [],
    },
    {
      title: 'APIs that Scale',
      description: 'Ship a backend in an afternoon.',
      type: 'workshop',
      day: start,
      start: '11:30',
      end: '12:30',
      roomId: lab1,
      speakerIds: [arvind],
    },
    {
      title: 'Designing for Citizens',
      description: 'UX patterns for public apps.',
      type: 'workshop',
      day: start,
      start: '11:30',
      end: '12:30',
      roomId: lab2,
      speakerIds: [sofia],
    },
    { title: 'Lunch', description: '', type: 'break', day: start, start: '12:30', end: '13:30', roomId: hall, speakerIds: [] },
    {
      title: 'Mentor Office Hours',
      description: 'Drop in with questions.',
      type: 'talk',
      day: start,
      start: '14:00',
      end: '16:00',
      roomId: lab1,
      speakerIds: [arvind, sofia],
    },
    // Intentional conflict for demo: Arvind double-booked.
    {
      title: 'Ask Me Anything: Infra',
      description: 'Overlaps office hours — a demo conflict.',
      type: 'panel',
      day: start,
      start: '15:00',
      end: '15:45',
      roomId: lab2,
      speakerIds: [arvind],
    },
    { title: 'From Hack to Startup', description: 'Fireside chat.', type: 'talk', day: start, start: '17:00', end: '18:00', roomId: hall, speakerIds: [karan] },
    {
      title: 'Final Pitches',
      description: '3-minute demos per team.',
      type: 'judging',
      day: day2,
      start: '14:00',
      end: '16:30',
      roomId: pitch,
      speakerIds: [],
    },
    { title: 'Awards & Closing', description: '', type: 'keynote', day: day2, start: '17:00', end: '18:00', roomId: hall, speakerIds: [karan] },
  ];
  await b.addSubBatch(id, 'sessions', sessions);

  const team = [
    { name: 'Riya Sen', email: 'riya@example.com', role: 'Lead Organizer', responsibilities: 'Overall coordination, sponsors' },
    { name: 'Aditya Joshi', email: 'aditya@example.com', role: 'Logistics', responsibilities: 'Venue, equipment, catering' },
    { name: 'Fatima Sheikh', email: 'fatima@example.com', role: 'Outreach', responsibilities: 'Registrations, social media' },
    { name: 'Jordan Pike', email: 'jordan@example.com', role: 'Tech Lead', responsibilities: 'Wi-Fi, judging platform' },
  ];
  const teamIds = await Promise.all(team.map((t) => b.addSub(id, 'team', t)));

  const now = Date.now();
  const tasks = [
    {
      title: 'Confirm judging panel',
      description: 'Get final yes from 5 judges.',
      status: 'in_progress',
      priority: 'high',
      assigneeId: teamIds[0],
      dueDate: isoPlusDays(3),
      order: 0,
      createdAt: now,
    },
    {
      title: 'Order team T-shirts',
      description: '250 units, 4 sizes.',
      status: 'todo',
      priority: 'medium',
      assigneeId: teamIds[1],
      dueDate: isoPlusDays(5),
      order: 1,
      createdAt: now,
    },
    {
      title: 'Publish problem statements',
      description: '',
      status: 'done',
      priority: 'high',
      assigneeId: teamIds[2],
      dueDate: isoPlusDays(-2),
      order: 2,
      createdAt: now,
    },
    {
      title: 'Stress-test venue Wi-Fi',
      description: 'Target 300 concurrent devices.',
      status: 'todo',
      priority: 'urgent',
      assigneeId: teamIds[3],
      dueDate: isoPlusDays(6),
      order: 3,
      createdAt: now,
    },
    {
      title: 'Book midnight snacks',
      description: '',
      status: 'todo',
      priority: 'low',
      assigneeId: teamIds[1],
      dueDate: isoPlusDays(7),
      order: 4,
      createdAt: now,
    },
    {
      title: 'Send mentor briefing pack',
      description: 'Schedule + judging rubric.',
      status: 'in_progress',
      priority: 'medium',
      assigneeId: teamIds[0],
      dueDate: isoPlusDays(4),
      order: 5,
      createdAt: now,
    },
    {
      title: 'Design certificates',
      description: '',
      status: 'done',
      priority: 'low',
      assigneeId: teamIds[2],
      dueDate: isoPlusDays(-1),
      order: 6,
      createdAt: now,
    },
  ];
  await b.addSubBatch(id, 'tasks', tasks);

  const resources = [
    { name: 'Volunteers', category: 'people', unit: 'people', required: 30, allocated: 0 },
    { name: 'Mentors', category: 'people', unit: 'people', required: 12, allocated: 0 },
    { name: 'Judges', category: 'people', unit: 'people', required: 5, allocated: 0 },
    { name: 'Projectors', category: 'equipment', unit: 'units', required: 4, allocated: 3 },
    { name: 'Extension boards', category: 'equipment', unit: 'units', required: 80, allocated: 52 },
    { name: 'Meals', category: 'catering', unit: 'meals', required: 1200, allocated: 900 },
  ];
  const resIds = await Promise.all(resources.map((r) => b.addSub(id, 'resources', r)));
  // Use the transactional API so allocated counts match allocation records.
  const claims = [
    [0, 'Ishaan K.'],
    [0, 'Nora P.'],
    [0, 'Maya S.'],
    [0, 'Dev R.'],
    [0, 'Leah T.'],
    [0, 'Omar F.'],
    [1, 'Arvind Rao'],
    [1, 'Sofia Mendes'],
    [1, 'Kunal B.'],
    [1, 'Hina Q.'],
    [1, 'Paul A.'],
    [2, 'Dr. Neha Kulkarni'],
    [2, 'Karan Malhotra'],
  ];
  for (const [idx, name] of claims) await b.claimResource(id, resIds[idx], name, 1);

  await b.addSubBatch(id, 'attendees', people(140, 1));

  const t = Date.now();
  await b.addSubBatch(id, 'messages', [
    {
      authorId: 'sample-riya',
      authorName: 'Riya Sen',
      text: 'Welcome to the HackSphere organizing channel! 🎉 This is a sample conversation.',
      isAnnouncement: true,
      createdAt: t - 86400_000,
    },
    {
      authorId: 'sample-aditya',
      authorName: 'Aditya Joshi',
      text: 'Projectors: 3 of 4 confirmed. Chasing the last one with the AV vendor.',
      isAnnouncement: false,
      createdAt: t - 7200_000,
    },
    {
      authorId: 'sample-jordan',
      authorName: 'Jordan Pike',
      text: 'Heads up — the scheduler is flagging Arvind as double-booked on day 1 afternoon.',
      isAnnouncement: false,
      createdAt: t - 3600_000,
    },
    {
      authorId: 'sample-fatima',
      authorName: 'Fatima Sheikh',
      text: '140 registrations so far, 35% students. Sending reminder emails tomorrow.',
      isAnnouncement: false,
      createdAt: t - 1800_000,
    },
  ]);
  return id;
}

async function seedConference(b, uid) {
  const start = isoPlusDays(0);
  const ev = {
    title: 'Sample: DevSummit India',
    description: 'A two-day, multi-track developer conference on web platforms, AI tooling and cloud. (Sample event for demonstration.)',
    category: 'conference',
    startDate: start,
    endDate: isoPlusDays(1),
    dailyStart: '09:00',
    dailyEnd: '18:00',
    venue: 'Convention Centre Hall B',
    city: 'Hyderabad',
    expectedAttendees: 600,
    theme: 'ocean',
    requirements: ['sessions', 'speakers', 'rooms', 'attendees', 'volunteers', 'equipment', 'catering'],
    isSample: true,
  };
  const id = await b.createEvent(uid, ev);
  const [a, bb] = await Promise.all([
    b.addSub(id, 'rooms', { name: 'Auditorium', capacity: 600, location: 'Hall B' }),
    b.addSub(id, 'rooms', { name: 'Track 2', capacity: 150, location: 'Hall C' }),
  ]);
  const sp = await b.addSub(id, 'speakers', { name: 'Lina Park', title: 'Web Platform Lead', company: 'Browserly', email: 'lina@example.com', bio: '' });
  await b.addSubBatch(id, 'sessions', [
    { title: 'State of the Web', description: '', type: 'keynote', day: start, start: '09:30', end: '10:30', roomId: a, speakerIds: [sp] },
    { title: 'AI Pair Programming in Practice', description: '', type: 'talk', day: start, start: '11:00', end: '11:45', roomId: bb, speakerIds: [] },
    { title: 'Coffee Break', description: '', type: 'break', day: start, start: '11:45', end: '12:15', roomId: a, speakerIds: [] },
  ]);
  const now = Date.now();
  await b.addSubBatch(id, 'tasks', [
    {
      title: 'Print speaker badges',
      description: '',
      status: 'done',
      priority: 'medium',
      assigneeId: null,
      dueDate: isoPlusDays(-1),
      order: 0,
      createdAt: now,
    },
    {
      title: 'Brief registration desk',
      description: '',
      status: 'in_progress',
      priority: 'high',
      assigneeId: null,
      dueDate: isoPlusDays(0),
      order: 1,
      createdAt: now,
    },
    {
      title: 'Collect slides from speakers',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigneeId: null,
      dueDate: isoPlusDays(1),
      order: 2,
      createdAt: now,
    },
  ]);
  await b.addSubBatch(id, 'resources', [
    { name: 'Volunteers', category: 'people', unit: 'people', required: 40, allocated: 34 },
    { name: 'Wireless mics', category: 'equipment', unit: 'units', required: 10, allocated: 6 },
  ]);
  await b.addSubBatch(id, 'attendees', people(60, 5));
  return id;
}

async function seedFestival(b, uid) {
  const ev = {
    title: 'Sample: Spring Fest',
    description: 'Annual college cultural festival with music, dance, food stalls and competitions. (Sample event for demonstration.)',
    category: 'festival',
    startDate: isoPlusDays(-30),
    endDate: isoPlusDays(-28),
    dailyStart: '10:00',
    dailyEnd: '23:00',
    venue: 'Campus Grounds',
    city: 'Pune',
    expectedAttendees: 2000,
    theme: 'sunset',
    requirements: ['sessions', 'volunteers', 'equipment', 'catering', 'attendees'],
    isSample: true,
  };
  const id = await b.createEvent(uid, ev);
  const now = Date.now();
  await b.addSubBatch(id, 'tasks', [
    { title: 'Stage setup', description: '', status: 'done', priority: 'high', assigneeId: null, dueDate: isoPlusDays(-31), order: 0, createdAt: now },
    {
      title: 'Settle vendor payments',
      description: '',
      status: 'done',
      priority: 'medium',
      assigneeId: null,
      dueDate: isoPlusDays(-25),
      order: 1,
      createdAt: now,
    },
  ]);
  await b.addSubBatch(id, 'resources', [{ name: 'Volunteers', category: 'people', unit: 'people', required: 80, allocated: 80 }]);
  await b.addSubBatch(id, 'attendees', people(45, 9));
  return id;
}

export async function seedSampleEvents(b, uid) {
  const hack = await seedHackathon(b, uid);
  await seedConference(b, uid);
  await seedFestival(b, uid);
  await b.logActivity(uid, { eventId: hack, eventTitle: 'Sample: HackSphere 2026', text: 'Loaded sample events for demonstration', kind: 'event' });
  return hack;
}
