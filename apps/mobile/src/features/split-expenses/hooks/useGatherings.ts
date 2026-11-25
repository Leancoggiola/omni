import useSWR from 'swr';

import { API_KEYS, buildQueryString } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GatheringSummary } from '@omni/shared/split-expenses';

const GATHERINGS_QUERY = { page: 1, limit: 50 };

/** Las juntadas de la persona, en el orden de la API (primero las activas, de la más nueva a la más vieja). */
export function useGatherings() {
  const key = `${API_KEYS.splitExpenses.gatherings}${buildQueryString(GATHERINGS_QUERY)}`;
  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<GatheringSummary>>(key);
  return { gatherings: data?.items, isLoading, error, mutate };
}
