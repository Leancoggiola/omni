import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@omni/shared/media';
import { FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } from '@omni/shared/theme';
import { TrashIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { useItemAuthor } from '@/core/household';
import { useColorSchemeControl } from '@/core/theme';
import { AuthorTag, Badge, IconButton, StatusPill } from '@/shared/ui';
import { glassElevation } from '@/theme/elevation';

import { MediaPoster } from './MediaPoster';

import type { MediaItem } from '@omni/shared/media';

export const POSTER_WIDTH = 56;

type MediaListItemProps = {
  item: MediaItem;
  onStatusPress: (item: MediaItem) => void;
  onDeletePress: (item: MediaItem) => void;
};

/**
 * Fila de la lista (= `MediaListItem` de web con el póster chico de #78) en una card glass de radio 24: póster,
 * título en 2 líneas, tipo, pill de estado tocable con chevron y tacho. El póster no es tocable.
 */
export const MediaListItem = memo(function MediaListItem({ item, onStatusPress, onDeletePress }: MediaListItemProps) {
  const { colorScheme } = useColorSchemeControl();
  const author = useItemAuthor(item.createdById);

  return (
    <XStack
      backgroundColor="$surfaceGlass"
      borderWidth={1}
      borderColor="$glassBorder"
      borderRadius={RADIUS.xl}
      padding={SPACING.sm}
      gap={SPACING.sm}
      {...glassElevation('card', colorScheme)}
    >
      <MediaPoster posterPath={item.posterPath} width={POSTER_WIDTH} />
      <YStack flex={1} gap={SPACING.xs} justifyContent="space-between">
        <XStack gap={SPACING.xs} alignItems="flex-start">
          <Paragraph flex={1} fontSize={FONT_SIZE.lg} lineHeight={LINE_HEIGHT.xl} fontWeight="600" numberOfLines={2}>
            {item.title}
          </Paragraph>
          <YStack paddingTop={SPACING['3xs']}>
            <Badge color="accent" variant="filled">
              {MEDIA_TYPE_LABELS[item.mediaType]}
            </Badge>
          </YStack>
        </XStack>
        {author ? <AuthorTag author={author} /> : null}
        <XStack alignItems="center" justifyContent="space-between">
          <StatusPill
            status={item.status}
            onPress={() => onStatusPress(item)}
            accessibilityLabel={`Estado de ${item.title}: ${MEDIA_STATUS_LABELS[item.status]}. Cambiar estado`}
          />
          <IconButton
            icon={TrashIcon}
            variant="subtle"
            color="destructive"
            size="sm"
            accessibilityLabel={`Eliminar ${item.title}`}
            onPress={() => onDeletePress(item)}
          />
        </XStack>
      </YStack>
    </XStack>
  );
});
