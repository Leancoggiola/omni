import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { CaretDownIcon } from 'phosphor-react-native';
import { XStack } from 'tamagui';
import { Paragraph } from '@/shared/ui';

import { useColorSchemeControl, useSemanticColors } from '@/core/theme';
import { glassElevation } from '@/theme/elevation';

type PlanPickerButtonProps = {
  name: string;
  onPress: () => void;
};

/** Pill glass con el plan que se está viendo; abre "Tus planes" para elegir otro. */
export function PlanPickerButton({ name, onPress }: PlanPickerButtonProps) {
  const colors = useSemanticColors();
  const { colorScheme } = useColorSchemeControl();

  return (
    <XStack
      alignSelf="flex-start"
      maxWidth="100%"
      height={SIZE.control.md}
      paddingHorizontal={SPACING.md}
      gap={SPACING.xs}
      alignItems="center"
      borderRadius={RADIUS.full}
      borderWidth={1}
      borderColor="glassBorder"
      backgroundColor="surfaceGlass"
      opacity="press:0.7"
      {...glassElevation('card', colorScheme)}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Plan ${name}`}
      accessibilityHint="Abre tus planes para elegir otro"
    >
      <Paragraph flexShrink={1} fontSize={FONT_SIZE.lg} fontWeight="600" numberOfLines={1}>
        {name}
      </Paragraph>
      <CaretDownIcon size={16} weight="bold" color={colors.text} />
    </XStack>
  );
}
