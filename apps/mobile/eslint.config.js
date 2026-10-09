// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const SPINNER_MESSAGE = 'Usar Spinner de @/shared/ui: trae el color de marca (Tamagui no le aplica defaultProps).';
const SPINNER_PATHS = [
  { name: 'tamagui', importNames: ['Spinner'], message: SPINNER_MESSAGE },
  { name: '@tamagui/spinner', message: SPINNER_MESSAGE },
];

// Las features usan las primitivas de @/shared/ui; las crudas de Tamagui salen con los estilos por defecto.
const RAW_CONTROLS_PATHS = [
  {
    name: 'tamagui',
    importNames: ['Button'],
    message: 'Usar Button de @/shared/ui (variantes, tamaños, loading y color de marca).',
  },
  {
    name: 'tamagui',
    importNames: ['Input'],
    message: 'Usar TextField / PasswordField de @/shared/ui (label, error, ícono y alto de 44 dp).',
  },
  {
    name: 'tamagui',
    importNames: ['Switch'],
    message: 'Usar Switch de @/shared/ui (thumb y fila con label).',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', { paths: SPINNER_PATHS }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Alert'][callee.property.name='alert']",
          message:
            'Nada de Alert.alert: notifySuccess/notifyError para feedback, confirm() para confirmar y actionSheet() para elegir (@/shared/ui).',
        },
      ],
    },
  },
  {
    // `no-restricted-imports` se reemplaza completo por bloque: acá van también los paths del Spinner.
    files: ['src/features/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [...SPINNER_PATHS, ...RAW_CONTROLS_PATHS] }],
    },
  },
  {
    // El único archivo que envuelve el Spinner de Tamagui. Va como override y no como eslint-disable en
    // línea: el `eslint --fix` de lint-staged corre con la config raíz, ve la directiva sin uso y la borra.
    files: ['src/shared/ui/Spinner.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
