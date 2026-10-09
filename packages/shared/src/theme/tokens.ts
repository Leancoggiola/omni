/** Omni brand scale (0 = lightest). Warmed toward terracotta (Direction B). */
export const BRAND = {
  0: '#FBF1E9',
  1: '#F2DAC7',
  2: '#E4BC9E',
  3: '#D29A76',
  4: '#BD7C57',
  5: '#9C5F42',
  6: '#7A4530', // base
  7: '#5C3222',
  8: '#452416',
  9: '#2F180E',
} as const;

// Neutral Colors
export const DARK = {
  0: '#DDDDDD',
  1: '#CACACA',
  2: '#8F8F8F',
  3: '#5E5E5E',
  4: '#3B3B3B',
  5: '#353535',
  6: '#292929', // base
  7: '#202020',
  8: '#1B1B1B',
  9: '#121212',
} as const;

export const GRAY = {
  0: '#F5F5F5', // 0
  1: '#E0E0E0', // 1
  2: '#CCCCCC', // 2
  3: '#B3B3B3', // 3
  4: '#939393', // 4
  5: '#707070', // 5
  6: '#606060', // 6
  7: '#4D4D4D', // 7
  8: '#232323', // 8 (base)
  9: '#161515', // 9
} as const;

/** App canvas — warm off-white / deep neutral, tuned to sit under the terracotta brand. */
export const CANVAS = {
  light: '#F4F0EB',
  dark: '#141313',
} as const;

/** Card / panel surface that sits on top of CANVAS (warm, never pure white or neutral gray). */
export const SURFACE = {
  light: '#FFFDFB',
  dark: '#211E1C',
} as const;

// Semantic Colors
export const BLUE = {
  0: '#E7F5FF',
  1: '#D0EBFF',
  2: '#A5D7FF',
  3: '#68ACE2',
  4: '#4599DE',
  5: '#2D8AD8',
  6: '#1878CB', // base
  7: '#1971C0',
  8: '#1665AE',
  9: '#155999',
} as const;

export const GREEN = {
  0: '#EEFFF1',
  1: '#BEE0C2',
  2: '#90C598',
  3: '#68AD72',
  4: '#489856',
  5: '#348641',
  6: '#277635',
  7: '#1F682C', // base
  8: '#1B5B27',
  9: '#185023',
} as const;

export const RED = {
  0: '#FFF5F5',
  1: '#FFE3E3',
  2: '#FFC9C9',
  3: '#E59797',
  4: '#E57979',
  5: '#E56060',
  6: '#E14949',
  7: '#D83737', // base
  8: '#C92C2C',
  9: '#B41E25',
} as const;

export const ORANGE = {
  0: '#FFF4E6',
  1: '#FFE8CC',
  2: '#FFD8A8',
  3: '#E5AC6C',
  4: '#E59845',
  5: '#E58326',
  6: '#E37111',
  7: '#DE5C06',
  8: '#D3450D', // base
  9: '#C3400D',
} as const;

// Extended Colors
export const INDIGO = {
  0: '#FAF2FF',
  1: '#F6EFFF',
  2: '#EDE0FF',
  3: '#E7D5FF',
  4: '#DAC1FF',
  5: '#CEACFF',
  6: '#A97DF4', // base
  7: '#976AEC',
  8: '#7F51E2',
  9: '#6B3BD9',
  10: '#5826D1',
} as const;

export const LIME = {
  0: '#F5FCDC',
  1: '#EBF8B8',
  2: '#E4F6A1',
  3: '#D6F171',
  4: '#CCEE4E',
  5: '#BBE813',
  6: '#9FD10F',
  7: '#89BF0C', // base
  8: '#71AB08',
  9: '#51830B',
  10: '#3B7F00',
} as const;

