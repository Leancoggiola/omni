import { describe, expect, it } from 'vitest';

import {
  DISPLAY,
  DISPLAY_FONT,
  OPACITY,
  OVERLINE,
  RADIUS,
  SEMANTIC,
  semanticDark,
  semanticLight,
  SHADOW_THEMED,
  SIZE,
  withOpacity,
} from '..';

describe('RADIUS', () => {
  it('va en múltiplos de 4 (salvo none y full) y crece de a un escalón', () => {
    const steps = [RADIUS.xs, RADIUS.sm, RADIUS.md, RADIUS.lg, RADIUS.xl, RADIUS['2xl']];
    expect(steps).toEqual([4, 8, 12, 16, 24, 32]);
    expect(RADIUS.none).toBe(0);
    expect(RADIUS.full).toBe(9999);
  });
});

describe('DISPLAY y OVERLINE', () => {
  it('usan Bricolage Grotesque y el interlineado en múltiplos de 4', () => {
    expect(DISPLAY_FONT).toBe('Bricolage Grotesque');
    for (const style of [...Object.values(DISPLAY), OVERLINE]) {
      expect(style.lineHeight % 4).toBe(0);
    }
  });

  it('da 800 a los títulos grandes y 700 a los de hojas y estados vacíos', () => {
    expect([DISPLAY.xl, DISPLAY.lg, DISPLAY.accent, DISPLAY.amountHero].map(d => d.fontWeight)).toEqual([
      800, 800, 800, 800,
    ]);
    expect(DISPLAY.md.fontWeight).toBe(700);
  });
});

describe('SIZE', () => {
  it('lleva el Button lg a 48 y las piezas fijas del v2', () => {
    expect(SIZE.control).toEqual({ sm: 36, md: 44, lg: 48 });
    expect([SIZE.fab, SIZE.tabBar]).toEqual([56, 72]);
    expect(SIZE.avatar).toEqual({ xs: 24, sm: 32, md: 40, lg: 80 });
  });
});

describe('opacidad de surface-glass', () => {
  it('withOpacity escribe el alfa en hex de 2 dígitos', () => {
    expect(withOpacity('#ffffff', 0.9)).toBe('#ffffffe6');
    expect(withOpacity('#ffffff', 0.06)).toBe('#ffffff0f');
  });

  it.each([
    ['light', semanticLight['--mantine-color-surfaces-glass'], '#FFFDFB'],
    ['dark', semanticDark['--mantine-color-surfaces-glass'], '#211E1C'],
  ])('en %s es la surface al OPACITY.glass', (_scheme, glass, surface) => {
    expect(glass).toBe(withOpacity(surface, OPACITY.glass));
    expect(parseInt(glass.slice(7, 9), 16) / 255).toBeCloseTo(OPACITY.glass, 2);
  });
});

describe('SEMANTIC de v2', () => {
  it.each(['light', 'dark'] as const)('expone los 9 colores nuevos en %s', scheme => {
    const s = SEMANTIC[scheme];
    for (const key of [
      'surfaceGlass',
      'glassBorder',
      'glowPeach',
      'glowLilac',
      'hairline',
      'borderSubtle',
      'track',
      'successFill',
      'onSuccessFill',
    ] as const) {
      expect(s[key]).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
    }
  });
});

describe('SHADOW_THEMED', () => {
  it('card y float en claro son las sombras cálidas del DS', () => {
    expect(SHADOW_THEMED.card.light).toMatchObject({ color: '#96786F', offsetY: 8, opacity: 0.12 });
    expect(SHADOW_THEMED.float.light).toMatchObject({ color: '#5C3222', offsetY: 12, opacity: 0.16 });
    expect(SHADOW_THEMED.sheet.dark).toMatchObject({ color: '#000000', offsetY: -12, opacity: 0.5 });
  });

  it.each(Object.entries(SHADOW_THEMED))(
    '%s tiene desenfoque 32 y desplazamiento de 8 o 12 en los dos esquemas',
    (_name, scheme) => {
      for (const shadow of [scheme.light, scheme.dark]) {
        expect(shadow.radius).toBe(32);
        expect([8, 12]).toContain(Math.abs(shadow.offsetY));
      }
    }
  );
});
