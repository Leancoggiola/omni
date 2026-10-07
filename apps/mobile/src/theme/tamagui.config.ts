import { config } from '@tamagui/config';
import { BRAND, SEMANTIC } from '@omni/shared/theme';
import { createTamagui } from 'tamagui';

type Theme = (typeof config.themes)['light'];

function surfaceTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  return {
    ...base,
    background: s.body,
    backgroundHover: s.secondary,
    backgroundPress: s.border,
    backgroundFocus: s.secondary,
    backgroundStrong: s.card,
    color: s.text,
    colorHover: s.text,
    colorPress: s.dimmed,
    colorFocus: s.text,
    borderColor: s.border,
    borderColorHover: s.dimmed,
    borderColorFocus: s.border,
    borderColorPress: s.border,
    placeholderColor: s.placeholder,
    color1: s.card,
    color2: s.card,
    color3: s.secondary,
    destructive: s.destructive,
    success: s.success,
    warning: s.warning,
    info: s.info,
    accent: s.accent,
    accentSurface: s.accentSurface,
    primary: s.primary,
    dimmed: s.dimmed,
  } as Theme;
}

function primaryTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  const onPrimary = scheme === 'light' ? '#ffffff' : SEMANTIC.dark.body;
  return {
    ...base,
    background: s.primary,
    backgroundHover: scheme === 'light' ? BRAND[6] : BRAND[3],
    backgroundPress: scheme === 'light' ? BRAND[8] : BRAND[5],
    backgroundFocus: s.primary,
    backgroundStrong: s.primary,
    color: onPrimary,
    colorHover: onPrimary,
    colorPress: onPrimary,
    colorFocus: onPrimary,
    borderColor: s.primary,
    borderColorHover: s.primary,
    borderColorFocus: s.primary,
    borderColorPress: s.primary,
    placeholderColor: onPrimary,
  };
}

function destructiveTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  const onDestructive = '#ffffff';
  return {
    ...base,
    background: s.destructive,
    backgroundHover: s.destructive,
    backgroundPress: s.destructive,
    backgroundFocus: s.destructive,
    backgroundStrong: s.destructive,
    color: onDestructive,
    colorHover: onDestructive,
    colorPress: onDestructive,
    colorFocus: onDestructive,
    borderColor: s.destructive,
    borderColorHover: s.destructive,
    borderColorFocus: s.destructive,
    borderColorPress: s.destructive,
    placeholderColor: onDestructive,
  };
}

function altTheme(scheme: 'light' | 'dark', base: Theme, strength: 1 | 2): Theme {
  const s = SEMANTIC[scheme];
  return {
    ...base,
    background: s.body,
    color: s.dimmed,
    colorHover: strength === 1 ? s.text : s.dimmed,
    placeholderColor: s.placeholder,
  };
}

/**
 * En nativo cada peso de Inter es una familia aparte (las carga `app/_layout.tsx`, ver
 * `theme/fonts.ts`). La fuente `body` de @tamagui/config no trae este mapeo, así que sin él
 * `fontWeight` no tiene efecto en Android.
 */
const interFace = {
  400: { normal: 'Inter' },
  500: { normal: 'InterMedium' },
  600: { normal: 'InterSemiBold' },
  700: { normal: 'InterBold' },
  800: { normal: 'InterBold' },
  900: { normal: 'InterBold' },
};

export const tamaguiConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    body: { ...config.fonts.body, face: interFace },
    heading: { ...config.fonts.heading, face: interFace },
  },
  themes: {
    ...config.themes,
    light: surfaceTheme('light', config.themes.light),
    dark: surfaceTheme('dark', config.themes.dark),
    light_active: primaryTheme('light', config.themes.light_active),
    dark_active: primaryTheme('dark', config.themes.dark_active),
    light_red: destructiveTheme('light', config.themes.light_red),
    dark_red: destructiveTheme('dark', config.themes.dark_red),
    light_alt1: altTheme('light', config.themes.light_alt1, 1),
    dark_alt1: altTheme('dark', config.themes.dark_alt1, 1),
    light_alt2: altTheme('light', config.themes.light_alt2, 2),
    dark_alt2: altTheme('dark', config.themes.dark_alt2, 2),
  },
});

// El compilador de @tamagui/babel-plugin solo encuentra la config como `export default` (o `config`):
// sin esto la descarta, reintenta en cada archivo y el bundle de Metro se cuelga.
export default tamaguiConfig;

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
