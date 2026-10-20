import { baseConfig } from '@omni/eslint-config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

/** Orden de imports: externos (react, mantine…), alias `@/`, relativos, tipos y CSS. */
const IMPORT_GROUPS = [
  ['^react', '^@mantine', '^[a-z]'],
  ['^@/'],
  ['^\.\./', '^\./'],
  ['^.*\\u0000$'],
  ['^.+\\.s?css$'],
];

const MANTINE_DEFAULT_COLORS = '(red|pink|grape|violet|indigo|blue|cyan|teal|green|lime|yellow|orange)';

export default [
  ...baseConfig,

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

      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports instead of default exports in components.',
        },
        {
          selector: `JSXAttribute[name.name=/^(color|c|bg)$/][value.value=/^${MANTINE_DEFAULT_COLORS}(\.[0-9])?$/]`,
          message: 'Usá los alias semánticos (destructive, error, success, brand…) en lugar de colores de Mantine.',
        },
      ],
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: IMPORT_GROUPS,
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'error',
    },
  },

  {
    ignores: ['node_modules/', 'dist/', 'coverage/', '.vite/'],
  },
];
