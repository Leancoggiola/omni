import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type { MediaItem, MediaStatus, MediaType } from '../../types';

type ListTransform = (items: MediaItem[]) => MediaItem[];

/**
 * El optimista parte de la lista que se ve, no de la última confirmada: dos cambios seguidos (estado
 * de A y después de B) no se pisan. La respuesta no se escribe en el cache: al terminar se revalida,
 * porque SWR descarta el resultado de una mutación si arrancó otra después. Mismo criterio en mobile.
 */
export function useMediaMutations() {
  const { mutate } = useSWRConfig();
  const listKey = SWR_KEYS.media.list;

  const mutateList = useCallback(
    <T>(request: () => Promise<T>, transform: ListTransform) => {
      let result: T | undefined;
      return mutate<MediaItem[]>(
        listKey,
        async () => {
          result = await request();
          return undefined;
        },
        {
          optimisticData: (_committed, displayed) => transform(displayed ?? []),
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        }
      ).then(() => result as T);
    },
    [mutate, listKey]
  );

  const addToList = useCallback(
    async (tmdbId: number, mediaType: MediaType, status: MediaStatus = 'to_watch') => {
      const item = await api.post<MediaItem>(listKey, { tmdbId, mediaType, status });
      await mutateList(
        () => Promise.resolve(item),
        items => [item, ...items]
      );
      return item;
    },
    [mutateList, listKey]
  );

  const updateStatus = useCallback(
    (itemId: string, status: MediaStatus) =>
      mutateList(
        () => api.patch<MediaItem>(SWR_KEYS.media.listItem(itemId), { status }),
        items => items.map(item => (item.id === itemId ? { ...item, status } : item))
      ),
    [mutateList]
  );

  const removeFromList = useCallback(
    async (itemId: string) => {
      await mutateList(
        () => api.delete(SWR_KEYS.media.listItem(itemId)),
        items => items.filter(item => item.id !== itemId)
      );
    },
    [mutateList]
  );

  return { addToList, updateStatus, removeFromList };
}
