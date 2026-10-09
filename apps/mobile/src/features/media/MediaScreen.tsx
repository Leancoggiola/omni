// tamagui-ignore
import { MEDIA_STATUS_LABELS, MEDIA_STATUSES } from '@omni/shared/media';
import { SPACING } from '@omni/shared/theme';
import { FilmSlateIcon, PlusIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, type ListRenderItem } from 'react-native';
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
  // Alta pendiente de avisar: el toast espera a que se oculte el Modal del sheet (si no, queda tapado).
  // Vive acá y no en el sheet porque reabrirlo durante la salida lo remonta y cortaría su cierre.
  const pendingAddNotice = useRef(false);

  const { data, error, isLoading, mutate } = useMyMediaList();
  const { addToList, updateStatus, removeFromList } = useMediaMutations();
  // Ítems con un sheet de acción abierto o una mutación en curso: un doble toque en la pill o el tacho
  // encolaría un segundo sheet (y un segundo DELETE, que daría 404).
  const busy = useRef(new Set<string>());

  const withItemLock = useCallback(async (item: MediaItem, action: () => Promise<void>) => {
    if (busy.current.has(item.id)) return;
    busy.current.add(item.id);
    try {
      await action();
    } finally {
      busy.current.delete(item.id);
    }
  }, []);

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
      pendingAddNotice.current = true;
    },
    [addToList]
  );

  const flushAddNotice = useCallback(() => {
    if (!pendingAddNotice.current) return;
    pendingAddNotice.current = false;
    notifySuccess('Agregado a tu lista');
  }, []);

  // Si la pantalla se desmonta con el sheet cerrándose (p. ej. logout), el aviso no se pierde.
  useEffect(() => flushAddNotice, [flushAddNotice]);

  // El cambio se ve en la pill (optimista); solo avisa si falla, como acordamos para mobile.
  const handleStatusPress = useCallback(
    (item: MediaItem) =>
      withItemLock(item, async () => {
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
      }),
    [updateStatus, withItemLock]
  );

  const handleDeletePress = useCallback(
    (item: MediaItem) =>
      withItemLock(item, async () => {
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
      }),
    [removeFromList, withItemLock]
  );

  // Handlers y renderItem estables: el `memo` de MediaListItem evita re-render de las filas al tipear.
  const onStatusPress = useCallback((item: MediaItem) => void handleStatusPress(item), [handleStatusPress]);
  const onDeletePress = useCallback((item: MediaItem) => void handleDeletePress(item), [handleDeletePress]);
  const renderItem = useCallback<ListRenderItem<MediaItem>>(
    ({ item }) => <MediaListItem item={item} onStatusPress={onStatusPress} onDeletePress={onDeletePress} />,
    [onStatusPress, onDeletePress]
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
        renderItem={renderItem}
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
        onClosed={flushAddNotice}
      />
    </Screen>
  );
}

function Separator() {
  return <YStack height={SPACING.sm} />;
}
