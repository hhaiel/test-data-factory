import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // Readable summary in the failure message: rule id, impact and the first offending element.
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0]?.target.join(' ')}`);
}

// US-TDF-0006: The tool is usable with a keyboard and screen reader
test.describe('Accessibility', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`US-TDF-0006-TC-001 No WCAG 2.1 AA violations, normal and invalid states (${scheme} mode)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const app = new FactoryPage(page);
      await app.goto();
      expect(await violations(page)).toEqual([]);

      await app.selectField('Age');
      await expect(app.field('Age').getByRole('button').first()).toHaveAttribute('aria-current', 'true');
      await app.fill('Min value', '99');
      await expect(app.editorError).toBeVisible(); // role="alert"
      expect(await violations(page)).toEqual([]);
    });
  }

  test('US-TDF-0006-TC-002 Main flow works with the keyboard only', async ({ page }) => {
    const app = new FactoryPage(page);
    await app.goto();

    /** Presses Tab until the target has focus (fails after 60 presses). */
    async function tabTo(target: ReturnType<FactoryPage['input']>) {
      for (let i = 0; i < 60; i++) {
        if (await target.evaluate((el) => el === document.activeElement)) return;
        await page.keyboard.press('Tab');
      }
      throw new Error('Could not reach the element with Tab');
    }

    await tabTo(app.addField);
    await page.keyboard.press('Enter');
    await expect(app.field('Field 5')).toBeVisible();

    await tabTo(app.input('Name'));
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Code');
    await expect(app.field('Code')).toBeVisible();

    await tabTo(app.chip('Nasty'));
    await page.keyboard.press('Space');
    await expect(app.chip('Nasty')).toHaveAttribute('aria-pressed', 'false');

    // Focus must be visible: the focused element gets an outline.
    const outline = await app.chip('Nasty').evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe('none');

    await tabTo(app.exportButton('JSON'));
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(download.suggestedFilename()).toBe('test-data.json');
  });

  test('US-TDF-0006-TC-003 Layout works at 375 px with no horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const app = new FactoryPage(page);
    await app.goto();
    await app.selectField('Full name');

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Panels stack: the data panel starts below the fields panel.
    const side = await app.fieldsPanel.boundingBox();
    const data = await app.dataPanel.boundingBox();
    expect(data!.y).toBeGreaterThanOrEqual(side!.y + side!.height);
  });
});
