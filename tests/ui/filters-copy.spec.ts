import { expect, test } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

// US-TDF-0003: Tester filters and copies values
test.describe('Filters and copy', () => {
  let app: FactoryPage;
  test.beforeEach(async ({ page }) => {
    app = new FactoryPage(page);
    await app.goto();
    await app.selectField('Full name');
  });

  test('US-TDF-0003-TC-001 Hide and show categories, including the all-hidden message', async () => {
    await app.chip('Nasty').click();
    await expect(app.chip('Nasty')).toHaveAttribute('aria-pressed', 'false');
    expect(await app.rowsOfType('Nasty')).toHaveLength(0);
    expect((await app.rows()).length).toBeGreaterThan(0);

    for (const c of ['Valid', 'Boundary', 'Invalid'] as const) await app.chip(c).click();
    await expect(app.dataPanel).toContainText('All categories are hidden. Turn one back on above.');

    await app.chip('Nasty').click();
    await expect(app.chip('Nasty')).toHaveAttribute('aria-pressed', 'true');
    const types = new Set((await app.rows()).map((r) => r.type));
    expect([...types]).toEqual(['Nasty']);
  });

  test('US-TDF-0003-TC-002 Hidden categories stay hidden on another field (needs confirmation)', async () => {
    for (const c of ['Valid', 'Boundary', 'Invalid'] as const) await app.chip(c).click();
    await app.selectField('Age');
    const types = new Set((await app.rows()).map((r) => r.type));
    expect([...types]).toEqual(['Nasty']);
  });

  test('US-TDF-0003-TC-003 Copy puts the exact value on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const row = app.rowByReason('Leading and trailing spaces');
    const button = row.getByRole('button', { name: /^Copy value/ });

    await button.click();
    await expect(button).toHaveText('✓');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('  Maria Santos  ');
    await expect(button).toHaveText('Copy', { timeout: 3000 });
  });
});
