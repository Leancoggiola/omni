import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CaretDownIcon } from 'phosphor-react-native';
import { Paragraph, XStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { MEDIA_STATUS_LABELS } from '@omni/shared/media';

import type { MediaStatus } from '@omni/shared/media';

/**
 * Mismos tokens que el Select de estado de web (`.combobox_root[data-*]`): por ver es neutro,
 * viendo es terracota y vista es sage.
 */
const STATUS_TOKENS = {
  to_watch: { background: '$dimmedSurface', border: '$dimmedBorder' },
  watching: { background: '$accentSurface', border: '$accentBorder' },
  watched: { background: '$successSurface', border: '$successBorder' },
} as const satisfies Record<MediaStatus, { background: string; border: string }>;

type StatusPillProps = {
  status: MediaStatus;
  /** Con `onPress` la pill se vuelve un disparador (muestra un caret), p. ej. para abrir un Sheet. */
  onPress?: () => void;
};

export function StatusPill({ status, onPress }: StatusPillProps) {
  const colors = useSemanticColors();
  const tokens = STATUS_TOKENS[status];
  const label = MEDIA_STATUS_LABELS[status];

  return (
    <XStack
      alignSelf="flex-start"
      alignItems="center"
      gap={SPACING['2xs']}
      paddingHorizontal={SPACING.sm}
      paddingVertical={SPACING['2xs']}
      borderRadius={RADIUS.full}
      borderWidth={1}
      backgroundColor={tokens.background}
      borderColor={tokens.border}
      onPress={onPress}
      hitSlop={onPress ? { top: 12, bottom: 12, left: 8, right: 8 } : undefined}
      pressStyle={onPress ? { opacity: 0.7 } : undefined}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `Estado: ${label}. Cambiar estado` : `Estado: ${label}`}
    >
      <Paragraph fontSize={FONT_SIZE.sm} fontWeight="600">
        {label}
      </Paragraph>
      {onPress ? <CaretDownIcon size={12} color={colors.text} weight="bold" /> : null}
    </XStack>
  );
}
