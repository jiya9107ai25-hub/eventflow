import { config } from '../config.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ preheader, heading, body, cta }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1e2235">
<span style="display:none">${esc(preheader)}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e3e7f0">
<tr><td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:22px 28px;color:#fff;font-weight:800;font-size:18px">EventFlow</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px">${esc(heading)}</h1>
${body}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.href)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8f9fc;color:#6b7280;font-size:12px">Sent by EventFlow on behalf of the event organizers.</td></tr>
</table></td></tr></table></body></html>`;
}

const list = (items, color = '#1e2235') =>
  items.length ? `<ul style="padding-left:18px;margin:8px 0;color:${color}">${items.map((i) => `<li style="margin:6px 0">${esc(i)}</li>`).join('')}</ul>` : '';

const eventLine = (e) => `<p style="margin:0 0 16px;color:#6b7280">${esc(e.dateLabel ?? `${e.startDate} – ${e.endDate}`)} · ${esc(e.venue)}, ${esc(e.city)}</p>`;
const eventUrl = (e) => `${config.appUrl}/app/events/${e.id}`;

/**
 * Every template returns { subject, html, text }.
 * `data` always has `event`; other fields depend on the template.
 */
export const templates = {
  /** Digest of everything that needs attention (scheduling conflicts, date clashes, shortages, overdue tasks). */
  'alert-digest'({ event, conflicts = [], clashes = [], shortages = [], overdue = [], note = '' }) {
    const section = (title, items, color) => (items.length ? `<h3 style="margin:18px 0 4px;font-size:15px;color:${color}">${esc(title)} (${items.length})</h3>${list(items)}` : '');
    const total = conflicts.length + clashes.length + shortages.length + overdue.length;
    return {
      subject: `⚠️ ${total} alert(s) for ${event.title}`,
      html: layout({
        preheader: `${total} item(s) need attention`,
        heading: `${total} item(s) need attention`,
        body:
          eventLine(event) +
          (note ? `<p style="background:#eef2ff;padding:12px;border-radius:10px">${esc(note)}</p>` : '') +
          section('Date clashes with other events', clashes, '#be123c') +
          section('Scheduling conflicts', conflicts, '#be123c') +
          section('Resource shortages', shortages, '#b45309') +
          section('Overdue tasks', overdue, '#b45309') +
          (total === 0 ? '<p>Everything looks good — no open alerts. 🎉</p>' : ''),
        cta: { label: 'Open event workspace', href: eventUrl(event) },
      }),
      text: `${total} alert(s) for ${event.title}\n\n${[...clashes, ...conflicts, ...shortages, ...overdue].map((x) => `- ${x}`).join('\n')}\n\n${eventUrl(event)}`,
    };
  },

  /** Sent when a new/edited event's dates overlap other events. */
  'date-clash'({ event, clashes = [] }) {
    return {
      subject: `📅 Date clash: ${event.title} overlaps ${clashes.length} event(s)`,
      html: layout({
        preheader: 'Your event dates overlap other events',
        heading: 'Heads up — date clash detected',
        body: eventLine(event) + '<p>The dates of this event overlap with:</p>' + list(clashes, '#be123c') + '<p style="color:#6b7280">Check that your team, venue and resources are not double-booked.</p>',
        cta: { label: 'Review event', href: eventUrl(event) },
      }),
      text: `Date clash for ${event.title}:\n${clashes.map((c) => `- ${c}`).join('\n')}`,
    };
  },

  /** Sent to a team member when a task is assigned to them. */
  'task-assigned'({ event, task, assigneeName, assignedBy }) {
    return {
      subject: `✅ New task for ${event.title}: ${task.title}`,
      html: layout({
        preheader: `${assignedBy} assigned you a task`,
        heading: `Hi ${assigneeName}, you have a new task`,
        body:
          eventLine(event) +
          `<table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e3e7f0;border-radius:12px"><tr><td style="padding:16px">
          <p style="margin:0;font-weight:700;font-size:16px">${esc(task.title)}</p>
          ${task.description ? `<p style="margin:6px 0 0;color:#6b7280">${esc(task.description)}</p>` : ''}
          <p style="margin:10px 0 0;font-size:13px">Priority: <b>${esc(task.priority)}</b>${task.dueDate ? ` · Due: <b>${esc(task.dueDate)}</b>` : ''}</p>
          </td></tr></table><p style="color:#6b7280">Assigned by ${esc(assignedBy)}.</p>`,
        cta: { label: 'View task board', href: `${eventUrl(event)}/tasks` },
      }),
      text: `New task: ${task.title} (${task.priority})${task.dueDate ? ` due ${task.dueDate}` : ''} — ${event.title}`,
    };
  },

  /** Sent when an event admin invites someone to co-organize. */
  'organizer-invite'({ event, inviterName = 'An organizer', inviteeEmail = '' }) {
    return {
      subject: `${inviterName} invited you to co-organize ${event.title}`,
      html: layout({
        preheader: 'You have been invited to help organize an event',
        heading: `Join ${event.title} as a co-organizer`,
        body:
          eventLine(event) +
          `<p><b>${esc(inviterName)}</b> invited you to help organize this event on EventFlow. As a co-organizer you can manage the schedule, tasks, resources, attendees and chat.</p>` +
          `<p style="background:#eef2ff;padding:12px;border-radius:10px">Log in or sign up with <b>${esc(inviteeEmail)}</b> and the event will appear in your dashboard automatically.</p>`,
        cta: { label: 'Open EventFlow', href: `${config.appUrl}/signup` },
      }),
      text: `${inviterName} invited you to co-organize ${event.title}. Log in or sign up at ${config.appUrl} with ${inviteeEmail} and the event will appear in your dashboard.`,
    };
  },

  /** Invitation / reminder with Google Calendar link and .ics attachment. */
  'event-invite'({ event, message = '', googleLink, sessions = [], kind = 'invite' }) {
    const isReminder = kind === 'reminder';
    return {
      subject: isReminder ? `⏰ Reminder: ${event.title} is coming up` : `🎟️ You're invited: ${event.title}`,
      html: layout({
        preheader: isReminder ? 'Event reminder' : 'Event invitation',
        heading: isReminder ? `Reminder: ${event.title}` : `You're invited to ${event.title}`,
        body:
          eventLine(event) +
          `<p>${esc(event.description)}</p>` +
          (message ? `<p style="background:#eef2ff;padding:12px;border-radius:10px">${esc(message)}</p>` : '') +
          (sessions.length ? `<h3 style="font-size:15px;margin:18px 0 4px">Schedule highlights</h3>${list(sessions.slice(0, 8))}` : '') +
          (googleLink ? `<p style="margin-top:18px"><a href="${esc(googleLink)}" style="color:#4f46e5;font-weight:600">➕ Add to Google Calendar</a> · the attached .ics works with Outlook & Apple Calendar.</p>` : ''),
        cta: { label: 'Open in EventFlow', href: eventUrl(event) },
      }),
      text: `${event.title}\n${event.description}\n${googleLink ?? ''}`,
    };
  },
};

export const TEMPLATE_NAMES = Object.keys(templates);