export const YELLOW = {
  0: '#FFFADE',
  1: '#FFF5BC',
  2: '#FFF2A6',
  3: '#FFEB7A',
  4: '#FFE658',
  5: '#FFDE21',
  6: '#FFC722',
  7: '#FFB122',
  8: '#FF9723', // base
  9: '#FF8123',
  10: '#FF6D24',
} as const;

export const PINK = {
  0: '#F9D9ED',
  1: '#F2B2DA',
  2: '#EE99CE',
  3: '#E566B6',
  4: '#DF40A3',
  5: '#D40085',
  6: '#BE017A', // base
  7: '#AC0171',
  8: '#970266',
  9: '#85025D',
  10: '#720353',
} as const;

/** Accent scale — vivid burnt-terracotta, distinct from the muted BRAND scale. */
export const TERRACOTTA = {
  0: '#FDF0EA',
  1: '#FADCC9',
  2: '#F4BC9C',
  3: '#EC9A70',
  4: '#E2794C',
  5: '#D66435',
  6: '#C1440E', // base
  7: '#A83A0C',
  8: '#8A2F0A',
  9: '#6E2508',
  10: '#551D07',
} as const;

/** Muted sage — the success/completed hue, chosen to harmonize with TERRACOTTA. */
export const SAGE = {
  0: '#F0F4EE',
  1: '#DFE8DA',
  2: '#C3D3BB',
  3: '#A3BC98',
  4: '#87A67A',
  5: '#6C8F5F',
  6: '#57764B', // base
  7: '#46603C',
  8: '#374B2F',
  9: '#2A3A24',
  10: '#1F2B1B',
} as const;

/** Appends a 2-digit hex alpha channel to a palette swatch, e.g. withAlpha(RED[3], '4d') -> '#E597974d'. */
const withAlpha = (hex: string, alphaHex: string) => `${hex}${alphaHex}`;

/**
 * Semantic color tokens — Light mode
 */
