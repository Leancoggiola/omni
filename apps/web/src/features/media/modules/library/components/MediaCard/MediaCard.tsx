import { memo } from 'react';
import { ActionIcon, Badge, Box, Card, Select, Stack, Text } from '@mantine/core';

import { openImageLightbox } from '@/shared/ui';

import { MEDIA_STATUS_SELECT_DATA } from '../../utils/mediaStatusOptions';
import { MediaPoster } from '../MediaPoster';

import type { MediaItem, MediaStatus } from '../../../_shared/types';

import { MEDIA_TYPE_LABELS, TMDB_POSTER_W500 } from '@omni/shared/media';
import { TrashIcon } from '@phosphor-icons/react';

interface MediaCardProps {
  item: MediaItem;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

export const MediaCard = memo(function MediaCard({ item, onStatusChange, onDelete }: MediaCardProps) {
  const posterUrl = item.posterPath ? `${TMDB_POSTER_W500}${item.posterPath}` : null;

  return (
    <Card shadow="sm" p="none" radius="md" withBorder h="100%">
      <Card.Section pos="relative">
        <MediaPoster
          key={item.posterPath ?? 'none'}
          variant="cover"
          posterPath={item.posterPath}
          title={item.title}
          onOpen={posterUrl ? () => openImageLightbox({ src: posterUrl, alt: item.title }) : undefined}
        />
        <Badge pos="absolute" top="1.75rem" left="1.5rem" size="sm" variant="filled" color="terracotta">
          {MEDIA_TYPE_LABELS[item.mediaType]}
        </Badge>
        <ActionIcon
          pos="absolute"
          top="1.5rem"
          right="1.5rem"
          variant="filled"
          color="destructive"
          aria-label={`Eliminar ${item.title}`}
          onClick={() => void onDelete(item)}
        >
          <TrashIcon size="1rem" />
        </ActionIcon>
      </Card.Section>

      <Stack gap="xs" p="sm" flex={1}>
        <Text fw={600} size="md" lineClamp={2}>
          {item.title}
        </Text>

        <Box mt="auto">
          <Select
            aria-label={`Estado de ${item.title}`}
            data={MEDIA_STATUS_SELECT_DATA}
            value={item.status}
            onChange={val => val && onStatusChange(item.id, val as MediaStatus)}
            size="sm"
            mod={item.status}
          />
        </Box>
      </Stack>
    </Card>
  );
});
