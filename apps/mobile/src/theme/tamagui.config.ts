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
    warningSurface: s.warningSurface,
    infoSurface: s.infoSurface,
    errorSurface: s.errorSurface,
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
 * `@tamagui/config` trae themes propios para Input y TextArea con su propio `placeholderColor`
 * (`#545454` en oscuro, casi invisible sobre el canvas) que pisan el del theme base.
 */
function inputTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  return {
    ...base,
    background: s.card,
    color: s.text,
    borderColor: s.border,
    borderColorHover: s.dimmed,
    borderColorFocus: s.primary,
    placeholderColor: s.placeholder,
  };
}

/**
 * Familias de sub-themes por componente de `@tamagui/config` (`light_Button`, `dark_red_active_Switch`…).
 * Tamagui las busca antes que el theme base, así que sin pisarlas Button y Switch salen grises o rosas.
 */
const COMPONENT_THEMES = [
  'Button',
  'Switch',
  'SwitchThumb',
  'Checkbox',
  'RadioGroupItem',
  'SliderTrack',
  'SliderTrackActive',
  'SliderThumb',
  'Progress',
  'ProgressIndicator',
  'ListItem',
  'Card',
  'Tooltip',
  'TooltipContent',
  'TooltipArrow',
  'DrawerFrame',
  'SheetOverlay',
  'DialogOverlay',
  'ModalOverlay',
];

// Existen en runtime, pero el tipo de `config.themes` de @tamagui/config no los declara.
const allThemes: Partial<Record<string, Theme>> = config.themes;

/** Pista del Switch apagado (gris con contraste sobre la card) y su thumb blanco (en claro sale negro). */
function switchTheme(scheme: 'light' | 'dark', base: Theme, part: 'track' | 'thumb'): Theme {
  const s = SEMANTIC[scheme];
  const color = part === 'thumb' ? s.white : s.border;
  return {
    ...base,
    background: color,
    backgroundHover: color,
    backgroundPress: color,
    backgroundFocus: color,
    backgroundStrong: color,
    borderColor: s.border,
    borderColorHover: s.border,
    borderColorFocus: s.border,
    borderColorPress: s.border,
  };
}

/** Superficie con otro fondo que el canvas: Button neutro (botón sobre el fondo no se vería) y Card/ListItem. */
function onSurfaceTheme(scheme: 'light' | 'dark', base: Theme, background: string): Theme {
  return {
    ...surfaceTheme(scheme, base),
    background,
    backgroundHover: background,
    backgroundPress: SEMANTIC[scheme].border,
    backgroundFocus: background,
  };
}

/**
 * Reconstruye todas las variantes (`<scheme>_<color|alt|active>_<Componente>`) de cada familia:
 * `_red` → destructivo, `_active` → primario, el resto → superficie. Los overlays (scrim) no se tocan.
 */
function componentThemes(scheme: 'light' | 'dark'): Record<string, Theme> {
  const out: Record<string, Theme> = {};
  for (const [name, original] of Object.entries(allThemes)) {
    const parts = name.split('_');
    const component = parts[parts.length - 1];
    if (parts[0] !== scheme || !original || !COMPONENT_THEMES.includes(component)) continue;
    if (component.endsWith('Overlay')) continue;

    // Parte de `surfaceTheme` para que los hijos sigan viendo los tokens custom (`$primary`, `$dimmed`…).
    const base = surfaceTheme(scheme, original);
    const s = SEMANTIC[scheme];
    const active = parts.includes('active');
    const red = parts.includes('red');
    const filled = ['SliderTrackActive', 'SliderThumb', 'ProgressIndicator'].includes(component);
    if (component === 'SwitchThumb') out[name] = switchTheme(scheme, base, 'thumb');
    else if (component === 'Switch' && !active && !red) out[name] = switchTheme(scheme, base, 'track');
    else if (red) out[name] = destructiveTheme(scheme, base);
    else if (active || filled) out[name] = primaryTheme(scheme, base);
    else if (component === 'Button') out[name] = { ...onSurfaceTheme(scheme, base, s.card), borderColor: s.border };
    else if (component === 'Card' || component === 'ListItem') out[name] = onSurfaceTheme(scheme, base, s.card);
    else if (component === 'SliderTrack' || component === 'Progress')
      out[name] = onSurfaceTheme(scheme, base, s.border);
    else if (component.startsWith('Tooltip'))
      out[name] = { ...onSurfaceTheme(scheme, base, s.card), borderColor: s.border };
    else out[name] = base;
    // Checked, el Switch de Tamagui pinta la pista con `$backgroundActive` (sin `activeStyle`).
    if (component === 'Switch') out[name] = { ...out[name], backgroundActive: s.primary } as Theme;
  }
  return out;
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
  // En nativo el Input de Tamagui no le pasa ningún color de placeholder a RN (en web lo hace por CSS):
  // sin esto Android usa su gris por defecto, ilegible en oscuro.
  // Cursor y selección: sin esto Android usa su teal.
  defaultProps: {
    Input: { placeholderTextColor: '$placeholderColor', cursorColor: '$primary', selectionColor: '$primary' },
    TextArea: { placeholderTextColor: '$placeholderColor', cursorColor: '$primary', selectionColor: '$primary' },
  },
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
    light_Input: inputTheme('light', allThemes.light_Input ?? config.themes.light),
    dark_Input: inputTheme('dark', allThemes.dark_Input ?? config.themes.dark),
    light_TextArea: inputTheme('light', allThemes.light_TextArea ?? config.themes.light),
    dark_TextArea: inputTheme('dark', allThemes.dark_TextArea ?? config.themes.dark),
    ...componentThemes('light'),
    ...componentThemes('dark'),
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
