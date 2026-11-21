import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config, features } from './config.js';
import { getAdmin } from './firebaseAdmin.js';
import { createSession, requireUser } from './lib/auth.js';
import { chatWithAssistant, explainEvent, generateEventPlan } from './lib/ai.js';
import { readPreview, sendTemplatedEmail } from './lib/mailer.js';
import { TEMPLATE_NAMES } from './lib/emailTemplates.js';
import { buildIcs, googleCalendarLink } from './lib/ics.js';

/**
 * EventFlow API
 *   GET  /api/health                 which services are enabled
 *   POST /api/auth/session           Firebase ID token → EventFlow JWT
 *   POST /api/ai/generate-event      Gemini: description → full event plan
 *   POST /api/ai/explain-event       Gemini: plain-English event briefing
 *   POST /api/ai/chat                Gemini: EventFlow Assistant chatbot
 *   POST /api/email/send             Mailgun: alerts, invites, reminders, task emails
 *   GET  /api/email/preview/:id      view an email saved in preview mode
 */

const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: 'Invalid request', details: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
  req.body = r.data;
  next();
};
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const limiter = (limit, message) => rateLimit({ windowMs: 60_000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message } });

const eventShape = z.object({
  id: z.string().optional(),
  title: z.string().max(120),
  description: z.string().max(2000).default(''),
  category: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  dailyStart: z.string(),
  dailyEnd: z.string(),
  venue: z.string().default(''),
  city: z.string().default(''),
  expectedAttendees: z.number().default(0),
  requirements: z.array(z.string()).default([]),
  dateLabel: z.string().optional(),
});
const sessionShape = z.object({ id: z.string(), title: z.string(), description: z.string().optional(), day: z.string(), start: z.string(), end: z.string(), roomId: z.string().nullable().optional() });

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: (origin, cb) => (!origin || config.corsOrigins.includes(origin) ? cb(null, true) : cb(new Error(`Origin ${origin} not allowed by CORS`))) }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => res.json({ name: 'EventFlow API', health: '/api/health' }));

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, features: { ai: features.ai ? 'gemini' : 'off', email: features.email ? 'mailgun' : 'preview', firebaseAdmin: Boolean(getAdmin()) } }),
  );

  app.post('/api/auth/session', limiter(30, 'Too many login attempts.'), wrap(createSession));

  app.post(
    '/api/ai/generate-event',
    limiter(15, 'Too many AI requests — wait a minute.'),
    requireUser,
    validate(z.object({ prompt: z.string().trim().min(10, 'Describe the event in at least a few words').max(2000), today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timeZone: z.string().default('UTC') })),
    wrap(async (req, res) => res.json(await generateEventPlan(req.body))),
  );

  app.post(
    '/api/ai/explain-event',
    limiter(15, 'Too many AI requests — wait a minute.'),
    requireUser,
    validate(z.object({ event: eventShape, stats: z.record(z.any()) })),
    wrap(async (req, res) => res.json(await explainEvent(req.body))),
  );

  app.post(
    '/api/ai/chat',
    limiter(30, 'Too many messages — wait a minute.'),
    requireUser,
    validate(
      z.object({
        messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) })).min(1).max(20),
        events: z
          .array(
            z.object({
              title: z.string().max(120),
              category: z.string().max(30),
              startDate: z.string().max(10),
              endDate: z.string().max(10),
              dailyStart: z.string().max(5),
              dailyEnd: z.string().max(5),
              venue: z.string().max(120),
              city: z.string().max(80),
              expectedAttendees: z.number().int().min(0).max(1_000_000),
            }),
          )
          .max(20)
          .default([]),
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    ),
    wrap(async (req, res) => res.json(await chatWithAssistant(req.body))),
  );

  app.post(
    '/api/email/send',
    limiter(20, 'Too many emails — wait a minute.'),
    requireUser,
    validate(
      z.object({
        to: z.array(z.string().email()).min(1, 'Add at least one recipient').max(50),
        template: z.enum(TEMPLATE_NAMES),
        data: z.record(z.any()).and(z.object({ event: eventShape })),
        calendar: z.object({ sessions: z.array(sessionShape).max(200).default([]), rooms: z.array(z.object({ id: z.string(), name: z.string() })).default([]), timeZone: z.string().default('UTC') }).optional(),
      }),
    ),
    wrap(async (req, res) => {
      const { to, template, data, calendar } = req.body;
      const attachments = [];
      if (calendar) {
        const e = data.event;
        data.googleLink = googleCalendarLink({ title: e.title, details: e.description, location: `${e.venue}, ${e.city}`, day: e.startDate, start: e.dailyStart, endDay: e.endDate, end: e.dailyEnd, timeZone: calendar.timeZone });
        attachments.push({ filename: `${e.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, content: buildIcs({ event: e, ...calendar }), contentType: 'text/calendar' });
      }
      // Sent from one EventFlow address, shown as "<Name> via EventFlow"; replies go to the sender.
      res.json(await sendTemplatedEmail({ to, template, data, attachments, replyTo: req.user.email || undefined, senderName: req.user.name }));
    }),
  );

  app.get(
    '/api/email/preview/:id',
    wrap(async (req, res) => {
      const html = await readPreview(req.params.id);
      if (!html) return res.status(404).send('Preview not found');
      res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src * data:").type('html').send(html);
    }),
  );

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    if (status >= 500) console.error('[api]', err);
    res.status(status).json({ error: status >= 500 && !err.expose && status !== 502 ? 'Something went wrong on the server.' : err.message, code: err.code });
  });
  return app;
}

// Start the server when run directly (`node server.js`), not when imported by tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createApp().listen(config.port, () => {
    const on = (b) => (b ? '\x1b[32mon\x1b[0m' : '\x1b[33moff\x1b[0m');
    console.log(`\n  EventFlow API running at http://localhost:${config.port}`);
    console.log(`  • Gemini AI:       ${on(features.ai)}${features.ai ? ` (${config.gemini.model})` : '  → add GEMINI_API_KEY (AI features disabled)'}`);
    console.log(`  • Mailgun email:   ${on(features.email)}${features.email ? ` (${config.mailgun.domain})` : '  → add MAILGUN_API_KEY + MAILGUN_DOMAIN (preview mode)'}`);
    console.log(`  • Firebase Admin:  ${on(Boolean(getAdmin()))}${getAdmin() ? '' : '  → add serviceAccountKey.json (dev mode)'}\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${config.port} is already in use. Change PORT in backend/.env (and the proxy in frontend/vite.config.ts).\n`);
      process.exit(1);
    }
    throw err;
  });
}
