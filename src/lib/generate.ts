import { generateDate, parseIsoDate } from './generators/date';
import { generateEmail } from './generators/email';
import { generateInteger } from './generators/integer';
import { generatePhMobile } from './generators/phMobile';
import { generateText } from './generators/text';
import { FIELD_TYPE_LABELS, type FieldSpec, type TestValue } from './types';

/** Longest text the tool will build a boundary value for. */
export const MAX_TEXT_LENGTH = 100_000;

/**
 * Reads a Min/Max input. Empty means "no limit". Only plain digits with an optional minus
 * count as a number: Number() would also accept "1e2" (100) and "0x1A" (26), which a tester
 * never means (DEF-004). Anything else becomes NaN, which validateField reports.
 */
export function parseLimit(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  return /^-?\d+$/.test(t) ? Number(t) : Number.NaN;
}

/**
 * Checks that saved data really is a field description (DEF-002): data saved by another
 * version, or edited by hand, may be valid JSON with the wrong content.
 */
export function isFieldSpec(value: unknown): value is FieldSpec {
  if (typeof value !== 'object' || value === null) return false;
  const f = value as Record<string, unknown>;
  const optionalNumber = (v: unknown) => v === undefined || v === null || typeof v === 'number';
  const optionalString = (v: unknown) => v === undefined || v === null || typeof v === 'string';
  return (
    typeof f.id === 'string' &&
    typeof f.name === 'string' &&
    typeof f.type === 'string' &&
    Object.hasOwn(FIELD_TYPE_LABELS, f.type) &&
    typeof f.required === 'boolean' &&
    optionalNumber(f.min) &&
    optionalNumber(f.max) &&
    optionalString(f.minDate) &&
    optionalString(f.maxDate)
  );
}

/**
 * Checks a field description before generating anything.
 * Returns a message for the first problem found, or null if the field is usable.
 */
export function validateField(field: FieldSpec): string | null {
  if (!field.name.trim()) return 'Give the field a name';
  if (field.type === 'text' || field.type === 'integer') {
    for (const [label, n] of [['Min', field.min], ['Max', field.max]] as const) {
      // Safe integers only: 1e20 is "whole" to JavaScript but can't be stored exactly.
      if (n !== undefined && !Number.isSafeInteger(n)) return `${label} must be a whole number`;
    }
    if (field.type === 'text' && ((field.min ?? 0) < 0 || (field.max ?? 0) < 0)) return "Length can't be negative";
    if (field.type === 'text' && field.min !== undefined && field.min > MAX_TEXT_LENGTH) return 'Min length is 100,000 characters at most';
    if (field.type === 'text' && field.max !== undefined && field.max > MAX_TEXT_LENGTH) return 'Max length is 100,000 characters';
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) return "Min can't be greater than max";
  }
  if (field.type === 'date') {
    if (field.minDate && !parseIsoDate(field.minDate)) return 'Earliest date must be a real date (YYYY-MM-DD)';
    if (field.maxDate && !parseIsoDate(field.maxDate)) return 'Latest date must be a real date (YYYY-MM-DD)';
    if (field.minDate && field.maxDate && field.minDate > field.maxDate) return "Earliest date can't be after the latest date";
  }
  return null;
}

/**
 * Generates the full test data set for one field.
 * Returns an empty list if the field description is invalid (see `validateField`).
 * Values are unique: if two rules produce the same value, the first one wins.
 */
export function generate(field: FieldSpec): TestValue[] {
  if (validateField(field)) return [];
  const all = byType(field);
  const seen = new Set<string>();
  return all.filter((v) => {
    if (seen.has(v.value)) return false;
    seen.add(v.value);
    return true;
  });
}

function byType(field: FieldSpec): TestValue[] {
  switch (field.type) {
    case 'text':
      return generateText(field);
    case 'integer':
      return generateInteger(field);
    case 'email':
      return generateEmail(field);
    case 'date':
      return generateDate(field);
    case 'phMobile':
      return generatePhMobile(field);
  }
}
