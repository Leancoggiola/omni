import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          setupFiles: ['src/test/setupEnv.ts'],
          include: ['src/**/*.{test,spec}.ts'],
          exclude: [...defaultExclude, 'src/**/__tests__/integration/**'],
        },
      },
      {
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          setupFiles: ['src/test/integration/setupIntegrationEnv.ts', 'src/test/integration/setupIntegrationDb.ts'],
          include: ['src/**/__tests__/integration/**/*.test.ts'],
          // El override de prisma que acota cada test a una transacción es estado de módulo.
          fileParallelism: false,
          pool: 'forks',
          maxWorkers: 1,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/main.ts', 'src/test/**', 'src/**/*.{test,spec}.ts'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
