import { memo, useEffect, useState } from 'react';
import { ActionIcon, AspectRatio, Badge, Box, Card, Center, Image, Select, Stack, Text } from '@mantine/core';
import { useHover } from '@mantine/hooks';

import { openImageLightbox } from '@/shared/ui';

import type { MediaItem, MediaStatus } from '../../../_shared/types';

import { MEDIA_STATUS_LABELS, MEDIA_STATUSES, MEDIA_TYPE_LABELS, TMDB_POSTER_W500 } from '@omni/shared/media';
import { FilmSlateIcon, TrashIcon } from '@phosphor-icons/react';

const STATUS_SELECT_DATA = MEDIA_STATUSES.map(value => ({
  value,
  label: MEDIA_STATUS_LABELS[value],
}));

/** TMDB posters are 2∶3 (e.g. 500×750). */
const POSTER_RATIO = 2 / 3;

interface MediaCardProps {
  item: MediaItem;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

export const MediaCard = memo(function MediaCard({ item, onStatusChange, onDelete }: MediaCardProps) {
  const [posterFailed, setPosterFailed] = useState(false);
  const { hovered, ref } = useHover();
  const posterUrl = item.posterPath ? `${TMDB_POSTER_W500}${item.posterPath}` : null;
  const showPoster = Boolean(posterUrl) && !posterFailed;

  useEffect(() => {
    setPosterFailed(false);
  }, [item.posterPath]);

  return (
    <Card shadow="sm" p="none" radius="md" withBorder h="100%" ref={ref}>
      <Card.Section pos="relative">
        <AspectRatio ratio={POSTER_RATIO}>
          {showPoster ? (
            <Image
              src={posterUrl!}
              alt={item.title}
              onError={() => setPosterFailed(true)}
              onClick={() => openImageLightbox({ src: posterUrl!, alt: item.title })}
              style={{ cursor: 'zoom-in' }}
            />
          ) : (
            <Center h="100%" bg="brand.5" c="dimmed">
              <FilmSlateIcon size="6rem" color="white" aria-hidden />
            </Center>
          )}
        </AspectRatio>
        <Badge pos="absolute" top="1.75rem" left="1.5rem" size="sm" variant="light" color="gray">
          {MEDIA_TYPE_LABELS[item.mediaType]}
        </Badge>
        {hovered && (
          <ActionIcon
            pos="absolute"
            top="1.5rem"
            right="1.5rem"
            variant="filled"
            color="destructive"
            onClick={() => void onDelete(item)}
          >
            <TrashIcon size="1rem" />
          </ActionIcon>
        )}
      </Card.Section>

      <Stack gap="xs" p="sm" flex={1}>
        <Text fw={600} size="md" lineClamp={2}>
          {item.title}
        </Text>

        <Box mt="auto">
          <Select
            data={STATUS_SELECT_DATA}
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
