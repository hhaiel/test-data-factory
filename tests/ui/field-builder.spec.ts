import { expect, test } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

// US-TDF-0001: Tester describes the fields of a form
test.describe('Field builder', () => {
  let app: FactoryPage;
  test.beforeEach(async ({ page }) => {
    app = new FactoryPage(page);
    await app.goto();
  });

  test('US-TDF-0001-TC-001 Add field creates a selected text field; editor fits each type', async () => {
    await app.addField.click();

    await expect(app.field('Field 5')).toContainText('Text, 1–50 chars, required');
    await expect(app.field('Field 5').getByRole('button').first()).toHaveAttribute('aria-current', 'true');
    await expect(app.input('Name')).toHaveValue('Field 5');
    await expect(app.input('Min length')).toHaveValue('1');
    await expect(app.input('Max length')).toHaveValue('50');
    await expect(app.input('Required')).toBeChecked();

    await app.input('Type').selectOption('Whole number');
    await expect(app.input('Min value')).toHaveValue('1');
    await expect(app.input('Max value')).toHaveValue('100');

    await app.input('Type').selectOption('Date');
    await expect(app.input('Earliest')).toHaveValue('');
    await expect(app.input('Latest')).toHaveValue('');

    await app.input('Type').selectOption('Email');
    await expect(app.editor).toContainText('Standard email rules. Generated addresses use example.com.');
    await expect(app.editor.getByRole('textbox')).toHaveCount(1); // only Name

    await app.input('Type').selectOption('PH mobile number');
    await expect(app.editor).toContainText('Accepts 09XXXXXXXXX or +639XXXXXXXXX.');
  });

  test('US-TDF-0001-TC-002 Editor changes update the summary; empty limit means no limit', async () => {
    await app.selectField('Full name');
    await app.fill('Name', 'Last name');
    await expect(app.field('Last name')).toBeVisible();

    await app.fill('Max length', '30');
    await expect(app.field('Last name')).toContainText('Text, 2–30 chars, required');

    await app.input('Required').uncheck();
    await expect(app.field('Last name')).toContainText('optional');

    await app.fill('Max length', '');
    await expect(app.field('Last name')).toContainText('Text, at least 2 chars, optional');
    await expect(app.editorError).toHaveCount(0);
    await expect(app.table).toBeVisible();
  });

  const invalidRules = [
    { row: 'a', field: 'Full name', label: 'Name', value: '', message: 'Give the field a name' },
    { row: 'b', field: 'Age', label: 'Min value', value: '99', message: "Min can't be greater than max" },
    { row: 'c', field: 'Age', label: 'Min value', value: '2.5', message: 'Min must be a whole number' },
    { row: 'd', field: 'Age', label: 'Max value', value: 'abc', message: 'Max must be a whole number' },
    { row: 'e', field: 'Full name', label: 'Min length', value: '-1', message: "Length can't be negative" },
    { row: 'f', field: 'Full name', label: 'Max length', value: '200000', message: 'Max length is 100,000 characters' },
  ];
  for (const r of invalidRules) {
    test(`US-TDF-0001-TC-003${r.row} ${r.label} "${r.value}" shows "${r.message}"`, async () => {
      await app.selectField(r.field);
      const original = await app.input(r.label).inputValue();
      await app.fill(r.label, r.value);

      await expect(app.editorError).toHaveText(r.message);
      await expect(app.fieldList.getByLabel('has a problem')).toHaveCount(1);

      await app.fill(r.label, original);
      await expect(app.editorError).toHaveCount(0);
      await expect(app.fieldList.getByLabel('has a problem')).toHaveCount(0);
    });
  }

  test('US-TDF-0001-TC-003g Earliest date after latest shows an error', async () => {
    await app.addField.click();
    await app.input('Type').selectOption('Date');
    await app.fill('Earliest', '2026-12-31');
    await app.fill('Latest', '2026-01-01');
    await expect(app.editorError).toHaveText("Earliest date can't be after the latest date");
  });

  test('US-TDF-0001-TC-004 Removing fields, including the selected and the last one', async () => {
    await app.selectField('Age');
    await app.removeField('Age');
    expect(await app.fieldNames()).toEqual(['Full name', 'Email', 'Mobile']);
    await expect(app.input('Name')).toHaveValue('Full name');

    for (const name of ['Full name', 'Email', 'Mobile']) await app.removeField(name);
    await expect(app.fieldList.getByRole('listitem')).toHaveCount(0);
    await expect(app.dataPanel.getByRole('heading', { name: 'Add your first field' })).toBeVisible();

    await app.dataPanel.getByRole('button', { name: 'Add field' }).click();
    expect(await app.fieldNames()).toEqual(['Field 1']);
    await expect(app.input('Name')).toHaveValue('Field 1');
  });
});
