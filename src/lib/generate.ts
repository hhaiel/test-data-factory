import { generateDate, parseIsoDate } from './generators/date';
import { decimalPlaces, generateDecimal } from './generators/decimal';
import { generateDropdown } from './generators/dropdown';
import { generateEmail } from './generators/email';
import { generateInteger } from './generators/integer';
import { generatePassword, requiredRules } from './generators/password';
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

/** Like parseLimit, but allows a decimal part ("12.50"). Still refuses "1e2", "0x1A" and commas. */
export function parseDecimalLimit(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

/** Turns the dropdown editor's text (one option per line) into a list, ignoring blank lines. */
export function parseOptions(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((o) => o.trim())
    .filter((o) => o !== '');
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
  const optionalRules = (v: unknown) =>
    v === undefined ||
    v === null ||
    (typeof v === 'object' && ['upper', 'lower', 'digit', 'symbol'].every((k) => typeof (v as Record<string, unknown>)[k] === 'boolean'));
  const optionalOptions = (v: unknown) => v === undefined || v === null || (Array.isArray(v) && v.every((o) => typeof o === 'string'));
  return (
    typeof f.id === 'string' &&
    typeof f.name === 'string' &&
    typeof f.type === 'string' &&
    Object.hasOwn(FIELD_TYPE_LABELS, f.type) &&
    typeof f.required === 'boolean' &&
    optionalNumber(f.min) &&
    optionalNumber(f.max) &&
    optionalString(f.minDate) &&
    optionalString(f.maxDate) &&
    optionalNumber(f.decimals) &&
    optionalRules(f.rules) &&
    optionalOptions(f.options)
  );
}

/**
 * Checks a field description before generating anything.
 * Returns a message for the first problem found, or null if the field is usable.
 */
export function validateField(field: FieldSpec): string | null {
  if (!field.name.trim()) return 'Give the field a name';
  const isLength = field.type === 'text' || field.type === 'password';
  if (isLength || field.type === 'integer') {
    for (const [label, n] of [['Min', field.min], ['Max', field.max]] as const) {
      // Safe integers only: 1e20 is "whole" to JavaScript but can't be stored exactly.
      if (n !== undefined && !Number.isSafeInteger(n)) return `${label} must be a whole number`;
    }
    if (isLength && ((field.min ?? 0) < 0 || (field.max ?? 0) < 0)) return "Length can't be negative";
    if (isLength && field.min !== undefined && field.min > MAX_TEXT_LENGTH) return 'Min length is 100,000 characters at most';
    if (isLength && field.max !== undefined && field.max > MAX_TEXT_LENGTH) return 'Max length is 100,000 characters';
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) return "Min can't be greater than max";
  }
  if (field.type === 'password') {
    // Every required character type needs a place, or no valid password exists.
    const needed = requiredRules(field.rules).length;
    if (needed > 0 && field.min !== undefined && field.min < needed) return `Min length must be at least ${needed} to fit the required character types`;
    if (needed > 0 && field.max !== undefined && field.max < needed) return `Max length must be at least ${needed} to fit the required character types`;
  }
  if (field.type === 'decimal') {
    const d = field.decimals ?? 2;
    if (!Number.isInteger(d) || d < 0 || d > 6) return 'Decimal places must be a whole number from 0 to 6';
    for (const [label, n] of [['Min', field.min], ['Max', field.max]] as const) {
      if (n === undefined) continue;
      if (!Number.isFinite(n)) return `${label} must be a number`;
      if (Math.abs(n) * 10 ** d > Number.MAX_SAFE_INTEGER / 10) return `${label} is too large`;
      if (decimalPlaces(n) > d) return `${label} has more decimal places than allowed (${d})`;
    }
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) return "Min can't be greater than max";
  }
  if (field.type === 'dropdown') {
    const options = field.options ?? [];
    if (options.length === 0) return 'Add at least one option';
    const seen = new Set<string>();
    for (const o of options) {
      if (seen.has(o)) return `Options must be unique: "${o}" is listed twice`;
      seen.add(o);
    }
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
    case 'decimal':
      return generateDecimal(field);
    case 'password':
      return generatePassword(field);
    case 'dropdown':
      return generateDropdown(field);
  }
}
