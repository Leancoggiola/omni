import { defineConfig, devices } from '@playwright/test';

import { API_ENV, API_URL, EXTERNAL_STUB_URL, RUN_SUFFIX, STUB_PORT, WEB_ENV, WEB_URL } from './src/support/env';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  outputDir: `./test-results${RUN_SUFFIX}`,
  globalSetup: './src/support/globalSetup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['html', { open: 'never', outputFolder: `playwright-report${RUN_SUFFIX}` }], ['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node ./src/support/externalStub.mjs',
      env: { EXTERNAL_STUB_PORT: String(STUB_PORT) },
      url: `${EXTERNAL_STUB_URL}/health`,
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      // reuseExistingServer en false a propósito: reusar una API de desarrollo
      // haría que la suite escriba sobre la base de dev sin avisar.
      command: 'pnpm --filter api dev:e2e',
      env: API_ENV,
      url: `${API_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter web dev',
      env: WEB_ENV,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      cwd: '../..',
    },
  ],
});
