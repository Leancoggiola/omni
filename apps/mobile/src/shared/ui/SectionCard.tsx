import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, YStack } from 'tamagui';

import { elevation } from '@/theme/elevation';

import { Title } from './Title';

import type { ReactNode } from 'react';

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Superficie de contenido: equivale a `Paper` de web (card cálida, radio `lg`, sombra `sm`) y,
 * con `title`, a `ProfileSectionCard`.
 */
export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderRadius={RADIUS.lg}
      padding={SPACING.lg}
      gap={SPACING.lg}
      {...elevation('sm')}
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
