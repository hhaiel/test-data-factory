import { describe, expect, it } from 'vitest';
import { describeRules } from './describe';
import { generate, isFieldSpec, parseDecimalLimit, parseOptions, validateField } from './generate';
import { buildPassword, NO_RULES } from './generators/password';
import { charLength } from './strings';
import type { FieldSpec, PasswordRules, TestValue } from './types';

const ALL: PasswordRules = { upper: true, lower: true, digit: true, symbol: true };
const field = (patch: Partial<FieldSpec>): FieldSpec => ({ id: 't', name: 'Test', type: 'text', required: true, ...patch });
const find = (values: TestValue[], value: string) => values.find((v) => v.value === value);
const ofCategory = (values: TestValue[], c: TestValue['category']) => values.filter((v) => v.category === c);

const amount = field({ type: 'decimal', min: 1, max: 50_000, decimals: 2 });
const newPassword = field({ type: 'password', min: 8, max: 64, rules: ALL });
const method = field({ type: 'dropdown', options: ['GCash', 'Maya', 'Credit card', 'Bank transfer'] });

describe('new types: shared rules', () => {
  it.each([
    ['decimal', amount],
    ['password', newPassword],
    ['dropdown', method],
  ] as const)('%s: every category, unique values, a reason for each', (_t, f) => {
    const values = generate(f);
    for (const c of ['valid', 'boundary', 'invalid', 'nasty'] as const) expect(ofCategory(values, c).length, c).toBeGreaterThan(0);
    expect(new Set(values.map((v) => v.value)).size).toBe(values.length);
    for (const v of values) expect(v.reason.length).toBeGreaterThan(5);
  });
  it.each([
    ['decimal', amount],
    ['password', newPassword],
    ['dropdown', method],
  ] as const)('%s: empty depends on Required', (_t, f) => {
    expect(find(generate(f), '')?.expect).toBe('reject');
    expect(find(generate({ ...f, required: false }), '')?.expect).toBe('accept');
  });
});

describe('decimal', () => {
  const values = generate(amount);

  it('puts boundaries one centavo either side of each limit', () => {
    expect(ofCategory(values, 'boundary').map((v) => [v.value, v.expect])).toEqual([
      ['1.00', 'accept'],
      ['0.99', 'reject'],
      ['50000.00', 'accept'],
      ['50000.01', 'reject'],
    ]);
  });
  it('uses the middle of the range, formatted to 2 places', () => {
    expect(values[0]).toMatchObject({ value: '25000.50', category: 'valid' });
  });
  it('asks for confirmation on one decimal place too many', () => {
    expect(find(values, '25000.505')?.expect).toBe('confirm');
  });
  it('includes amount formats people really type', () => {
    expect(find(values, '25,000.50')?.expect).toBe('confirm');
    expect(find(values, '25.000,50')?.expect).toBe('reject');
    expect(find(values, '₱25000.50')?.expect).toBe('confirm');
  });
  it('rejects a nasty value outside the range', () => {
    expect(find(values, '.50')?.expect).toBe('reject'); // 0.50 is below the minimum of 1
    expect(find(values, '-0.00')?.expect).toBe('reject');
  });
  it('avoids floating-point drift in boundaries (0.1 + 0.2)', () => {
    const v = generate(field({ type: 'decimal', min: 0.1, max: 0.3, decimals: 1 }));
    expect(ofCategory(v, 'boundary').map((x) => x.value)).toEqual(['0.1', '0.0', '0.3', '0.4']);
  });
  it('works with zero decimal places', () => {
    const v = generate(field({ type: 'decimal', min: 10, max: 20, decimals: 0 }));
    expect(ofCategory(v, 'boundary').map((x) => x.value)).toEqual(['10', '9', '20', '21']);
    expect(find(v, '15.5')?.expect).toBe('confirm');
  });
  it.each([
    [{ decimals: 7 }, 'Decimal places must be a whole number from 0 to 6'],
    [{ decimals: 1.5 }, 'Decimal places must be a whole number from 0 to 6'],
    [{ min: 0.005 }, 'Min has more decimal places than allowed (2)'],
    [{ max: Number.NaN }, 'Max must be a number'],
    [{ max: 1e15 }, 'Max is too large'],
    [{ min: 100, max: 10 }, "Min can't be greater than max"],
  ])('rejects %o', (patch, message) => {
    expect(validateField({ ...amount, ...patch })).toBe(message);
  });
  it('reads decimal limits strictly', () => {
    expect(parseDecimalLimit('12.50')).toBe(12.5);
    expect(parseDecimalLimit('-3')).toBe(-3);
    expect(parseDecimalLimit('')).toBeUndefined();
    for (const bad of ['1e2', '0x1A', '1,000', '12.', '.5', 'abc']) expect(parseDecimalLimit(bad)).toBeNaN();
  });
});

