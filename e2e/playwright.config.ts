import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * DAXUL production QA suite.
 *
 * Required env (read from process.env only, never hardcoded or logged):
 *   BASE_URL, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD
 * Run:  npm run qa:e2e   (after `npx playwright install chromium`)
 *
 * Tracing, video and automatic screenshots are OFF everywhere so that the login
 * form values can never end up in an artifact. 14-mobile takes explicit
 * screenshots of non-login pages only.
 */
export default defineConfig({
  testDir: __dirname,
  testMatch: /\d\d-.*\.spec\.ts$/,
  outputDir: path.join(__dirname, 'test-results'),
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: path.join(__dirname, 'report'), open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    storageState: path.join(__dirname, '.auth', 'admin.json'),
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    ignoreHTTPSErrors: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
});
