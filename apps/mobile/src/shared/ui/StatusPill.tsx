import { MEDIA_STATUS_LABELS, type MediaStatus } from '@omni/shared/media';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CaretDownIcon } from 'phosphor-react-native';
import { Paragraph, XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

const STATUS_TOKENS = {
  to_watch: { background: '$disabledSurface', border: '$borderSubtle' },
  watching: { background: '$accentSurface', border: '$accentBorder' },
  watched: { background: '$successSurface', border: '$successBorder' },
} as const satisfies Record<MediaStatus, { background: string; border: string }>;

const PILL_HEIGHT = 28;

type StatusPillProps = {
  status: MediaStatus;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * Pill de estado de v2 (alto 28, borde de 1): por ver es neutro (`disabled-surface`), viendo es terracota y vista es
 * sage, como el Select de estado de web (`MediaStatusSelect.module.scss`). Con `onPress` es un disparador con chevron.
 * `accessibilityLabel` reemplaza al label por defecto; en listas, con el título del ítem ("Estado de Dune: Vista").
 */
export function StatusPill({ status, onPress, accessibilityLabel }: StatusPillProps) {
  const colors = useSemanticColors();
  const tokens = STATUS_TOKENS[status];
  const label = MEDIA_STATUS_LABELS[status];

  return (
    <XStack
      alignSelf="flex-start"
      alignItems="center"
      gap={SPACING['2xs']}
      height={PILL_HEIGHT}
      paddingHorizontal={SPACING.sm}
      borderRadius={RADIUS.full}
      borderWidth={1}
      backgroundColor={tokens.background}
      borderColor={tokens.border}
      onPress={onPress}
      hitSlop={onPress ? { top: 12, bottom: 12, left: 8, right: 8 } : undefined}
      pressStyle={onPress ? { opacity: 0.7 } : undefined}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? (onPress ? `Estado: ${label}. Cambiar estado` : `Estado: ${label}`)}
    >
      <Paragraph fontSize={FONT_SIZE.sm} fontWeight="600" color="$color">
        {label}
      </Paragraph>
      {onPress ? <CaretDownIcon size={14} color={colors.text} /> : null}
    </XStack>
  );
}
