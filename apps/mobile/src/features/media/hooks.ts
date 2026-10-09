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

/** Mutaciones sobre el cache de la lista, como `useMediaMutations` de web (sin refetch). */
export function useMediaMutations() {
  const { mutate } = useSWRConfig();

  const addToList = useCallback(
    async (tmdbId: number, mediaType: MediaType, status: MediaStatus) => {
      const item = await api.post<MediaItem>(LIST_KEY, { tmdbId, mediaType, status });
      await mutate(LIST_KEY, (current: MediaItem[] | undefined) => [item, ...(current ?? [])], {
        revalidate: false,
      });
      return item;
    },
    [mutate]
  );

  /** Optimista: la pill cambia al instante y vuelve atrás si falla. */
  const updateStatus = useCallback(
    async (itemId: string, status: MediaStatus) => {
      await mutate(
        LIST_KEY,
        async (current: MediaItem[] | undefined) => {
          const updated = await api.patch<MediaItem>(API_KEYS.media.listItem(itemId), { status });
          return current?.map(item => (item.id === itemId ? updated : item)) ?? [updated];
        },
        {
          optimisticData: (current: MediaItem[] | undefined) =>
            current?.map(item => (item.id === itemId ? { ...item, status } : item)) ?? [],
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      );
    },
    [mutate]
  );

  const removeFromList = useCallback(
    async (itemId: string) => {
      await mutate(
        LIST_KEY,
        async (current: MediaItem[] | undefined) => {
          await api.delete(API_KEYS.media.listItem(itemId));
          return current?.filter(item => item.id !== itemId) ?? [];
        },
        {
          optimisticData: (current: MediaItem[] | undefined) => current?.filter(item => item.id !== itemId) ?? [],
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      );
    },
    [mutate]
  );

  return { addToList, updateStatus, removeFromList };
}

/** Búsqueda en TMDB (películas y series) con debounce; sin query suficiente no pide nada. */
export function useMediaSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const enabled = debounced.length >= MIN_SEARCH_LENGTH;
  const key = enabled
    ? `${API_KEYS.media.search}${buildQueryString({ query: debounced, page: 1, type: 'multi' })}`
    : null;
  const { data, error, isLoading } = useSWR<TmdbSearchResponse>(key, { keepPreviousData: true });

  return {
    results: enabled ? (data?.results ?? []) : [],
    error,
    isLoading,
    /** El texto todavía no llegó al mínimo (o el debounce aún no lo tomó). */
    tooShort: !enabled,
  };
}
