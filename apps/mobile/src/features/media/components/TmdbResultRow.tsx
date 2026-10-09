import { MEDIA_TYPE_LABELS } from '@omni/shared/media';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CheckIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useSemanticColors } from '@/core/theme';

import { MediaPoster } from './MediaPoster';

import type { MediaType } from '@omni/shared/media';

const THUMB_WIDTH = 36;

type TmdbResultRowProps = {
  title: string;
  mediaType: MediaType;
  posterPath: string | null;
  selected: boolean;
  /** Ya está en la lista: se muestra atenuado y no se puede elegir. */
  alreadyAdded: boolean;
  onPress: () => void;
};

/** Opción de búsqueda de TMDB (= `TmdbSearchOption` de web): miniatura, título y tipo. */
export const TmdbResultRow = memo(function TmdbResultRow({
  title,
  mediaType,
  posterPath,
  selected,
  alreadyAdded,
  onPress,
}: TmdbResultRowProps) {
  const colors = useSemanticColors();
  const type = MEDIA_TYPE_LABELS[mediaType];

  return (
    <XStack
      alignItems="center"
      gap={SPACING.sm}
      padding={SPACING.xs}
      borderRadius={RADIUS.md}
      backgroundColor={selected ? '$primarySurface' : 'transparent'}
      opacity={alreadyAdded ? 0.5 : 1}
      onPress={alreadyAdded ? undefined : onPress}
      pressStyle={alreadyAdded ? undefined : { backgroundColor: '$hover' }}
      accessible
      accessibilityRole="radio"
      accessibilityLabel={`${title}, ${type}${alreadyAdded ? ', ya en tu lista' : ''}`}
      accessibilityState={{ checked: selected, disabled: alreadyAdded }}
    >
      <MediaPoster posterPath={posterPath} width={THUMB_WIDTH} />
      <YStack flex={1} gap={SPACING['3xs']}>
        <Paragraph fontSize={FONT_SIZE.md} fontWeight="500" numberOfLines={1}>
          {title}
        </Paragraph>
        <Paragraph fontSize={FONT_SIZE.sm} color="$dimmed">
          {type}
          {alreadyAdded ? ' · Ya en tu lista' : ''}
        </Paragraph>
      </YStack>
      {selected ? <CheckIcon size={20} weight="bold" color={colors.primary} /> : null}
    </XStack>
  );
});
