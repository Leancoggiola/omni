import { FC } from 'react';
import { Button, SimpleGrid, Stack, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

import { MediaCard } from './MediaCard';
import { MediaListItem } from './MediaListItem';

import type { MediaItem, MediaStatus } from '../types';

import { FilmSlateIcon, PlusIcon } from '@phosphor-icons/react';

interface MyMediaListProps {
  items: MediaItem[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry: () => void | Promise<unknown>;
  hasActiveFilters: boolean;
  displayMode: string;
  onAdd: () => void;
  onStatusChange: (id: string, status: MediaStatus) => void;
  onDelete: (item: MediaItem) => void | Promise<void>;
}

/**
 * Lista ya filtrada (`useMyMediaList`). Sin ítems distingue "sin resultados" (hay filtros activos, como en mobile) de
 * "lista vacía" (con el botón de agregar).
 */
export const MyMediaList: FC<MyMediaListProps> = ({
  items,
  isLoading,
  error,
  onRetry,
  hasActiveFilters,
  displayMode,
  onAdd,
  onStatusChange,
  onDelete,
}) => {
  const theme = useMantineTheme();
  const isWide = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`, undefined, {
    getInitialValueInEffect: false,
  });

  if (error) {
    return <ErrorState message="No se pudo cargar tu lista" onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!items || items.length === 0) {
    if (hasActiveFilters) {
      return <EmptyState icon={<FilmSlateIcon />} title="No hay resultados" />;
    }

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

  return (
    <Stack gap="md">
      {isWide && displayMode === 'grid' ? (
        <SimpleGrid cols={{ base: 3, lg: 4 }} spacing="md">
          {items.map(item => (
            <MediaCard key={item.id} item={item} onStatusChange={onStatusChange} onDelete={onDelete} />
          ))}
        </SimpleGrid>
      ) : (
        items.map(item => (
          <MediaListItem key={item.id} item={item} onStatusChange={onStatusChange} onDelete={onDelete} />
        ))
      )}
    </Stack>
  );
};
