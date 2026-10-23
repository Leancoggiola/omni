import { featureIsolation, hardcodedColorSelectors } from '@omni/eslint-config';
import expoConfig from 'eslint-config-expo/flat.js';
import { defineConfig } from 'eslint/config';
import { join } from 'node:path';

const SPINNER_MESSAGE = 'Usar Spinner de @/shared/ui: trae el color de marca (Tamagui no le aplica defaultProps).';
const SPINNER_PATHS = [
  { name: 'tamagui', importNames: ['Spinner'], message: SPINNER_MESSAGE },
  { name: '@tamagui/spinner', message: SPINNER_MESSAGE },
];

/** Las features usan las primitivas de @/shared/ui; las crudas de Tamagui salen con los estilos por defecto. */
const BUTTON_MESSAGE = 'Usar Button de @/shared/ui (variantes, tamaños, loading y color de marca).';
const INPUT_MESSAGE = 'Usar TextField / PasswordField de @/shared/ui (label, error, ícono y alto de 44 dp).';
const SWITCH_MESSAGE = 'Usar Switch de @/shared/ui (thumb y fila con label).';
const RAW_CONTROLS_PATHS = [
  { name: 'tamagui', importNames: ['Button'], message: BUTTON_MESSAGE },
  { name: '@tamagui/button', message: BUTTON_MESSAGE },
  { name: 'tamagui', importNames: ['Input'], message: INPUT_MESSAGE },
  { name: '@tamagui/input', message: INPUT_MESSAGE },
  { name: 'tamagui', importNames: ['Switch'], message: SWITCH_MESSAGE },
  { name: '@tamagui/switch', message: SWITCH_MESSAGE },
];

const ALERT_MESSAGE =
  'Nada de Alert.alert: notifySuccess/notifyError para feedback, confirm() para confirmar y actionSheet() para elegir (@/shared/ui).';
/** `no-restricted-syntax` se reemplaza completo por bloque: los selectores van en una lista que se reutiliza. */
const ALERT_SELECTORS = [
  "MemberExpression[object.name='Alert'][property.name='alert']",
  "MemberExpression[object.name='Alert'][property.value='alert']",
  "MemberExpression[object.property.name='Alert'][property.name='alert']",
  "VariableDeclarator[init.name='Alert'] > ObjectPattern > Property[key.name='alert']",
].map(selector => ({ selector, message: ALERT_MESSAGE }));

const NAMESPACE_IMPORT = {
  selector: "ImportDeclaration[source.value='tamagui'] > ImportNamespaceSpecifier",
  message:
    'Importar de tamagui por nombre: `import * as` esquiva la regla que prohíbe Button, Input, Switch y Spinner.',
};

const TEST_FILES = ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}'];

const JEST_GLOBALS = Object.fromEntries(
  ['describe', 'it', 'expect', 'beforeAll', 'afterAll', 'beforeEach', 'afterEach', 'jest', '__dirname'].map(name => [
    name,
    'readonly',
  ])
);

export default defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/', '.tamagui/', 'coverage/', 'android/', 'ios/'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', { paths: SPINNER_PATHS }],
      'no-restricted-syntax': ['error', ...ALERT_SELECTORS],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...ALERT_SELECTORS, ...hardcodedColorSelectors],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [...SPINNER_PATHS, ...RAW_CONTROLS_PATHS] }],
      'no-restricted-syntax': ['error', ...ALERT_SELECTORS, NAMESPACE_IMPORT, ...hardcodedColorSelectors],
    },
  },
  ...featureIsolation({
    featuresDir: join(import.meta.dirname, 'src/features'),
    paths: [...SPINNER_PATHS, ...RAW_CONTROLS_PATHS],
  }),
  {
    files: TEST_FILES,
    rules: { 'no-restricted-syntax': ['error', ...ALERT_SELECTORS] },
  },
  {
    files: ['*.test.js'],
    languageOptions: { globals: JEST_GLOBALS },
  },
  {
    files: ['src/shared/ui/Spinner.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
