import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export { featureIsolation } from './features.mjs';
export { hardcodedColorSelectors } from './colors.mjs';
export { IMPORT_GROUPS, importSortConfig } from './import-sort.mjs';

/** Reglas comunes a todos los paquetes: TypeScript recomendado, Prettier y `any`/variables sin usar como error. */
export const baseConfig = [
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
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
];
