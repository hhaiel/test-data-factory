import { describe, expect, it } from 'vitest';
import { generate, validateField } from './generate';
import { parseIsoDate } from './generators/date';
import { charLength } from './strings';
import type { FieldSpec, TestValue } from './types';

const field = (patch: Partial<FieldSpec>): FieldSpec => ({ id: 't', name: 'Test', type: 'text', required: true, ...patch });
const find = (values: TestValue[], value: string) => values.find((v) => v.value === value);
const byReason = (values: TestValue[], text: string) => values.find((v) => v.reason.includes(text));

describe('validateField', () => {
  it('accepts a normal field', () => {
    expect(validateField(field({ min: 2, max: 50 }))).toBeNull();
  });
  it.each([
    [{ name: '  ' }, 'Give the field a name'],
    [{ min: 10, max: 5 }, "Min can't be greater than max"],
    [{ min: 2.5 }, 'Min must be a whole number'],
    [{ max: Number.NaN }, 'Max must be a whole number'],
    [{ min: -1 }, "Length can't be negative"],
    [{ max: 200_000 }, 'Max length is 100,000 characters'],
    [{ type: 'date' as const, minDate: '2026-02-30' }, 'Earliest date must be a real date (YYYY-MM-DD)'],
    [{ type: 'date' as const, minDate: '2026-12-31', maxDate: '2026-01-01' }, "Earliest date can't be after the latest date"],
  ])('rejects %o', (patch, message) => {
    expect(validateField(field(patch))).toBe(message);
  });
  it('allows negative ranges for whole numbers', () => {
    expect(validateField(field({ type: 'integer', min: -10, max: -1 }))).toBeNull();
  });
  it('generates nothing for an invalid field', () => {
    expect(generate(field({ min: 10, max: 5 }))).toEqual([]);
  });
});

describe('every type', () => {
  const fields: FieldSpec[] = [
    field({ type: 'text', min: 2, max: 50 }),
    field({ type: 'integer', min: 18, max: 65 }),
    field({ type: 'email' }),
    field({ type: 'date', minDate: '2026-01-01', maxDate: '2026-12-31' }),
    field({ type: 'phMobile' }),
  ];
  it.each(fields.map((f) => [f.type, f] as const))('%s: has every category, unique values and a reason for each', (_type, f) => {
    const values = generate(f);
    for (const c of ['valid', 'boundary', 'invalid', 'nasty']) expect(values.some((v) => v.category === c)).toBe(true);
    expect(new Set(values.map((v) => v.value)).size).toBe(values.length);
    for (const v of values) expect(v.reason.length).toBeGreaterThan(5);
  });
  it.each(fields.map((f) => [f.type, f] as const))('%s: empty is rejected when required, accepted when optional', (_type, f) => {
    expect(find(generate(f), '')).toMatchObject({ category: 'invalid', expect: 'reject' });
    expect(find(generate({ ...f, required: false }), '')).toMatchObject({ category: 'valid', expect: 'accept' });
  });
});

describe('text', () => {
  const values = generate(field({ min: 2, max: 50 }));

  it('puts boundaries exactly at and just outside the length limits', () => {
    const lengths = values.filter((v) => v.category === 'boundary').map((v) => [charLength(v.value), v.expect]);
    expect(lengths).toEqual([
      [2, 'accept'],
      [1, 'reject'],
      [50, 'accept'],
      [51, 'reject'],
    ]);
  });
  it('never ends a boundary value with a space, so its length is visible', () => {
    for (const v of values.filter((x) => x.category === 'boundary')) expect(v.value.endsWith(' ')).toBe(false);
  });
  it('rejects nasty values that are also too long, and says why', () => {
    const short = generate(field({ min: 2, max: 10 }));
    const sql = short.find((v) => v.value.startsWith('Robert'));
    expect(sql).toMatchObject({ expect: 'reject' });
    expect(sql?.reason).toContain('longer than the maximum of 10');
  });
  it('asks for confirmation on the 10,000-character value when there is no maximum', () => {
    const huge = generate(field({ min: 1 })).find((v) => v.value.length === 10_000);
    expect(huge?.expect).toBe('confirm');
  });
  it('accepts the 10,000-character value when the maximum allows it', () => {
    const huge = generate(field({ min: 1, max: 20_000 })).find((v) => v.value.length === 10_000);
    expect(huge?.expect).toBe('accept');
  });
  it('uses a realistic name as the typical value when one fits', () => {
    expect(values[0]).toMatchObject({ value: 'Maria Clara Santos', category: 'valid' });
    expect(generate(field({ min: 2, max: 5 }))[0].value).toBe('Maria');
  });
  it('counts an emoji as one character', () => {
    expect(charLength('Maria 😀')).toBe(7);
  });
});

