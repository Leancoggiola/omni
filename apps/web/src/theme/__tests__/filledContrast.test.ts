import { DEFAULT_THEME, getPrimaryShade, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';

import { THEME } from '../config';
import { cssVariablesResolver, variantResolver } from '../css-variables';

import { contrastRatio, SEMANTIC, semanticLight, WCAG_AA_TEXT } from '@omni/shared/theme';

const theme = mergeMantineTheme(DEFAULT_THEME, THEME);
const resolved = cssVariablesResolver(theme);

/** El texto de un `filled` como lo pinta el navegador en `scheme` (resolviendo la variable, si es una). */
function filled(color: string, scheme: 'light' | 'dark') {
  const { color: text } = variantResolver({ color, theme, variant: 'filled' });
  const name = /^var\((--[\w-]+)\)$/.exec(text)?.[1];
  const [palette = '', shade] = color.split('.');
  const background = theme.colors[palette]?.[shade ? Number(shade) : getPrimaryShade(theme, scheme)] ?? '';
  const vars: Record<string, string | undefined> = resolved[scheme];
  return { background, text: name ? (vars[name] ?? '') : text };
}

describe.each(['light', 'dark'] as const)('contraste de los filled (%s)', scheme => {
  it.each(['brand', 'terracotta', 'sage', 'destructive', 'success', 'info', 'warning', 'error', 'brand.6'])(
    '%s llega a AA',
    color => {
      const { background, text } = filled(color, scheme);
      expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  );

  it.each(['brand', 'terracotta', 'sage', 'destructive', 'success', 'info', 'warning', 'error'])(
    'el hover de %s también llega a AA',
    color => {
      const { text } = filled(color, scheme);
      const vars: Record<string, string | undefined> = resolved[scheme];
      const hover = vars[`--mantine-color-${color}-filled-hover`] ?? '';
      expect(contrastRatio(hover, text)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  );

  it('el Button de marca coincide con el de mobile (SEMANTIC), hover incluido', () => {
    expect(filled('brand', scheme)).toEqual({
      background: SEMANTIC[scheme].primaryFill,
      text: SEMANTIC[scheme].onPrimaryFill,
    });
    const vars: Record<string, string | undefined> = resolved[scheme];
    expect(vars['--mantine-color-brand-filled-hover']).toBe(SEMANTIC[scheme].primaryFillHover);
  });
});

/**
 * El texto de estado en claro (`-light-color`, el que usa Mantine en `light` y `outline`) llega a AA sobre el
 * wash de su estado y sobre el canvas, y coincide con el token semántico que usa mobile.
 */
describe('contraste del texto de estado en claro', () => {
  const vars: Record<string, string | undefined> = resolved.light;

  it.each([
    ['info', 'surfaces-info-light', 'text-info'],
    ['warning', 'surfaces-warning-light', 'text-warning'],
    ['error', 'surfaces-error-light', 'text-error'],
    ['destructive', 'surfaces-error-light', 'text-destructive'],
  ] as const)('%s sobre su wash y el canvas llega a AA', (color, wash, text) => {
    const tone = theme.colors[color]?.[9] ?? '';
    expect(tone).toBe(semanticLight[`--mantine-color-${text}`]);
    expect(contrastRatio(tone, vars[`--mantine-color-${wash}`] ?? '')).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(contrastRatio(tone, SEMANTIC.light.body)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it('el relleno destructivo sigue en RED[7], como destructiveFill de mobile', () => {
    expect(filled('destructive', 'light').background).toBe(SEMANTIC.light.destructiveFill);
  });
});

describe('variantResolver', () => {
  it('sin autoContrast deja el texto blanco de Mantine', () => {
    const colors = variantResolver({ color: 'brand', theme, variant: 'filled', autoContrast: false });
    expect(colors.color).toBe('var(--mantine-color-white)');
  });

  it('light-custom usa la superficie y el borde semánticos', () => {
    const colors = variantResolver({ color: 'destructive', theme, variant: 'light-custom' });
    expect(colors.background).toBe('var(--mantine-color-surfaces-destructive-light)');
  });
});
