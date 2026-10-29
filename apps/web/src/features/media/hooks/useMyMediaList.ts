import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { SWR_KEYS } from '@/shared/api';

import type { MediaItem, MediaListFilters } from '../types';

import { DEFAULT_MEDIA_FILTERS, filterMediaItems } from '@omni/shared/media';

/** La lista completa en una sola key (`allItems`); `data` es la misma lista con los filtros aplicados en el cliente. */
export function useMyMediaList(filters: MediaListFilters = DEFAULT_MEDIA_FILTERS) {
  const { data, isLoading, error, mutate } = useSWRImmutable<MediaItem[]>(SWR_KEYS.media.list);

  const filtered = useMemo(() => (data ? filterMediaItems(data, filters) : data), [data, filters]);

  return { data: filtered, allItems: data, isLoading, error, mutate };
}
