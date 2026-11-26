import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

/**
 * Philippine mobile number: 09XXXXXXXXX (11 digits) or +639XXXXXXXXX.
 * Uses 0917 123 4567, a well-known placeholder pattern.
 */
export function generatePhMobile(field: FieldSpec): TestValue[] {
  return [
    { value: '09171234567', category: 'valid', expect: 'accept', reason: 'Local format: 11 digits starting with 09' },
    { value: '+639171234567', category: 'valid', expect: 'accept', reason: 'International format with +63' },

    { value: '0917123456', category: 'boundary', expect: 'reject', reason: '10 digits: one too short' },
    { value: '091712345678', category: 'boundary', expect: 'reject', reason: '12 digits: one too long' },
    { value: '+63917123456', category: 'boundary', expect: 'reject', reason: '+63 format with one digit missing' },

    emptyValue(field),
    { value: '08171234567', category: 'invalid', expect: 'reject', reason: 'Starts with 08: not a mobile prefix' },
    { value: '0917abc4567', category: 'invalid', expect: 'reject', reason: 'Letters inside the number' },
    { value: '(02) 8123 4567', category: 'invalid', expect: 'reject', reason: 'Landline number, not mobile' },

    { value: '0917 123 4567', category: 'nasty', expect: 'confirm', reason: 'Spaces between groups: how people actually type it' },
    { value: '0917-123-4567', category: 'nasty', expect: 'confirm', reason: 'Dashes between groups' },
    { value: '639171234567', category: 'nasty', expect: 'confirm', reason: 'Country code without the +' },
    { value: '+63 917 123 4567', category: 'nasty', expect: 'confirm', reason: 'International format with spaces' },
    { value: '+6309171234567', category: 'nasty', expect: 'reject', reason: '+63 followed by the local 0: a very common mistake' },
    { value: '٠٩١٧١٢٣٤٥٦٧', category: 'nasty', expect: 'reject', reason: 'Arabic-Indic digits: real digits, but not 0–9' },
  ];
}
