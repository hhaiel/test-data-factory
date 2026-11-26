import { generateDate, parseIsoDate } from './generators/date';
import { generateEmail } from './generators/email';
import { generateInteger } from './generators/integer';
import { generatePhMobile } from './generators/phMobile';
import { generateText } from './generators/text';
import type { FieldSpec, TestValue } from './types';

/**
 * Checks a field description before generating anything.
 * Returns a message for the first problem found, or null if the field is usable.
 */
export function validateField(field: FieldSpec): string | null {
  if (!field.name.trim()) return 'Give the field a name';
  if (field.type === 'text' || field.type === 'integer') {
    for (const [label, n] of [['Min', field.min], ['Max', field.max]] as const) {
      if (n !== undefined && !Number.isInteger(n)) return `${label} must be a whole number`;
    }
    if (field.type === 'text' && ((field.min ?? 0) < 0 || (field.max ?? 0) < 0)) return "Length can't be negative";
    if (field.type === 'text' && field.max !== undefined && field.max > 100_000) return 'Max length is 100,000 characters';
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
