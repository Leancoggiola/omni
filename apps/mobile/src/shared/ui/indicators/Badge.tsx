import { RADIUS } from '@omni/shared/theme';
import { Paragraph, XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

export type BadgeColor = 'brand' | 'accent' | 'success' | 'destructive' | 'dimmed';
type BadgeVariant = 'filled' | 'light' | 'outline';
type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  children: string;
  /** `accent` es el terracota del tipo de media; `dimmed`, el gris de "Próximamente". */
  color?: BadgeColor;
  variant?: BadgeVariant;
  size?: BadgeSize;
};

type SemanticColors = ReturnType<typeof useSemanticColors>;

/** Fondo lleno, texto encima, wash, borde y texto sobre el wash de cada color (`SEMANTIC`). */
function badgeColors(color: BadgeColor, s: SemanticColors) {
  switch (color) {
    case 'brand':
      return {
        fill: s.primary,
        onFill: s.onPrimary,
        surface: s.primarySurface,
        border: s.primaryBorder,
        text: s.primary,
      };
    case 'accent':
      return { fill: s.accentFill, onFill: s.white, surface: s.accentSurface, border: s.accentBorder, text: s.accent };
    case 'success':
      return {
        fill: s.success,
        onFill: s.onPrimary,
        surface: s.successSurface,
        border: s.successBorder,
        text: s.success,
      };
    case 'destructive':
      return {
        fill: s.destructive,
        onFill: s.onDestructive,
        surface: s.errorSurface,
        border: s.destructiveBorder,
        text: s.destructive,
      };
    case 'dimmed':
      return { fill: s.dimmed, onFill: s.onPrimary, surface: s.dimmedSurface, border: s.dimmedBorder, text: s.dimmed };
  }
}

/** Alto y fuente de `Badge` de Mantine (`--badge-height-*`, `--badge-fz-*`). */
const SIZES = {
  sm: { height: 18, fontSize: 10, paddingX: 8 },
  md: { height: 22, fontSize: 11, paddingX: 10 },
} as const;

/** Equivalente de `Badge` de Mantine: pill en mayúsculas, 700. */
export function Badge({ children, color = 'brand', variant = 'light', size = 'sm' }: BadgeProps) {
  const c = badgeColors(color, useSemanticColors());
  const metrics = SIZES[size];
  const background = variant === 'filled' ? c.fill : variant === 'light' ? c.surface : 'transparent';
  const border = variant === 'outline' ? c.border : 'transparent';
  const text = variant === 'filled' ? c.onFill : c.text;

  return (
    <XStack
      alignSelf="flex-start"
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
