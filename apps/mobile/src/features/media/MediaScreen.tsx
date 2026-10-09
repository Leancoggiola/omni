// tamagui-ignore
import { MEDIA_STATUS_LABELS, MEDIA_STATUSES } from '@omni/shared/media';
import { SPACING } from '@omni/shared/theme';
import { FilmSlateIcon, PlusIcon } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { YStack } from 'tamagui';

import {
  actionSheet,
  Button,
  confirm,
  EmptyState,
  ErrorState,
  getErrorMessage,
  LoadingState,
  notifyError,
  notifySuccess,
  Screen,
  ScreenHeader,
} from '@/shared/ui';

import { AddMediaFab, FAB_SIZE } from './components/AddMediaFab';
import { AddMediaSheet } from './components/AddMediaSheet';
import { MediaListItem } from './components/MediaListItem';
import { MediaToolbar } from './components/MediaToolbar';
import { useMediaMutations, useMyMediaList } from './hooks';
import { DEFAULT_MEDIA_FILTERS, filterMediaItems, hasActiveFilters, type MediaListFilters } from './utils/filterMedia';
import { buildMediaTmdbKey } from './utils/tmdb';

import type { MediaItem, MediaStatus, MediaType } from '@omni/shared/media';

const STATUS_OPTIONS = MEDIA_STATUSES.map(value => ({ value, label: MEDIA_STATUS_LABELS[value] }));

export function MediaScreen() {
  const [filters, setFilters] = useState<MediaListFilters>(DEFAULT_MEDIA_FILTERS);
  const [addOpen, setAddOpen] = useState(false);
  // Remonta el sheet en cada apertura: arranca sin búsqueda ni selección (como el modal de web).
  const [addKey, setAddKey] = useState(0);

  const { data, error, isLoading, mutate } = useMyMediaList();
  const { addToList, updateStatus, removeFromList } = useMediaMutations();

  const items = useMemo(() => filterMediaItems(data ?? [], filters), [data, filters]);

  const existingTmdbIds = useMemo(
    () => new Set((data ?? []).map(item => buildMediaTmdbKey(item.mediaType, item.tmdbId))),
    [data]
  );

  const openAdd = useCallback(() => {
    setAddKey(key => key + 1);
    setAddOpen(true);
  }, []);

  const handleAdd = useCallback(
    async (tmdbId: number, mediaType: MediaType, status: MediaStatus) => {
      await addToList(tmdbId, mediaType, status);
    },
    [addToList]
  );

  // El cambio se ve en la pill (optimista); solo avisa si falla, como acordamos para mobile.
  const handleStatusPress = useCallback(
    async (item: MediaItem) => {
      const status = await actionSheet({
        title: 'Cambiar estado',
        description: item.title,
        options: STATUS_OPTIONS,
        value: item.status,
      });
      if (!status || status === item.status) return;
      try {
        await updateStatus(item.id, status);
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo actualizar el estado'));
      }
    },
    [updateStatus]
  );

  const handleDeletePress = useCallback(
    async (item: MediaItem) => {
      const confirmed = await confirm({
        title: '¿Eliminar?',
        description: 'Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
      });
      if (!confirmed) return;
      try {
        await removeFromList(item.id);
        notifySuccess('Eliminado de tu lista');
      } catch (err) {
        notifyError(getErrorMessage(err, 'No se pudo eliminar de la lista'));
      }
    },
    [removeFromList]
  );

  const renderEmpty = () => {
    if (error) return <ErrorState message="No se pudo cargar tu lista" onRetry={() => void mutate()} />;
    if (isLoading) return <LoadingState />;
    if (hasActiveFilters(filters)) return <EmptyState icon={FilmSlateIcon} title="No hay resultados" />;
    return (
      <EmptyState
        icon={FilmSlateIcon}
        title="Tu lista está vacía"
        action={
          <Button variant="light" leftSection={PlusIcon} alignSelf="center" onPress={openAdd}>
            Agregar
          </Button>
        }
      />
    );
  };

  // Con error, la lista que quedó en cache no se muestra: el error se ve siempre (regla de oro 0).
  const listData = error ? [] : items;

  return (
    <Screen>
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MediaListItem
            item={item}
            onStatusPress={i => void handleStatusPress(i)}
            onDeletePress={i => void handleDeletePress(i)}
          />
        )}
        ListHeaderComponent={
          <YStack gap={SPACING.md} paddingBottom={SPACING.md}>
            {/* Título de la página, como el `PageHeader` de web: no es el label de navegación del registro. */}
            <ScreenHeader icon={FilmSlateIcon} title="Películas y Series" subtitle="Tu lista de seguimiento" />
            <MediaToolbar filters={filters} onChange={setFilters} />
          </YStack>
        }
        ListEmptyComponent={renderEmpty()}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingBottom: FAB_SIZE + SPACING.md * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
      <AddMediaFab onPress={openAdd} />
      <AddMediaSheet
        key={addKey}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingTmdbIds={existingTmdbIds}
        onSubmit={handleAdd}
      />
    </Screen>
  );
}

function Separator() {
  return <YStack height={SPACING.sm} />;
}
