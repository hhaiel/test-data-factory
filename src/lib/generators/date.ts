import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses YYYY-MM-DD as a UTC date, or returns null if it is not a real calendar date. */
export function parseIsoDate(value: string): Date | null {
  const m = ISO.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Date field, entered as YYYY-MM-DD. `minDate` / `maxDate` are inclusive. */
export function generateDate(field: FieldSpec): TestValue[] {
  const min = field.minDate ? parseIsoDate(field.minDate) : null;
  const max = field.maxDate ? parseIsoDate(field.maxDate) : null;
  const inRange = (d: Date) => (!min || d >= min) && (!max || d <= max);
  const values: TestValue[] = [];

  const typical = min && max ? addDays(min, Math.floor((max.getTime() - min.getTime()) / 86_400_000 / 2)) : min ? addDays(min, 30) : max ? addDays(max, -30) : new Date(Date.UTC(2026, 5, 15));
  values.push({ value: toIso(typical), category: 'valid', expect: 'accept', reason: 'Typical date inside the range' });

  if (min) {
    values.push({ value: toIso(min), category: 'boundary', expect: 'accept', reason: 'Earliest allowed date' });
    values.push({ value: toIso(addDays(min, -1)), category: 'boundary', expect: 'reject', reason: 'One day before the earliest allowed date' });
  }
  if (max) {
    values.push({ value: toIso(max), category: 'boundary', expect: 'accept', reason: 'Latest allowed date' });
    values.push({ value: toIso(addDays(max, 1)), category: 'boundary', expect: 'reject', reason: 'One day after the latest allowed date' });
  }

  values.push(emptyValue(field));
  values.push({ value: '2026-02-30', category: 'invalid', expect: 'reject', reason: 'February 30 does not exist' });
  values.push({ value: '2026-13-01', category: 'invalid', expect: 'reject', reason: 'Month 13 does not exist' });
  values.push({ value: 'next Tuesday', category: 'invalid', expect: 'reject', reason: 'Words instead of a date' });

  // Leap days: pick the first leap year at or after the typical date's year.
  let leapYear = typical.getUTCFullYear();
  while (!(leapYear % 4 === 0 && (leapYear % 100 !== 0 || leapYear % 400 === 0))) leapYear++;
  const leapDay = new Date(Date.UTC(leapYear, 1, 29));
  values.push({
    value: toIso(leapDay),
    category: 'nasty',
    expect: inRange(leapDay) ? 'accept' : 'reject',
    reason: inRange(leapDay) ? 'Leap day: a real date that date code often gets wrong' : 'Leap day: a real date, but outside the allowed range',
  });
  values.push({ value: `${leapYear + 1}-02-29`, category: 'nasty', expect: 'reject', reason: 'February 29 in a year that is not a leap year' });
  values.push({ value: '11/26/2026', category: 'nasty', expect: 'confirm', reason: 'US month/day order: is it rejected or read correctly?' });
  values.push({ value: '26/11/2026', category: 'nasty', expect: 'confirm', reason: 'Day/month order used in the Philippines and Europe' });
  values.push({ value: '0000-00-00', category: 'nasty', expect: 'reject', reason: 'All zeros: a placeholder some databases store as a date' });
  values.push({ value: '1900-01-01', category: 'nasty', expect: min || max ? (inRange(new Date(Date.UTC(1900, 0, 1))) ? 'accept' : 'reject') : 'confirm', reason: 'Very old date: often used as a fake default' });
  values.push({ value: '9999-12-31', category: 'nasty', expect: max ? 'reject' : 'confirm', reason: 'Far-future date: often used to mean "never expires"' });

  return values;
}