export const semanticLight = {
  // Text
  '--mantine-color-text-title': GRAY[9],
  '--mantine-color-text-default': GRAY[8],
  '--mantine-color-text-dimmed': GRAY[5],
  '--mantine-color-text-dimmed-hover': GRAY[6],
  '--mantine-color-text-dimmed-disabled': '#7676764d',
  '--mantine-color-text-placeholder': GRAY[4],
  '--mantine-color-text-disabled': GRAY[3],
  '--mantine-color-text-link-default': BRAND[7],
  '--mantine-color-text-link-hover': BRAND[5],
  '--mantine-color-text-link-visited': '#6F4BDF',
  '--mantine-color-text-primary': BRAND[5],
  '--mantine-color-text-primary-hover': BRAND[8],
  '--mantine-color-text-primary-disabled': withAlpha(BRAND[7], '4d'),
  '--mantine-color-text-error': RED[7],
  '--mantine-color-text-warning': ORANGE[8],
  '--mantine-color-text-success': SAGE[6],
  '--mantine-color-text-info': BLUE[6],
  '--mantine-color-text-accent': TERRACOTTA[7],
  '--mantine-color-text-destructive': RED[7],
  '--mantine-color-text-destructive-hover': RED[8],
  '--mantine-color-text-destructive-disabled': withAlpha(RED[7], '4d'),
  '--mantine-color-text-white': '#ffffff',
  '--mantine-color-text-black': '#000000',

  // Surfaces
  '--mantine-color-surfaces-primary': BRAND[5],
  '--mantine-color-surfaces-primary-hover': BRAND[8],
  '--mantine-color-surfaces-primary-disabled': withAlpha(BRAND[7], '4d'),
  '--mantine-color-surfaces-primary-subtle': BRAND[0],
  '--mantine-color-surfaces-primary-light': BRAND[1],
  '--mantine-color-surfaces-destructive': RED[7],
  '--mantine-color-surfaces-destructive-hover': RED[8],
  '--mantine-color-surfaces-destructive-disabled': withAlpha(RED[7], '4d'),
  '--mantine-color-surfaces-destructive-subtle': RED[0],
  '--mantine-color-surfaces-destructive-light': RED[1],
  '--mantine-color-surfaces-dimmed': GRAY[5],
  '--mantine-color-surfaces-dimmed-subtle': GRAY[0],
  '--mantine-color-surfaces-dimmed-light': GRAY[4],
  '--mantine-color-surfaces-dimmed-hover': GRAY[6],
  '--mantine-color-surfaces-dimmed-disabled': '#7676764d',
  '--mantine-color-surfaces-disabled': GRAY[1],
  '--mantine-color-surfaces-white': '#ffffff',
  '--mantine-color-surfaces-card': SURFACE.light,
  '--mantine-color-surfaces-device-bg': CANVAS.light,
  '--mantine-color-surfaces-overlay': '#000000b0',
  '--mantine-color-surfaces-hover': BRAND[0],
  '--mantine-color-surfaces-hover-destructive': RED[0],
  '--mantine-color-surfaces-accent-light': TERRACOTTA[0],
  '--mantine-color-surfaces-accent-high': TERRACOTTA[6],
  '--mantine-color-surfaces-info-light': BLUE[0],
  '--mantine-color-surfaces-warning-light': ORANGE[0],
  '--mantine-color-surfaces-success-light': SAGE[0],
  '--mantine-color-surfaces-error-light': RED[1],
  '--mantine-color-surfaces-success-high': SAGE[6],
  '--mantine-color-surfaces-error-high': RED[7],
  '--mantine-color-surfaces-info-high': BLUE[6],
  '--mantine-color-surfaces-warning-high': ORANGE[6],

  // Border
  '--mantine-color-border-primary': BRAND[5],
  '--mantine-color-border-primary-hover': BRAND[8],
  '--mantine-color-border-primary-disabled': withAlpha(BRAND[7], '4d'),
  '--mantine-color-border-destructive': RED[7],
  '--mantine-color-border-destructive-hover': RED[8],
  '--mantine-color-border-destructive-disabled': withAlpha(RED[7], '4d'),
  '--mantine-color-border-dimmed': GRAY[5],
  '--mantine-color-border-dimmed-light': GRAY[4],
  '--mantine-color-border-dimmed-hover': GRAY[6],
  '--mantine-color-border-dimmed-disabled': '#7676764d',
  '--mantine-color-border-disabled': GRAY[3],
  '--mantine-color-border-error': RED[7],
  '--mantine-color-border-warning': ORANGE[8],
  '--mantine-color-border-success': SAGE[4],
  '--mantine-color-border-info': BLUE[6],
  '--mantine-color-border-accent': TERRACOTTA[3],
  '--mantine-color-border-onlyread': GRAY[4],
  '--mantine-color-border-focus-tab': '#000000',
  '--mantine-color-border-white': '#ffffff',

  // Icons
  '--mantine-color-icons-primary': BRAND[5],
  '--mantine-color-icons-primary-hover': BRAND[8],
  '--mantine-color-icons-primary-disabled': withAlpha(BRAND[7], '4d'),
  '--mantine-color-icons-destructive': RED[7],
  '--mantine-color-icons-destructive-hover': RED[8],
  '--mantine-color-icons-destructive-disabled': withAlpha(RED[7], '4d'),
  '--mantine-color-icons-dimmed': GRAY[5],
  '--mantine-color-icons-dimmed-light': GRAY[4],
  '--mantine-color-icons-dimmed-hover': GRAY[6],
  '--mantine-color-icons-dimmed-disabled': '#7676764d',
  '--mantine-color-icons-disabled': GRAY[3],
  '--mantine-color-icons-success': SAGE[6],
  '--mantine-color-icons-warning': ORANGE[8],
  '--mantine-color-icons-info': BLUE[6],
  '--mantine-color-icons-error': RED[7],
  '--mantine-color-icons-accent': TERRACOTTA[6],
  '--mantine-color-icons-white': '#ffffff',
  '--mantine-color-icons-black': '#000000',
} as const;

