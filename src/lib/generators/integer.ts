import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

/** Whole number field. `min` / `max` are the allowed values (inclusive). */
export function generateInteger(field: FieldSpec): TestValue[] {
  const { min, max } = field;
  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);
  const values: TestValue[] = [];

  // Valid: the middle of the range (or a plain number if the range is open).
  const typical = min !== undefined && max !== undefined ? Math.round((min + max) / 2) : min !== undefined ? min + 10 : max !== undefined ? max - 10 : 42;
  values.push({ value: String(typical), category: 'valid', expect: 'accept', reason: 'Typical value inside the range' });
  if (inRange(0) && typical !== 0 && min !== 0 && max !== 0) {
    values.push({ value: '0', category: 'valid', expect: 'accept', reason: 'Zero is allowed: easy to treat as "no value" by mistake' });
  }

  // Boundaries.
  if (min !== undefined) {
    values.push({ value: String(min), category: 'boundary', expect: 'accept', reason: `Minimum allowed (${min})` });
    values.push({ value: String(min - 1), category: 'boundary', expect: 'reject', reason: `Just below the minimum (${min - 1})` });
  }
  if (max !== undefined) {
    values.push({ value: String(max), category: 'boundary', expect: 'accept', reason: `Maximum allowed (${max})` });
    values.push({ value: String(max + 1), category: 'boundary', expect: 'reject', reason: `Just above the maximum (${max + 1})` });
  }

  // Invalid: the wrong kind of input.
  values.push(emptyValue(field));
  values.push({ value: `${typical}.5`, category: 'invalid', expect: 'reject', reason: 'Decimal in a whole-number field' });
  values.push({ value: 'twenty', category: 'invalid', expect: 'reject', reason: 'Words instead of digits' });
  if (min !== undefined && min >= 0) {
    values.push({ value: '-5', category: 'invalid', expect: 'reject', reason: 'Negative number when only positive values make sense' });
  }

  // Nasty: inputs that some number parsers quietly accept.
  values.push({ value: '1e2', category: 'nasty', expect: 'reject', reason: 'Scientific notation: JavaScript reads it as 100' });
  values.push({ value: '0x1A', category: 'nasty', expect: 'reject', reason: 'Hexadecimal: some parsers read it as 26' });
  if (typical >= 0) {
    values.push({ value: `0${typical}`, category: 'nasty', expect: 'confirm', reason: 'Leading zero: accept it as the same number, or reject it?' });
    values.push({ value: `+${typical}`, category: 'nasty', expect: 'confirm', reason: 'Plus sign in front: valid for some parsers, not others' });
  }
  values.push({ value: ` ${typical} `, category: 'nasty', expect: 'confirm', reason: 'Spaces around the number: should they be trimmed?' });
  values.push({ value: toArabicIndic(typical), category: 'nasty', expect: 'reject', reason: 'Arabic-Indic digits: real digits, but not 0–9' });
  values.push({ value: '99999999999999999999', category: 'nasty', expect: 'reject', reason: 'Larger than JavaScript can store exactly: may silently change value' });

  return values;
}

function toArabicIndic(n: number): string {
  return String(Math.abs(n)).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}
