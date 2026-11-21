import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { config, features } from '../config.js';
import { ASSISTANT_PROMPT, BRIEFING_PROMPT, PLAN_PROMPT } from './prompts.js';

let client = null;
const gemini = () => (client ??= new GoogleGenAI({ apiKey: config.gemini.apiKey }));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(1000),
  category: z.enum(['conference', 'hackathon', 'festival', 'workshop', 'meetup', 'other']),
  startDate: date,
  endDate: date,
  dailyStart: time,
  dailyEnd: time,
  venue: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  expectedAttendees: z.number().int().min(1).max(100000),
  theme: z.enum(['indigo', 'ocean', 'sunset', 'forest', 'rose', 'slate']).catch('indigo'),
  requirements: z.array(z.enum(['sessions', 'speakers', 'rooms', 'attendees', 'volunteers', 'mentors', 'judges', 'equipment', 'catering', 'budget'])).catch(['sessions', 'attendees']),
  rooms: z.array(z.object({ name: z.string().min(1), capacity: z.number().int().min(1) })).max(12).catch([]),
  sessions: z
    .array(
      z.object({
        title: z.string().min(2),
        description: z.string().catch(''),
        type: z.enum(['keynote', 'talk', 'workshop', 'panel', 'break', 'judging']).catch('talk'),
        dayIndex: z.number().int().min(0),
        start: time,
        end: time,
        roomName: z.string().catch(''),
      }),
    )
    .max(40)
    .catch([]),
  tasks: z.array(z.object({ title: z.string().min(2), priority: z.enum(['low', 'medium', 'high', 'urgent']).catch('medium'), dueOffsetDays: z.number().int() })).max(30).catch([]),
  resources: z.array(z.object({ name: z.string().min(1), category: z.enum(['people', 'equipment', 'catering', 'venue', 'other']).catch('other'), unit: z.string().catch('units'), required: z.number().int().min(1) })).max(20).catch([]),
  tips: z.array(z.string()).max(6).catch([]),
});

const PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    category: { type: Type.STRING, enum: ['conference', 'hackathon', 'festival', 'workshop', 'meetup', 'other'] },
    startDate: { type: Type.STRING, description: 'yyyy-MM-dd' },
    endDate: { type: Type.STRING, description: 'yyyy-MM-dd' },
    dailyStart: { type: Type.STRING, description: 'HH:mm 24h' },
    dailyEnd: { type: Type.STRING, description: 'HH:mm 24h' },
    venue: { type: Type.STRING },
    city: { type: Type.STRING },
    expectedAttendees: { type: Type.INTEGER },
    theme: { type: Type.STRING, enum: ['indigo', 'ocean', 'sunset', 'forest', 'rose', 'slate'] },
    requirements: { type: Type.ARRAY, items: { type: Type.STRING, enum: ['sessions', 'speakers', 'rooms', 'attendees', 'volunteers', 'mentors', 'judges', 'equipment', 'catering', 'budget'] } },
    rooms: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, capacity: { type: Type.INTEGER } }, required: ['name', 'capacity'] } },
    sessions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['keynote', 'talk', 'workshop', 'panel', 'break', 'judging'] },
          dayIndex: { type: Type.INTEGER, description: '0 = first day of the event' },
          start: { type: Type.STRING },
          end: { type: Type.STRING },
          roomName: { type: Type.STRING },
        },
        required: ['title', 'type', 'dayIndex', 'start', 'end'],
      },
    },
    tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, priority: { type: Type.STRING, enum: ['low', 'medium', 'high', 'urgent'] }, dueOffsetDays: { type: Type.INTEGER, description: 'days relative to start date, negative = before' } }, required: ['title', 'priority', 'dueOffsetDays'] } },
    resources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, category: { type: Type.STRING, enum: ['people', 'equipment', 'catering', 'venue', 'other'] }, unit: { type: Type.STRING }, required: { type: Type.INTEGER } }, required: ['name', 'category', 'unit', 'required'] } },
    tips: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['title', 'description', 'category', 'startDate', 'endDate', 'dailyStart', 'dailyEnd', 'venue', 'city', 'expectedAttendees', 'requirements', 'rooms', 'sessions', 'tasks', 'resources'],
};

/** Post-process: keep sessions inside the event days/hours and fix date order. */
function sanitizePlan(plan) {
  if (plan.endDate < plan.startDate) plan.endDate = plan.startDate;
  if (plan.dailyEnd <= plan.dailyStart) plan.dailyEnd = '18:00';
  const days = Math.round((new Date(plan.endDate) - new Date(plan.startDate)) / 86400000) + 1;
  plan.sessions = plan.sessions.filter((s) => s.end > s.start).map((s) => ({ ...s, dayIndex: Math.min(Math.max(0, s.dayIndex), days - 1) }));
  return plan;
}

/**
 * Turn a natural-language description into a full event plan.
 * Gemini only (structured JSON output). Errors are explained in plain words.
 */
/**
 * Models to try, in order. Google limits older models (e.g. gemini-2.5-*) for
 * new API keys, so if the configured one returns 404 we try newer ones.
 */
