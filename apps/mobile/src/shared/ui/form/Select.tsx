import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CaretUpDownIcon } from 'phosphor-react-native';
import { useRef } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { actionSheet, type ActionSheetOption } from '../actionSheet/actionSheet';
import { FIELD_HEIGHT } from './TextField';

export type SelectItem<T extends string> = ActionSheetOption<T>;

type SelectProps<T extends string> = {
  data: readonly SelectItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  /** Sin `label` visible es obligatorio: es lo que nombra al campo (y el título del sheet). */
  accessibilityLabel?: string;
  disabled?: boolean;
};

/**
 * Equivalente de `Select` de Mantine: un campo de 44 dp con el valor actual y el caret, que abre las
 * opciones en un `actionSheet()` (check en la actual y "Cancelar"), no en un dropdown.
 */
export function Select<T extends string>({
  data,
  value,
  onChange,
  label,
  accessibilityLabel,
  disabled = false,
}: SelectProps<T>) {
  const colors = useSemanticColors();
  const name = accessibilityLabel ?? label ?? '';
  const current = data.find(item => item.value === value)?.label ?? '';
  // Dos toques rápidos abrirían dos sheets en cola.
  const opening = useRef(false);

  const open = async () => {
    if (opening.current) return;
    opening.current = true;
    try {
      const picked = await actionSheet({ title: name, options: data, value });
      if (picked !== null && picked !== value) onChange(picked);
    } finally {
      opening.current = false;
    }
  };

  return (
    <YStack gap={SPACING['2xs']}>
      {label ? (
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          {label}
        </Paragraph>
      ) : null}
      <XStack
        height={FIELD_HEIGHT}
        alignItems="center"
        gap={SPACING.xs}
        paddingHorizontal={SPACING.sm}
        borderRadius={RADIUS.lg}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor={disabled ? '$disabledSurface' : '$background'}
        onPress={disabled ? undefined : () => void open()}
        pressStyle={disabled ? undefined : { borderColor: '$primary' }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${name}: ${current}`}
        accessibilityHint="Abre las opciones"
        accessibilityState={{ disabled }}
      >
        <Paragraph flex={1} numberOfLines={1} fontSize={FONT_SIZE.md} color={disabled ? '$dimmed' : '$color'}>
          {current}
        </Paragraph>
        <CaretUpDownIcon size={16} color={disabled ? colors.disabledText : colors.dimmed} />
      </XStack>
    </YStack>
  );
}
