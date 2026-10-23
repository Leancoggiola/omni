import { RADIUS, SPACING } from '@omni/shared/theme';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { Spinner } from '../Spinner';

import { BUTTON_SIZES, buttonPalette, touchHitSlop, type ButtonSize, type ButtonVariant } from './buttonStyles';

import type { InlineAlign } from '../types';
import type { Icon } from 'phosphor-react-native';

export type ButtonProps = {
  /** Solo texto: para el estado de carga está `loading` (un Spinner dentro del texto rompe en Android). */
  children: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  color?: 'brand' | 'destructive';
  size?: ButtonSize;
  /** Ícono de Phosphor a la izquierda: el botón lo pinta con el color y el tamaño de la variante. */
  leftSection?: Icon;
  /** Muestra un Spinner en lugar del contenido (mismo ancho) e ignora los toques. */
  loading?: boolean;
  disabled?: boolean;
  /** Sin esto el botón ocupa lo que su contenido, como en Mantine; en mobile casi siempre va a lo ancho. */
  fullWidth?: boolean;
  /** Alineación sin `fullWidth` (`center` en una fila centrada). */
  alignSelf?: InlineAlign;
  accessibilityLabel?: string;
};

/**
 * Equivalente de `Button` de Mantine: variantes filled · outline · light · subtle, colores brand ·
 * destructive, tamaños sm 36 / md 44 / lg 50 dp, radio 12 y peso 600.
 */
export function Button({
  children,
  onPress,
  variant = 'filled',
  color = 'brand',
  size = 'md',
  leftSection: LeftIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  alignSelf = 'flex-start',
  accessibilityLabel,
}: ButtonProps) {
  const colors = useSemanticColors();
  const metrics = BUTTON_SIZES[size];
  const palette = buttonPalette(variant, color, disabled, colors);
  const interactive = !disabled && !loading;

  return (
    <XStack
      theme={palette.theme}
      alignSelf={fullWidth ? 'stretch' : alignSelf}
      height={metrics.height}
      paddingHorizontal={metrics.paddingX}
      borderRadius={RADIUS.lg}
      borderWidth={1}
      borderColor={palette.borderColor}
      backgroundColor={palette.background}
      alignItems="center"
      justifyContent="center"
      onPress={interactive ? onPress : undefined}
      pressStyle={interactive ? { backgroundColor: palette.backgroundPress, opacity: palette.pressOpacity } : undefined}
      hitSlop={touchHitSlop(metrics.height)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: !interactive, busy: loading }}
    >
      <XStack alignItems="center" gap={SPACING.xs} opacity={loading ? 0 : 1}>
        {LeftIcon ? <LeftIcon size={metrics.icon} color={palette.icon} weight="bold" /> : null}
        <Paragraph
          color={palette.color}
          fontSize={metrics.fontSize}
          lineHeight={metrics.fontSize * 1.25}
          fontWeight="600"
          numberOfLines={1}
        >
          {children}
        </Paragraph>
      </XStack>
      {loading ? (
        <YStack position="absolute" top={0} right={0} bottom={0} left={0} alignItems="center" justifyContent="center">
          <Spinner
            size="small"
            color={palette.color}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
        </YStack>
      ) : null}
    </XStack>
  );
}
