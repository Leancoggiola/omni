import { FONT_SIZE } from '@omni/shared/theme';

import type { useSemanticColors } from '@/core/theme';

export type ButtonVariant = 'filled' | 'outline' | 'light' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';
/** `dimmed` es el `color="gray"` de Mantine: solo lo usa `IconButton` (cerrar, mostrar contraseña). */
export type ButtonColor = 'brand' | 'destructive' | 'dimmed';

type SemanticColors = ReturnType<typeof useSemanticColors>;

/** Alto, fuente y padding de Mantine (`--button-height-*`, `--button-padding-x-*`), con el md en 44 dp de toque. */
export const BUTTON_SIZES = {
  sm: { height: 36, fontSize: FONT_SIZE.sm, paddingX: 18, icon: 16 },
  md: { height: 44, fontSize: FONT_SIZE.md, paddingX: 22, icon: 18 },
  lg: { height: 50, fontSize: FONT_SIZE.lg, paddingX: 26, icon: 20 },
} as const satisfies Record<ButtonSize, { height: number; fontSize: number; paddingX: number; icon: number }>;

/** Área de toque mínima recomendada: el `sm` (36 dp) completa el resto con `hitSlop`. */
const MIN_TOUCH_SIZE = 44;

/** `hitSlop` que lleva un control de `height` dp hasta el área de toque mínima (undefined si ya llega). */
export function touchHitSlop(height: number) {
  const slop = Math.max(0, (MIN_TOUCH_SIZE - height) / 2);
  return slop ? { top: slop, bottom: slop, left: slop, right: slop } : undefined;
}

export type ButtonPalette = {
  /** Theme de Tamagui (solo filled): `active`/`red` traen el fondo, el texto y el estado presionado de #75. */
  theme?: 'active' | 'red';
  background: string;
  backgroundPress: string;
  borderColor: string;
  /** Token del texto (y del Spinner de `loading`). */
  color: string;
  /** Color crudo para el ícono de Phosphor, que no resuelve tokens `$`. */
  icon: string;
  pressOpacity: number;
};

const ACCENT = {
  brand: { token: '$primary', surface: '$primarySurface', raw: (s: SemanticColors) => s.primary },
  destructive: { token: '$destructive', surface: '$errorSurface', raw: (s: SemanticColors) => s.destructive },
  dimmed: { token: '$dimmed', surface: '$dimmedSurface', raw: (s: SemanticColors) => s.dimmed },
} as const;

/**
 * Colores por variante, como el `variantColorResolver` de Mantine. Deshabilitado ignora la variante
 * (`--mantine-color-disabled`), igual que en web.
 */
export function buttonPalette(
  variant: ButtonVariant,
  color: ButtonColor,
  disabled: boolean,
  colors: SemanticColors
): ButtonPalette {
  if (disabled) {
    return {
      background: '$disabledSurface',
      backgroundPress: '$disabledSurface',
      borderColor: 'transparent',
      color: '$disabledText',
      icon: colors.disabledText,
      pressOpacity: 1,
    };
  }

  const accent = ACCENT[color];
  switch (variant) {
    case 'filled':
      if (color === 'dimmed') {
        return {
          background: '$dimmed',
          backgroundPress: '$dimmed',
          borderColor: 'transparent',
          color: '$onDimmed',
          icon: colors.onDimmed,
          pressOpacity: 0.85,
        };
      }
      return {
        theme: color === 'destructive' ? 'red' : 'active',
        background: '$background',
        backgroundPress: '$backgroundPress',
        borderColor: 'transparent',
        color: '$color',
        icon: color === 'destructive' ? colors.onDestructive : colors.onPrimaryFill,
        pressOpacity: color === 'destructive' ? 0.85 : 1,
      };
    case 'outline':
      return {
        background: 'transparent',
        backgroundPress: accent.surface,
        borderColor: accent.token,
        color: accent.token,
        icon: accent.raw(colors),
        pressOpacity: 1,
      };
    case 'light':
      return {
        background: accent.surface,
        backgroundPress: accent.surface,
        borderColor: 'transparent',
        color: accent.token,
        icon: accent.raw(colors),
        pressOpacity: 0.75,
      };
    case 'subtle':
      return {
        background: 'transparent',
        backgroundPress: accent.surface,
        borderColor: 'transparent',
        color: accent.token,
        icon: accent.raw(colors),
        pressOpacity: 1,
      };
  }
}
