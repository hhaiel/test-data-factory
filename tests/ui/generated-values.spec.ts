import { expect, test } from '@playwright/test';
import { FactoryPage, type CategoryName } from '../support/factory-page';

// US-TDF-0002: Tester sees the values worth testing, with reasons
test.describe('Generated values', () => {
  let app: FactoryPage;
  test.beforeEach(async ({ page }) => {
    app = new FactoryPage(page);
    await app.goto();
  });

  test('US-TDF-0002-TC-001 Text field: columns, length boundaries, unique values, counts', async () => {
    await app.selectField('Full name');
    await expect(app.table.getByRole('columnheader')).toHaveText(['Value', 'Type', 'Expect', "Why it's here", 'Copy']);

    const boundary = (await app.rowsOfType('Boundary')).map((r) => [r.reason, r.expect]);
    expect(boundary).toEqual([
      ['Exactly the minimum length (2)', 'Accept'],
      ['One character below the minimum (1)', 'Reject'],
      ['Exactly the maximum length (50)', 'Accept'],
      ['One character over the maximum (51)', 'Reject'],
    ]);
    // The minimum-length value really is 2 characters on screen.
    expect((await app.rowsOfType('Boundary'))[0].value).toHaveLength(2);

    await expect(app.rowByReason('Required field left blank')).toContainText('(empty)');
    await expect(app.rowByReason('Required field left blank')).toContainText('Reject');

    const rows = await app.rows();
    expect(new Set(rows.map((r) => r.value)).size).toBe(rows.length);
    for (const c of ['Valid', 'Boundary', 'Invalid', 'Nasty'] as CategoryName[]) {
      expect(await app.chipCount(c), `${c} count`).toBe(rows.filter((r) => r.type === c).length);
    }
  });

  test('US-TDF-0002-TC-002 Whole number and date boundaries', async () => {
    await app.selectField('Age');
    expect((await app.rowsOfType('Boundary')).map((r) => [r.value, r.expect])).toEqual([
      ['18', 'Accept'],
      ['17', 'Reject'],
      ['65', 'Accept'],
      ['66', 'Reject'],
    ]);

    await app.loadPreset('Leave request');
    await app.selectField('Start date');
    expect((await app.rowsOfType('Boundary')).map((r) => [r.value, r.expect])).toEqual([
      ['2026-01-01', 'Accept'],
      ['2025-12-31', 'Reject'],
      ['2026-12-31', 'Accept'],
      ['2027-01-01', 'Reject'],
    ]);
  });

  test('US-TDF-0002-TC-003 Empty is valid for an optional field', async () => {
    await app.selectField('Mobile');
    const empty = app.rowByReason('Optional field left blank');
    await expect(empty).toContainText('(empty)');
    await expect(empty).toContainText('Valid');
    await expect(empty).toContainText('Accept');
  });

  test('US-TDF-0002-TC-004 A nasty value that is also too long is Reject and says why', async () => {
    await app.selectField('Full name');
    await app.fill('Max length', '10');
    const sql = app.table.locator('tbody tr').filter({ hasText: "Robert');" });
    await expect(sql).toContainText('Nasty');
    await expect(sql).toContainText('Reject');
    await expect(sql).toContainText('It is also longer than the maximum of 10.');
  });

  test('US-TDF-0002-TC-005 Hard-to-see values are described; code is shown as text', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await app.selectField('Full name');
    const values = (await app.rows()).map((r) => r.value);

    expect(values).toContain('(empty)');
    expect(values).toContain('(3 spaces)');
    expect(values).toContain('␣␣Maria Santos␣␣');
    expect(values).toContain('Maria[zero-width space]Santos');
    expect(values.some((v) => v.endsWith('… (10,000 chars)'))).toBe(true);
    expect(values).toContain('<script>alert(1)</script>');
    expect(dialogs).toEqual([]);
    await expect(app.table.locator('script')).toHaveCount(0);
  });

  test('US-TDF-0002-TC-006 Invalid rules replace the table with a message and zero counts', async () => {
    await app.selectField('Age');
    await app.fill('Min value', '99');
    await expect(app.dataPanel).toContainText("Fix the field to see its test data: min can't be greater than max.");
    await expect(app.table).toHaveCount(0);
    for (const c of ['Valid', 'Boundary', 'Invalid', 'Nasty'] as CategoryName[]) expect(await app.chipCount(c)).toBe(0);
  });

  test('US-TDF-0002-TC-007 Generated emails only use example.com domains', async () => {
    // Read the raw values from the JSON export: the table shortens long values, which can hide the domain.
    const data = JSON.parse((await app.download('JSON')).text) as Record<string, { value: string }[]>;
    const domains = data.Email.map((v) => v.value)
      .filter((v) => v.includes('@'))
      .map((v) => v.split('@').pop()!.trim().split('\n')[0].toLowerCase())
      .filter((d) => d && d !== 'exämple.com'); // the one deliberately invalid domain
    expect(domains.length).toBeGreaterThan(10);
    // "example" on its own is a reserved name too (used by the "no dot in the domain" case).
    for (const d of domains) expect(d, `domain ${d}`).toMatch(/(^|\.)example(\.com)?$/);
  });
});
