import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import type { Icon } from 'phosphor-react-native';
import type { ReactNode } from 'react';

export type BannerColor = 'brand' | 'accent' | 'success' | 'warning' | 'info' | 'destructive';

type BannerProps = {
  children: ReactNode;
  color?: BannerColor;
  title?: string;
  icon?: Icon;
};

type SemanticColors = ReturnType<typeof useSemanticColors>;

/** Wash, borde y texto de cada color: los mismos `surfaces-{color}-light` / `border-{color}` que web. */
function bannerColors(color: BannerColor, s: SemanticColors) {
  switch (color) {
    case 'brand':
      return { surface: s.primarySurface, border: s.primaryBorder, text: s.primary };
    case 'accent':
      return { surface: s.accentSurface, border: s.accentBorder, text: s.accent };
    case 'success':
      return { surface: s.successSurface, border: s.successBorder, text: s.success };
    case 'warning':
      return { surface: s.warningSurface, border: s.warningBorder, text: s.warning };
    case 'info':
      return { surface: s.infoSurface, border: s.infoBorder, text: s.info };
    case 'destructive':
      return { surface: s.errorSurface, border: s.destructiveBorder, text: s.destructive };
  }
}

/**
 * Equivalente de `Alert` de web (variante `light-custom`, la que tiene por defecto): wash del color,
 * borde de 1 y texto en el color. Para errores de formulario: `<Banner color="destructive">`.
 */
export function Banner({ children, color = 'brand', title, icon: IconComponent }: BannerProps) {
  const c = bannerColors(color, useSemanticColors());

  return (
    <XStack
      backgroundColor={c.surface}
      borderWidth={1}
      borderColor={c.border}
      borderRadius={RADIUS.lg}
      paddingVertical={SPACING.sm}
      paddingHorizontal={SPACING.md}
      gap={SPACING.sm}
      alignItems={title ? 'flex-start' : 'center'}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {IconComponent ? <IconComponent size={20} color={c.text} /> : null}
      <YStack flex={1} gap={SPACING['2xs']}>
        {title ? (
          <Paragraph color={c.text} fontSize={FONT_SIZE.md} fontWeight="700">
            {title}
          </Paragraph>
        ) : null}
        <Paragraph color={title ? '$color' : c.text} fontSize={FONT_SIZE.md}>
          {children}
        </Paragraph>
      </YStack>
    </XStack>
  );
}
