import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GatheringSummary, ListGatheringsParams } from '@omni/shared/split-expenses';

const DEFAULT_GATHERING_PARAMS: ListGatheringsParams = { page: 1, limit: 50 };

export function useGatherings(params: Partial<ListGatheringsParams> = {}) {
  const query = { ...DEFAULT_GATHERING_PARAMS, ...params };
  const key = `${SWR_KEYS.splitExpenses.gatherings}${buildQueryString(query)}`;
  const { data, error, isLoading } = useSWR<PaginatedResponse<GatheringSummary>>(key);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? query.page,
    limit: data?.limit ?? query.limit,
    isLoading,
    error,
  };
}
