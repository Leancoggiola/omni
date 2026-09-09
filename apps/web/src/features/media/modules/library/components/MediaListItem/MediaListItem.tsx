import { memo } from 'react';
import { ActionIcon, Card, Flex, Group, Select, Text } from '@mantine/core';

import type { MediaItem, MediaStatus } from '../../../_shared/types';

import { MEDIA_STATUS_LABELS, MEDIA_STATUSES } from '@omni/shared/media';
import { FilmSlateIcon, TelevisionIcon, TrashIcon } from '@phosphor-icons/react';

const STATUS_SELECT_DATA = MEDIA_STATUSES.map(value => ({
  value,
  label: MEDIA_STATUS_LABELS[value],
}));

interface MediaListItemProps {
  item: MediaItem;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

export const MediaListItem = memo(function MediaListItem({ item, onStatusChange, onDelete }: MediaListItemProps) {
  const TypeIcon = item.mediaType === 'movie' ? FilmSlateIcon : TelevisionIcon;

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Flex
        direction={{ base: 'column', xs: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', xs: 'center' }}
        gap="md"
      >
        <Group gap="xs" wrap="nowrap" flex={1} miw={0}>
          <TypeIcon size="2rem" aria-hidden style={{ flexShrink: 0 }} />
          <Text fw={600} size="md" lineClamp={1} miw={0}>
            {item.title}
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }} justify="flex-end">
          <Select
            aria-label={`Estado de ${item.title}`}
            data={STATUS_SELECT_DATA}
            value={item.status}
            onChange={val => val && onStatusChange(item.id, val as MediaStatus)}
            size="sm"
            mod={item.status}
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
      </Flex>
    </Card>
  );
});
