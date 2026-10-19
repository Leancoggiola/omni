import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { SWR_KEYS } from '@/shared/api';

import type { MediaFilters, MediaItem } from '../../../_shared/types';

export function useMyMediaList(filters: MediaFilters = {}) {
  const { data, isLoading, error, mutate } = useSWRImmutable<MediaItem[]>(SWR_KEYS.media.list);

  const filtered = useMemo(() => {
    if (!data) return data;

    return data.filter(item => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.mediaType && item.mediaType !== filters.mediaType) return false;
      return true;
    });
  }, [data, filters.mediaType, filters.status]);

  return { data: filtered, allItems: data, isLoading, error, mutate };
}
