import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable } from 'react-native';
import { Button, Input, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { mutate as globalMutate } from 'swr';
import { FilmSlateIcon } from 'phosphor-react-native';

import { ApiError, API_KEYS } from '@/shared/api';
import { ProfileAvatarButton, Screen, ScreenHeader } from '@/shared/ui';
import { MEDIA_STATUS_LABELS, MEDIA_STATUSES, MEDIA_TYPE_LABELS } from '@omni/shared/media';

import { MediaCard } from './components/MediaCard';
import { useMediaMutations, useMediaSearch, useMyMediaList } from './hooks';
import { buildMediaTmdbKey, getTmdbResultKey, getTmdbResultTitle, resolveMediaType } from './utils/tmdb';

import type { MediaItem, MediaStatus, MediaType } from '@omni/shared/media';

export function MediaScreen() {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<MediaStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [addQuery, setAddQuery] = useState('');
  const [addStatus, setAddStatus] = useState<MediaStatus>('to_watch');
  const [adding, setAdding] = useState(false);

  const filters = useMemo(
    () => ({
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(typeFilter !== 'all' && { mediaType: typeFilter }),
    }),
    [statusFilter, typeFilter]
  );

  const { data, isLoading, mutate } = useMyMediaList(filters);
  const { addToList, updateStatus, removeFromList } = useMediaMutations();
  const { results, isLoading: searching } = useMediaSearch(addQuery);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(item => item.title.toLowerCase().includes(q));
  }, [data, searchText]);

  const existingTmdbIds = useMemo(() => {
    const set = new Set<string>();
    data?.forEach(item => set.add(buildMediaTmdbKey(item.mediaType, item.tmdbId)));
    return set;
  }, [data]);

  const refreshList = useCallback(async () => {
    await mutate();
    await globalMutate(key => typeof key === 'string' && key.startsWith(API_KEYS.media.list));
  }, [mutate]);

  const handleAdd = useCallback(
    async (tmdbId: number, mediaType: MediaType) => {
      setAdding(true);
      try {
        await addToList(tmdbId, mediaType, addStatus);
        setAddQuery('');
        await refreshList();
        Alert.alert('Listo', 'Agregado a tu lista');
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          Alert.alert('Ya en tu lista', err.message);
        } else {
          Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo agregar');
        }
      } finally {
        setAdding(false);
      }
    },
    [addStatus, addToList, refreshList]
  );

  const handleStatus = useCallback(
    (item: MediaItem) => {
      const buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] =
        MEDIA_STATUSES.map(status => ({
          text: MEDIA_STATUS_LABELS[status],
          onPress: () => {
            void (async () => {
              try {
                await updateStatus(item.id, status);
                await refreshList();
              } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
              }
            })();
          },
        }));
      buttons.push({ text: 'Cancelar', style: 'cancel' });
      Alert.alert('Cambiar estado', item.title, buttons);
    },
    [refreshList, updateStatus]
  );

  const handleDelete = useCallback(
    (item: MediaItem) => {
      Alert.alert('¿Eliminar?', item.title, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeFromList(item.id);
                await refreshList();
              } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
              }
            })();
          },
        },
      ]);
    },
    [refreshList, removeFromList]
  );

  return (
    <Screen>
      {/* Título de la página, como el `PageHeader` de web: no es el label de navegación del registro. */}
      <ScreenHeader
        icon={FilmSlateIcon}
        title="Películas y Series"
        subtitle="Tu lista de seguimiento"
        actions={<ProfileAvatarButton />}
      />

      <Input placeholder="Buscar en tu lista" value={searchText} onChangeText={setSearchText} />

      <XStack gap="$2" flexWrap="wrap">
        <Button size="$2" chromeless={statusFilter !== 'all'} onPress={() => setStatusFilter('all')}>
          Todos
        </Button>
        {MEDIA_STATUSES.map(status => (
          <Button key={status} size="$2" chromeless={statusFilter !== status} onPress={() => setStatusFilter(status)}>
            {MEDIA_STATUS_LABELS[status]}
          </Button>
        ))}
      </XStack>

      <XStack gap="$2">
        <Button size="$2" chromeless={typeFilter !== 'all'} onPress={() => setTypeFilter('all')}>
          Todos
        </Button>
        <Button size="$2" chromeless={typeFilter !== 'movie'} onPress={() => setTypeFilter('movie')}>
          Películas
        </Button>
        <Button size="$2" chromeless={typeFilter !== 'tv'} onPress={() => setTypeFilter('tv')}>
          Series
        </Button>
      </XStack>

      <YStack gap="$2">
        <Paragraph fontWeight="600">Agregar desde TMDB</Paragraph>
        <Input placeholder="Buscar película o serie…" value={addQuery} onChangeText={setAddQuery} />
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <Paragraph size="$2" theme="alt2">
            Estado:
          </Paragraph>
          {MEDIA_STATUSES.map(status => (
            <Button key={status} size="$2" chromeless={addStatus !== status} onPress={() => setAddStatus(status)}>
              {MEDIA_STATUS_LABELS[status]}
            </Button>
          ))}
        </XStack>
        {searching ? <Spinner /> : null}
        {results.slice(0, 5).map(result => {
          const mediaType = resolveMediaType(result);
          const key = getTmdbResultKey(result);
          const alreadyAdded = existingTmdbIds.has(key);
          const disabled = adding || alreadyAdded;

          return (
            <Pressable
              key={key}
              disabled={disabled}
              onPress={() => {
                if (!alreadyAdded) void handleAdd(result.id, mediaType);
              }}
            >
              <XStack gap="$2" paddingVertical="$2" alignItems="center" opacity={alreadyAdded ? 0.55 : 1}>
                <Paragraph flex={1}>
                  {getTmdbResultTitle(result)} ({MEDIA_TYPE_LABELS[mediaType]}){alreadyAdded ? ' · Ya en tu lista' : ''}
                </Paragraph>
                <Button size="$2" disabled={disabled}>
                  +
                </Button>
              </XStack>
            </Pressable>
          );
        })}
      </YStack>

      {isLoading ? (
        <Spinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={<Paragraph theme="alt2">No hay items en tu lista</Paragraph>}
          renderItem={({ item }) => <MediaCard item={item} onStatusPress={handleStatus} onDeletePress={handleDelete} />}
        />
      )}
    </Screen>
  );
}
