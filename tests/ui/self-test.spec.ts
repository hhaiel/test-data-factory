import { expect, test } from '@playwright/test';
import { testData } from '../data/min-length.data';
import { FactoryPage } from '../support/factory-page';

/**
 * The tool testing itself: tests/data/min-length.data.ts was exported from the app's own
 * Playwright button (see scripts/export-self-test-data.mjs), describing the editor's
 * "Min length" input as a whole number, 0 to 100,000, optional.
 *
 * Each value is typed into a text field's Min length (with Max length cleared, so only the
 * min rules apply). "accept" values must leave no error; "reject" values must show one.
 * "confirm" values are skipped: their right behavior isn't decided yet.
 */
const rows = testData['Min length'];

test.describe('US-TDF-0001-TC-005 Min length input, driven by the tool\'s own test data', () => {
  for (const row of rows) {
    const title = `${row.category} ${JSON.stringify(row.value)}: ${row.expect} (${row.reason})`;
    test(title, async ({ page }) => {
      test.skip(row.expect === 'confirm', 'Needs confirmation: behavior not decided');
      const app = new FactoryPage(page);
      await app.goto();
      await app.addField.click();
      await app.fill('Max length', '');
      await app.fill('Min length', row.value);

      if (row.expect === 'accept') {
        await expect(app.editorError, `"${row.value}" should be accepted`).toHaveCount(0);
        await expect(app.table).toBeVisible();
      } else {
        await expect(app.editorError, `"${row.value}" should be rejected`).toBeVisible();
      }
    });
  }
});
