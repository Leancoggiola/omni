import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Input, Paragraph, XStack, YStack, type InputProps } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import type { Icon } from 'phosphor-react-native';
import type { ComponentProps, ReactNode } from 'react';

export const FIELD_HEIGHT = 44;
const ICON_SIZE = 18;
/** Lugar para el ícono izquierdo o la acción derecha dentro del campo. */
const SECTION_WIDTH = 40;

export type TextFieldProps = Omit<InputProps, 'size' | 'disabled'> & {
  label?: string;
  description?: string;
  /** Mensaje de error: pinta el borde en destructivo y se muestra debajo del campo. */
  error?: string;
  required?: boolean;
  leftSection?: Icon;
  /** Acción dentro del campo, a la derecha (p. ej. el ojo de `PasswordField`). */
  rightSection?: ReactNode;
  disabled?: boolean;
  /** Para encadenar el foco entre campos (`ref.current?.focus()`). */
  ref?: ComponentProps<typeof Input>['ref'];
};

/**
 * Equivalente de `TextInput` de Mantine: label 14/600 (con `*` si es requerido), descripción, error,
 * ícono izquierdo y alto 44. Placeholder, cursor y selección vienen de `defaultProps` del config.
 */
export function TextField({
  label,
  description,
  error,
  required = false,
  leftSection: LeftIcon,
  rightSection,
  disabled = false,
  ref,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  ...inputProps
}: TextFieldProps) {
  const colors = useSemanticColors();
  // Lo visual (asterisco, descripción, error) también para TalkBack: el error primero.
  const baseLabel = accessibilityLabel ?? label;
  const a11yLabel = baseLabel && required ? `${baseLabel}, obligatorio` : baseLabel;
  const a11yHint = [error, description, accessibilityHint].filter(Boolean).join('. ') || undefined;

  // Un error que aparece debajo del campo (p. ej. al enviar) no siempre se anuncia como live region
  // en Android. Solo cuando aparece o cambia: el que ya estaba al montar se lee en el hint al enfocar.
  const previousError = useRef(error);
  useEffect(() => {
    if (error && error !== previousError.current) AccessibilityInfo.announceForAccessibility(error);
    previousError.current = error;
  }, [error]);

  return (
    <YStack gap={SPACING['2xs']}>
      {label ? (
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="600">
          {label}
          {required ? (
            <Paragraph color="$destructive" fontSize={FONT_SIZE.md} fontWeight="600">
              {' *'}
            </Paragraph>
          ) : null}
        </Paragraph>
      ) : null}
      {description ? (
        <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm}>
          {description}
        </Paragraph>
      ) : null}
      <XStack alignItems="center">
        <Input
          ref={ref}
          flex={1}
          height={FIELD_HEIGHT}
          borderRadius={RADIUS.lg}
          borderWidth={1}
          borderColor={error ? '$destructive' : '$borderColor'}
          focusStyle={{ borderColor: error ? '$destructive' : '$primary' }}
          backgroundColor={disabled ? '$disabledSurface' : '$background'}
          color={disabled ? '$dimmed' : '$color'}
          fontSize={FONT_SIZE.md}
          paddingLeft={LeftIcon ? SECTION_WIDTH : SPACING.sm}
          paddingRight={rightSection ? SECTION_WIDTH : SPACING.sm}
          disabled={disabled}
          accessibilityLabel={a11yLabel}
          accessibilityHint={a11yHint}
          {...inputProps}
          accessibilityState={{ ...accessibilityState, disabled }}
        />
        {LeftIcon ? (
          <YStack
            position="absolute"
            left={0}
            width={SECTION_WIDTH}
            alignItems="center"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <LeftIcon size={ICON_SIZE} color={disabled ? colors.disabledText : colors.dimmed} />
          </YStack>
        ) : null}
        {rightSection ? (
          <YStack position="absolute" right={0} width={SECTION_WIDTH} alignItems="center">
            {rightSection}
          </YStack>
        ) : null}
      </XStack>
      {error ? (
        <Paragraph color="$destructive" fontSize={FONT_SIZE.sm}>
          {error}
        </Paragraph>
      ) : null}
    </YStack>
  );
}
