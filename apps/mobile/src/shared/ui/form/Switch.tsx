import { FONT_SIZE, LINE_HEIGHT, SPACING } from '@omni/shared/theme';
import { Paragraph, Switch as TamaguiSwitch, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Con label se arma la fila completa: texto a la izquierda y switch a la derecha, toda tocable. */
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Para un switch sin `label` visible (la fila la arma quien lo usa). */
  accessibilityLabel?: string;
};

/**
 * Switch de marca: apagado la pista es `color-4` del theme base (`border-subtle`, ver `tamagui.config.ts`, #75) y
 * encendido el Switch de Tamagui 3 pasa al theme `active` (`activeTheme`, relleno `primary-fill`). El thumb es blanco
 * en los dos estados y `size="xl"` deja la pista en 53 x 28, lo más cerca del 58 x 29 de Tamagui 2. Acá van también el
 * rol accesible y la fila con label (= `Switch` de Mantine).
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  accessibilityLabel,
}: SwitchProps) {
  const colors = useSemanticColors();
  const a11y = {
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: accessibilityLabel ?? label,
    accessibilityHint: description,
    accessibilityState: { checked, disabled },
  } as const;

  const control = (
    <TamaguiSwitch
      size="xl"
      activeTheme="active"
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      opacity={disabled ? 0.5 : 1}
      {...(label ? { accessible: false, importantForAccessibility: 'no-hide-descendants' as const } : a11y)}
    >
      <TamaguiSwitch.Thumb activeStyle={{ backgroundColor: colors.white }} />
    </TamaguiSwitch>
  );

  if (!label) return control;

  return (
    <XStack
      alignItems="center"
      gap={SPACING.sm}
      onPress={disabled ? undefined : () => onCheckedChange(!checked)}
      {...a11y}
    >
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph
          fontSize={FONT_SIZE.lg}
          lineHeight={`${LINE_HEIGHT.xl}px`}
          fontWeight="600"
          color={disabled ? 'dimmed' : 'color'}
        >
          {label}
        </Paragraph>
        {description ? (
          <Paragraph fontSize={FONT_SIZE.sm} color="dimmed">
            {description}
          </Paragraph>
        ) : null}
      </YStack>
      {control}
    </XStack>
  );
}
