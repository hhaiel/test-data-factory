import { describe, expect, it } from 'vitest';
import { buildDataSet, toCsv, toJson, toPlaywright } from './exporters';
import { describeRules } from './describe';
import { displayValue } from './strings';
import type { FieldSpec } from './types';

const fields: FieldSpec[] = [
  { id: 'a', name: 'Full name', type: 'text', required: true, min: 2, max: 50 },
  { id: 'b', name: 'Age', type: 'integer', required: true, min: 18, max: 65 },
];
const data = buildDataSet(fields);
const total = data.reduce((n, d) => n + d.values.length, 0);

/** Minimal RFC 4180 parser, so the test checks the CSV the way a spreadsheet would read it. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += ch;
  }
  return rows;
}

describe('CSV export', () => {
  const csv = toCsv(data);
  it('starts with a BOM so Excel reads UTF-8', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
  it('round-trips every value exactly, including quotes, commas and spaces', () => {
    const rows = parseCsv(csv.slice(1));
    expect(rows[0]).toEqual(['field', 'value', 'category', 'expect', 'reason']);
    expect(rows).toHaveLength(total + 1);
    const exported = rows.slice(1).map((r) => r[1]);
    expect(exported).toEqual(data.flatMap((d) => d.values.map((v) => v.value)));
  });
});

describe('JSON export', () => {
  it('is valid JSON keyed by field name', () => {
    const parsed = JSON.parse(toJson(data));
    expect(Object.keys(parsed)).toEqual(['Full name', 'Age']);
    expect(parsed.Age[0]).toMatchObject({ value: '42', category: 'valid', expect: 'accept' });
  });
});

describe('Playwright export', () => {
  const ts = toPlaywright(data);
  it('exports typed test data', () => {
    expect(ts).toContain('export const testData: Record<string, TestValue[]> =');
    expect(ts).toContain('"Full name"');
  });
  it('embeds the data as valid JSON', () => {
    const json = ts.slice(ts.indexOf('= {') + 2, ts.indexOf('};') + 1);
    expect(Object.keys(JSON.parse(json))).toEqual(['Full name', 'Age']);
  });
});

describe('display helpers', () => {
  it.each([
    ['', '(empty)'],
    ['   ', '(3 spaces)'],
    ['Maria​Santos', 'Maria[zero-width space]Santos'],
    ['  Maria  ', '␣␣Maria␣␣'],
    [' 42 ', '␣42␣'],
  ])('shows %j as %j', (value, shown) => {
    expect(displayValue(value)).toBe(shown);
  });
  it('shortens long values and shows their length', () => {
    expect(displayValue('x'.repeat(10_000))).toMatch(/… \(10,000 chars\)$/);
  });
  it('summarizes field rules', () => {
    expect(describeRules(fields[0])).toBe('Text, 2–50 chars, required');
    expect(describeRules({ id: 'c', name: 'Mobile', type: 'phMobile', required: false })).toBe('PH mobile number, optional');
  });
});
