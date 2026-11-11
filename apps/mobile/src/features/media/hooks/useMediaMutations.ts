import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import type { MediaItem, MediaStatus, MediaType } from '@omni/shared/media';

const LIST_KEY = API_KEYS.media.list;

type ListTransform = (items: MediaItem[]) => MediaItem[];

/**
 * Mutaciones sobre la lista (mismo criterio que `useMediaMutations` de web). El optimista parte de la
 * lista que se ve, no de la última confirmada: dos cambios seguidos (estado de A y después de B) no se
 * pisan. La respuesta no se escribe en el cache: al terminar se revalida, porque SWR descarta el
 * resultado de una mutación si arrancó otra después.
 */
export function useMediaMutations() {
  const { mutate } = useSWRConfig();

  const mutateList = useCallback(
    (request: () => Promise<unknown>, transform: ListTransform) =>
      mutate<MediaItem[]>(
        LIST_KEY,
        async () => {
          await request();
          return undefined;
        },
        {
          optimisticData: (_committed, displayed) => transform(displayed ?? []),
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        }
      ),
    [mutate]
  );

  const addToList = useCallback(
    async (tmdbId: number, mediaType: MediaType, status: MediaStatus) => {
      const item = await api.post<MediaItem>(LIST_KEY, { tmdbId, mediaType, status });
      await mutateList(
        () => Promise.resolve(),
        items => [item, ...items]
      );
      return item;
    },
    [mutateList]
  );

  /** Optimista: la pill cambia al instante y vuelve atrás si falla. */
  const updateStatus = useCallback(
    (itemId: string, status: MediaStatus) =>
      mutateList(
        () => api.patch<MediaItem>(API_KEYS.media.listItem(itemId), { status }),
        items => items.map(item => (item.id === itemId ? { ...item, status } : item))
      ).then(() => undefined),
    [mutateList]
  );

  const removeFromList = useCallback(
    (itemId: string) =>
      mutateList(
        () => api.delete(API_KEYS.media.listItem(itemId)),
        items => items.filter(item => item.id !== itemId)
      ).then(() => undefined),
    [mutateList]
  );

  return { addToList, updateStatus, removeFromList };
}
