import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon, type Icon } from 'phosphor-react-native';
import { StyleSheet } from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { elevation } from '@/theme/elevation';
import { gradientPoints, transparentOf } from '@/theme/gradient';

import { IconButton } from '../button/IconButton';

import type { NotificationVariant } from './notify';

const ICON_SIZE = 18;
/** Lavado horizontal, como web: del color del estado a transparente al 90 %. */
const WASH = gradientPoints(90);
const ACCENT_BAR_WIDTH = 3;

/**
 * Acento (`icons-{variante}`: ícono y barra izquierda) y wash (`surfaces-{variante}-light`): los mismos
 * tokens que `NotificationCard.module.scss` de web.
 */
const VARIANTS = {
  success: { icon: CheckCircleIcon, accent: 'successIcon', wash: 'successSurface' },
  error: { icon: WarningIcon, accent: 'errorIcon', wash: 'errorSurface' },
  warning: { icon: WarningCircleIcon, accent: 'warningIcon', wash: 'warningSurface' },
  info: { icon: InfoIcon, accent: 'infoIcon', wash: 'infoSurface' },
} as const satisfies Record<NotificationVariant, { icon: Icon; accent: string; wash: string }>;

type NotificationCardProps = {
  variant: NotificationVariant;
  title: string;
  message: string;
  onClose: () => void;
};

export function NotificationCard({ variant, title, message, onClose }: NotificationCardProps) {
  const colors = useSemanticColors();
  const { icon: IconComponent, accent, wash } = VARIANTS[variant];
  const accentColor = colors[accent];
  const washColor = colors[wash];
  const washClear = transparentOf(washColor);

  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderRadius={RADIUS.lg}
      overflow="hidden"
      {...elevation('md')}
      accessibilityRole="alert"
      accessibilityLiveRegion={variant === 'error' ? 'assertive' : 'polite'}
    >
      <LinearGradient
        colors={[washColor, washClear]}
        locations={[0, 0.9]}
        start={WASH.start}
        end={WASH.end}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <YStack
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        width={ACCENT_BAR_WIDTH}
        backgroundColor={accentColor}
        pointerEvents="none"
      />
      {/* Compacta, como el `NotificationCard` de web: ícono suelto (sin chip), título y mensaje 12. */}
      <XStack
        paddingVertical={SPACING.xs}
        paddingLeft={SPACING.sm}
        paddingRight={SPACING['2xs']}
        gap={SPACING.xs}
        alignItems="center"
      >
        <IconComponent size={ICON_SIZE} color={accentColor} weight="fill" />
        <YStack flex={1} gap={SPACING['3xs']}>
          <Paragraph fontSize={FONT_SIZE.sm} lineHeight={LINE_HEIGHT.sm} fontWeight="700">
            {title}
          </Paragraph>
          <Paragraph fontSize={FONT_SIZE.sm} lineHeight={LINE_HEIGHT.sm} color="$dimmed">
            {message}
          </Paragraph>
        </YStack>
        <IconButton icon={XIcon} color="dimmed" size="sm" accessibilityLabel="Cerrar notificación" onPress={onClose} />
      </XStack>
    </YStack>
  );
}
