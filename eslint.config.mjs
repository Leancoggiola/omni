import { baseConfig } from './packages/eslint-config/index.mjs';

export default [
  ...baseConfig,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'apps/**',
      'packages/shared/**',
      'packages/typescript-config/**',
      '.claude/worktrees/**',
    ],
  },
];
