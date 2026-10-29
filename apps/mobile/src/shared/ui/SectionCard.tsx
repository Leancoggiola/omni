import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, YStack } from 'tamagui';

import { useColorSchemeControl } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

import { Title } from './Title';

import type { ReactNode } from 'react';

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Superficie de contenido de v2: equivale a `Paper` de web (card glass de radio 24: `surface-glass`, `glass-border` y
 * sombra `card`, esta última solo en iOS) y, con `title`, a `ProfileSectionCard`. No se anida: adentro van filas o superficies sólidas.
 */
export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  const { colorScheme } = useColorSchemeControl();

  return (
    <YStack
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.lg}
      gap={SPACING.md}
      {...glassElevation('card', colorScheme)}
    >
      {title ? (
        <YStack gap={SPACING['2xs']}>
          <Title order={4} fontWeight="600">
            {title}
          </Title>
          {subtitle ? (
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
              {subtitle}
            </Paragraph>
          ) : null}
        </YStack>
      ) : null}
      {children}
    </YStack>
  );
}
