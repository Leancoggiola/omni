import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@omni/shared/media';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { TrashIcon } from 'phosphor-react-native';
import { memo } from 'react';
import { Paragraph, XStack, YStack } from 'tamagui';

import { Badge, IconButton, StatusPill } from '@/shared/ui';
import { elevation } from '@/theme/elevation';

import { MediaPoster } from './MediaPoster';

import type { MediaItem } from '@omni/shared/media';

export const POSTER_WIDTH = 56;

type MediaListItemProps = {
  item: MediaItem;
  onStatusPress: (item: MediaItem) => void;
  onDeletePress: (item: MediaItem) => void;
};

/**
 * Fila de la lista (= `MediaListItem` de web con el póster chico de #78): póster, título en 2 líneas,
 * tipo, estado tocable y tacho. El póster no es tocable.
 */
export const MediaListItem = memo(function MediaListItem({ item, onStatusPress, onDeletePress }: MediaListItemProps) {
  return (
    <XStack
      backgroundColor="$backgroundStrong"
      borderRadius={RADIUS.lg}
      padding={SPACING.sm}
      gap={SPACING.sm}
      {...elevation('sm')}
    >
      <MediaPoster posterPath={item.posterPath} width={POSTER_WIDTH} />
      <YStack flex={1} gap={SPACING.xs} justifyContent="space-between">
        <XStack gap={SPACING.xs} alignItems="flex-start">
          <Paragraph flex={1} fontSize={FONT_SIZE.md} fontWeight="600" numberOfLines={2}>
            {item.title}
          </Paragraph>
          <YStack paddingTop={SPACING['3xs']}>
            <Badge color="accent" variant="filled">
              {MEDIA_TYPE_LABELS[item.mediaType]}
            </Badge>
          </YStack>
        </XStack>
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
