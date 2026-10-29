import { RADIUS } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

import type { InlineAlign } from '../types';

export type BadgeColor = 'accent' | 'dimmed';
type BadgeVariant = 'filled' | 'light';
type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  children: string;
  /** `accent` es el terracota del tipo de media; `dimmed`, el gris de "Próximamente". */
  color: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
  alignSelf?: InlineAlign;
};

/**
 * Fondo lleno, texto encima, wash y texto sobre el wash de cada color. El texto de cada
 * relleno sale de `onFill` (`onAccentFill`, `onDimmed`): oscuro sobre los fondos claros de dark.
 * Terracota usa el tono y el texto del Badge filled de web (`$accentFill`/`$onAccentFill`).
 */
const BADGE_TOKENS = {
  accent: {
    fill: '$accentFill',
    onFill: '$onAccentFill',
    surface: '$accentSurface',
    text: '$accent',
  },
  dimmed: {
    fill: '$dimmed',
    onFill: '$onDimmed',
    surface: '$disabledSurface',
    text: '$dimmed',
  },
} as const satisfies Record<BadgeColor, Record<'fill' | 'onFill' | 'surface' | 'text', string>>;

/** Alto y fuente de `Badge` de Mantine (`--badge-height-*`, `--badge-fz-*`). */
const SIZES = {
  sm: { height: 18, fontSize: 10, paddingX: 9 },
  md: { height: 22, fontSize: 11, paddingX: 11 },
} as const;

/** Equivalente de `Badge` de Mantine: pill en mayúsculas, 700. */
export function Badge({ children, color, variant = 'light', size = 'sm', alignSelf = 'flex-start' }: BadgeProps) {
  const t = BADGE_TOKENS[color];
  const metrics = SIZES[size];
  const background = variant === 'filled' ? t.fill : t.surface;
  const text = variant === 'filled' ? t.onFill : t.text;

  return (
    <XStack
      alignSelf={alignSelf}
      height={metrics.height}
      paddingHorizontal={metrics.paddingX}
      alignItems="center"
      borderRadius={RADIUS.full}
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
