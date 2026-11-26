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
  if (f.type === 'decimal') {
    parts.push(range(f.min, f.max));
    const d = f.decimals ?? 2;
    parts.push(`${d} decimal place${d === 1 ? '' : 's'}`);
  }
  if (f.type === 'password') {
    parts.push(range(f.min, f.max, ' chars'));
    const rules = (['upper', 'lower', 'digit', 'symbol'] as const).filter((r) => f.rules?.[r]);
    const names = { upper: 'A–Z', lower: 'a–z', digit: '0–9', symbol: 'symbol' };
    if (rules.length) parts.push(rules.map((r) => names[r]).join(' '));
  }
  if (f.type === 'dropdown') {
    const n = f.options?.length ?? 0;
    parts.push(`${n} option${n === 1 ? '' : 's'}`);
  }
  parts.push(f.required ? 'required' : 'optional');
  return parts.filter(Boolean).join(', ');
}
