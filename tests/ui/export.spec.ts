import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

/** Minimal RFC 4180 parser: reads the CSV the way a spreadsheet would. */
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

// US-TDF-0004: Tester exports all the test data
test.describe('Export', () => {
  let app: FactoryPage;
  test.beforeEach(async ({ page }) => {
    app = new FactoryPage(page);
    await app.goto();
  });

  /** Total rows across all fields, counted from the chips in the UI. */
  async function totalValues(names: string[]) {
    let total = 0;
    for (const name of names) {
      await app.selectField(name);
      total += (await app.rows()).length;
    }
    return total;
  }

  test('US-TDF-0004-TC-001 CSV has the right columns and one row per value', async () => {
    const expected = await totalValues(['Full name', 'Age', 'Email', 'Mobile']);
    const { name, text } = await app.download('CSV');

    expect(name).toBe('test-data.csv');
    expect(text.charCodeAt(0)).toBe(0xfeff); // BOM so Excel reads UTF-8
    const rows = parseCsv(text.slice(1));
    expect(rows[0]).toEqual(['field', 'value', 'category', 'expect', 'reason']);
    expect(rows.length - 1).toBe(expected);
    expect(new Set(rows.slice(1).map((r) => r[0]))).toEqual(new Set(['Full name', 'Age', 'Email', 'Mobile']));
    // A value with a newline inside stays in one cell.
    expect(rows.some((r) => r[1] === 'maria@example.com\nbcc:someone@example.com')).toBe(true);
  });

  test('US-TDF-0004-TC-003 JSON is keyed by field name', async () => {
    const { name, text } = await app.download('JSON');
    expect(name).toBe('test-data.json');
    const data = JSON.parse(text);
    expect(Object.keys(data)).toEqual(['Full name', 'Age', 'Email', 'Mobile']);
    for (const v of data.Age) expect(Object.keys(v).sort()).toEqual(['category', 'expect', 'reason', 'value']);
  });

  test('US-TDF-0004-TC-004 Playwright export compiles as strict TypeScript', async () => {
    const { name, text, path } = await app.download('Playwright');
    expect(name).toBe('test-data.ts');
    expect(text).toContain('export const testData');
    expect(text).toContain('export interface TestValue');
    expect(text).toMatch(/\/\*\nExample:/);

    const dir = await mkdtemp(join(tmpdir(), 'tdf-'));
    const file = join(dir, 'test-data.ts');
    await copyFile(path, file);
    const tsc = resolve('node_modules/typescript/bin/tsc');
    // Compiled in an empty temp folder, so no project tsconfig is involved.
    let output = '';
    try {
      execFileSync(process.execPath, [tsc, '--strict', '--noEmit', '--target', 'es2022', '--module', 'esnext', '--skipLibCheck', file], {
        stdio: 'pipe',
        cwd: dir,
      });
    } catch (e) {
      const err = e as { stdout?: Buffer; stderr?: Buffer };
      output = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || String(e);
    }
    expect(output, 'TypeScript compiler output').toBe('');
  });

  test('US-TDF-0004-TC-005 Invalid fields are left out of exports, with a banner', async () => {
    await app.selectField('Age');
    await app.fill('Min value', '99');
    await expect(app.banner).toHaveText("1 field has a problem and won't be exported until fixed.");

    const data = JSON.parse((await app.download('JSON')).text);
    expect(Object.keys(data)).toEqual(['Full name', 'Email', 'Mobile']);
  });

  test('US-TDF-0004-TC-006 Export buttons are disabled when nothing can be exported', async () => {
    for (const name of ['Full name', 'Email', 'Mobile']) await app.removeField(name);
    await app.selectField('Age');
    await app.fill('Min value', '99');

    for (const kind of ['CSV', 'JSON', 'Playwright'] as const) await expect(app.exportButton(kind)).toBeDisabled();
    await expect(app.banner).toContainText('1 field has a problem');
  });
});
