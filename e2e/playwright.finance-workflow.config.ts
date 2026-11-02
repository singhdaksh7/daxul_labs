import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: __dirname,
  testMatch: /partner-finance-workflow\.spec\.ts$/,
  outputDir: path.join(__dirname, 'test-results'),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