describe('password', () => {
  const values = generate(newPassword);

  it('builds passwords of an exact length that meet the rules', () => {
    const p = buildPassword(12, ALL);
    expect(p).toHaveLength(12);
    expect(p).toMatch(/[A-Z]/);
    expect(p).toMatch(/[a-z]/);
    expect(p).toMatch(/\d/);
    expect(p).toMatch(/[^A-Za-z0-9]/);
  });
  it('length boundaries meet the character rules, so only the length is being tested', () => {
    const b = ofCategory(values, 'boundary');
    expect(b.map((v) => [charLength(v.value), v.expect])).toEqual([
      [8, 'accept'],
      [7, 'reject'],
      [64, 'accept'],
      [65, 'reject'],
    ]);
    for (const v of b) expect(v.value).toMatch(/[A-Z]/);
  });
  it('has one invalid value per rule, missing only that character type', () => {
    const missing = ofCategory(values, 'invalid').filter((v) => v.reason.startsWith('No '));
    expect(missing.map((v) => v.reason)).toEqual([
      'No uppercase letter, otherwise valid',
      'No lowercase letter, otherwise valid',
      'No number, otherwise valid',
      'No symbol, otherwise valid',
    ]);
    expect(missing[0].value).not.toMatch(/[A-Z]/);
    expect(missing[1].value).not.toMatch(/[a-z]/);
    expect(missing[2].value).not.toMatch(/\d/);
    expect(missing[3].value).not.toMatch(/[^A-Za-z0-9]/);
    for (const v of missing) expect(charLength(v.value)).toBe(12);
  });
  it('flags a leaked password for confirmation', () => {
    expect(find(values, 'Password1!')?.expect).toBe('confirm');
  });
  it('rejects a nasty value that breaks a rule, and says which', () => {
    const v = generate(field({ type: 'password', min: 12, max: 64, rules: ALL }));
    const leaked = find(v, 'Password1!');
    expect(leaked?.expect).toBe('reject');
    expect(leaked?.reason).toContain('shorter than the minimum of 12');
  });
  it('works with no character rules', () => {
    const v = generate(field({ type: 'password', min: 1, max: 64, rules: NO_RULES }));
    expect(ofCategory(v, 'invalid').some((x) => x.reason.startsWith('No '))).toBe(false);
  });
  it('refuses a min length too short for the required character types', () => {
    expect(validateField({ ...newPassword, min: 3 })).toBe('Min length must be at least 4 to fit the required character types');
    expect(validateField({ ...newPassword, min: undefined, max: 3 })).toBe('Max length must be at least 4 to fit the required character types');
  });
});

describe('dropdown', () => {
  const values = generate(method);

  it('marks first and last options as boundaries and middle ones as valid', () => {
    expect(ofCategory(values, 'boundary').map((v) => v.value)).toEqual(['GCash', 'Bank transfer']);
    expect(ofCategory(values, 'valid').map((v) => v.value)).toEqual(['Maya', 'Credit card']);
  });
  it('includes values only the API can send', () => {
    expect(find(values, 'Not an option')?.expect).toBe('reject');
    expect(find(values, 'GCash,Maya')?.expect).toBe('reject');
    expect(find(values, 'GCASH')?.expect).toBe('confirm');
    expect(find(values, 'GCash ')?.expect).toBe('confirm');
  });
  it('never uses a real option as the "not an option" value', () => {
    const v = generate(field({ type: 'dropdown', options: ['Not an option', 'Other'] }));
    expect(find(v, 'Not an option')?.expect).toBe('accept');
    expect(find(v, 'Not an option (x)')?.expect).toBe('reject');
  });
  it('shows at most 4 middle options from a long list', () => {
    const v = generate(field({ type: 'dropdown', options: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'] }));
    expect(ofCategory(v, 'valid').map((x) => x.value)).toEqual(['A2', 'A3', 'A6', 'A7']);
  });
  it('works with a single option', () => {
    const v = generate(field({ type: 'dropdown', options: ['Only'] }));
    expect(ofCategory(v, 'boundary').map((x) => x.value)).toEqual(['Only']);
  });
  it.each([
    [[], 'Add at least one option'],
    [['A', 'B', 'A'], 'Options must be unique: "A" is listed twice'],
  ])('rejects options %j', (options, message) => {
    expect(validateField({ ...method, options })).toBe(message);
  });
  it('reads one option per line, ignoring blank lines and spaces', () => {
    expect(parseOptions('GCash\r\n\n  Maya  \nCredit card\n')).toEqual(['GCash', 'Maya', 'Credit card']);
  });
});

describe('new types: summaries and saved data', () => {
  it('summarizes each type', () => {
    expect(describeRules(amount)).toBe('Decimal / amount, 1–50000, 2 decimal places, required');
    expect(describeRules(newPassword)).toBe('Password, 8–64 chars, A–Z a–z 0–9 symbol, required');
    expect(describeRules(method)).toBe('Dropdown, 4 options, required');
  });
  it('accepts saved fields of the new types', () => {
    for (const f of [amount, newPassword, method]) expect(isFieldSpec(f)).toBe(true);
  });
  it.each([
    ['rules with a missing key', { ...newPassword, rules: { upper: true } }],
    ['options that are not strings', { ...method, options: ['A', 2] }],
    ['decimals as text', { ...amount, decimals: '2' }],
  ])('rejects saved data with %s', (_label, value) => {
    expect(isFieldSpec(value)).toBe(false);
  });
});