/**
 * Semantic color tokens — Dark mode
 */
export const semanticDark = {
  // Text
  '--mantine-color-text-title': DARK[0],
  '--mantine-color-text-default': '#ffffff',
  '--mantine-color-text-dimmed': GRAY[2],
  '--mantine-color-text-dimmed-hover': '#ffffff',
  '--mantine-color-text-dimmed-disabled': '#ffffff4d',
  '--mantine-color-text-placeholder': DARK[3],
  '--mantine-color-text-disabled': DARK[3],
  '--mantine-color-text-primary': BRAND[3],
  '--mantine-color-text-primary-hover': BRAND[2],
  '--mantine-color-text-primary-disabled': withAlpha(BRAND[3], '4d'),
  '--mantine-color-text-error': RED[4],
  '--mantine-color-text-warning': ORANGE[2],
  '--mantine-color-text-success': SAGE[3],
  '--mantine-color-text-info': BLUE[1],
  '--mantine-color-text-accent': TERRACOTTA[3],
  '--mantine-color-text-destructive': RED[4],
  '--mantine-color-text-destructive-hover': RED[3],
  '--mantine-color-text-destructive-disabled': withAlpha(RED[3], '4d'),
  '--mantine-color-text-white': '#ffffff',
  '--mantine-color-text-black': '#000000',

  '--mantine-color-text-link-default': BRAND[3],

  // Surfaces
  '--mantine-color-surfaces-primary': BRAND[3],
  '--mantine-color-surfaces-primary-hover': BRAND[2],
  '--mantine-color-surfaces-primary-disabled': withAlpha(BRAND[3], '4d'),
  '--mantine-color-surfaces-primary-subtle': BRAND[7],
  '--mantine-color-surfaces-primary-light': withAlpha(BRAND[3], '29'),
  '--mantine-color-surfaces-destructive': RED[3],
  '--mantine-color-surfaces-destructive-hover': RED[4],
  '--mantine-color-surfaces-destructive-disabled': withAlpha(RED[3], '4d'),
  '--mantine-color-surfaces-destructive-subtle': RED[8],
  '--mantine-color-surfaces-destructive-light': withAlpha(RED[8], '60'),
  '--mantine-color-surfaces-dimmed': GRAY[3],
  '--mantine-color-surfaces-dimmed-subtle': DARK[6],
  '--mantine-color-surfaces-dimmed-light': GRAY[3],
  '--mantine-color-surfaces-dimmed-hover': DARK[4],
  '--mantine-color-surfaces-dimmed-disabled': '#ffffff1a',
  '--mantine-color-surfaces-disabled': DARK[6],
  '--mantine-color-surfaces-white': '#ffffff',
  '--mantine-color-surfaces-card': SURFACE.dark,
  '--mantine-color-surfaces-device-bg': CANVAS.dark,
  '--mantine-color-surfaces-device-bg-onboarding': CANVAS.dark,
  '--mantine-color-surfaces-overlay': '#000000b0',
  '--mantine-color-surfaces-hover': DARK[5],
  '--mantine-color-surfaces-hover-destructive': withAlpha(RED[7], '29'),
  '--mantine-color-surfaces-accent-light': withAlpha(TERRACOTTA[6], '33'),
  '--mantine-color-surfaces-accent-high': TERRACOTTA[5],
  '--mantine-color-surfaces-info-light': withAlpha(BLUE[6], '33'),
  '--mantine-color-surfaces-warning-light': withAlpha(ORANGE[6], '33'),
  '--mantine-color-surfaces-success-light': withAlpha(SAGE[6], '40'),
  '--mantine-color-surfaces-error-light': withAlpha(RED[7], '33'),
  '--mantine-color-surfaces-success-high': SAGE[5],
  '--mantine-color-surfaces-error-high': RED[3],
  '--mantine-color-surfaces-info-high': BLUE[3],
  '--mantine-color-surfaces-warning-high': ORANGE[6],

  // Border
  '--mantine-color-border-primary': BRAND[3],
  '--mantine-color-border-primary-hover': BRAND[2],
  '--mantine-color-border-primary-disabled': withAlpha(BRAND[3], '4d'),
  '--mantine-color-border-destructive': RED[4],
  '--mantine-color-border-destructive-hover': RED[3],
  '--mantine-color-border-destructive-disabled': withAlpha(RED[3], '4d'),
  '--mantine-color-border-dimmed': GRAY[7],
  '--mantine-color-border-dimmed-light': GRAY[3],
  '--mantine-color-border-dimmed-hover': GRAY[5],
  '--mantine-color-border-dimmed-disabled': '#ffffff1a',
  '--mantine-color-border-disabled': GRAY[7],
  '--mantine-color-border-error': RED[4],
  '--mantine-color-border-warning': ORANGE[3],
  '--mantine-color-border-success': SAGE[5],
  '--mantine-color-border-info': BLUE[3],
  '--mantine-color-border-accent': TERRACOTTA[5],
  '--mantine-color-border-onlyread': GRAY[3],
  '--mantine-color-border-focus-tab': GRAY[3],
  '--mantine-color-border-white': GRAY[3],

  // Icons
  '--mantine-color-icons-primary': BRAND[3],
  '--mantine-color-icons-primary-hover': BRAND[2],
  '--mantine-color-icons-primary-disabled': withAlpha(BRAND[3], '4d'),
  '--mantine-color-icons-destructive': RED[4],
  '--mantine-color-icons-destructive-hover': RED[3],
  '--mantine-color-icons-destructive-disabled': withAlpha(RED[3], '4d'),
  '--mantine-color-icons-dimmed': GRAY[4],
  '--mantine-color-icons-dimmed-light': GRAY[3],
  '--mantine-color-icons-dimmed-hover': GRAY[3],
  '--mantine-color-icons-dimmed-disabled': withAlpha(GRAY[4], '4d'),
  '--mantine-color-icons-disabled': GRAY[6],
  '--mantine-color-icons-success': SAGE[3],
  '--mantine-color-icons-warning': ORANGE[3],
  '--mantine-color-icons-info': BLUE[3],
  '--mantine-color-icons-error': RED[3],
  '--mantine-color-icons-accent': TERRACOTTA[3],
  '--mantine-color-icons-white': '#ffffff',
  '--mantine-color-icons-black': '#000000',
};

