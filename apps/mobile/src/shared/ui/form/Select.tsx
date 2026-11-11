import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CaretUpDownIcon } from 'phosphor-react-native';
import { useRef } from 'react';
import { Paragraph, XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { actionSheet, type ActionSheetOption } from '../actionSheet/actionSheet';
import { FIELD_HEIGHT } from './TextField';

export type SelectItem<T extends string> = ActionSheetOption<T>;

type SelectProps<T extends string> = {
  data: readonly SelectItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nombra al campo y es el título del sheet. */
  accessibilityLabel: string;
};

/**
 * Equivalente de `Select` de Mantine: un campo de 44 dp con el valor actual y el caret, que abre las
 * opciones en un `actionSheet()` (check en la actual y "Cancelar"), no en un dropdown.
 */
export function Select<T extends string>({ data, value, onChange, accessibilityLabel }: SelectProps<T>) {
  const colors = useSemanticColors();
  const current = data.find(item => item.value === value)?.label ?? '';
  const opening = useRef(false);

  const open = async () => {
    if (opening.current) return;
    opening.current = true;
    try {
      const picked = await actionSheet({ title: accessibilityLabel, options: data, value });
      if (picked !== null && picked !== value) onChange(picked);
    } finally {
      opening.current = false;
    }
  };

  return (
    <XStack
      height={FIELD_HEIGHT}
      alignItems="center"
      gap={SPACING.xs}
      paddingHorizontal={SPACING.sm}
      borderRadius={RADIUS.md}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
      onPress={() => void open()}
      pressStyle={{ borderColor: '$primary' }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${current}`}
      accessibilityHint="Abre las opciones"
    >
      <Paragraph flex={1} numberOfLines={1} fontSize={FONT_SIZE.md} color="$color">
        {current}
      </Paragraph>
      <CaretUpDownIcon size={16} color={colors.dimmed} />
    </XStack>
  );
}
