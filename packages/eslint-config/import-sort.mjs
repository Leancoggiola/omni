import simpleImportSort from 'eslint-plugin-simple-import-sort';

/** Orden de imports: externos (react, mantine…), alias `@/`, relativos, tipos y CSS. */
export const IMPORT_GROUPS = [
  ['^react', '^@mantine', '^[a-z]'],
  ['^@/'],
  ['^\\.\\./', '^\\./'],
  ['^.*\\u0000$'],
  ['^.+\\.s?css$'],
];

/** Ordena imports y exports de `.ts`/`.tsx` con `IMPORT_GROUPS`. */
export const importSortConfig = {
  files: ['**/*.ts', '**/*.tsx'],
  plugins: { 'simple-import-sort': simpleImportSort },
  rules: {
    'simple-import-sort/imports': ['error', { groups: IMPORT_GROUPS }],
    'simple-import-sort/exports': 'error',
  },
};
