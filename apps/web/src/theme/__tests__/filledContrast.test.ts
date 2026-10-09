import { DEFAULT_THEME, getPrimaryShade, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';

import { THEME } from '../config';
import { cssVariablesResolver, variantResolver } from '../css-variables';

import { contrastRatio, SEMANTIC, WCAG_AA_TEXT } from '@omni/shared/theme';

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
  it.each(['brand', 'terracotta', 'sage', 'destructive', 'success', 'brand.6'])('%s llega a AA', color => {
    const { background, text } = filled(color, scheme);
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it('el Button de marca coincide con el de mobile (SEMANTIC)', () => {
    expect(filled('brand', scheme)).toEqual({
      background: SEMANTIC[scheme].primaryFill,
      text: SEMANTIC[scheme].onPrimaryFill,
    });
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
