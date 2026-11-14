import { SEMANTIC } from '@omni/shared/theme';
import { defaultConfig } from '@tamagui/config/v5';

import { tamaguiConfig } from './tamagui.config';

const themes = tamaguiConfig.themes as unknown as Record<string, Record<string, unknown>>;

/** Los themes del config pueden guardar la variable de Tamagui (`{ val }`) en vez del string. */
function value(theme: string, key: string): unknown {
  const v = themes[theme]?.[key];
  return v && typeof v === 'object' && 'val' in v ? (v as { val: unknown }).val : v;
}

const baseLight = defaultConfig.themes.light as Record<string, unknown>;

/** Cada clave con guion del theme base de v5 junto a su grafía camelCase (`background-hover` / `backgroundHover`). */
const KEBAB_PAIRS = Object.keys(baseLight)
  .map(kebab => [kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), kebab] as const)
  .filter(([camel, kebab]) => camel !== kebab && camel in baseLight);

describe.each(['light', 'dark'] as const)('themes propios (%s)', scheme => {
  const s = SEMANTIC[scheme];

  it.each([
    ['active', 'background', s.primaryFill],
    ['active', 'color', s.onPrimaryFill],
    ['active', 'backgroundHover', s.primaryFillHover],
    ['active', 'backgroundPress', s.primaryFillPress],
    ['active', 'background-press', s.primaryFillPress],
    ['active', 'disabledSurface', s.disabledSurface],
    ['active', 'onAccentFill', s.onAccentFill],
    ['red', 'background', s.destructiveFill],
    ['red', 'color', s.onDestructive],
    ['red', 'primarySurface', s.primarySurface],
    ['Input', 'background', s.card],
    ['Input', 'border-color', s.border],
    ['Input', 'border-color-focus', s.primary],
    ['Input', 'placeholder-color', s.placeholder],
    ['Input', 'disabledSurface', s.disabledSurface],
    ['Input', 'destructive', s.destructive],
    ['Input', 'primary', s.primary],
    ['TextArea', 'background', s.card],
    ['TextArea', 'placeholder-color', s.placeholder],
  ])('%s: %s resuelve a SEMANTIC', (name, key, expected) => {
    expect(value(`${scheme}_${name}`, key)).toBe(expected);
  });

  it('el theme base pisa las dos grafías de cada color y la pista del Switch apagado', () => {
    expect(value(scheme, 'background')).toBe(s.body);
    expect(value(scheme, 'border-color')).toBe(s.border);
    expect(value(scheme, 'background-press')).toBe(s.border);
    expect(value(scheme, 'color-4')).toBe(s.borderSubtle);
    expect(value(scheme, 'color-5')).toBe(s.borderSubtle);
  });

  it.each([
    ['surfaceGlass', s.surfaceGlass],
    ['glassBorder', s.glassBorder],
    ['glowPeach', s.glowPeach],
    ['glowLilac', s.glowLilac],
    ['hairline', s.hairline],
    ['borderSubtle', s.borderSubtle],
    ['track', s.track],
    ['successFill', s.successFill],
    ['onSuccessFill', s.onSuccessFill],
  ])('los tokens de v2 resuelven %s en el theme base y en uno de color', (key, expected) => {
    expect(value(scheme, key)).toBe(expected);
    expect(value(`${scheme}_active`, key)).toBe(expected);
  });

  it.each(['', '_active', '_red', '_Input', '_TextArea'])(
    'las dos grafías de cada clave compuesta coinciden en %s',
    suffix => {
      expect(KEBAB_PAIRS.length).toBeGreaterThan(10);
      for (const [camel, kebab] of KEBAB_PAIRS) {
        expect(value(`${scheme}${suffix}`, kebab)).toBe(value(`${scheme}${suffix}`, camel));
      }
    }
  );

  it('el theme red pone el texto de onDestructive sobre destructiveFill', () => {
    expect(value(`${scheme}_red`, 'background')).toBe(s.destructiveFill);
    expect(value(`${scheme}_red`, 'color')).toBe(s.onDestructive);
  });
});

describe('fuentes de display', () => {
  it('registra Bricolage Grotesque con el 700 y el 800 en caras propias', () => {
    const display = tamaguiConfig.fonts.display as unknown as {
      family: string;
      face: Record<number, { normal: string }>;
    };
    expect(display.family).toBe('Bricolage Grotesque');
    expect(display.face[700].normal).toBe('BricolageGrotesqueBold');
    expect(display.face[800].normal).toBe('BricolageGrotesqueExtraBold');
  });
});

describe('animaciones', () => {
  it('registra el driver de React Native con los presets que usan los Sheet', () => {
    const animations = tamaguiConfig.animations as unknown as { animations: Record<string, unknown> };
    expect(Object.keys(animations.animations)).toEqual(expect.arrayContaining(['lazy', 'medium']));
  });
});
