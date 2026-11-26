import { FIELD_TYPE_LABELS, type FieldSpec } from './types';

/** A short summary of a field's rules, e.g. "Text, 2–50 chars, required". */
export function describeRules(f: FieldSpec): string {
  const parts: string[] = [FIELD_TYPE_LABELS[f.type]];
  const range = (lo?: number | string, hi?: number | string, unit = '') => {
    if (lo !== undefined && lo !== '' && hi !== undefined && hi !== '') return `${lo}–${hi}${unit}`;
    if (lo !== undefined && lo !== '') return `at least ${lo}${unit}`;
    if (hi !== undefined && hi !== '') return `up to ${hi}${unit}`;
    return '';
  };
  if (f.type === 'text') parts.push(range(f.min, f.max, ' chars'));
  if (f.type === 'integer') parts.push(range(f.min, f.max));
  if (f.type === 'date') parts.push(range(f.minDate, f.maxDate));
  parts.push(f.required ? 'required' : 'optional');
  return parts.filter(Boolean).join(', ');
}
