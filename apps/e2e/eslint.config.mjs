import { baseConfig } from '@omni/eslint-config';

/** @type {import("eslint").Linter.Config} */
export default [
  ...baseConfig,
  {
    ignores: ['eslint.config.mjs', 'playwright-report/', 'test-results/', '.auth/'],
  },
];
