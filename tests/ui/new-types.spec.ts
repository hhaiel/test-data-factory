import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

// US-TDF-0007: Tester describes amount, password and dropdown fields
test.describe('New field types', () => {
  let app: FactoryPage;
  test.beforeEach(async ({ page }) => {
    app = new FactoryPage(page);
    await app.goto();
  });

  async function noA11yViolations() {
    const results = await new AxeBuilder({ page: app.page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  }

  test('US-TDF-0007-TC-001 Each new type shows its controls with the right defaults', async () => {
    await app.addField.click();

    await app.input('Type').selectOption('Decimal / amount');
    await expect(app.input('Min value')).toHaveValue('0');
    await expect(app.input('Max value')).toHaveValue('1000');
    await expect(app.input('Decimal places')).toHaveValue('2');
    await noA11yViolations();

    await app.input('Type').selectOption('Password');
    await expect(app.input('Min length')).toHaveValue('8');
    await expect(app.input('Max length')).toHaveValue('64');
    const rules = app.editor.getByRole('group', { name: 'Must contain' }).getByRole('checkbox');
    await expect(rules).toHaveCount(4);
    for (const box of await rules.all()) await expect(box).toBeChecked();
    await noA11yViolations();

    await app.input('Type').selectOption('Dropdown');
    await expect(app.input('Options (one per line)')).toHaveValue('Option A\nOption B\nOption C');
    await expect(app.field('Field 5')).toContainText('Dropdown, 3 options, required');
    await noA11yViolations();
  });

  test('US-TDF-0007-TC-002 Decimal boundaries are one centavo either side; an extra place is Confirm', async () => {
    await app.loadPreset('Payment');
    await app.selectField('Amount (₱)');
    expect((await app.rowsOfType('Boundary')).map((r) => [r.value, r.expect])).toEqual([
      ['1.00', 'Accept'],
      ['0.99', 'Reject'],
      ['50000.00', 'Accept'],
      ['50000.01', 'Reject'],
    ]);
    const extra = app.rowByReason('One more decimal place than allowed');
    await expect(extra).toContainText('25000.505');
    await expect(extra).toContainText('Confirm');
  });

  const decimalErrors = [
    { row: 'a', label: 'Decimal places', value: '7', message: 'Decimal places must be a whole number from 0 to 6' },
    { row: 'b', label: 'Min value', value: '0.005', message: 'Min has more decimal places than allowed (2)' },
    { row: 'c', label: 'Min value', value: '1e2', message: 'Min must be a number' },
    { row: 'd', label: 'Max value', value: '1,000', message: 'Max must be a number' },
    { row: 'e', label: 'Min value', value: '60000', message: "Min can't be greater than max" },
  ];
  for (const r of decimalErrors) {
    test(`US-TDF-0007-TC-003${r.row} Decimal ${r.label} "${r.value}" shows "${r.message}"`, async () => {
      await app.loadPreset('Payment');
      await app.selectField('Amount (₱)');
      const original = await app.input(r.label).inputValue();
      await app.fill(r.label, r.value);
      await expect(app.editorError).toHaveText(r.message);
      await app.fill(r.label, original);
      await expect(app.editorError).toHaveCount(0);
    });
  }

  test('US-TDF-0007-TC-004 Password boundaries meet the rules; one invalid value per rule', async () => {
    await app.loadPreset('Change password');
    await app.selectField('New password');

    const boundary = await app.rowsOfType('Boundary');
    expect(boundary.map((r) => r.expect)).toEqual(['Accept', 'Reject', 'Accept', 'Reject']);
    for (const r of boundary.slice(0, 2)) {
      expect(r.value).toMatch(/[A-Z]/);
      expect(r.value).toMatch(/[a-z]/);
      expect(r.value).toMatch(/\d/);
      expect(r.value).toMatch(/[^A-Za-z0-9]/);
    }
    expect(boundary[0].value).toHaveLength(8);
    expect(boundary[1].value).toHaveLength(7);

    const missing = (await app.rowsOfType('Invalid')).filter((r) => r.reason.startsWith('No '));
    expect(missing.map((r) => r.reason)).toEqual([
      'No uppercase letter, otherwise valid',
      'No lowercase letter, otherwise valid',
      'No number, otherwise valid',
      'No symbol, otherwise valid',
    ]);

    await app.input(/^Symbol/).uncheck();
    await expect(app.rowByReason('No symbol, otherwise valid')).toHaveCount(0);
    await expect(app.field('New password')).toContainText('A–Z a–z 0–9,');
  });

  test('US-TDF-0007-TC-005 A password length too short for the rules shows an error', async () => {
    await app.loadPreset('Change password');
    await app.selectField('New password');
    await app.fill('Min length', '3');
    await expect(app.editorError).toHaveText('Min length must be at least 4 to fit the required character types');
  });

  test('US-TDF-0007-TC-006 Dropdown values and option rules', async () => {
    await app.loadPreset('Payment');
    await app.selectField('Payment method');

    expect((await app.rowsOfType('Boundary')).map((r) => r.value)).toEqual(['GCash', 'Bank transfer']);
    expect((await app.rowsOfType('Valid')).map((r) => r.value)).toEqual(['Maya', 'Credit card']);
    const rows = await app.rows();
    const expectFor = (value: string) => rows.find((r) => r.value === value)?.expect;
    expect(expectFor('Not an option')).toBe('Reject');
    expect(expectFor('GCash,Maya')).toBe('Reject');
    expect(expectFor('GCASH')).toBe('Confirm');
    expect(expectFor('GCash␣')).toBe('Confirm');

    const options = app.input('Options (one per line)');
    await options.fill('GCash\nMaya\nCredit card\nBank transfer\n\nGCash');
    await expect(app.editorError).toHaveText('Options must be unique: "GCash" is listed twice');
    await options.fill('');
    await expect(app.editorError).toHaveText('Add at least one option');
  });

  test('US-TDF-0007-TC-007 Change password and Payment presets', async () => {
    await app.loadPreset('Change password');
    expect(await app.fieldNames()).toEqual(['Current password', 'New password']);
    await app.loadPreset('Payment');
    expect(await app.fieldNames()).toEqual(['Amount (₱)', 'Payment method', 'Tip (₱)']);
  });

  test('US-TDF-0007-TC-008 New-type fields are exported and kept after a reload', async ({ page }) => {
    await app.loadPreset('Payment');
    const data = JSON.parse((await app.download('JSON')).text) as Record<string, unknown[]>;
    expect(Object.keys(data)).toEqual(['Amount (₱)', 'Payment method', 'Tip (₱)']);
    for (const list of Object.values(data)) expect(list.length).toBeGreaterThan(5);

    await page.reload();
    expect(await app.fieldNames()).toEqual(['Amount (₱)', 'Payment method', 'Tip (₱)']);
    await expect(app.field('Amount (₱)')).toContainText('Decimal / amount, 1–50000, 2 decimal places, required');
    await expect(app.field('Payment method')).toContainText('Dropdown, 4 options, required');
  });
});
