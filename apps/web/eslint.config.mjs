import { baseConfig, featureIsolation, hardcodedColorSelectors, importSortConfig } from '@omni/eslint-config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import { join } from 'node:path';

const NO_DEFAULT_EXPORT = {
  selector: 'ExportDefaultDeclaration',
  message: 'Use named exports instead of default exports in components.',
};

const TEST_FILES = ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'];

export default defineConfig([
  ...baseConfig,
  importSortConfig,
  ...featureIsolation({ featuresDir: join(import.meta.dirname, 'src/features') }),

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...hardcodedColorSelectors],
    },
  },

  {
    files: ['**/*.tsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/self-closing-comp': 'error',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT, ...hardcodedColorSelectors],
    },
  },

  {
    files: TEST_FILES,
    rules: { 'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT] },
  },

  {
    ignores: ['node_modules/', 'dist/', 'coverage/', '.vite/'],
  },
]);
