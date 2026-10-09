import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckIcon, type Icon } from 'phosphor-react-native';
import { Paragraph, XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import type { InlineAlign } from '../types';

type ChipProps = {
  children: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Ícono cuando no está marcado; marcado muestra el check, como `Chip` de Mantine. */
  icon?: Icon;
  disabled?: boolean;
  alignSelf?: InlineAlign;
};

const CHIP_HEIGHT = 32;
const ICON_SIZE = 14;

/** Chip de filtro (= `Chip` de Mantine, variante light): pill que se marca y desmarca. */
export function Chip({
  children,
  checked,
  onChange,
  icon: IconComponent,
  disabled = false,
  alignSelf = 'flex-start',
}: ChipProps) {
  const colors = useSemanticColors();
  const LeadingIcon = checked ? CheckIcon : IconComponent;

  return (
    <XStack
      alignSelf={alignSelf}
      height={CHIP_HEIGHT}
      paddingHorizontal={SPACING.sm}
      gap={SPACING['2xs']}
      alignItems="center"
      borderRadius={RADIUS.full}
      borderWidth={1}
      borderColor={checked ? '$primaryBorder' : '$borderColor'}
      backgroundColor={checked ? '$primarySurface' : '$backgroundStrong'}
      opacity={disabled ? 0.5 : 1}
      onPress={disabled ? undefined : () => onChange(!checked)}
      pressStyle={{ opacity: 0.7 }}
      hitSlop={{ top: 6, bottom: 6 }}
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={children}
      accessibilityState={{ checked, disabled }}
    >
      {LeadingIcon ? (
        <LeadingIcon size={ICON_SIZE} color={checked ? colors.primary : colors.dimmed} weight="bold" />
      ) : null}
      <Paragraph fontSize={FONT_SIZE.sm} fontWeight="600" color={checked ? '$primary' : '$color'}>
        {children}
      </Paragraph>
    </XStack>
  );
}
