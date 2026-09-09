import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, './src/app'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/theme': path.resolve(__dirname, './src/theme'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@': path.resolve(__dirname, './src'),
    },
  },
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
});
