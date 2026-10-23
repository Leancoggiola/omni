import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { Stack } from '@mantine/core';

import { confirm, getErrorMessage, notifyError, notifySuccess } from '@/shared/ui';

import {
  AddMediaModal,
  buildMediaTmdbKey,
  MediaListToolbar,
  MediaPageHeader,
  MyMediaList,
  useMediaMutations,
  useMyMediaList,
} from './modules';

import type { MediaItem, MediaListFilters, MediaStatus, MediaType } from './modules';

import { hasActiveFilters } from '@omni/shared/media';

export const MediaPage: FC = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<MediaStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [displayMode, onDisplayChange] = useState<string>('grid');
  const [addOpened, setAddOpened] = useState(false);
  const deletingIds = useRef(new Set<string>());

  const filters = useMemo<MediaListFilters>(
    () => ({ status: statusFilter, mediaType: typeFilter, query: searchText }),
    [statusFilter, typeFilter, searchText]
  );

  const {
    data: listData,
    allItems,
    isLoading: listLoading,
    error: listError,
    mutate: retryList,
  } = useMyMediaList(filters);
  const { addToList, updateStatus, removeFromList } = useMediaMutations();

  const existingTmdbIds = useMemo(() => {
    const set = new Set<string>();
    allItems?.forEach(item => set.add(buildMediaTmdbKey(item.mediaType, item.tmdbId)));
    return set;
  }, [allItems]);

  const handleAdd = useCallback(
    async (tmdbId: number, mediaType: MediaType, status: MediaStatus) => {
      await addToList(tmdbId, mediaType, status);
    },
    [addToList]
  );

  const handleStatusChange = useCallback(
    async (id: string, status: MediaStatus) => {
      try {
        await updateStatus(id, status);
        notifySuccess('Estado actualizado');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo actualizar el estado'));
      }
    },
    [updateStatus]
  );

  const handleDelete = useCallback(
    async (item: MediaItem) => {
      if (deletingIds.current.has(item.id)) return;
      deletingIds.current.add(item.id);

      try {
        const confirmed = await confirm({
          title: '¿Eliminar?',
          description: 'Esta acción no se puede deshacer.',
          confirmLabel: 'Eliminar',
        });
        if (!confirmed) return;

        await removeFromList(item.id);
        notifySuccess('Eliminado de tu lista');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo eliminar de la lista'));
      } finally {
        deletingIds.current.delete(item.id);
      }
    },
    [removeFromList]
  );

  return (
    <Stack gap="lg">
      <MediaPageHeader onAdd={() => setAddOpened(true)} displayMode={displayMode} onDisplayChange={onDisplayChange} />

      <MediaListToolbar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />

      <MyMediaList
        items={listData}
        isLoading={listLoading}
        error={listError}
        onRetry={() => retryList()}
        hasActiveFilters={hasActiveFilters(filters)}
        displayMode={displayMode}
        onAdd={() => setAddOpened(true)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      <AddMediaModal
        opened={addOpened}
        onClose={() => setAddOpened(false)}
        onSubmit={handleAdd}
        existingTmdbIds={existingTmdbIds}
      />
    </Stack>
  );
};
