import { FONT_SIZE, RADIUS, SIZE, SPACING } from '@omni/shared/theme';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, type TextInputInstance } from 'react-native';
import { Input, XStack, YStack, type InputProps } from 'tamagui';
import { Paragraph } from '@/shared/ui/Paragraph';

import { useSemanticColors } from '@/core/theme';

import { useFormField } from './FormContext';

import type { Icon } from 'phosphor-react-native';
import type { ComponentProps, ReactNode } from 'react';

export const FIELD_HEIGHT = SIZE.field.md;
const ICON_SIZE = 18;

type FieldSize = keyof typeof SIZE.field;

const FIELD_SIZES = {
  md: { height: SIZE.field.md, fontSize: FONT_SIZE.md, section: 40 },
  lg: { height: SIZE.field.lg, fontSize: FONT_SIZE.lg, section: 48 },
} as const satisfies Record<FieldSize, { height: number; fontSize: number; section: number }>;

export type TextFieldProps = Omit<InputProps, 'size' | 'disabled'> & {
  label?: string;
  description?: string;
  /** Mensaje de error: pinta el borde en destructivo y se muestra debajo del campo. */
  error?: string;
  required?: boolean;
  size?: FieldSize;
  leftSection?: Icon;
  /** Acción dentro del campo, a la derecha (p. ej. el ojo de `PasswordField`). */
  rightSection?: ReactNode;
  disabled?: boolean;
  ref?: ComponentProps<typeof Input>['ref'];
};

/**
 * Equivalente de `TextInput` de Mantine: label 14/600 (con `*` si es requerido), ícono izquierdo, alto 44 (52 y fuente
 * de 16 con `size="lg"`) y, debajo del campo, la descripción y el error. Placeholder, cursor y selección
 * (`placeholderTextColor`, `cursorColor`, `selectionColor`) van acá: Tamagui 3 no tiene `defaultProps` en el config. El
 * ícono izquierdo y la acción derecha ocupan un hueco de 40 (48 en `lg`) dentro del campo, que es también su padding
 * lateral (`paddingStart`/`paddingEnd`: el `paddingInline` del `size` de `Input` les gana a
 * `paddingLeft`/`paddingRight`). Dentro de un formulario (`FormSheet`, `FormFields`) "Siguiente" salta solo al próximo
 * campo habilitado y el último queda con "Listo"; un `returnKeyType` u `onSubmitEditing` propio tiene prioridad. Dentro
 * de un ScrollView de formulario (`FormSheet`, `FormScrollView`) el campo enfocado scrollea hasta quedar arriba del
 * teclado.
 */
export function TextField({
  label,
  description,
  error,
  required = false,
  size = 'md',
  leftSection: LeftIcon,
  rightSection,
  disabled = false,
  ref,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  returnKeyType,
  submitBehavior,
  onSubmitEditing,
  onFocus,
  ...inputProps
}: TextFieldProps) {
  const colors = useSemanticColors();
  const metrics = FIELD_SIZES[size];
  const baseLabel = accessibilityLabel ?? label;
  const a11yLabel = baseLabel && required ? `${baseLabel}, obligatorio` : baseLabel;
  const a11yHint = [error, description, accessibilityHint].filter(Boolean).join('. ') || undefined;

  const inputRef = useRef<TextInputInstance | null>(null);
  const field = useFormField(!disabled, () => inputRef.current);
  const autoNext = field.inForm && !onSubmitEditing;

  const setRef = (node: TextInputInstance | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node as never);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const borderBase = error ? 'destructive' : disabled ? 'transparent' : 'border-color';
  const borderFocus = error ? 'destructive' : 'primary';

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
            <Paragraph color="destructive" fontSize={FONT_SIZE.md} fontWeight="600">
              {' *'}
            </Paragraph>
          ) : null}
        </Paragraph>
      ) : null}
      <XStack alignItems="center">
        <Input
          ref={setRef as never}
          flex={1}
          height={metrics.height}
          borderRadius={RADIUS.md}
          borderWidth={1}
          borderColor={`${borderBase} focus:${borderFocus}`}
          backgroundColor={disabled ? 'disabledSurface' : 'background'}
          color={disabled ? 'dimmed' : 'color'}
          placeholderTextColor="placeholder-color"
          cursorColor="primary"
          selectionColor="primary"
          fontSize={metrics.fontSize}
          paddingStart={LeftIcon ? metrics.section : SPACING.sm}
          paddingEnd={rightSection ? metrics.section : SPACING.sm}
          disabled={disabled}
          accessibilityLabel={a11yLabel}
          accessibilityHint={a11yHint}
          returnKeyType={returnKeyType ?? (autoNext ? (field.hasNext ? 'next' : 'done') : undefined)}
          submitBehavior={submitBehavior ?? (autoNext && field.hasNext ? 'submit' : undefined)}
          onSubmitEditing={autoNext ? () => void field.focusNext() : onSubmitEditing}
          onFocus={event => {
            onFocus?.(event);
            field.scrollIntoView?.();
          }}
          {...inputProps}
          accessibilityState={{ ...accessibilityState, disabled }}
        />
        {LeftIcon ? (
          <YStack
            position="absolute"
            left={0}
            width={metrics.section}
            alignItems="center"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <LeftIcon size={ICON_SIZE} color={disabled ? colors.disabledText : colors.dimmed} />
          </YStack>
        ) : null}
        {rightSection ? (
          <YStack position="absolute" right={0} width={metrics.section} alignItems="center">
            {rightSection}
          </YStack>
        ) : null}
      </XStack>
      {description ? (
        <Paragraph color="dimmed" fontSize={FONT_SIZE.sm}>
          {description}
        </Paragraph>
      ) : null}
      {error ? (
        <Paragraph color="destructive" fontSize={FONT_SIZE.sm}>
          {error}
        </Paragraph>
      ) : null}
    </YStack>
  );
}
