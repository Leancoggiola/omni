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
    primaryBorder: s.primaryBorder,
    destructiveBorder: s.destructiveBorder,
    warningBorder: s.warningBorder,
    infoBorder: s.infoBorder,
    accentFill: s.accentFill,
    onAccentFill: s.onAccentFill,
    disabledSurface: s.disabledSurface,
    disabledText: s.disabledText,
    hover: s.hover,
    primary: s.primary,
    onPrimary: s.onPrimary,
    onDestructive: s.onDestructive,
    dimmed: s.dimmed,
  } as Theme;
}

/**
 * Los themes de color (`active`, `red`, `alt*`) parten de `surfaceTheme` y pisan fondo y texto: así
 * los tokens propios (`$primarySurface`, `$disabledSurface`…) siguen resolviendo dentro de un subárbol
 * con `theme="active"` y una primitiva anidada no se queda sin color.
 */
function primaryTheme(scheme: 'light' | 'dark', base: Theme, tone: 'fill' | 'accent' = 'accent'): Theme {
  const s = SEMANTIC[scheme];
  // `fill` es el relleno del Button de marca (primaryShade de web: 7 en claro, 4 en oscuro); `accent` el
  // tono de texto/acento (Switch, Slider, Progress), que es más suave.
  const fill = tone === 'fill';
  const background = fill ? s.primaryFill : s.primary;
  const onPrimary = fill ? s.onPrimaryFill : s.onPrimary;
  const hover = fill ? (scheme === 'light' ? BRAND[8] : BRAND[5]) : scheme === 'light' ? BRAND[6] : BRAND[3];
  const press = fill ? (scheme === 'light' ? BRAND[9] : BRAND[6]) : scheme === 'light' ? BRAND[8] : BRAND[5];
  return {
    ...surfaceTheme(scheme, base),
    background,
    backgroundHover: hover,
    backgroundPress: press,
    backgroundFocus: background,
    backgroundStrong: background,
    color: onPrimary,
    colorHover: onPrimary,
    colorPress: onPrimary,
    colorFocus: onPrimary,
    borderColor: background,
    borderColorHover: background,
    borderColorFocus: background,
    borderColorPress: background,
    placeholderColor: onPrimary,
  };
}

function destructiveTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  const onDestructive = s.onDestructive;
  return {
    ...surfaceTheme(scheme, base),
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
    ...surfaceTheme(scheme, base),
    background: s.body,
    color: s.dimmed,
    colorHover: strength === 1 ? s.text : s.dimmed,
    placeholderColor: s.placeholder,
  };
}

/**
 * `@tamagui/config` trae themes propios para Input y TextArea con su propio `placeholderColor`
 * (`#545454` en oscuro, casi invisible sobre el canvas) que pisan el del theme base. Parte de
 * `surfaceTheme` para que dentro del Input resuelvan los tokens propios (`$destructive`, `$disabledSurface`).
 */
function inputTheme(scheme: 'light' | 'dark', base: Theme): Theme {
  const s = SEMANTIC[scheme];
  return {
    ...surfaceTheme(scheme, base),
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
export const COMPONENT_THEMES = [
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

const FILLED = ['SliderTrackActive', 'SliderThumb', 'ProgressIndicator'];

/** Sub-theme de un componente según su variante (`parts`: `['light', 'red', 'active', 'Button']`). */
function buildComponentTheme(scheme: 'light' | 'dark', component: string, parts: string[], base: Theme): Theme {
  const s = SEMANTIC[scheme];
  const active = parts.includes('active');
  const red = parts.includes('red');
  if (component === 'SwitchThumb') return switchTheme(scheme, base, 'thumb');
  if (component === 'Switch') {
    const theme = red
      ? destructiveTheme(scheme, base)
      : active
        ? primaryTheme(scheme, base)
        : switchTheme(scheme, base, 'track');
    // Checked, el Switch de Tamagui pinta la pista con `$backgroundActive` (sin `activeStyle`); la clave
    // existe en runtime pero el tipo `Theme` de @tamagui/config no la declara, de ahí el cast.
    return { ...theme, backgroundActive: s.primary } as Theme;
  }
  if (red) return destructiveTheme(scheme, base);
  if (active) return primaryTheme(scheme, base, component === 'Button' ? 'fill' : 'accent');
  if (FILLED.includes(component)) return primaryTheme(scheme, base);
  if (component === 'Button') return { ...onSurfaceTheme(scheme, base, s.card), borderColor: s.border };
  if (component === 'Card' || component === 'ListItem') return onSurfaceTheme(scheme, base, s.card);
  if (component === 'SliderTrack' || component === 'Progress') return onSurfaceTheme(scheme, base, s.border);
  if (component.startsWith('Tooltip')) return { ...onSurfaceTheme(scheme, base, s.card), borderColor: s.border };
  return base;
}

/**
 * Reconstruye todas las variantes (`<scheme>_<color|alt|active>_<Componente>`) de cada familia:
 * `_red` → destructivo, `_active` → primario, el resto → superficie. Los `*Overlay` (scrim) no están en la lista: Tamagui ya los resuelve con `rgba` neutro, válido en los dos esquemas.
 */
function componentThemes(scheme: 'light' | 'dark'): Record<string, Theme> {
  const out: Record<string, Theme> = {};
  for (const [name, original] of Object.entries(allThemes)) {
    const parts = name.split('_');
    const component = parts[parts.length - 1];
    if (parts[0] !== scheme || !original || !COMPONENT_THEMES.includes(component)) continue;

    out[name] = buildComponentTheme(scheme, component, parts, surfaceTheme(scheme, original));
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
    light_active: primaryTheme('light', config.themes.light_active, 'fill'),
    dark_active: primaryTheme('dark', config.themes.dark_active, 'fill'),
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
