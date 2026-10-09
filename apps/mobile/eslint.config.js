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
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/ui/Spinner.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
