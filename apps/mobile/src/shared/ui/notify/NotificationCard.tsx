import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon, type Icon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { themedElevation } from '@/theme/elevation';

import { IconButton } from '../button/IconButton';

import type { NotificationVariant } from './notify';

const ICON_SIZE = 18;
const DOT_SIZE = 32;

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

/**
 * Toast de v2: superficie sólida de radio 16 con borde `hairline` y sombra `float`, el ícono en un círculo de 32 con el
 * wash del color, título (14/20, 700), mensaje (12/16, atenuado) y la X de "Cerrar notificación".
 */
export function NotificationCard({ variant, title, message, onClose }: NotificationCardProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();
  const { icon: IconComponent, accent, wash } = VARIANTS[variant];

  return (
    <XStack
      backgroundColor="$backgroundStrong"
      borderWidth={1}
      borderColor="$hairline"
      borderRadius={RADIUS.lg}
      paddingVertical={SPACING.sm}
      paddingLeft={SPACING.md}
      paddingRight={SPACING['2xs']}
      gap={SPACING.sm}
      alignItems="center"
      {...themedElevation('float', colorScheme)}
      accessibilityRole="alert"
      accessibilityLiveRegion={variant === 'error' ? 'assertive' : 'polite'}
    >
      <YStack
        width={DOT_SIZE}
        height={DOT_SIZE}
        borderRadius={RADIUS.full}
        backgroundColor={colors[wash]}
        alignItems="center"
        justifyContent="center"
      >
        <IconComponent size={ICON_SIZE} color={colors[accent]} weight="fill" />
      </YStack>
      <YStack flex={1}>
        <Paragraph fontSize={FONT_SIZE.md} lineHeight={20} fontWeight="700">
          {title}
        </Paragraph>
        <Paragraph fontSize={FONT_SIZE.sm} lineHeight={LINE_HEIGHT.md} color="$dimmed">
          {message}
        </Paragraph>
      </YStack>
      <IconButton icon={XIcon} color="dimmed" size="sm" accessibilityLabel="Cerrar notificación" onPress={onClose} />
    </XStack>
  );
}
