import { DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';
import { describe, expect, it } from 'vitest';

import { THEME } from '../config';
import { cssVariablesResolver } from '../css-variables';

import { RADIUS as RADIUS_PX, SEMANTIC } from '@omni/shared/theme';

const theme = mergeMantineTheme(DEFAULT_THEME, THEME);
const resolved = cssVariablesResolver(theme);

describe.each(['light', 'dark'] as const)('tokens v2 en el resolver (%s)', scheme => {
  const vars: Record<string, string | undefined> = resolved[scheme];
  const s = SEMANTIC[scheme];

  it.each([
    ['--mantine-color-surfaces-glass', s.surfaceGlass],
    ['--mantine-color-border-glass', s.glassBorder],
    ['--mantine-color-surfaces-glow-peach', s.glowPeach],
    ['--mantine-color-surfaces-glow-lilac', s.glowLilac],
    ['--mantine-color-border-hairline', s.hairline],
    ['--mantine-color-border-subtle', s.borderSubtle],
    ['--mantine-color-surfaces-track', s.track],
    ['--mantine-color-surfaces-success-fill', s.successFill],
    ['--mantine-color-text-on-success-fill', s.onSuccessFill],
  ])('publica %s igual que SEMANTIC (mobile)', (name, expected) => {
    expect(vars[name]).toBe(expected);
  });
});

describe('sombras v2', () => {
  it('claro sale del tema y oscuro del resolver, con desenfoque 32', () => {
    expect(theme.shadows.card).toBe('0 8px 32px rgb(150 120 111 / 0.12)');
    expect(theme.shadows.sheet).toBe('0 -12px 32px rgb(92 50 34 / 0.12)');
    expect(resolved.dark['--mantine-shadow-card']).toBe('0 8px 32px rgb(0 0 0 / 0.4)');
    expect(resolved.dark['--mantine-shadow-float']).toBe('0 12px 32px rgb(0 0 0 / 0.5)');
    expect(resolved.light['--mantine-shadow-card']).toBeUndefined();
  });
});

describe('radios y tipografía v2', () => {
  it('registra la escala en rem, con 2xl para las hojas inferiores', () => {
    expect(theme.radius['2xl']).toBe(`${RADIUS_PX['2xl'] / 16}rem`);
    expect(theme.radius.xl).toBe('1.5rem');
    expect(theme.radius.md).toBe('0.75rem');
    expect(theme.radius.sm).toBe('0.5rem');
    expect(theme.radius.xs).toBe('0.25rem');
    expect(theme.defaultRadius).toBe('md');
  });

  it('expone la familia display y sus estilos en rem', () => {
    expect(theme.other.displayFontFamily).toContain('Bricolage Grotesque');
    expect(theme.other.display.xl).toMatchObject({ fontSize: '2.5rem', lineHeight: '2.75rem', fontWeight: 800 });
    expect(theme.other.display.md.fontWeight).toBe(700);
  });
});
