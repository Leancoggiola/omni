import { defineConfig, devices } from '@playwright/test';

import { API_URL, TMDB_STUB_URL, WEB_URL } from './src/support/env';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/support/globalSetup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node ./src/support/tmdbStub.mjs',
      url: `${TMDB_STUB_URL}/health`,
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      // reuseExistingServer en false a propósito: reusar una API de desarrollo
      // haría que la suite escriba sobre la base de dev sin avisar.
      command: 'pnpm --filter api dev:e2e',
      url: `${API_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter web dev',
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      cwd: '../..',
    },
  ],
});
