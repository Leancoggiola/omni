import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { ArrowLeftIcon, type Icon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { IconButton } from './button/IconButton';
import { Title } from './Title';

import type { ReactNode } from 'react';

const CHIP_SIZE = 44;

type ScreenHeaderProps = {
  icon: Icon;
  title: string;
  subtitle?: string;
  /** Se muestra en el borde opuesto: botones, avatar, etc. */
  actions?: ReactNode;
  /** Pantallas de stack (Perfil): agrega un `IconButton` de volver antes del chip. */
  onBack?: () => void;
};

/** Equivalente de `PageHeader` de web: chip de ícono terracota + título + subtítulo + acciones. */
export function ScreenHeader({ icon: IconComponent, title, subtitle, actions, onBack }: ScreenHeaderProps) {
  const colors = useSemanticColors();

  return (
    <XStack alignItems="center" justifyContent="space-between" gap={SPACING.md}>
      <XStack alignItems="center" gap={SPACING.sm} flexShrink={1}>
        {onBack ? <IconButton icon={ArrowLeftIcon} accessibilityLabel="Volver" onPress={onBack} /> : null}
        <YStack
          width={CHIP_SIZE}
          height={CHIP_SIZE}
          borderRadius={RADIUS.md}
          backgroundColor="$accentSurface"
          alignItems="center"
          justifyContent="center"
        >
          <IconComponent size={24} color={colors.accent} />
        </YStack>
        <YStack flexShrink={1} gap={SPACING['3xs']}>
          <Title order={1} numberOfLines={1}>
            {title}
          </Title>
          {subtitle ? (
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
              {subtitle}
            </Paragraph>
          ) : null}
        </YStack>
      </XStack>
      {actions}
    </XStack>
  );
}
