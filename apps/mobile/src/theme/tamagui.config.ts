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
    accentBorder: s.accentBorder,
    successSurface: s.successSurface,
    successBorder: s.successBorder,
    dimmedSurface: s.dimmedSurface,
    dimmedBorder: s.dimmedBorder,
    primarySurface: s.primarySurface,
    hover: s.hover,
    primary: s.primary,
    onPrimary: s.onPrimary,
    dimmed: s.dimmed,
  } as Theme;
}

function primaryTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  const onPrimary = s.onPrimary;
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
  const onDestructive = s.onDestructive;
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
 * Montserrat, igual que web. En nativo cada peso es una familia aparte (las carga `app/_layout.tsx`,
 * ver `theme/fonts.ts`): sin este mapeo `fontWeight` no tiene efecto en Android.
 */
const montserratFace = {
  400: { normal: 'Montserrat' },
  500: { normal: 'MontserratMedium' },
  600: { normal: 'MontserratSemiBold' },
  700: { normal: 'MontserratBold' },
  800: { normal: 'MontserratBold' },
  900: { normal: 'MontserratBold' },
};

// Radios y espaciado compartidos con web: `RADIUS` / `SPACING` de `@omni/shared/theme`, como números
// (`borderRadius={RADIUS.lg}`, `padding={SPACING.md}`). No se registran como tokens de Tamagui: sus
// componentes (Input, Select, Popover, ListItem) recorren `space`/`radius` ordenados por valor con
// `getSpace(token, { shift })`, y meter valores nuevos en la escala les cambia el padding.

export const tamaguiConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    body: { ...config.fonts.body, family: 'Montserrat', face: montserratFace },
    heading: { ...config.fonts.heading, family: 'Montserrat', face: montserratFace },
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
