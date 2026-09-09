import { FC, useMemo } from 'react';
import { Button, SimpleGrid, Stack } from '@mantine/core';

import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

import { MediaCard } from '../MediaCard';
import { MediaListItem } from '../MediaListItem';

import type { MediaItem, MediaStatus } from '../../../_shared/types';

import { FilmSlateIcon, PlusIcon } from '@phosphor-icons/react';

interface MyMediaListProps {
  items: MediaItem[] | undefined;
  isLoading: boolean;
  error?: unknown;
  searchText: string;
  displayMode: string;
  onAdd: () => void;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

export const MyMediaList: FC<MyMediaListProps> = ({
  items,
  isLoading,
  error,
  searchText,
  displayMode,
  onAdd,
  onStatusChange,
  onDelete,
}) => {
  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = searchText.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => item.title.toLowerCase().includes(q));
  }, [items, searchText]);

  if (error) {
    return <ErrorState message="No se pudo cargar tu lista" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<FilmSlateIcon />}
        title="Tu lista está vacía"
        action={
          <Button variant="light" leftSection={<PlusIcon size="1rem" />} onClick={onAdd}>
            Agregar
          </Button>
        }
      />
    );
  }

  if (filteredItems.length === 0) {
    return <EmptyState icon={<FilmSlateIcon />} title="No hay resultados" />;
  }

  return (
    <Stack gap="md">
      {displayMode === 'grid' ? (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
          {filteredItems.map(item => (
            <MediaCard key={item.id} item={item} onStatusChange={onStatusChange} onDelete={onDelete} />
          ))}
        </SimpleGrid>
      ) : (
        filteredItems.map(item => (
          <MediaListItem key={item.id} item={item} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))
      )}
    </Stack>
  );
};
