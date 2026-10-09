import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { api, API_KEYS, buildQueryString } from '@/shared/api';

import { useDebouncedValue } from './useDebouncedValue';

import type { MediaItem, MediaStatus, MediaType, TmdbSearchResponse } from '@omni/shared/media';

const LIST_KEY = API_KEYS.media.list;

/** Mínimo de caracteres para buscar en TMDB, como el `TmdbSearchField` de web. */
export const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * La lista completa en una sola key: los filtros se aplican en el cliente (`filterMediaItems`), igual
 * que web. Así "ya en tu lista" ve todos los títulos aunque haya un filtro activo.
 */
export function useMyMediaList() {
  const { data, error, isLoading, mutate } = useSWR<MediaItem[]>(LIST_KEY);
  return { data, error, isLoading, mutate };
}

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

/** Búsqueda en TMDB (películas y series) con debounce; sin query suficiente no pide nada. */
export function useMediaSearch(query: string) {
  const raw = query.trim();
  const tooShort = raw.length < MIN_SEARCH_LENGTH;
  const debounced = useDebouncedValue(raw, SEARCH_DEBOUNCE_MS);
  const enabled = !tooShort && debounced.length >= MIN_SEARCH_LENGTH;
  const key = enabled
    ? `${API_KEYS.media.search}${buildQueryString({ query: debounced, page: 1, type: 'multi' })}`
    : null;
  const { data, error, isValidating, mutate } = useSWR<TmdbSearchResponse>(key, { keepPreviousData: true });

  return {
    results: enabled ? (data?.results ?? []) : [],
    error: enabled ? error : undefined,
    /** Busca mientras corre el debounce o la request; los resultados anteriores siguen a la vista. */
    isLoading: !tooShort && (raw !== debounced || isValidating),
    /** El texto (sin debounce) no llega al mínimo. */
    tooShort,
    retry: () => void mutate(),
  };
}
