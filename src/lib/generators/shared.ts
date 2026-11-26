import type { FieldSpec, TestValue } from '../types';

/** The empty value: invalid for a required field, valid for an optional one. */
export function emptyValue(field: FieldSpec): TestValue {
  return field.required
    ? { value: '', category: 'invalid', expect: 'reject', reason: 'Required field left blank' }
    : { value: '', category: 'valid', expect: 'accept', reason: 'Optional field left blank' };
}
