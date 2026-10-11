import { FONT_SIZE, SPACING } from '@omni/shared/theme';
import { Paragraph, Switch as TamaguiSwitch, XStack, YStack } from 'tamagui';

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
 * Switch de marca: la pista y el thumb salen de los sub-themes `Switch`/`SwitchThumb` de
 * `tamagui.config.ts` (#75); acá van el thumb, el rol accesible y la fila con label (= `Switch` de Mantine).
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  accessibilityLabel,
}: SwitchProps) {
  const a11y = {
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: accessibilityLabel ?? label,
    accessibilityHint: description,
    accessibilityState: { checked, disabled },
  } as const;

  const control = (
    <TamaguiSwitch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      opacity={disabled ? 0.5 : 1}
      {...(label ? { accessible: false, importantForAccessibility: 'no-hide-descendants' as const } : a11y)}
    >
      <TamaguiSwitch.Thumb />
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
        <Paragraph fontSize={FONT_SIZE.md} color={disabled ? '$dimmed' : '$color'}>
          {label}
        </Paragraph>
        {description ? (
          <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed">
            {description}
          </Paragraph>
        ) : null}
      </YStack>
      {control}
    </XStack>
  );
}