const MODELS = () => [...new Set([config.gemini.model, 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'])];
let workingModel = null;
const isModelMissing = (err) => /not found|404|is not supported|no longer available/i.test(String(err?.message ?? err));

const isBusy = (err) => /503|UNAVAILABLE|overloaded|high demand|try again later/i.test(String(err?.message ?? err));
const isQuota = (err) => /429|RESOURCE_EXHAUSTED|quota/i.test(String(err?.message ?? err));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls Gemini with automatic recovery:
 *  - model busy (503)  → wait and retry, then try the next model
 *  - model missing (404) or out of free quota (429) → try the next model
 */
async function generate(request) {
  const order = workingModel ? [workingModel, ...MODELS().filter((m) => m !== workingModel)] : MODELS();
  let lastErr;
  for (const model of order) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await gemini().models.generateContent({ ...request, model });
        if (workingModel !== model) console.log(`[ai] using Gemini model: ${model}`);
        workingModel = model;
        return res;
      } catch (err) {
        lastErr = err;
        if (isBusy(err) && attempt === 1) {
          console.warn(`[ai] ${model} is busy, retrying in 2s…`);
          await sleep(2000);
          continue;
        }
        if (isBusy(err) || isModelMissing(err) || isQuota(err)) {
          console.warn(`[ai] ${model} unavailable (${isBusy(err) ? 'busy' : isQuota(err) ? 'quota' : 'not available'}), trying the next model…`);
          break;
        }
        throw err;
      }
    }
  }
  throw lastErr;
}

/** Short, key-free explanation of why a Gemini call failed. */
export function geminiReason(err) {
  const m = String(err?.message ?? err);
  if (/API[_ ]KEY[_ ]INVALID|API key not valid|PERMISSION_DENIED|401|403/i.test(m)) return 'the API key is not valid (check GEMINI_API_KEY in backend/.env)';
  if (/503|UNAVAILABLE|overloaded|high demand/i.test(m)) return 'Google\u2019s Gemini servers are busy right now (tried every model) — wait a minute and click Generate again';
  if (/RESOURCE_EXHAUSTED|429|quota/i.test(m)) return 'free-tier limit reached — wait a minute and try again';
  if (/not found|404|is not supported|no longer available/i.test(m)) return `no Gemini model is available for this key (tried ${MODELS().join(', ')}) — set GEMINI_MODEL in backend/.env to a model listed at https://ai.google.dev/gemini-api/docs/models`;
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|network/i.test(m)) return 'could not reach Google (check your internet)';
  if (/JSON|Unexpected token/i.test(m)) return 'Gemini returned an unreadable answer — try again';
  return m.replace(/AIza[\w-]{20,}/g, '***').slice(0, 140);
}

class AiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.expose = true;
    this.code = 'ai_unavailable';
  }
}
function requireGemini() {
  if (!features.ai) throw new AiError('Gemini is not set up. Add GEMINI_API_KEY to backend/.env and restart the backend.', 503);
}

export async function generateEventPlan({ prompt, today, timeZone }) {
  requireGemini();
  try {
    const res = await generate({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                PLAN_PROMPT.replace('{today}', () => today).replace('{timeZone}', () => timeZone).replace('{userText}', () => prompt),
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', responseSchema: PLAN_RESPONSE_SCHEMA, temperature: 0.4 },
    });
    const parsed = planSchema.parse(JSON.parse(res.text ?? '{}'));
    return { source: 'gemini', plan: sanitizePlan(parsed) };
  } catch (err) {
    console.warn('[ai] Gemini failed:', err.message);
    throw new AiError(`Gemini error: ${geminiReason(err)}`, 502);
  }
}

const briefingSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  nextSteps: z.array(z.string()).max(6),
});

/** Plain-English briefing of an event's status, risks and next steps. */
export async function explainEvent(input) {
  requireGemini();
  try {
    const res = await generate({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                BRIEFING_PROMPT + '\n\n' +
                JSON.stringify(input),
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { summary: { type: Type.STRING }, highlights: { type: Type.ARRAY, items: { type: Type.STRING } }, risks: { type: Type.ARRAY, items: { type: Type.STRING } }, nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ['summary', 'highlights', 'risks', 'nextSteps'],
        },
        temperature: 0.3,
      },
    });
    return { source: 'gemini', briefing: briefingSchema.parse(JSON.parse(res.text ?? '{}')) };
  } catch (err) {
    console.warn('[ai] Gemini briefing failed:', err.message);
    throw new AiError(`Gemini error: ${geminiReason(err)}`, 502);
  }
}

/**
 * Chatbot: the user types a question in the app, Gemini answers using the
 * prompt in lib/prompts.js plus a short summary of the user's events.
 */
export async function chatWithAssistant({ messages, events = [], today }) {
  requireGemini();
  const eventInfo = events.length
    ? events.map((e) => `- ${e.title} (${e.category}) on ${e.startDate}${e.endDate !== e.startDate ? ` to ${e.endDate}` : ''}, ${e.dailyStart}–${e.dailyEnd}, at ${e.venue}, ${e.city}, about ${e.expectedAttendees} people`).join('\n')
    : 'The user has not created any events yet.';
  try {
    const res = await generate({
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: {
        systemInstruction: `${ASSISTANT_PROMPT}\n\nToday is ${today}.\nThe user's events:\n${eventInfo}`,
        temperature: 0.6,
        maxOutputTokens: 800,
      },
    });
    const reply = (res.text ?? '').trim();
    if (!reply) throw new Error('Gemini returned an empty answer — try again');
    return { reply };
  } catch (err) {
    console.warn('[ai] chat failed:', err.message);
    throw new AiError(`Gemini error: ${geminiReason(err)}`, 502);
  }
}

/** Test hook: swap in a fake Gemini client. */
export function _setGeminiClientForTests(fake) {
  client = fake;
  workingModel = null;
}
