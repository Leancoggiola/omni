import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { Paragraph } from '@/shared/ui';

import type { Icon } from 'phosphor-react-native';
import type { ReactNode } from 'react';

const ICON_SIZE = 16;

type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  avatar?: ReactNode;
  leftIcon?: Icon;
  rightIcon?: Icon;
  accessibilityLabel?: string;
  onPress?: () => void;
};

/**
 * Chip en pill de 44 dp para elegir entre opciones (fecha, participantes, entre quiénes). Marcado va en
 * `primarySurface`. Sin `onPress` es fijo ("Vos").
 */
export function ChoiceChip({
  label,
  selected = false,
  avatar,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  accessibilityLabel,
  onPress,
}: ChoiceChipProps) {
  const colors = useSemanticColors();
  const iconColor = selected ? colors.primary : colors.text;

  return (
    <XStack
      height={SIZE.control.md}
      alignItems="center"
      gap={SPACING.xs}
      paddingLeft={avatar ? SPACING['2xs'] : SPACING.md}
      paddingRight={SPACING.md}
      borderRadius={RADIUS.full}
      borderWidth={1}
      borderColor={selected ? 'primaryBorder' : 'border-color'}
      backgroundColor={selected ? 'primarySurface' : 'backgroundStrong'}
      opacity={onPress ? 'press:0.7' : undefined}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: !onPress }}
    >
      {avatar}
      {LeftIcon ? <LeftIcon size={ICON_SIZE} color={iconColor} /> : null}
      <Paragraph
        color={selected ? 'primary' : 'color'}
        fontSize={FONT_SIZE.md}
        fontWeight={selected ? '700' : '500'}
        numberOfLines={1}
      >
        {label}
      </Paragraph>
      {RightIcon ? <RightIcon size={ICON_SIZE} color={iconColor} /> : null}
    </XStack>
  );
}
