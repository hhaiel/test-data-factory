import { expect, test } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

// US-TDF-0005: Tester starts from a preset and keeps their work
test.describe('Presets and saved fields', () => {
  test('US-TDF-0005-TC-001 First visit loads the User signup preset', async ({ page }) => {
    const app = new FactoryPage(page);
    await app.goto();
    expect(await app.fieldNames()).toEqual(['Full name', 'Age', 'Email', 'Mobile']);
    await expect(app.input('Name')).toHaveValue('Full name');
  });

  test('US-TDF-0005-TC-002 Each preset replaces the fields and selects the first one', async ({ page }) => {
    const app = new FactoryPage(page);
    await app.goto();
    await expect(app.preset.getByRole('option')).toHaveText(['Load a preset…', 'User signup', 'Leave request', 'Checkout']);

    await app.loadPreset('Leave request');
    expect(await app.fieldNames()).toEqual(['Start date', 'Days requested', 'Reason']);
    await expect(app.input('Name')).toHaveValue('Start date');
    await expect(app.preset).toHaveValue('');

    await app.loadPreset('Checkout');
    expect(await app.fieldNames()).toEqual(['Quantity', 'Discount code', 'Contact number']);
    await expect(app.input('Name')).toHaveValue('Quantity');
  });

  test('US-TDF-0005-TC-003 Fields and rules are the same after a reload', async ({ page }) => {
    const app = new FactoryPage(page);
    await app.goto();
    await app.addField.click();
    await app.fill('Name', 'Postcode');
    await app.fill('Max length', '4');
    await app.selectField('Age');
    await app.fill('Max value', '70');

    await page.reload();
    expect(await app.fieldNames()).toEqual(['Full name', 'Age', 'Email', 'Mobile', 'Postcode']);
    await expect(app.field('Postcode')).toContainText('Text, 1–4 chars, required');
    await expect(app.field('Age')).toContainText('Whole number, 18–70, required');
  });

  const broken = [
    { row: 'a', label: 'not JSON', value: 'not json' },
    { row: 'b', label: 'an empty list', value: '[]' },
    { row: 'c', label: 'an unknown field type', value: '[{"id":"x","name":"Bad","type":"colour","required":true}]' },
  ];
  for (const b of broken) {
    test(`US-TDF-0005-TC-004${b.row} Saved data that is ${b.label} doesn't crash the app`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript((value) => localStorage.setItem('tdf.fields.v1', value), b.value);

      const app = new FactoryPage(page);
      await app.goto();
      expect(await app.fieldNames()).toEqual(['Full name', 'Age', 'Email', 'Mobile']);
      expect(errors).toEqual([]);
    });
  }
});