describe('integer', () => {
  const values = generate(field({ type: 'integer', min: 18, max: 65 }));

  it('covers min, min-1, max and max+1', () => {
    expect(find(values, '18')?.expect).toBe('accept');
    expect(find(values, '17')?.expect).toBe('reject');
    expect(find(values, '65')?.expect).toBe('accept');
    expect(find(values, '66')?.expect).toBe('reject');
  });
  it('uses the middle of the range as the typical value', () => {
    expect(values[0]).toMatchObject({ value: '42', category: 'valid' });
  });
  it('includes zero as valid only when it is in range', () => {
    expect(find(values, '0')).toBeUndefined();
    expect(find(generate(field({ type: 'integer', min: -5, max: 5 })), '0')).toMatchObject({ category: 'valid', expect: 'accept' });
  });
  it('keeps the boundary label when zero is also the minimum', () => {
    expect(find(generate(field({ type: 'integer', min: 0, max: 10 })), '0')?.category).toBe('boundary');
  });
  it('includes parser traps', () => {
    expect(find(values, '1e2')?.expect).toBe('reject');
    expect(find(values, '٤٢')?.category).toBe('nasty');
  });
  it('works with no limits at all', () => {
    const open = generate(field({ type: 'integer' }));
    expect(open.some((v) => v.category === 'boundary')).toBe(false);
    expect(open[0].value).toBe('42');
  });
});

describe('email', () => {
  const values = generate(field({ type: 'email' }));
  it('only uses reserved example domains', () => {
    for (const v of values) {
      const domain = v.value.split('@').pop() ?? '';
      if (v.value.includes('@') && domain) expect(domain).toMatch(/example(\.|$)|exämple/i);
    }
  });
  it('accepts plus addressing and a 64-character local part', () => {
    expect(find(values, 'maria+test@example.com')?.expect).toBe('accept');
    expect(find(values, `${'a'.repeat(64)}@example.com`)?.expect).toBe('accept');
    expect(find(values, `${'a'.repeat(65)}@example.com`)?.expect).toBe('reject');
  });
});

describe('date', () => {
  const values = generate(field({ type: 'date', minDate: '2026-01-01', maxDate: '2026-12-31' }));

  it('puts boundaries one day either side of the range', () => {
    expect(find(values, '2026-01-01')?.expect).toBe('accept');
    expect(find(values, '2025-12-31')?.expect).toBe('reject');
    expect(find(values, '2026-12-31')?.expect).toBe('accept');
    expect(find(values, '2027-01-01')?.expect).toBe('reject');
  });
  it('rejects a leap day that falls outside the range', () => {
    expect(byReason(values, 'Leap day')).toMatchObject({ value: '2028-02-29', expect: 'reject' });
  });
  it('accepts a leap day inside the range', () => {
    const wide = generate(field({ type: 'date', minDate: '2024-01-01', maxDate: '2024-12-31' }));
    expect(byReason(wide, 'Leap day')).toMatchObject({ value: '2024-02-29', expect: 'accept' });
  });
  it('parses only real calendar dates', () => {
    expect(parseIsoDate('2024-02-29')).not.toBeNull();
    expect(parseIsoDate('2023-02-29')).toBeNull();
    expect(parseIsoDate('2026-1-5')).toBeNull();
  });
  it('crosses year ends correctly', () => {
    const v = generate(field({ type: 'date', minDate: '2026-03-01' }));
    expect(find(v, '2026-02-28')?.expect).toBe('reject');
  });
});

describe('PH mobile', () => {
  const values = generate(field({ type: 'phMobile' }));
  it('accepts both local and international formats', () => {
    expect(find(values, '09171234567')?.expect).toBe('accept');
    expect(find(values, '+639171234567')?.expect).toBe('accept');
  });
  it('rejects one digit too few or too many', () => {
    expect(find(values, '0917123456')?.expect).toBe('reject');
    expect(find(values, '091712345678')?.expect).toBe('reject');
  });
});
