import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { WarningCircleIcon, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

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
const COMPACT_CHIP_SIZE = 44;
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
  return <YStack width={width} height={height} flex={flex} borderRadius={radius} backgroundColor="track" />;
}

/**
 * Fila skeleton: card glass con el póster y las líneas de título, tipo y estado de una fila de lista. Replica las
 * medidas de `MediaListItem` (póster de 56 x 84, pill de estado de 28): si cambia la fila, cambia acá.
 */
function SkeletonRow() {
  const { colorScheme } = useColorSchemeControl();

  return (
    <XStack
      backgroundColor="surfaceGlass"
      borderWidth={1}
      borderColor="glassBorder"
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

/** Fila skeleton compacta: círculo y dos líneas, sin superficie propia. */
function CompactSkeletonRow() {
  return (
    <XStack gap={SPACING.sm} alignItems="center">
      <SkeletonBlock width={COMPACT_CHIP_SIZE} height={COMPACT_CHIP_SIZE} radius={RADIUS.full} />
      <YStack flex={1} gap={SPACING.xs}>
        <SkeletonBlock height={14} radius={RADIUS.sm} />
        <SkeletonBlock width={104} height={12} radius={RADIUS.sm} />
      </YStack>
    </XStack>
  );
}

/** Fila de las variantes `compact`: chip redondo con el ícono, texto al lado y la acción a lo ancho debajo. */
function CompactRow({
  icon: IconComponent,
  iconColor,
  chipColor,
  title,
  description,
  action,
}: {
  icon: Icon;
  iconColor: string;
  chipColor: 'primarySurface' | 'errorSurface';
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <YStack gap={SPACING.sm}>
      <XStack gap={SPACING.sm} alignItems="center">
        <YStack
          width={COMPACT_CHIP_SIZE}
          height={COMPACT_CHIP_SIZE}
          borderRadius={RADIUS.full}
          backgroundColor={chipColor}
          alignItems="center"
          justifyContent="center"
        >
          <IconComponent size={24} color={iconColor} />
        </YStack>
        <YStack flex={1} gap={SPACING['3xs']}>
          <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
            {title}
          </Paragraph>
          {description ? (
            <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
              {description}
            </Paragraph>
          ) : null}
        </YStack>
      </XStack>
      {action}
    </YStack>
  );
}

type LoadingStateProps = {
  variant?: 'spinner' | 'skeleton';
  size?: 'small' | 'large';
  rows?: number;
  compact?: boolean;
};

/**
 * Carga de los estados de UI compartidos, mismo contrato que `@/shared/ui` de web (regla de oro 0): el `error` de SWR
 * se muestra con `ErrorState`, nunca como lista vacía. `variant="spinner"` (por defecto) es el spinner de marca, con
 * `size`; `variant="skeleton"` dibuja `rows` filas (por defecto 3) en `track` que pulsan despacio, quietas con "reducir
 * movimiento". Con `compact` las filas del skeleton son bajas y sin card, para ir dentro de la card de un widget. En las
 * dos variantes el contenedor se llama "Cargando".
 */
export function LoadingState({
  variant = 'spinner',
  size = 'large',
  rows = SKELETON_ROWS,
  compact = false,
}: LoadingStateProps) {
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
        {Array.from({ length: rows }, (_, index) =>
          compact ? <CompactSkeletonRow key={index} /> : <SkeletonRow key={index} />
        )}
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
  description?: string;
  action?: ReactNode;
  compact?: boolean;
};

/**
 * Vacío de v2: ícono en un cuadro glass de 56 y radio 24, y el título en `display md`. `description` es una línea de
 * apoyo debajo del título; `action` va debajo, típicamente un Button. `compact` es una fila baja sin superficie propia,
 * para ir dentro de la card de un widget.
 */
export function EmptyState({ icon: IconComponent, title, description, action, compact = false }: EmptyStateProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();

  if (compact) {
    return (
      <CompactRow
        icon={IconComponent}
        iconColor={colors.primary}
        chipColor="primarySurface"
        title={title}
        description={description}
        action={action}
      />
    );
  }

  return (
    <YStack
      backgroundColor="backgroundStrong"
      borderWidth={1}
      borderColor="hairline"
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
        borderColor="glassBorder"
        backgroundColor="surfaceGlass"
        alignItems="center"
        justifyContent="center"
        {...glassElevation('card', colorScheme)}
      >
        <IconComponent size={28} color={colors.accent} />
      </YStack>
      <DisplayTitle size="md" textAlign="center" header={false}>
        {title}
      </DisplayTitle>
      {description ? (
        <Paragraph color="dimmed" fontSize={FONT_SIZE.md} textAlign="center">
          {description}
        </Paragraph>
      ) : null}
      {action}
    </YStack>
  );
}

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
};

/**
 * Error de v2: card sólida con borde `hairline`, ícono en un cuadro `errorSurface` de 56, el mensaje en `display md` y
 * "Reintentar" opcional (outline destructivo, a lo ancho); `retrying` lo muestra cargando mientras el reintento está
 * en curso. `compact` es una fila baja sin superficie propia, para ir dentro de la card de un widget.
 */
export function ErrorState({
  message = 'No se pudieron cargar los datos',
  onRetry,
  retrying = false,
  compact = false,
}: ErrorStateProps) {
  const colors = useSemanticColors();
  const retryButton = onRetry ? (
    <Button fullWidth variant="outline" color="destructive" loading={retrying} onPress={onRetry}>
      Reintentar
    </Button>
  ) : null;

  if (compact) {
    return (
      <YStack accessibilityRole="alert">
        <CompactRow
          icon={WarningCircleIcon}
          iconColor={colors.destructive}
          chipColor="errorSurface"
          title={message}
          action={retryButton}
        />
      </YStack>
    );
  }

  return (
    <YStack
      backgroundColor="backgroundStrong"
      borderWidth={1}
      borderColor="hairline"
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
        backgroundColor="errorSurface"
        alignItems="center"
        justifyContent="center"
      >
        <WarningCircleIcon size={28} color={colors.destructive} />
      </YStack>
      <DisplayTitle size="md" textAlign="center" header={false}>
        {message}
      </DisplayTitle>
      {retryButton}
    </YStack>
  );
}
