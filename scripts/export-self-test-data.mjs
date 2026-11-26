/**
 * Uses the Test Data Factory on itself.
 *
 * Opens the real app in a browser, describes the field editor's own "Min length" input
 * the way a tester would read it from the rules (a whole number, 0 to 100,000, optional),
 * clicks the Playwright export button, and saves the file to tests/data/.
 * tests/ui/self-test.spec.ts then types every exported value into the app.
 *
 * Run: npm run export-self-test-data   (regenerate after changing the generators)
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const OUT = 'tests/data/min-length.data.ts';

const server = await createServer({ server: { port: 4177, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto('http://localhost:4177/');

  // Start from one field so the export holds only "Min length".
  for (const name of ['Full name', 'Email', 'Mobile']) {
    await page.getByRole('button', { name: `Remove ${name}`, exact: true }).click();
  }
  const editor = page.getByRole('form', { name: 'Edit field' });
  await editor.getByLabel('Name', { exact: true }).fill('Min length');
  await editor.getByLabel('Min value', { exact: true }).fill('0');
  await editor.getByLabel('Max value', { exact: true }).fill('100000');
  await editor.getByLabel('Required', { exact: true }).uncheck();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Playwright', exact: true }).click(),
  ]);
  await mkdir('tests/data', { recursive: true });
  await download.saveAs(OUT);
  console.log(`Saved ${OUT}`);
} finally {
  await browser.close();
  await server.close();
}
