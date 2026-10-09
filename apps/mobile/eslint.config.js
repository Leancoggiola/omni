// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'tamagui',
              importNames: ['Spinner'],
              message: 'Usar Spinner de @/shared/ui: trae el color de marca (Tamagui no le aplica defaultProps).',
            },
            {
              name: '@tamagui/spinner',
              message: 'Usar Spinner de @/shared/ui: trae el color de marca (Tamagui no le aplica defaultProps).',
            },
          ],
        },
      ],
    },
  },
  {
    // El único archivo que envuelve el Spinner de Tamagui. Va como override y no como eslint-disable en
    // línea: el `eslint --fix` de lint-staged corre con la config raíz, ve la directiva sin uso y la borra.
    files: ['src/shared/ui/Spinner.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
