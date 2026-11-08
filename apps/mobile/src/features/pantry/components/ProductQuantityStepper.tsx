import { PANTRY_UNIT_LABELS } from '@omni/shared/pantry';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { MinusIcon, PlusIcon } from 'phosphor-react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { IconButton } from '@/shared/ui';

import type { PantryUnit } from '@omni/shared/pantry';

const VALUE_FONT_SIZE = 32;

type ProductQuantityStepperProps = {
  value: number;
  unit: PantryUnit;
  minQuantity: number | null;
  onChange: (value: number) => void;
};

/** Ajuste rápido de la cantidad en la alacena (±1); se guarda con el resto del form. */
export function ProductQuantityStepper({ value, unit, minQuantity, onChange }: ProductQuantityStepperProps) {
  const unitLabel = value === 1 ? PANTRY_UNIT_LABELS[unit].one : PANTRY_UNIT_LABELS[unit].other;

  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      padding={SPACING.sm}
      borderRadius={RADIUS.lg}
      borderWidth={1}
      borderColor="$glassBorder"
      accessibilityRole="adjustable"
      accessibilityLabel="Cantidad en la alacena"
      accessibilityValue={{ text: `${value} ${unitLabel}` }}
    >
      <IconButton
        icon={MinusIcon}
        variant="filled"
        size="lg"
        accessibilityLabel="Restar uno"
        disabled={value <= 0}
        onPress={() => onChange(Math.max(0, value - 1))}
      />
      <YStack alignItems="center" accessibilityLiveRegion="polite">
        <Paragraph fontSize={VALUE_FONT_SIZE} lineHeight={VALUE_FONT_SIZE} fontWeight="800">
          {value}
        </Paragraph>
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
          {`${unitLabel}${minQuantity !== null ? ` · mínimo ${minQuantity}` : ''}`}
        </Paragraph>
      </YStack>
      <IconButton
        icon={PlusIcon}
        variant="filled"
        size="lg"
        accessibilityLabel="Sumar uno"
        onPress={() => onChange(value + 1)}
      />
    </XStack>
  );
}
