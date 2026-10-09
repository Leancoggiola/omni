import { RADIUS } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

import type { InlineAlign } from '../types';

export type BadgeColor = 'brand' | 'accent' | 'success' | 'destructive' | 'dimmed';
type BadgeVariant = 'filled' | 'light' | 'outline';
type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  children: string;
  /** `accent` es el terracota del tipo de media; `dimmed`, el gris de "Próximamente". */
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  alignSelf?: InlineAlign;
};

/**
 * Fondo lleno, texto encima, wash, borde y texto sobre el wash de cada color. El texto de cada
 * relleno sale de `onFill` (`onPrimary`, `onSuccess`, `onDimmed`…): oscuro sobre los fondos claros de dark.
 * Terracota usa el tono y el texto del Badge filled de web (`$accentFill`/`$onAccentFill`); rojo, blanco.
 */
const BADGE_TOKENS = {
  brand: {
    fill: '$primary',
    onFill: '$onPrimary',
    surface: '$primarySurface',
    border: '$primaryBorder',
    text: '$primary',
  },
  accent: {
    fill: '$accentFill',
    onFill: '$onAccentFill',
    surface: '$accentSurface',
    border: '$accentBorder',
    text: '$accent',
  },
  success: {
    fill: '$success',
    onFill: '$onSuccess',
    surface: '$successSurface',
    border: '$successBorder',
    text: '$success',
  },
  destructive: {
    fill: '$destructiveFill',
    onFill: '$onDestructive',
    surface: '$errorSurface',
    border: '$destructiveBorder',
    text: '$destructive',
  },
  dimmed: {
    fill: '$dimmed',
    onFill: '$onDimmed',
    surface: '$dimmedSurface',
    border: '$dimmedBorder',
    text: '$dimmed',
  },
} as const satisfies Record<BadgeColor, Record<'fill' | 'onFill' | 'surface' | 'border' | 'text', string>>;

/** Alto y fuente de `Badge` de Mantine (`--badge-height-*`, `--badge-fz-*`). */
const SIZES = {
  sm: { height: 18, fontSize: 10, paddingX: 8 },
  md: { height: 22, fontSize: 11, paddingX: 10 },
} as const;

/** Equivalente de `Badge` de Mantine: pill en mayúsculas, 700. */
export function Badge({
  children,
  color = 'brand',
  variant = 'light',
  size = 'sm',
  alignSelf = 'flex-start',
}: BadgeProps) {
  const t = BADGE_TOKENS[color];
  const metrics = SIZES[size];
  const background = variant === 'filled' ? t.fill : variant === 'light' ? t.surface : 'transparent';
  const border = variant === 'outline' ? t.border : 'transparent';
  const text = variant === 'filled' ? t.onFill : t.text;

  return (
    <XStack
      alignSelf={alignSelf}
      height={metrics.height}
      paddingHorizontal={metrics.paddingX}
      alignItems="center"
      borderRadius={RADIUS.full}
      borderWidth={1}
      borderColor={border}
      backgroundColor={background}
    >
      <Paragraph
        color={text}
        fontSize={metrics.fontSize}
        lineHeight={metrics.fontSize * 1.2}
        fontWeight="700"
        letterSpacing={0.25}
        textTransform="uppercase"
        numberOfLines={1}
      >
        {children}
      </Paragraph>
    </XStack>
  );
}
