import { authBackend } from './index';

/**
 * Client for the EventFlow backend (Node/Express in /backend).
 * In development Vite proxies /api → http://localhost:5050 (see vite.config.ts).
 * In production set VITE_API_URL to the deployed backend URL.
 * Auth: Firebase login → POST /api/auth/session → backend JWT on every request.
 */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

let currentUser = null;
let session = null;

/** Called by AuthProvider so requests can identify the user. */
export function setApiUser(u) {
  currentUser = u;
  if (!u || session?.uid !== u.uid) session = null;
}

export class ApiError extends Error {
  status;
  code;
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

async function call(path, init) {
  try {
    return await fetch(`${BASE}/api${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...init.headers },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the EventFlow backend. Is it running? (cd backend && npm run dev)', 0, 'offline');
  }
}

async function readError(res) {
  const data = await res.json().catch(() => ({}));
  const detail = Array.isArray(data.details) ? ` (${data.details[0]})` : '';
  return new ApiError((data.error ?? `Request failed (${res.status})`) + detail, res.status, data.code);
}

/**
 * Exchange the Firebase login for a backend JWT (signed with JWT_SECRET).
 * The backend verifies the Firebase ID token with Firebase Admin first.
 */
async function getSession(force = false) {
  if (!currentUser) throw new ApiError('Please log in first.', 401);
  if (!force && session && session.uid === currentUser.uid && session.exp - Date.now() > 60_000) return session.token;
  const idToken = await authBackend.getIdToken().catch(() => null);
  const res = await call('/auth/session', {
    method: 'POST',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: { uid: currentUser.uid, email: currentUser.email, name: currentUser.displayName },
  });
  if (!res.ok) throw await readError(res);
  const { token } = await res.json();
  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  session = { token, exp: payload.exp * 1000, uid: currentUser.uid };
  return token;
}

async function request(path, init = {}, auth = true) {
  const send = async (force) => call(path, { ...init, headers: auth ? { Authorization: `Bearer ${await getSession(force)}` } : {} });
  let res = await send(false);
  if (res.status === 401 && auth) res = await send(true); // session expired → refresh once
  if (!res.ok) throw await readError(res);
  return await res.json();
}

export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Event fields the backend needs for emails / calendar / AI. */
export function eventPayload(e, dateLabel) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    startDate: e.startDate,
    endDate: e.endDate,
    dailyStart: e.dailyStart,
    dailyEnd: e.dailyEnd,
    venue: e.venue,
    city: e.city,
    expectedAttendees: e.expectedAttendees,
    requirements: e.requirements,
    dateLabel,
  };
}

const sessionPayload = (s) => ({ id: s.id, title: s.title, description: s.description, day: s.day, start: s.start, end: s.end, roomId: s.roomId });

/* ---------------- endpoints ---------------- */

export const api = {
  health: () => request('/health', {}, false),

  generateEvent: (prompt, today) => request('/ai/generate-event', { method: 'POST', body: { prompt, today, timeZone: timeZone() } }),

  explainEvent: (event, stats) => request('/ai/explain-event', { method: 'POST', body: { event: eventPayload(event), stats } }),
  /** EventFlow Assistant chatbot: send the conversation, get Gemini's reply. */
  chat: (messages, events, today) =>
    request('/ai/chat', {
      method: 'POST',
      body: {
        messages,
        today,
        events: events.slice(0, 20).map((e) => ({
          title: e.title,
          category: e.category,
          startDate: e.startDate,
          endDate: e.endDate,
          dailyStart: e.dailyStart,
          dailyEnd: e.dailyEnd,
          venue: e.venue || '',
          city: e.city || '',
          expectedAttendees: Number(e.expectedAttendees) || 0,
        })),
      },
    }),

  sendEmail: (args) =>
    request('/email/send', {
      method: 'POST',
      body: {
        to: args.to,
        template: args.template,
        data: args.data,
        calendar: args.calendar
          ? { sessions: args.calendar.sessions.map(sessionPayload), rooms: args.calendar.rooms.map((r) => ({ id: r.id, name: r.name })), timeZone: timeZone() }
          : undefined,
      },
    }),
};
