// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const SPINNER_MESSAGE = 'Usar Spinner de @/shared/ui: trae el color de marca (Tamagui no le aplica defaultProps).';
const SPINNER_PATHS = [
  { name: 'tamagui', importNames: ['Spinner'], message: SPINNER_MESSAGE },
  { name: '@tamagui/spinner', message: SPINNER_MESSAGE },
];

// Las features usan las primitivas de @/shared/ui; las crudas de Tamagui salen con los estilos por defecto.
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
// `no-restricted-syntax` se reemplaza completo por bloque: los selectores van en una lista que se reutiliza.
const ALERT_SELECTORS = [
  // Alert.alert(...), RN.Alert.alert(...), Alert['alert'] y la referencia sin llamar (const f = Alert.alert).
  "MemberExpression[object.name='Alert'][property.name='alert']",
  "MemberExpression[object.name='Alert'][property.value='alert']",
  "MemberExpression[object.property.name='Alert'][property.name='alert']",
  // const { alert } = Alert
  "VariableDeclarator[init.name='Alert'] > ObjectPattern > Property[key.name='alert']",
].map(selector => ({ selector, message: ALERT_MESSAGE }));

const NAMESPACE_IMPORT = {
  selector: "ImportDeclaration[source.value='tamagui'] > ImportNamespaceSpecifier",
  message:
    'Importar de tamagui por nombre: `import * as` esquiva la regla que prohíbe Button, Input, Switch y Spinner.',
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-restricted-imports': ['error', { paths: SPINNER_PATHS }],
      'no-restricted-syntax': ['error', ...ALERT_SELECTORS],
    },
  },
  {
    // Ambas reglas se reemplazan completas por bloque: acá van también los paths del Spinner y los selectores de Alert.
    files: ['src/features/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [...SPINNER_PATHS, ...RAW_CONTROLS_PATHS] }],
      'no-restricted-syntax': ['error', ...ALERT_SELECTORS, NAMESPACE_IMPORT],
    },
  },
  {
    // El único archivo que envuelve el Spinner de Tamagui. Va como override y no como eslint-disable en
    // línea: el `eslint --fix` de lint-staged corre con la config raíz, ve la directiva sin uso y la borra.
    files: ['src/shared/ui/Spinner.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
