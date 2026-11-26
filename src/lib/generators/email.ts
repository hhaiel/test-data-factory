import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

/**
 * Email field. Uses example.com, which is reserved for documentation and testing,
 * so no generated address can belong to a real person.
 */
export function generateEmail(field: FieldSpec): TestValue[] {
  const local64 = 'a'.repeat(64);
  return [
    { value: 'maria.santos@example.com', category: 'valid', expect: 'accept', reason: 'Standard address' },
    { value: 'maria+test@example.com', category: 'valid', expect: 'accept', reason: 'Plus addressing: valid and common, often wrongly rejected' },
    { value: 'm.santos@mail.example.co.uk', category: 'valid', expect: 'accept', reason: 'Subdomain and two-part country domain' },

    { value: `${local64}@example.com`, category: 'boundary', expect: 'accept', reason: 'Part before @ is 64 characters, the standard maximum' },
    { value: `${local64}a@example.com`, category: 'boundary', expect: 'reject', reason: 'Part before @ is 65 characters, one over the maximum' },

    emptyValue(field),
    { value: 'maria.example.com', category: 'invalid', expect: 'reject', reason: 'No @ sign' },
    { value: 'maria@', category: 'invalid', expect: 'reject', reason: 'Nothing after the @' },
    { value: '@example.com', category: 'invalid', expect: 'reject', reason: 'Nothing before the @' },
    { value: 'maria@@example.com', category: 'invalid', expect: 'reject', reason: 'Two @ signs' },
    { value: 'maria santos@example.com', category: 'invalid', expect: 'reject', reason: 'Space inside the address' },
    { value: 'maria@example', category: 'invalid', expect: 'confirm', reason: 'No dot in the domain: technically allowed, but rarely wanted' },

    { value: 'MARIA.SANTOS@EXAMPLE.COM', category: 'nasty', expect: 'confirm', reason: 'Capitals: is this a duplicate of the lowercase address?' },
    { value: ' maria.santos@example.com ', category: 'nasty', expect: 'confirm', reason: 'Spaces around the address: should they be trimmed?' },
    { value: 'maria..santos@example.com', category: 'nasty', expect: 'reject', reason: 'Two dots in a row are not allowed' },
    { value: 'maria.@example.com', category: 'nasty', expect: 'reject', reason: 'Dot just before the @ is not allowed' },
    { value: 'maria@exämple.com', category: 'nasty', expect: 'confirm', reason: 'Accented letter in the domain: valid internationally, often unsupported' },
    { value: '"maria santos"@example.com', category: 'nasty', expect: 'confirm', reason: 'Quoted part with a space: valid by the standard, rejected by most apps' },
    { value: 'maria@example.com\nbcc:someone@example.com', category: 'nasty', expect: 'reject', reason: 'Newline inside: can be used to add extra recipients' },
  ];
}
