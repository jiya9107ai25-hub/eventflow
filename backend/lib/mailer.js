import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config, features } from '../config.js';
import { templates } from './emailTemplates.js';

const OUTBOX = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'outbox');

/** "Jiya Arora via EventFlow <noreply@your-mailgun-domain>" */
export function fromHeader(senderName) {
  const address = `noreply@${config.mailgun.domain || 'eventflow.local'}`;
  if (!senderName) return `EventFlow <${address}>`;
  const safe = String(senderName).replace(/["<>\r\n]/g, '').slice(0, 60);
  return `"${safe} via EventFlow" <${address}>`;
}

/** Send through the Mailgun HTTP API (no SDK needed — Node's fetch + FormData). */
async function sendWithMailgun({ from, to, subject, html, text, replyTo, attachments }) {
  const form = new FormData();
  form.append('from', from);
  for (const r of to) form.append('to', r);
  form.append('subject', subject);
  form.append('html', html);
  form.append('text', text);
  if (replyTo) form.append('h:Reply-To', replyTo);
  for (const a of attachments) form.append('attachment', new Blob([a.content], { type: a.contentType }), a.filename);

  const res = await fetch(`${config.mailgun.baseUrl}/v3/${config.mailgun.domain}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${config.mailgun.apiKey}`).toString('base64')}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = res.status === 401 ? ' (check MAILGUN_API_KEY)' : res.status === 403 || /sandbox|authorized/i.test(body.message ?? '') ? ' (sandbox domains can only send to Authorized Recipients — add them in Mailgun)' : '';
    throw Object.assign(new Error(`Mailgun: ${body.message ?? res.statusText}${hint}`), { status: 502 });
  }
  return body.id;
}

/**
 * Render a template and deliver it.
 *  - MAILGUN_API_KEY + MAILGUN_DOMAIN set → real email via Mailgun.
 *  - Otherwise → "preview" mode: saved to backend/data/outbox, viewable in the browser.
 */
export async function sendTemplatedEmail({ to, template, data, attachments = [], replyTo, senderName }) {
  const render = templates[template];
  if (!render) throw Object.assign(new Error(`Unknown email template "${template}"`), { status: 400 });
  const { subject, html, text } = render(data);
  const from = fromHeader(senderName);
  const id = crypto.randomUUID();

  if (features.email) {
    const messageId = await sendWithMailgun({ from, to, subject, html, text, replyTo, attachments });
    return { id, status: 'sent', subject, to, messageId };
  }

  await fs.mkdir(OUTBOX, { recursive: true });
  const esc = (s) => String(s).replace(/</g, '&lt;');
  const banner = `<div style="font-family:Arial;background:#fef3c7;color:#92400e;padding:10px 16px;font-size:13px">
    <b>Preview mode</b> — Mailgun isn't configured, so this email was not delivered.
    From: ${esc(from)} · Reply-To: ${esc(replyTo ?? '—')} · To: ${to.map(esc).join(', ')} · Attachments: ${attachments.map((a) => a.filename).join(', ') || 'none'}</div>`;
  await fs.writeFile(path.join(OUTBOX, `${id}.html`), banner + html, 'utf8');
  console.log(`[email:preview] "${subject}" → ${to.join(', ')}  (${config.apiUrl}/api/email/preview/${id})`);
  return { id, status: 'preview', subject, to, previewUrl: `${config.apiUrl}/api/email/preview/${id}` };
}

export async function readPreview(id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  try {
    return await fs.readFile(path.join(OUTBOX, `${id}.html`), 'utf8');
  } catch {
    return null;
  }
}
