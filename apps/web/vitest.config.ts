import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: ['./src/__tests__/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        include: [
          'src/shared/api/keys.ts',
          'src/shared/api/fetcher.ts',
          'src/shared/api/client.ts',
          'src/shared/api/refreshSession.ts',
          'src/shared/api/serverWake.ts',
          'src/**/utils/**/*.ts',
        ],
        exclude: ['src/**/utils/**/index.ts', 'src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  })
);
