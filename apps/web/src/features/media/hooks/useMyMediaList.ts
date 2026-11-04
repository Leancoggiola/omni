import { useMemo } from 'react';
import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { MediaItem, MediaListFilters } from '../types';

import { DEFAULT_MEDIA_FILTERS, filterMediaItems, MEDIA_LIST_REFRESH_MS } from '@omni/shared/media';

/**
 * La lista completa en una sola key (`allItems`); `data` es la misma lista con los filtros aplicados en el cliente.
 * Es compartida con la pareja: revalida al enfocar la pestaña y se refresca cada `MEDIA_LIST_REFRESH_MS` solo
 * mientras la pestaña está visible.
 */
export function useMyMediaList(filters: MediaListFilters = DEFAULT_MEDIA_FILTERS) {
  const { data, isLoading, error, mutate } = useSWR<MediaItem[]>(SWR_KEYS.media.list, {
    revalidateOnFocus: true,
    refreshInterval: MEDIA_LIST_REFRESH_MS,
  });

  const filtered = useMemo(() => (data ? filterMediaItems(data, filters) : data), [data, filters]);

  return { data: filtered, allItems: data, isLoading, error, mutate };
}
