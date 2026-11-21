import Papa from 'papaparse';
import { attendeeCsvRowSchema } from '@/schemas';

const HEADER_ALIASES = {
  name: 'name',
  'full name': 'name',
  email: 'email',
  'email address': 'email',
  organization: 'organization',
  organisation: 'organization',
  company: 'organization',
  ticket: 'ticketType',
  'ticket type': 'ticketType',
  tickettype: 'ticketType',
  type: 'ticketType',
  role: 'ticketType',
  category: 'ticketType',
  department: 'organization',
  college: 'organization',
  school: 'organization',
};

/**
 * Parse and validate attendee CSV text. Each row is checked with Zod;
 * duplicates (by email, both inside the file and against existing attendees) are skipped.
 */
export function parseAttendeeCsv(text, existingEmails = new Set()) {
  const parsed = Papa.parse(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim(),
  });

  const result = { valid: [], errors: [], duplicates: 0 };
  const fields = parsed.meta.fields ?? [];
  if (!fields.includes('name') || !fields.includes('email')) {
    result.errors.push({ row: 0, message: 'CSV must include “name” and “email” columns.' });
    return result;
  }
  const seen = new Set(existingEmails);

  parsed.data.forEach((raw, i) => {
    const rowNum = i + 2; // +1 header, +1 for 1-based
    const check = attendeeCsvRowSchema.safeParse(raw);
    if (!check.success) {
      result.errors.push({ row: rowNum, message: check.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') });
      return;
    }
    const email = check.data.email.toLowerCase();
    if (seen.has(email)) {
      result.duplicates++;
      return;
    }
    seen.add(email);
    result.valid.push({ ...check.data, email });
  });

  return result;
}

export const SAMPLE_CSV = `name,email,department,type
Ananya Rao,ananya@example.com,CSE,student
Rahul Mehta,rahul.parent@example.com,CSE,parent
Dr. Priya Nair,priya@example.com,ECE,faculty`;
