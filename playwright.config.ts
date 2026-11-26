import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright starts its own copy of the app on port 4176, so it never clashes with a dev server
 * you already have open on 5173.
 * Run everything:     npm run test:e2e
 * Watch it run:       npx playwright test --headed
 * Test the live site: BASE_URL=https://your-deploy.vercel.app npm run test:e2e   (no local server started)
 */
const PORT = 4176;
const LIVE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: LIVE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: LIVE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
