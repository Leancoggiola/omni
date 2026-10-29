import { FC } from 'react';
import { Group, Paper, Select, Stack, Tabs, TextInput } from '@mantine/core';

import type { MediaStatus, MediaType } from '../types';

import { MEDIA_STATUS_FILTER_OPTIONS, MEDIA_TYPE_FILTER_OPTIONS } from '@omni/shared/media';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

interface MediaListToolbarProps {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  statusFilter: MediaStatus | 'all';
  onStatusFilterChange: (value: MediaStatus | 'all') => void;
  typeFilter: MediaType | 'all';
  onTypeFilterChange: (value: MediaType | 'all') => void;
}

export const MediaListToolbar: FC<MediaListToolbarProps> = ({
  searchText,
  onSearchTextChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}) => {
  return (
    <Stack gap="md">
      <Paper p="md">
        <Group gap="md" align="flex-end" wrap="wrap">
          <TextInput
            aria-label="Buscar en tu lista"
            placeholder="Buscar..."
            value={searchText}
            onChange={e => onSearchTextChange(e.currentTarget.value)}
            leftSection={<MagnifyingGlassIcon size="1rem" />}
            flex={1}
            size="md"
          />
          <Select
            aria-label="Tipo de contenido"
            data={MEDIA_TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={val => onTypeFilterChange((val as MediaType | 'all') || 'all')}
            w={{ base: '100%', xs: '8.75rem' }}
            size="md"
          />
        </Group>
      </Paper>

      <Tabs
        value={statusFilter}
        onChange={val => onStatusFilterChange((val as MediaStatus | 'all') || 'all')}
        color="brand"
      >
        <Tabs.List>
          {MEDIA_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </Stack>
  );
};
