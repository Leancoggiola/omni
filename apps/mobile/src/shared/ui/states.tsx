import { RADIUS, SPACING } from '@omni/shared/theme';
import { WarningCircleIcon, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

import { Button } from './button/Button';
import { DisplayTitle } from './DisplayTitle';
import { Spinner } from './Spinner';
import { STATUS_PILL_HEIGHT } from './StatusPill';
import { useReduceMotion } from './useReduceMotion';

import type { ReactNode } from 'react';

const SKELETON_ROWS = 3;
const SKELETON_PULSE_MS = 900;
const POSTER = { width: 56, height: 84 } as const;

/** Bloque de color `track`; su forma sale de las props. */
function SkeletonBlock({
  width,
  height,
  radius,
  flex,
}: {
  width?: number;
  height: number;
  radius: number;
  flex?: number;
}) {
  return <YStack width={width} height={height} flex={flex} borderRadius={radius} backgroundColor="$track" />;
}

/**
 * Fila skeleton: card glass con el póster y las líneas de título, tipo y estado de una fila de lista. Replica las
 * medidas de `MediaListItem` (póster de 56 x 84, pill de estado de 28): si cambia la fila, cambia acá.
 */
function SkeletonRow() {
  const { colorScheme } = useColorSchemeControl();

  return (
    <XStack
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      {...glassElevation('card', colorScheme)}
    >
      <SkeletonBlock width={POSTER.width} height={POSTER.height} radius={RADIUS.sm} />
      <YStack flex={1} justifyContent="space-between">
        <XStack gap={SPACING.xs} alignItems="center">
          <SkeletonBlock flex={1} height={20} radius={RADIUS.sm} />
          <SkeletonBlock width={64} height={20} radius={RADIUS.full} />
        </XStack>
        <SkeletonBlock width={104} height={STATUS_PILL_HEIGHT} radius={RADIUS.full} />
      </YStack>
    </XStack>
  );
}

type LoadingStateProps = {
  variant?: 'spinner' | 'skeleton';
  size?: 'small' | 'large';
  rows?: number;
};

/**
 * Carga de los estados de UI compartidos, mismo contrato que `@/shared/ui` de web (regla de oro 0): el `error` de SWR
 * se muestra con `ErrorState`, nunca como lista vacía. `variant="spinner"` (por defecto) es el spinner de marca, con
 * `size`; `variant="skeleton"` dibuja `rows` filas (por defecto 3) en `track` que pulsan despacio, quietas con "reducir
 * movimiento". En las dos el contenedor se llama "Cargando".
 */
export function LoadingState({ variant = 'spinner', size = 'large', rows = SKELETON_ROWS }: LoadingStateProps) {
  const reduceMotion = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (variant !== 'skeleton' || reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: SKELETON_PULSE_MS, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: SKELETON_PULSE_MS, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(1);
    };
  }, [variant, reduceMotion, pulse]);

  if (variant === 'skeleton') {
    return (
      <Animated.View
        style={{ gap: SPACING.sm, opacity: pulse }}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando"
      >
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </Animated.View>
    );
  }

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
