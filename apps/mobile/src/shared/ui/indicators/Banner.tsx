import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Paragraph, XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import type { Icon } from 'phosphor-react-native';

export type BannerColor = 'brand' | 'accent' | 'success' | 'warning' | 'info' | 'destructive';

type BannerProps = {
  /** Solo texto: el Banner se anuncia y se lee como un único nodo, no lleva acciones adentro. */
  children: string;
  color?: BannerColor;
  icon?: Icon;
};

type SemanticColors = ReturnType<typeof useSemanticColors>;

/** Wash, borde y texto de cada color: los mismos `surfaces-{color}-light` / `border-{color}` que web. */
const BANNER_TOKENS = {
  brand: { surface: '$primarySurface', border: '$primaryBorder', text: '$primary' },
  accent: { surface: '$accentSurface', border: '$accentBorder', text: '$accent' },
  success: { surface: '$successSurface', border: '$successBorder', text: '$success' },
  warning: { surface: '$warningSurface', border: '$warningBorder', text: '$warning' },
  info: { surface: '$infoSurface', border: '$infoBorder', text: '$info' },
  destructive: { surface: '$errorSurface', border: '$destructiveBorder', text: '$destructive' },
} as const satisfies Record<BannerColor, Record<'surface' | 'border' | 'text', string>>;

/** El ícono de Phosphor no resuelve tokens `$`: va con el color crudo equivalente. */
const ICON_COLOR = {
  brand: s => s.primary,
  accent: s => s.accent,
  success: s => s.success,
  warning: s => s.warning,
  info: s => s.info,
  destructive: s => s.destructive,
} as const satisfies Record<BannerColor, (s: SemanticColors) => string>;

/**
 * Equivalente de `Alert` de web (variante `light-custom`, la que tiene por defecto): wash del color,
 * borde de 1 y texto en el color. Para errores de formulario: `<Banner color="destructive">`.
 */
export function Banner({ children, color = 'brand', icon: IconComponent }: BannerProps) {
  const colors = useSemanticColors();
  const t = BANNER_TOKENS[color];

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(children);
  }, [children]);

  return (
    <XStack
      backgroundColor={t.surface}
      borderWidth={1}
      borderColor={t.border}
      borderRadius={RADIUS.lg}
      paddingVertical={SPACING.sm}
      paddingHorizontal={SPACING.md}
      gap={SPACING.sm}
      alignItems="center"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={children}
    >
      {IconComponent ? <IconComponent size={20} color={ICON_COLOR[color](colors)} /> : null}
      <Paragraph flex={1} color={t.text} fontSize={FONT_SIZE.md}>
        {children}
      </Paragraph>
    </XStack>
  );
}
