import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { geminiReason } from '../lib/ai.js';
import { mailgunDomain } from '../config.js';
import { buildIcs, googleCalendarLink } from '../lib/ics.js';
import { fromHeader } from '../lib/mailer.js';

describe('Gemini errors', () => {
  it('explains failures without leaking the key', () => {
    assert.match(geminiReason(new Error('API key not valid. Please pass a valid API key.')), /not valid/);
    assert.match(geminiReason(new Error('429 RESOURCE_EXHAUSTED')), /limit/);
    assert.doesNotMatch(geminiReason(new Error('weird AIzaSyA1234567890abcdefghijklmnop')), /AIza/);
  });
});

describe('config', () => {
  it('reads the Mailgun domain even from a pasted dashboard URL', () => {
    assert.equal(mailgunDomain('https://app.mailgun.com/mg/sending/sandboxabc.mailgun.org/settings?tab=setup'), 'sandboxabc.mailgun.org');
    assert.equal(mailgunDomain('mg.example.com'), 'mg.example.com');
  });
});

describe('helpers', () => {
  it('builds an .ics and Google Calendar link', () => {
    const event = { id: 'e1', title: 'Demo', description: 'D', startDate: '2026-12-12', endDate: '2026-12-12', dailyStart: '09:00', dailyEnd: '18:00', venue: 'Hall', city: 'Pune' };
    assert.match(buildIcs({ event, timeZone: 'Asia/Kolkata' }), /DTSTART;TZID=Asia\/Kolkata:20261212T090000/);
    assert.match(googleCalendarLink({ title: 'X', day: '2026-12-12', start: '09:00', end: '10:00' }), /dates=20261212T090000%2F20261212T100000/);
  });
  it('formats the sender as "<Name> via EventFlow"', () => {
    assert.match(fromHeader('Jiya Arora'), /^"Jiya Arora via EventFlow" <noreply@/);
    assert.match(fromHeader('Bad"<Name>'), /^"BadName via EventFlow"/);
  });
});

describe('HTTP API', () => {
  let server;
  let base;
  let token;
  const json = { 'content-type': 'application/json' };
  const auth = () => ({ ...json, authorization: `Bearer ${token}` });
  const event = { id: 'e1', title: 'Demo', description: 'Desc', category: 'meetup', startDate: '2026-12-12', endDate: '2026-12-12', dailyStart: '17:00', dailyEnd: '20:00', venue: 'Hub', city: 'Pune', expectedAttendees: 50, requirements: [] };

  before(async () => {
    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(() => server.close());

  it('reports health', async () => {
    const r = await (await fetch(`${base}/health`)).json();
    assert.equal(r.ok, true);
    assert.ok(['mailgun', 'preview'].includes(r.features.email));
  });

  it('issues a JWT session (dev mode) and rejects requests without it', async () => {
    assert.equal((await fetch(`${base}/ai/generate-event`, { method: 'POST', headers: json, body: '{}' })).status, 401);
    const r = await fetch(`${base}/auth/session`, { method: 'POST', headers: json, body: JSON.stringify({ uid: 'u1', email: 'me@example.com', name: 'Jiya Arora' }) });
    assert.equal(r.status, 200);
    token = (await r.json()).token;
    assert.ok(token.split('.').length === 3);
    assert.equal((await fetch(`${base}/ai/generate-event`, { method: 'POST', headers: { ...json, authorization: 'Bearer nope' }, body: '{}' })).status, 401);
  });

  it('validates chatbot messages', async () => {
    const bad = await fetch(`${base}/ai/chat`, { method: 'POST', headers: auth(), body: JSON.stringify({ messages: [], today: '2026-11-21' }) });
    assert.equal(bad.status, 400);
    const ok = await fetch(`${base}/ai/chat`, { method: 'POST', headers: auth(), body: JSON.stringify({ messages: [{ role: 'user', content: 'How many volunteers do I need?' }], today: '2026-11-21' }) });
    assert.ok([200, 502, 503].includes(ok.status));
  });

  it('says clearly when Gemini is not set up (no offline fallback)', async () => {
    const r = await fetch(`${base}/ai/generate-event`, { method: 'POST', headers: auth(), body: JSON.stringify({ prompt: 'Tech conference for 300 people in Bengaluru next month', today: '2026-11-21', timeZone: 'Asia/Kolkata' }) });
    if (r.status === 503) assert.match((await r.json()).error, /GEMINI_API_KEY/);
    else assert.ok([200, 502].includes(r.status));
  });

  it('sends a co-organizer invite as "<Name> via EventFlow" with Reply-To the sender', async () => {
    const r = await fetch(`${base}/email/send`, { method: 'POST', headers: auth(), body: JSON.stringify({ to: ['friend@example.com'], template: 'organizer-invite', data: { event, inviterName: 'Jiya Arora', inviteeEmail: 'friend@example.com' } }) });
    assert.equal(r.status, 200);
    const body = await r.json();
    if (body.status === 'preview') {
      const html = await (await fetch(body.previewUrl.replace(/^http:\/\/localhost:\d+/, `http://127.0.0.1:${server.address().port}`))).text();
      assert.match(html, /Jiya Arora via EventFlow/);
      assert.match(html, /Reply-To: me@example.com/);
    }
  });

  it('attaches an .ics to invitations', async () => {
    const r = await fetch(`${base}/email/send`, { method: 'POST', headers: auth(), body: JSON.stringify({ to: ['a@example.com'], template: 'event-invite', data: { event }, calendar: { sessions: [], rooms: [], timeZone: 'Asia/Kolkata' } }) });
    assert.equal(r.status, 200);
  });

  it('validates recipients', async () => {
    const r = await fetch(`${base}/email/send`, { method: 'POST', headers: auth(), body: JSON.stringify({ to: ['nope'], template: 'alert-digest', data: { event } }) });
    assert.equal(r.status, 400);
  });
});