/**
 * Compact semantic map for mobile (Tamagui) and legacy consumers.
 * Derived from `semanticLight` / `semanticDark`.
 * `secondary` es el alias histórico de fondo secundario (en dark apunta a `surfaces-disabled`);
 * para el estado neutro "por ver" usar `dimmedSurface` + `dimmedBorder`, igual que web.
 */
export const SEMANTIC = {
  light: {
    body: semanticLight['--mantine-color-surfaces-device-bg'],
    text: semanticLight['--mantine-color-text-default'],
    card: semanticLight['--mantine-color-surfaces-card'],
    secondary: semanticLight['--mantine-color-surfaces-dimmed-subtle'],
    border: semanticLight['--mantine-color-border-dimmed-light'],
    destructive: semanticLight['--mantine-color-text-destructive'],
    success: semanticLight['--mantine-color-text-success'],
    warning: semanticLight['--mantine-color-text-warning'],
    info: semanticLight['--mantine-color-text-info'],
    accent: semanticLight['--mantine-color-text-accent'],
    accentSurface: semanticLight['--mantine-color-surfaces-accent-light'],
    accentBorder: semanticLight['--mantine-color-border-accent'],
    successSurface: semanticLight['--mantine-color-surfaces-success-light'],
    successBorder: semanticLight['--mantine-color-border-success'],
    warningSurface: semanticLight['--mantine-color-surfaces-warning-light'],
    infoSurface: semanticLight['--mantine-color-surfaces-info-light'],
    errorSurface: semanticLight['--mantine-color-surfaces-error-light'],
    successIcon: semanticLight['--mantine-color-icons-success'],
    warningIcon: semanticLight['--mantine-color-icons-warning'],
    infoIcon: semanticLight['--mantine-color-icons-info'],
    errorIcon: semanticLight['--mantine-color-icons-error'],
    dimmedSurface: semanticLight['--mantine-color-surfaces-dimmed-subtle'],
    dimmedBorder: semanticLight['--mantine-color-border-dimmed'],
    primarySurface: semanticLight['--mantine-color-surfaces-primary-light'],
    primaryBorder: semanticLight['--mantine-color-border-primary'],
    destructiveBorder: semanticLight['--mantine-color-border-destructive'],
    warningBorder: semanticLight['--mantine-color-border-warning'],
    infoBorder: semanticLight['--mantine-color-border-info'],
    // Badge filled terracota: el tono `filled` de Mantine (primaryShade 7) y el texto que elige autoContrast.
    accentFill: TERRACOTTA[7],
    onAccentFill: semanticLight['--mantine-color-text-white'],
    disabledSurface: semanticLight['--mantine-color-surfaces-disabled'],
    disabledText: semanticLight['--mantine-color-text-disabled'],
    hover: semanticLight['--mantine-color-surfaces-hover'],
    onPrimary: semanticLight['--mantine-color-text-white'],
    onDestructive: semanticLight['--mantine-color-text-white'],
    dimmed: semanticLight['--mantine-color-text-dimmed'],
    placeholder: semanticLight['--mantine-color-text-placeholder'],
    anchor: semanticLight['--mantine-color-text-link-default'],
    primary: semanticLight['--mantine-color-text-primary'],
    black: semanticLight['--mantine-color-text-black'],
    white: semanticLight['--mantine-color-text-white'],
  },
  dark: {
    body: semanticDark['--mantine-color-surfaces-device-bg'],
    text: semanticDark['--mantine-color-text-default'],
    card: semanticDark['--mantine-color-surfaces-card'],
    secondary: semanticDark['--mantine-color-surfaces-disabled'],
    border: semanticDark['--mantine-color-border-dimmed'],
    destructive: semanticDark['--mantine-color-text-destructive'],
    success: semanticDark['--mantine-color-text-success'],
    warning: semanticDark['--mantine-color-text-warning'],
    info: semanticDark['--mantine-color-text-info'],
    accent: semanticDark['--mantine-color-text-accent'],
    accentSurface: semanticDark['--mantine-color-surfaces-accent-light'],
    accentBorder: semanticDark['--mantine-color-border-accent'],
    successSurface: semanticDark['--mantine-color-surfaces-success-light'],
    successBorder: semanticDark['--mantine-color-border-success'],
    warningSurface: semanticDark['--mantine-color-surfaces-warning-light'],
    infoSurface: semanticDark['--mantine-color-surfaces-info-light'],
    errorSurface: semanticDark['--mantine-color-surfaces-error-light'],
    successIcon: semanticDark['--mantine-color-icons-success'],
    warningIcon: semanticDark['--mantine-color-icons-warning'],
    infoIcon: semanticDark['--mantine-color-icons-info'],
    errorIcon: semanticDark['--mantine-color-icons-error'],
    dimmedSurface: semanticDark['--mantine-color-surfaces-dimmed-subtle'],
    dimmedBorder: semanticDark['--mantine-color-border-dimmed'],
    primarySurface: semanticDark['--mantine-color-surfaces-primary-light'],
    primaryBorder: semanticDark['--mantine-color-border-primary'],
    destructiveBorder: semanticDark['--mantine-color-border-destructive'],
    warningBorder: semanticDark['--mantine-color-border-warning'],
    infoBorder: semanticDark['--mantine-color-border-info'],
    // primaryShade 4 en dark: claro (luminancia > 0,3), así que autoContrast pone texto oscuro.
    accentFill: TERRACOTTA[4],
    onAccentFill: semanticDark['--mantine-color-surfaces-device-bg'],
    disabledSurface: semanticDark['--mantine-color-surfaces-disabled'],
    disabledText: semanticDark['--mantine-color-text-disabled'],
    hover: semanticDark['--mantine-color-surfaces-hover'],
    // El primario de dark es claro (BRAND[3]): el texto encima va con el fondo de página, no blanco.
    onPrimary: semanticDark['--mantine-color-surfaces-device-bg'],
    onDestructive: semanticDark['--mantine-color-text-white'],
    dimmed: semanticDark['--mantine-color-text-dimmed'],
    placeholder: semanticDark['--mantine-color-text-placeholder'],
    anchor: semanticDark['--mantine-color-text-link-default'],
    primary: semanticDark['--mantine-color-text-primary'],
    black: semanticDark['--mantine-color-text-black'],
    white: semanticDark['--mantine-color-text-white'],
  },
} as const;

