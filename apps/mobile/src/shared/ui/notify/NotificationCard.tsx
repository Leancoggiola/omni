import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon, type Icon } from 'phosphor-react-native';
import { StyleSheet } from 'react-native';
import { Button, Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { elevation } from '@/theme/elevation';
import { gradientPoints, transparentOf } from '@/theme/gradient';

import type { NotificationVariant } from './notify';

const ICON_SIZE = 36;
const WASH = gradientPoints(135);

/** Acento y wash por variante: los mismos tokens que `NotificationCard.module.scss` de web. */
const VARIANTS = {
  success: { icon: CheckCircleIcon, accent: 'success', wash: 'successSurface' },
  error: { icon: WarningIcon, accent: 'destructive', wash: 'errorSurface' },
  warning: { icon: WarningCircleIcon, accent: 'warning', wash: 'warningSurface' },
  info: { icon: InfoIcon, accent: 'info', wash: 'infoSurface' },
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
        locations={[0, 0.65]}
        start={WASH.start}
        end={WASH.end}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <XStack padding={SPACING.md} gap={SPACING.sm} alignItems="flex-start">
        <YStack
          width={ICON_SIZE}
          height={ICON_SIZE}
          borderRadius={RADIUS.full}
          backgroundColor={washColor}
          alignItems="center"
          justifyContent="center"
        >
          <IconComponent size={20} color={accentColor} weight="fill" />
        </YStack>
        <YStack flex={1} gap={SPACING['3xs']}>
          <Paragraph fontSize={FONT_SIZE.md} fontWeight="700">
            {title}
          </Paragraph>
          <Paragraph fontSize={FONT_SIZE.md} color="$dimmed">
            {message}
          </Paragraph>
        </YStack>
        <Button
          chromeless
          circular
          size="$2"
          onPress={onClose}
          accessibilityLabel="Cerrar notificación"
          icon={<XIcon size={16} color={colors.dimmed} />}
        />
      </XStack>
    </YStack>
  );
}
