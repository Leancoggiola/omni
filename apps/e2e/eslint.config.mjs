import { baseConfig } from '@omni/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: ['dist/', 'playwright-report/', 'test-results/', '.auth/'],
  },
];
