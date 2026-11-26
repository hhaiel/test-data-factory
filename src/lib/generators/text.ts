import { charLength, stringOfLength } from '../strings';
import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

/**
 * Text field. `min` / `max` are length limits in characters.
 * Nasty values keep their expectation honest: if a nasty value is also too long or too short,
 * it is expected to be rejected for that reason first.
 */
export function generateText(field: FieldSpec): TestValue[] {
  const min = field.min ?? (field.required ? 1 : 0);
  const max = field.max;
  const inRange = (v: string) => {
    const len = charLength(v);
    return len >= min && (max === undefined || len <= max);
  };
  const lengthNote = (v: string) => {
    const len = charLength(v);
    if (len < min) return ` It is also shorter than the minimum of ${min}.`;
    if (max !== undefined && len > max) return ` It is also longer than the maximum of ${max}.`;
    return '';
  };

  const values: TestValue[] = [];

  // Valid: a realistic value if one fits the range, otherwise filler text in the middle of it.
  const realistic = ['Maria Clara Santos', 'Maria Santos', 'Juan dela Cruz', 'Ana Reyes', 'Maria', 'Ana'].find(inRange);
  const midLength = max === undefined ? Math.max(min, 12) : Math.round((min + max) / 2);
  const typical = realistic ?? stringOfLength(Math.max(midLength, 1));
  if (inRange(typical)) {
    values.push({ value: typical, category: 'valid', expect: 'accept', reason: `Typical value, ${charLength(typical)} characters` });
  }
  const accented = 'José Peña';
  if (inRange(accented)) {
    values.push({ value: accented, category: 'valid', expect: 'accept', reason: 'Accented letters (é, ñ) are normal in names' });
  }

  // Boundaries on length.
  if (min > 0) {
    values.push({ value: stringOfLength(min), category: 'boundary', expect: 'accept', reason: `Exactly the minimum length (${min})` });
    if (min - 1 > 0) {
      values.push({ value: stringOfLength(min - 1), category: 'boundary', expect: 'reject', reason: `One character below the minimum (${min - 1})` });
    }
  }
  if (max !== undefined) {
    values.push({ value: stringOfLength(max), category: 'boundary', expect: 'accept', reason: `Exactly the maximum length (${max})` });
    values.push({ value: stringOfLength(max + 1), category: 'boundary', expect: 'reject', reason: `One character over the maximum (${max + 1})` });
  }

  // Invalid.
  values.push(emptyValue(field));
  if (field.required) {
    values.push({ value: '   ', category: 'invalid', expect: 'reject', reason: 'Only spaces: looks filled in but has no content' });
  }

  // Nasty: values that break weak validation, storage or display.
  const nasty: { value: string; expect: TestValue['expect']; reason: string }[] = [
    { value: '  Maria Santos  ', expect: 'confirm', reason: 'Leading and trailing spaces: should they be trimmed before saving?' },
    { value: 'Maria 😀', expect: 'confirm', reason: 'Emoji: some databases and length checks count it as 2 characters' },
    { value: "Robert'); DROP TABLE users;--", expect: 'accept', reason: 'Looks like SQL: must be saved as plain text, never run' },
    { value: '<script>alert(1)</script>', expect: 'confirm', reason: 'Looks like HTML: must never run as code when shown again' },
    { value: 'مريم سانتوس', expect: 'accept', reason: 'Right-to-left script: checks layout and storage of non-Latin text' },
    { value: 'Maria​Santos', expect: 'confirm', reason: 'Hidden zero-width space: two values that look the same are different' },
    { value: 'null', expect: 'accept', reason: 'The word "null": some code confuses it with no value at all' },
  ];
  for (const n of nasty) {
    const outOfRange = !inRange(n.value);
    values.push({
      value: n.value,
      category: 'nasty',
      expect: outOfRange ? 'reject' : n.expect,
      reason: n.reason + lengthNote(n.value),
    });
  }

  const huge = stringOfLength(10_000);
  const hugeReason = 'Very long input (10,000 characters): checks limits on the server, not just the form';
  values.push(
    max === undefined
      ? { value: huge, category: 'nasty', expect: 'confirm', reason: `${hugeReason}. No maximum is set, so confirm the real limit.` }
      : { value: huge, category: 'nasty', expect: inRange(huge) ? 'accept' : 'reject', reason: hugeReason },
  );

  return values;
}
