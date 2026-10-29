import { memo } from 'react';
import { ActionIcon, Badge, Card, Group, Stack, Text } from '@mantine/core';

import { MediaPoster } from './MediaPoster';
import { MediaStatusSelect } from './MediaStatusSelect/MediaStatusSelect';

import type { MediaItem, MediaStatus } from '../types';

import { MEDIA_TYPE_LABELS } from '@omni/shared/media';
import { TrashIcon } from '@phosphor-icons/react';

interface MediaListItemProps {
  item: MediaItem;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

/**
 * Fila de la lista: póster, título en 2 líneas con el tipo a su derecha, y debajo el estado y el tacho.
 * Un título largo baja a la segunda línea, no empuja al badge.
 */
export const MediaListItem = memo(function MediaListItem({ item, onStatusChange, onDelete }: MediaListItemProps) {
  return (
    <Card p="sm" bg="var(--mantine-color-surfaces-card)" bd="1px solid var(--mantine-color-border-subtle)">
      <Group gap="sm" wrap="nowrap" align="stretch">
        <MediaPoster key={item.posterPath ?? 'none'} posterPath={item.posterPath} />
        <Stack gap="xs" flex={1} miw={0} justify="space-between">
          <Group gap="xs" wrap="nowrap" align="flex-start" justify="space-between">
            <Text fw={600} size="md" lineClamp={2} miw={0}>
              {item.title}
            </Text>
            <Badge size="sm" variant="filled" color="terracotta" style={{ flexShrink: 0 }}>
              {MEDIA_TYPE_LABELS[item.mediaType]}
            </Badge>
          </Group>
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <MediaStatusSelect
              aria-label={`Estado de ${item.title}`}
              status={item.status}
              onStatusChange={status => onStatusChange(item.id, status)}
              size="sm"
              flex={1}
              maw="11.25rem"
            />
            <ActionIcon
              variant="subtle"
              color="destructive"
              aria-label={`Eliminar ${item.title}`}
              onClick={() => void onDelete(item)}
            >
              <TrashIcon size="1rem" />
            </ActionIcon>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
});
