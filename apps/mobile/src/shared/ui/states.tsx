import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { WarningCircleIcon, type Icon } from 'phosphor-react-native';
import { Button, Paragraph, Spinner, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import type { ReactNode } from 'react';

/**
 * Estados de UI compartidos, mismo contrato que `@/shared/ui` de web (regla de oro 0): el `error`
 * de SWR se muestra con `ErrorState`, nunca como lista vacía.
 */

export function LoadingState({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <YStack paddingVertical={SPACING.xl} alignItems="center" justifyContent="center">
      <Spinner size={size} color="$primary" accessibilityRole="progressbar" accessibilityLabel="Cargando" />
    </YStack>
  );
}

const INDICATOR_SIZE = 56;

type EmptyStateProps = {
  icon: Icon;
  title: string;
  /** Debajo del título, típicamente un Button. */
  action?: ReactNode;
};

export function EmptyState({ icon: IconComponent, title, action }: EmptyStateProps) {
  const colors = useSemanticColors();

  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={RADIUS.md}
      padding={SPACING.xl}
      gap={SPACING.md}
      alignItems="center"
    >
      <YStack
        width={INDICATOR_SIZE}
        height={INDICATOR_SIZE}
        borderRadius={RADIUS.full}
        backgroundColor="$dimmedSurface"
        alignItems="center"
        justifyContent="center"
      >
        <IconComponent size={28} color={colors.dimmed} />
      </YStack>
      <Paragraph fontSize={FONT_SIZE.lg} fontWeight="600" textAlign="center">
        {title}
      </Paragraph>
      {action}
    </YStack>
  );
}

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = 'No se pudieron cargar los datos', onRetry }: ErrorStateProps) {
  const colors = useSemanticColors();

  return (
    <YStack
      backgroundColor="$errorSurface"
      borderWidth={1}
      borderColor="$destructive"
      borderRadius={RADIUS.lg}
      padding={SPACING.md}
      gap={SPACING.md}
      accessibilityRole="alert"
    >
      <XStack gap={SPACING.sm} alignItems="center">
        <WarningCircleIcon size={20} color={colors.destructive} />
        <Paragraph flex={1} fontSize={FONT_SIZE.md}>
          {message}
        </Paragraph>
      </XStack>
      {onRetry ? (
        <Button size="$3" variant="outlined" borderColor="$destructive" color="$destructive" onPress={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </YStack>
  );
}
