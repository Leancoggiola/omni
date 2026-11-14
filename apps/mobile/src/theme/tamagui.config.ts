import { animations } from '@tamagui/config/animations-rn';
import { defaultConfig as config, type V5Theme } from '@tamagui/config/v5';
import { BRAND, DISPLAY_FONT, SEMANTIC } from '@omni/shared/theme';
import { createTamagui } from 'tamagui';

type Theme = V5Theme;

/** `backgroundHover` desde `background-hover`: la grafía camelCase de una clave con guiones. */
function camelCase(kebab: string) {
  return kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Los themes v5 de `@tamagui/config` traen cada clave compuesta en dos grafías (`backgroundHover` y
 * `background-hover`) y los componentes de Tamagui 3 leen la segunda. Devuelve los pares `[camel, kebab]` de `theme`:
 * toda clave con guion que tenga su grafía camelCase, así que una clave nueva de v5 no queda fuera. Quien pisa una de
 * las dos tiene que pisar también la otra, o el componente sigue con el gris de la base.
 */
export function kebabKeyPairs(theme: object): (readonly [camel: string, kebab: string])[] {
  return Object.keys(theme)
    .filter(key => key.includes('-') && camelCase(key) !== key && camelCase(key) in theme)
    .map(kebab => [camelCase(kebab), kebab] as const);
}

const KEBAB_KEYS = kebabKeyPairs(config.themes.light);

/** Copia cada clave compuesta del theme base (`kebabKeyPairs`) a su grafía con guiones. */
function withKebabKeys<T extends object>(theme: T): T {
  const out: Record<string, unknown> = { ...(theme as Record<string, unknown>) };
  for (const [camel, kebab] of KEBAB_KEYS) {
    if (camel in out) out[kebab] = out[camel];
  }
  return out as T;
}

/**
 * Claves propias del theme base: los colores de `SEMANTIC` y los pisados de los tokens de Tamagui. `color-4` y
 * `color-5` son los dos tonos que lee la pista del Switch apagado de Tamagui 3: van en `borderSubtle`, gris con
 * contraste sobre la card.
 */
function surfaceValues(scheme: 'light' | 'dark') {
  const s = SEMANTIC[scheme];
  return {
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
    destructiveFill: s.destructiveFill,
    onAccentFill: s.onAccentFill,
    onSuccess: s.onSuccess,
    onDimmed: s.onDimmed,
    disabledSurface: s.disabledSurface,
    disabledText: s.disabledText,
    hover: s.hover,
    primary: s.primary,
    onPrimary: s.onPrimary,
    onDestructive: s.onDestructive,
    dimmed: s.dimmed,
    surfaceGlass: s.surfaceGlass,
    glassBorder: s.glassBorder,
    glowPeach: s.glowPeach,
    glowLilac: s.glowLilac,
    hairline: s.hairline,
    borderSubtle: s.borderSubtle,
    track: s.track,
    scrim: s.scrim,
    successFill: s.successFill,
    onSuccessFill: s.onSuccessFill,
    'color-4': s.borderSubtle,
    'color-5': s.borderSubtle,
  };
}

type AppTheme = Theme & Record<keyof ReturnType<typeof surfaceValues>, string>;

/**
 * Theme base de una escala: el de `@tamagui/config` más las claves propias de `surfaceValues`, que `AppTheme` suma al
 * tipo (sin ellas Tamagui rechaza `color="dimmed"`).
 */
function surfaceTheme(scheme: 'light' | 'dark', base: Theme): AppTheme {
  return withKebabKeys({ ...base, ...surfaceValues(scheme) });
}

/**
 * Los themes de color (`active`, `red`) parten de `surfaceTheme` y pisan fondo y texto: así
 * los tokens propios (`primarySurface`, `disabledSurface`…) siguen resolviendo dentro de un subárbol
 * con `theme="active"` y una primitiva anidada no se queda sin color. `fill` es el relleno del Button de marca
 * (primaryShade de web: 7 en claro, 4 en oscuro) y `accent` el tono de texto/acento (Switch, Slider, Progress),
 * más suave. Los tonos de interacción del relleno salen de SEMANTIC: con el texto encima siguen en AA.
 */
function primaryTheme(scheme: 'light' | 'dark', base: Theme, tone: 'fill' | 'accent' = 'accent'): AppTheme {
  const s = SEMANTIC[scheme];
  const fill = tone === 'fill';
  const background = fill ? s.primaryFill : s.primary;
  const onPrimary = fill ? s.onPrimaryFill : s.onPrimary;
  const hover = fill ? s.primaryFillHover : scheme === 'light' ? BRAND[6] : BRAND[3];
  const press = fill ? s.primaryFillPress : scheme === 'light' ? BRAND[8] : BRAND[5];
  return withKebabKeys({
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
  });
}

/**
 * El relleno es `destructiveFill` (RED[7], como web), no el `destructive` de texto: en oscuro es RED[4] y con
 * blanco daba 2,9:1.
 */
function destructiveTheme(scheme: 'light' | 'dark', base: Theme): AppTheme {
  const s = SEMANTIC[scheme];
  const fill = s.destructiveFill;
  const onDestructive = s.onDestructive;
  return withKebabKeys({
    ...surfaceTheme(scheme, base),
    background: fill,
    backgroundHover: fill,
    backgroundPress: fill,
    backgroundFocus: fill,
    backgroundStrong: fill,
    color: onDestructive,
    colorHover: onDestructive,
    colorPress: onDestructive,
    colorFocus: onDestructive,
    borderColor: fill,
    borderColorHover: fill,
    borderColorFocus: fill,
    borderColorPress: fill,
    placeholderColor: onDestructive,
  });
}

/**
 * El `Input` y el `TextArea` de Tamagui 3 se montan dentro de `<Theme name="Input">` / `<Theme name="TextArea">`, y los
 * themes v5 `light_Input`, `light_TextArea` traen su propio `placeholderColor` (casi invisible en oscuro) que
 * pisa el del theme base. Parte de `surfaceTheme` para que dentro del Input resuelvan los tokens propios
 * (`destructive`, `disabledSurface`).
 */
function inputTheme(scheme: 'light' | 'dark', base: Theme): AppTheme {
  const s = SEMANTIC[scheme];
  return withKebabKeys({
    ...surfaceTheme(scheme, base),
    background: s.card,
    color: s.text,
    borderColor: s.border,
    borderColorHover: s.dimmed,
    borderColorFocus: s.primary,
    placeholderColor: s.placeholder,
  });
}

const allThemes: Partial<Record<string, Theme>> = config.themes;

const montserratFace = {
  400: { normal: 'Montserrat' },
  500: { normal: 'MontserratMedium' },
  600: { normal: 'MontserratSemiBold' },
  700: { normal: 'MontserratBold' },
  800: { normal: 'MontserratBold' },
  900: { normal: 'MontserratBold' },
};

const bricolageFace = {
  400: { normal: 'BricolageGrotesqueBold' },
  500: { normal: 'BricolageGrotesqueBold' },
  600: { normal: 'BricolageGrotesqueBold' },
  700: { normal: 'BricolageGrotesqueBold' },
  800: { normal: 'BricolageGrotesqueExtraBold' },
  900: { normal: 'BricolageGrotesqueExtraBold' },
};

/** Pone el tamaño `4` de la fuente en 14 con interlineado 23, sin tocar el tipo que declara `@tamagui/config`. */
function withDefaultSize<F extends typeof config.fonts.body>(font: F): F {
  return { ...font, size: { ...font.size, 4: '14px' }, lineHeight: { ...font.lineHeight, 4: '23px' } };
}

/**
 * Arma la config de Tamagui. Radios y espaciado compartidos con web (`RADIUS` / `SPACING` de `@omni/shared/theme`) van
 * como números, no como tokens de Tamagui. Tamagui 3 no trae driver de animaciones en ningún config: se suma el de
 * React Native, el que usan los `transition` de los Sheet (`lazy`, `medium`). `onlyAllowShorthands` y
 * `allowedStyleValues` van apagados (v5 los trae encendidos): el código usa los nombres largos de RN
 * (`backgroundColor`, `paddingHorizontal`) y colores crudos de `SEMANTIC`. El `4` de la fuente `body` es el tamaño por
 * defecto de todo `Paragraph` (`size` en `true`): se deja en 14 con interlineado 23, como el `$true` de Tamagui 2, en
 * vez de los 17 de v5 en nativo. El Input no recibe `defaultProps` (Tamagui 3 los quitó): el color de placeholder, el
 * cursor y la selección los fija `TextField`.
 * Fuentes: Montserrat, igual que web; en nativo cada peso es una familia aparte (las carga `app/_layout.tsx`, ver
 * `theme/fonts.ts`) y sin `montserratFace` `fontWeight` no tiene efecto en Android. `display` es Bricolage Grotesque,
 * la familia de los títulos: solo están cargados el 700 y el 800 (ver `BRICOLAGE_FACES`) y los pesos menores caen en el
 * 700. `allThemes` es `config.themes` sin tipar: `light_Input` y compañía existen en runtime, pero el tipo de
 * `@tamagui/config` no los declara. El resultado se exporta también como `export default`: el compilador de
 * `@tamagui/metro-plugin` solo encuentra la config así (o como `config`) y, sin eso, la descarta, reintenta en cada
 * archivo y el bundle de Metro se cuelga.
 */
function buildTamaguiConfig() {
  return createTamagui({
    ...config,
    animations,
    settings: { ...config.settings, onlyAllowShorthands: false, allowedStyleValues: false },
    fonts: {
      ...config.fonts,
      body: { ...withDefaultSize(config.fonts.body), family: 'Montserrat', face: montserratFace },
      heading: { ...config.fonts.heading, family: 'Montserrat', face: montserratFace },
      display: { ...config.fonts.heading, family: DISPLAY_FONT, face: bricolageFace },
    },
    themes: {
      ...config.themes,
      light: surfaceTheme('light', config.themes.light),
      dark: surfaceTheme('dark', config.themes.dark),
      light_active: primaryTheme('light', config.themes.light_accent, 'fill'),
      dark_active: primaryTheme('dark', config.themes.dark_accent, 'fill'),
      light_red: destructiveTheme('light', config.themes.light_red),
      dark_red: destructiveTheme('dark', config.themes.dark_red),
      light_Input: inputTheme('light', allThemes.light_Input ?? config.themes.light),
      dark_Input: inputTheme('dark', allThemes.dark_Input ?? config.themes.dark),
      light_TextArea: inputTheme('light', allThemes.light_TextArea ?? config.themes.light),
      dark_TextArea: inputTheme('dark', allThemes.dark_TextArea ?? config.themes.dark),
    },
  });
}

export const tamaguiConfig = buildTamaguiConfig();

export default tamaguiConfig;

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
