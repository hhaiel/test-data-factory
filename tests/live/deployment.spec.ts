import { expect, test } from '@playwright/test';
import { FactoryPage } from '../support/factory-page';

/**
 * Checks for the deployed site only: the headers come from vercel.json, which the local
 * dev server doesn't apply. Run with: BASE_URL=https://<your-deploy> npm run test:e2e
 */
test.describe('Live deployment', () => {
  test.skip(!process.env.BASE_URL, 'Only runs against a deployed site (set BASE_URL)');

  test('Security headers from vercel.json are sent', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['content-security-policy']).toContain("default-src 'self'");
  });

  test('The app works under the Content-Security-Policy, with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    const app = new FactoryPage(page);
    await app.goto();
    await app.selectField('Age');
    await expect(app.rowByReason('Minimum allowed (18)')).toBeVisible();
    // Styles loaded: a styled panel has a border radius (CSP would block the stylesheet otherwise).
    expect(await app.dataPanel.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('12px');
    expect(errors).toEqual([]);
  });

  test('Built assets are cached long-term', async ({ page, request }) => {
    await page.goto('/');
    const src = await page.locator('script[type="module"]').first().getAttribute('src');
    const res = await request.get(src!);
    expect(res.headers()['cache-control']).toContain('immutable');
  });
});