/**
 * Gradient stops shared by web (Mantine `MantineGradient`) and mobile (expo-linear-gradient).
 * `deg` follows the CSS convention: 0 points up, 90 to the right.
 */
export const GRADIENT_STOPS = {
  brand: { from: BRAND[5], to: BRAND[7], deg: 90 },
  terracotta: { from: TERRACOTTA[4], to: TERRACOTTA[7], deg: 90 },
  cardLight: { from: BRAND[0], to: BRAND[2], deg: 215 },
  cardDark: { from: BRAND[4], to: BRAND[5], deg: 215 },
} as const;

/**
 * Escalas de layout en px, compartidas por los dos clientes. Web las pasa a rem (`px / 16`) para
 * Mantine; mobile las usa como números (`borderRadius={RADIUS.lg}`), sin registrarlas en Tamagui.
 */
export const RADIUS = {
  none: 0,
  xs: 2,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/** Escala tipográfica en px (fuente Montserrat en los dos clientes). Web la pasa a rem. */
export const FONT_SIZE = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18 } as const;

export const LINE_HEIGHT = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22 } as const;

/** Títulos (`Title order={n}` en web, `Title order={n}` de `@/shared/ui` en mobile); peso 700. */
export const HEADING = {
  h1: { fontSize: 28, lineHeight: 33 },
  h2: { fontSize: 22, lineHeight: 30 },
  h3: { fontSize: 18, lineHeight: 22 },
  h4: { fontSize: 16, lineHeight: 18 },
  h5: { fontSize: 14, lineHeight: 16 },
  h6: { fontSize: 12, lineHeight: 14 },
} as const;

export const SPACING = {
  none: 0,
  '3xs': 2,
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

/**
 * Elevación para nativo (`shadow*` en iOS, `elevation` en Android). Replica la capa principal de
 * los `SHADOWS` CSS de web (`apps/web/src/theme/tokens.ts`): si cambia uno, revisar el otro.
 */
export const SHADOW = {
  xs: { color: '#000000', offsetY: 1, radius: 2, opacity: 0.05, elevation: 1 },
  sm: { color: '#000000', offsetY: 1, radius: 3, opacity: 0.1, elevation: 2 },
  md: { color: '#000000', offsetY: 4, radius: 6, opacity: 0.1, elevation: 4 },
  lg: { color: '#000000', offsetY: 10, radius: 15, opacity: 0.1, elevation: 8 },
  brand: { color: '#96786F', offsetY: 10, radius: 15, opacity: 0.2, elevation: 8 },
} as const;

export type BrandShade = keyof typeof BRAND;
export type ColorScheme = keyof typeof SEMANTIC;
