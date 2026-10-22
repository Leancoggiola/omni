const MANTINE_COLORS = '(red|pink|grape|violet|indigo|blue|cyan|teal|green|lime|yellow|orange)';
const COLOR_VALUE = `/^${MANTINE_COLORS}([.][0-9])?$/`;
const COLOR_PROPS = '/^(color|c|bg|bgc|borderColor|fill|stroke)$/';

const NAMED_MESSAGE = 'Usá los alias semánticos (destructive, error, success, brand…) en lugar de colores de Mantine.';
const HEX_MESSAGE = 'Nada de hex sueltos: el color nace en packages/shared/src/theme/tokens.ts.';

/** Selectores de `no-restricted-syntax` para la regla de oro 4: colores nombrados de Mantine y hex literales. */
export const hardcodedColorSelectors = [
  { selector: `JSXAttribute[name.name=${COLOR_PROPS}][value.value=${COLOR_VALUE}]`, message: NAMED_MESSAGE },
  {
    selector: `JSXAttribute[name.name=${COLOR_PROPS}] > JSXExpressionContainer > Literal[value=${COLOR_VALUE}]`,
    message: NAMED_MESSAGE,
  },
  { selector: `Property[key.name=${COLOR_PROPS}][value.value=${COLOR_VALUE}]`, message: NAMED_MESSAGE },
  {
    selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: HEX_MESSAGE,
  },
  {
    selector: 'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z])/]',
    message: HEX_MESSAGE,
  },
];
