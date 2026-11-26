import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

/**
 * Dropdown (single choice). In the UI only listed options can be picked, so the invalid and
 * nasty values are mainly for testing the server or API, where anything can be sent.
 */
export function generateDropdown(field: FieldSpec): TestValue[] {
  const options = field.options ?? [];
  const values: TestValue[] = [];
  const has = (v: string) => options.includes(v);

  // First and last are boundaries (lists are often off by one); a few from the middle are valid.
  const middle = options.slice(1, -1);
  const shownMiddle = middle.length <= 4 ? middle : [...middle.slice(0, 2), ...middle.slice(-2)];
  for (const o of shownMiddle) values.push({ value: o, category: 'valid', expect: 'accept', reason: 'One of the options' });
  values.push({ value: options[0], category: 'boundary', expect: 'accept', reason: 'First option: lists are often off by one' });
  if (options.length > 1) {
    values.push({ value: options[options.length - 1], category: 'boundary', expect: 'accept', reason: 'Last option: lists are often off by one' });
  }

  values.push(emptyValue(field));
  let notOption = 'Not an option';
  while (has(notOption)) notOption += ' (x)';
  values.push({ value: notOption, category: 'invalid', expect: 'reject', reason: "Not in the list: can't be picked in the UI, so send it through the API" });
  if (options.length > 1) {
    values.push({ value: `${options[0]},${options[1]}`, category: 'invalid', expect: 'reject', reason: 'Two options at once: a single-choice field must refuse it' });
  }

  const first = options[0];
  const flipped = first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase();
  if (flipped !== first && !has(flipped)) {
    values.push({ value: flipped, category: 'nasty', expect: 'confirm', reason: 'Different letter case: is it treated as the same option?' });
  }
  values.push({ value: `${first} `, category: 'nasty', expect: 'confirm', reason: 'Trailing space after a real option: matched or refused?' });
  if (!has('0')) {
    values.push({ value: '0', category: 'nasty', expect: 'reject', reason: 'Position instead of text: some forms send the index, not the option' });
  }
  values.push({ value: '<script>alert(1)</script>', category: 'nasty', expect: 'reject', reason: 'Looks like HTML: must be refused, and never shown as code if stored' });

  return values;
}
