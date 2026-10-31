import { memo } from 'react';
import { ActionIcon, Badge, Box, Card, Stack, Text } from '@mantine/core';

import { useItemAuthor } from '@/core/household';
import { AuthorTag } from '@/shared/ui';

import { MediaPoster } from './MediaPoster';
import { MediaStatusSelect } from './MediaStatusSelect/MediaStatusSelect';

import type { MediaItem, MediaStatus } from '../types';

import { MEDIA_TYPE_LABELS } from '@omni/shared/media';
import { TrashIcon } from '@phosphor-icons/react';

interface MediaCardProps {
  item: MediaItem;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

export const MediaCard = memo(function MediaCard({ item, onStatusChange, onDelete }: MediaCardProps) {
  const author = useItemAuthor(item.createdById);

  return (
    <Card p="none" bg="var(--mantine-color-surfaces-card)" bd="1px solid var(--mantine-color-border-subtle)" h="100%">
      <Card.Section pos="relative">
        <MediaPoster
          key={item.posterPath ?? 'none'}
          variant="cover"
          posterPath={item.posterPath}
          title={item.title}
          zoomable
        />
        <Badge pos="absolute" top="1.75rem" left="1.5rem" size="sm" variant="filled" color="terracotta">
          {MEDIA_TYPE_LABELS[item.mediaType]}
        </Badge>
        <ActionIcon
          pos="absolute"
          top="1.5rem"
          right="1.5rem"
          variant="default"
          radius="full"
          size="2.5rem"
          c="var(--mantine-color-icons-destructive)"
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

        {author && <AuthorTag author={author} />}

        <Box mt="auto">
          <MediaStatusSelect
            aria-label={`Estado de ${item.title}`}
            status={item.status}
            onStatusChange={status => onStatusChange(item.id, status)}
            size="sm"
          />
        </Box>
      </Stack>
    </Card>
  );
});
