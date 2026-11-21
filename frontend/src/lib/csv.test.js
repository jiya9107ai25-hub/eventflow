import { describe, expect, it } from 'vitest';
import { parseAttendeeCsv } from './csv';

describe('parseAttendeeCsv', () => {
  it('parses valid rows and normalises values', () => {
    const r = parseAttendeeCsv('Name,Email,Department,Type\nAsha,ASHA@x.com,CSE,Parents');
    expect(r.errors).toEqual([]);
    expect(r.valid).toEqual([{ name: 'Asha', email: 'asha@x.com', organization: 'CSE', ticketType: 'parent' }]);
  });

  it('applies defaults for optional columns', () => {
    const r = parseAttendeeCsv('name,email\nBen,ben@x.com');
    expect(r.valid[0]).toEqual({ name: 'Ben', email: 'ben@x.com', ticketType: 'general', organization: '' });
  });

  it('reports invalid rows with row numbers', () => {
    const r = parseAttendeeCsv('name,email\nA,not-an-email\nGood Person,good@x.com');
    expect(r.valid).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(2);
  });

  it('rejects files missing required columns', () => {
    const r = parseAttendeeCsv('fullname,mail\nA,a@x.com');
    expect(r.valid).toHaveLength(0);
    expect(r.errors[0].message).toMatch(/name.*email/i);
  });

  it('skips duplicates within the file and against existing attendees', () => {
    const r = parseAttendeeCsv('name,email\nOne,dup@x.com\nTwo,dup@x.com\nThree,old@x.com', new Set(['old@x.com']));
    expect(r.valid).toHaveLength(1);
    expect(r.duplicates).toBe(2);
  });

  it('rejects unknown ticket types', () => {
    const r = parseAttendeeCsv('name,email,ticket\nZed,z@x.com,platinum');
    expect(r.valid).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
  });
});
