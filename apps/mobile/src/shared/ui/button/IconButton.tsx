import { RADIUS } from '@omni/shared/theme';
import { XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import {
  BUTTON_SIZES,
  buttonPalette,
  touchHitSlop,
  type ButtonColor,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles';

import type { Icon } from 'phosphor-react-native';

type IconButtonProps = {
  icon: Icon;
  /** Obligatorio: es lo único que anuncia el lector de pantalla. */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  disabled?: boolean;
};

/**
 * Equivalente de `ActionIcon` de Mantine: botón circular de 36 / 44 / 48 dp con las variantes de `Button`. `subtle` es
 * la variante por defecto (la que más usa web); `glass` es el volver del encabezado de Perfil.
 */
export function IconButton({
  icon: IconComponent,
  accessibilityLabel,
  onPress,
  variant = 'subtle',
  color = 'brand',
  size = 'md',
  disabled = false,
}: IconButtonProps) {
  const colors = useSemanticColors();
  const metrics = BUTTON_SIZES[size];
  const palette = buttonPalette(variant, color, disabled, colors);

  return (
    <XStack
      theme={palette.theme}
      width={metrics.height}
      height={metrics.height}
      borderRadius={RADIUS.full}
      borderWidth={1}
      borderColor={palette.borderColor}
      backgroundColor={palette.background}
      alignItems="center"
      justifyContent="center"
      onPress={disabled ? undefined : onPress}
      pressStyle={disabled ? undefined : { backgroundColor: palette.backgroundPress, opacity: palette.pressOpacity }}
      hitSlop={touchHitSlop(metrics.height)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <IconComponent size={metrics.icon + 2} color={palette.icon} />
    </XStack>
  );
}
