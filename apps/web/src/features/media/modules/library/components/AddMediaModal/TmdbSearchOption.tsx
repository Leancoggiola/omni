import { memo } from 'react';
import { Combobox, Group, Image, Stack, Text } from '@mantine/core';

import { getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from '../../../_shared/utils/tmdb';

import type { TmdbMediaResult } from '../../../_shared/types';

import { MEDIA_TYPE_LABELS, TMDB_POSTER_W500 } from '@omni/shared/media';

interface TmdbSearchOptionProps {
  item: TmdbMediaResult;
  alreadyAdded: boolean;
}

export const TmdbSearchOption = memo(function TmdbSearchOption({ item, alreadyAdded }: TmdbSearchOptionProps) {
  const type = resolveMediaType(item);
  const title = getTmdbResultTitle(item);
  const key = getTmdbResultKey(item);

  return (
    <Combobox.Option value={key} disabled={alreadyAdded}>
      <Group gap="sm" wrap="nowrap">
        <Image
          src={item.poster_path ? `${TMDB_POSTER_W500}${item.poster_path}` : undefined}
          w="2.25rem"
          h="3.375rem"
          radius="sm"
          alt={title}
        />
        <Stack gap="none" style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {MEDIA_TYPE_LABELS[type]}
            {alreadyAdded ? ' · Ya en tu lista' : ''}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  );
});
