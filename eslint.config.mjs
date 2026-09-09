import { baseConfig } from './packages/eslint-config/index.mjs';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Registers react-hooks so per-package eslint-disable comments resolve
    // during the root-level pre-commit lint (see apps/web/eslint.config.mjs).
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '**/generated/', 'apps/*/eslint.config.mjs', 'packages/*/eslint.config.mjs'],
  },
];
