import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { TmdbSearchResponse } from '../../../_shared/types';

export function useMediaSearch(query: string, page = 1, type = 'multi') {
  const key = query.trim() ? `${SWR_KEYS.media.search}${buildQueryString({ page, query, type })}` : null;

  return useSWR<TmdbSearchResponse>(key, {
    keepPreviousData: true,
  });
}
