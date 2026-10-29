import { RADIUS, SPACING } from '@omni/shared/theme';
import { WarningCircleIcon, type Icon } from 'phosphor-react-native';
import { YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

import { Button } from './button/Button';
import { DisplayTitle } from './DisplayTitle';
import { Spinner } from './Spinner';

import type { ReactNode } from 'react';

/**
 * Carga de los estados de UI compartidos, mismo contrato que `@/shared/ui` de web (regla de oro 0): el `error` de SWR
 * se muestra con `ErrorState`, nunca como lista vacía.
 */
export function LoadingState({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <YStack paddingVertical={SPACING.xl} alignItems="center" justifyContent="center">
      <Spinner size={size} />
    </YStack>
  );
}

const INDICATOR_SIZE = 56;

type EmptyStateProps = {
  icon: Icon;
  title: string;
  action?: ReactNode;
};

/**
 * Vacío de v2: ícono en un cuadro glass de 56 y radio 24, y el título en `display md`. `action` va debajo del título,
 * típicamente un Button.
 */
export function EmptyState({ icon: IconComponent, title, action }: EmptyStateProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();

  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderWidth={1}
      borderColor="$hairline"
      borderRadius={RADIUS.lg}
      padding={SPACING.xl}
      gap={SPACING.md}
      alignItems="center"
    >
      <YStack
        width={INDICATOR_SIZE}
        height={INDICATOR_SIZE}
        borderRadius={RADIUS.xl}
        borderWidth={1}
        borderColor="$glassBorder"
        backgroundColor="$surfaceGlass"
        alignItems="center"
        justifyContent="center"
        {...glassElevation('card', colorScheme)}
      >
        <IconComponent size={28} color={colors.accent} />
      </YStack>
      <DisplayTitle size="md" textAlign="center" header={false}>
        {title}
      </DisplayTitle>
      {action}
    </YStack>
  );
}

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

/**
 * Error de v2: card sólida con borde `hairline`, ícono en un cuadro `errorSurface` de 56, el mensaje en `display md` y
 * "Reintentar" opcional (outline destructivo, a lo ancho); `retrying` lo muestra cargando mientras el reintento está
 * en curso.
 */
export function ErrorState({
  message = 'No se pudieron cargar los datos',
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  const colors = useSemanticColors();

  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderWidth={1}
      borderColor="$hairline"
      borderRadius={RADIUS.lg}
      paddingVertical={SPACING.lg}
      paddingHorizontal={SPACING.md}
      gap={SPACING.sm}
      alignItems="center"
      accessibilityRole="alert"
    >
      <YStack
        width={INDICATOR_SIZE}
        height={INDICATOR_SIZE}
        borderRadius={RADIUS.xl}
        backgroundColor="$errorSurface"
        alignItems="center"
        justifyContent="center"
      >
        <WarningCircleIcon size={28} color={colors.destructive} />
      </YStack>
      <DisplayTitle size="md" textAlign="center" header={false}>
        {message}
      </DisplayTitle>
      {onRetry ? (
        <Button fullWidth variant="outline" color="destructive" loading={retrying} onPress={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </YStack>
  );
}
