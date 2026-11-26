import type { FieldSpec, TestValue } from '../types';
import { emptyValue } from './shared';

/** How many digits a number has after the decimal point (up to 10). */
export function decimalPlaces(n: number): number {
  for (let p = 0; p <= 10; p++) {
    const scaled = n * 10 ** p;
    if (Math.abs(Math.round(scaled) - scaled) < 1e-7) return p;
  }
  return 11;
}

function withCommas(text: string): string {
  const [whole, frac] = text.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = whole.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + digits + (frac !== undefined ? `.${frac}` : '');
}

/**
 * Decimal or money field. `min` / `max` are the allowed values (inclusive), `decimals` the
 * digits allowed after the point. All arithmetic is done in whole "units" (e.g. centavos for
 * 2 decimals), because 0.1 + 0.2 isn't 0.3 in floating point.
 */
export function generateDecimal(field: FieldSpec): TestValue[] {
  const d = field.decimals ?? 2;
  const scale = 10 ** d;
  const unitName = d === 0 ? '1' : `0.${'0'.repeat(d - 1)}1`;
  const toUnits = (n: number) => Math.round(n * scale);
  const fmt = (units: number) => (units / scale).toFixed(d);
  const minU = field.min === undefined ? undefined : toUnits(field.min);
  const maxU = field.max === undefined ? undefined : toUnits(field.max);
  const inRange = (units: number) => (minU === undefined || units >= minU) && (maxU === undefined || units <= maxU);
  const values: TestValue[] = [];

  const typicalU =
    minU !== undefined && maxU !== undefined
      ? Math.round((minU + maxU) / 2)
      : minU !== undefined
        ? minU + 100 * scale
        : maxU !== undefined
          ? maxU - 100 * scale
          : 1250 * scale + Math.floor(scale / 2);
  const typical = fmt(typicalU);

  // Valid.
  values.push({ value: typical, category: 'valid', expect: 'accept', reason: `Typical amount inside the range, ${d} decimal place${d === 1 ? '' : 's'}` });
  if (d > 0) {
    const wholeU = Math.trunc(typicalU / scale) * scale;
    if (inRange(wholeU)) {
      values.push({ value: String(wholeU / scale), category: 'valid', expect: 'accept', reason: 'Whole amount typed without decimals' });
    }
  }
  if (inRange(0) && typicalU !== 0 && minU !== 0 && maxU !== 0) {
    values.push({ value: fmt(0), category: 'valid', expect: 'accept', reason: 'Zero is allowed: easy to treat as "no value" by mistake' });
  }

  // Boundaries: one smallest step either side of each limit.
  if (minU !== undefined) {
    values.push({ value: fmt(minU), category: 'boundary', expect: 'accept', reason: `Minimum allowed (${fmt(minU)})` });
    values.push({ value: fmt(minU - 1), category: 'boundary', expect: 'reject', reason: `Just below the minimum, by ${unitName}` });
  }
  if (maxU !== undefined) {
    values.push({ value: fmt(maxU), category: 'boundary', expect: 'accept', reason: `Maximum allowed (${fmt(maxU)})` });
    values.push({ value: fmt(maxU + 1), category: 'boundary', expect: 'reject', reason: `Just above the maximum, by ${unitName}` });
  }

  // Invalid.
  values.push(emptyValue(field));
  values.push({ value: 'abc', category: 'invalid', expect: 'reject', reason: 'Letters instead of a number' });
  values.push({ value: '12.3.4', category: 'invalid', expect: 'reject', reason: 'Two decimal points' });
  values.push({
    value: (typicalU / scale).toFixed(d) + (d === 0 ? '.5' : '5'),
    category: 'invalid',
    expect: 'confirm',
    reason: `One more decimal place than allowed: rejected, or silently rounded?`,
  });

  // Nasty.
  const nastyIn = (units: number) => (inRange(units) ? 'confirm' : 'reject');
  values.push({ value: '1e2', category: 'nasty', expect: 'reject', reason: 'Scientific notation: JavaScript reads it as 100' });
  values.push({ value: `₱${typical}`, category: 'nasty', expect: 'confirm', reason: 'Currency symbol typed into the field' });
  values.push({ value: ` ${typical} `, category: 'nasty', expect: 'confirm', reason: 'Spaces around the number: should they be trimmed?' });
  if (Math.abs(typicalU) >= 1000 * scale) {
    values.push({ value: withCommas(typical), category: 'nasty', expect: 'confirm', reason: 'Thousands separator: how people write amounts' });
    if (d > 0) {
      const european = withCommas(typical).replace(/,/g, '_').replace('.', ',').replace(/_/g, '.');
      values.push({ value: european, category: 'nasty', expect: 'reject', reason: 'European format (comma as the decimal point): easy to misread by 1,000×' });
    }
  }
  if (d > 0) {
    const halfU = Math.round(scale / 2);
    values.push({ value: fmt(halfU).replace(/^0/, ''), category: 'nasty', expect: nastyIn(halfU), reason: 'No zero before the decimal point' });
  }
  values.push({ value: `-${fmt(0)}`, category: 'nasty', expect: nastyIn(0), reason: 'Negative zero: should show as zero, not "-0.00"' });
  if (d === 2 && inRange(toUnits(1.005))) {
    values.push({ value: '1.005', category: 'nasty', expect: 'confirm', reason: "JavaScript rounds 1.005 to 1.00, not 1.01: it can't store 1.005 exactly" });
  }
  values.push({ value: 'NaN', category: 'nasty', expect: 'reject', reason: 'The word NaN: some number parsers accept it' });
  values.push({ value: 'Infinity', category: 'nasty', expect: 'reject', reason: 'The word Infinity: JavaScript reads it as a number' });

  return values;
}
