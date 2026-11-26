import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page } from '@playwright/test';

export type CategoryName = 'Valid' | 'Boundary' | 'Invalid' | 'Nasty';

export interface Row {
  value: string;
  type: string;
  expect: string;
  reason: string;
}

/**
 * Page object for the Test Data Factory screen. Locators are role- and label-based,
 * the same way a user (or a screen reader) finds things.
 */
export class FactoryPage {
  readonly fieldsPanel: Locator;
  readonly fieldList: Locator;
  readonly addField: Locator;
  readonly editor: Locator;
  readonly dataPanel: Locator;
  readonly table: Locator;
  readonly banner: Locator;
  readonly editorError: Locator;
  readonly preset: Locator;

  constructor(readonly page: Page) {
    this.fieldsPanel = page.getByRole('complementary', { name: 'Fields' });
    this.fieldList = this.fieldsPanel.getByRole('list');
    this.addField = this.fieldsPanel.getByRole('button', { name: '+ Add field' });
    this.editor = page.getByRole('form', { name: 'Edit field' });
    this.dataPanel = page.getByRole('region', { name: 'Generated test data' });
    this.table = this.dataPanel.getByRole('table');
    this.banner = page.getByRole('status');
    this.editorError = this.editor.getByRole('alert');
    this.preset = page.getByRole('combobox', { name: /Load a preset/ });
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.fieldList).toBeVisible();
  }

  /** The list item for a field, found by its exact name. */
  field(name: string): Locator {
    return this.fieldList.getByRole('listitem').filter({ has: this.page.getByText(name, { exact: true }) });
  }

  async selectField(name: string) {
    await this.field(name).getByRole('button').first().click();
    await expect(this.editor.getByLabel('Name')).toHaveValue(name);
  }

  async removeField(name: string) {
    await this.page.getByRole('button', { name: `Remove ${name}`, exact: true }).click();
  }

  fieldNames(): Promise<string[]> {
    return this.fieldList.locator('.field-name').allInnerTexts();
  }

  input(label: string | RegExp): Locator {
    return this.editor.getByLabel(label, { exact: typeof label === 'string' });
  }

  async fill(label: string | RegExp, value: string) {
    await this.input(label).fill(value);
  }

  chip(category: CategoryName): Locator {
    return this.dataPanel.getByRole('group', { name: 'Show categories' }).getByRole('button', { name: new RegExp(`^${category}`) });
  }

  async chipCount(category: CategoryName): Promise<number> {
    return Number(await this.chip(category).locator('.count').innerText());
  }

  /** Every visible row of the values table, as the user reads it. */
  async rows(): Promise<Row[]> {
    return this.table.locator('tbody tr').evaluateAll((trs) =>
      trs.map((tr) => {
        const td = tr.querySelectorAll('td');
        return { value: td[0].textContent ?? '', type: td[1].textContent ?? '', expect: td[2].textContent ?? '', reason: td[3].textContent ?? '' };
      }),
    );
  }

  async rowsOfType(type: CategoryName): Promise<Row[]> {
    return (await this.rows()).filter((r) => r.type === type);
  }

  rowByReason(reason: string | RegExp): Locator {
    return this.table.locator('tbody tr').filter({ hasText: reason });
  }

  async loadPreset(name: 'User signup' | 'Leave request' | 'Change password' | 'Payment' | 'Checkout') {
    await this.preset.selectOption(name);
  }

  exportButton(kind: 'CSV' | 'JSON' | 'Playwright'): Locator {
    return this.page.getByRole('group', { name: 'Export all fields' }).getByRole('button', { name: kind, exact: true });
  }

  /** Clicks an export button and returns the downloaded file's name and text. */
  async download(kind: 'CSV' | 'JSON' | 'Playwright'): Promise<{ name: string; text: string; path: string }> {
    const [dl] = await Promise.all([this.page.waitForEvent('download'), this.exportButton(kind).click()]);
    const path = await dl.path();
    return { name: dl.suggestedFilename(), text: await readFile(path, 'utf8'), path };
  }
}
