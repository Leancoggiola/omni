import { baseConfig } from '@omni/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: ['dist/', 'coverage/'],
  },
];
