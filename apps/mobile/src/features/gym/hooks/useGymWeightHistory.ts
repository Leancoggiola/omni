import { useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';

import { API_KEYS, buildQueryString } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GymWeightEntry } from '@omni/shared/gym';

export const WEIGHT_HISTORY_PAGE_SIZE = 5;

type HistoryPage = PaginatedResponse<GymWeightEntry>;

/**
 * Historial de peso de la variante de un ejercicio, del más nuevo al más viejo, de a `WEIGHT_HISTORY_PAGE_SIZE`:
 * `loadMore` pide la página siguiente (al llegar al final del scroll). Se lee también en planes archivados. El
 * `mutate` global con filtro de SWR no toca las keys de `useSWRInfinite`: quien carga un peso revalida con el `mutate`
 * de este hook.
 */
export function useGymWeightHistory(exerciseId: string | null) {
  const getKey = useCallback(
    (index: number, previous: HistoryPage | null) => {
      if (!exerciseId) return null;
      if (previous && index * WEIGHT_HISTORY_PAGE_SIZE >= previous.total) return null;
      return `${API_KEYS.gym.exerciseWeightHistory(exerciseId)}${buildQueryString({
        limit: WEIGHT_HISTORY_PAGE_SIZE,
        page: index + 1,
      })}`;
    },
    [exerciseId]
  );
  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite<HistoryPage>(getKey);

  const entries = data?.flatMap(page => page.items) ?? [];
  const total = data?.[0]?.total ?? 0;
  const hasMore = entries.length < total;
  const isLoadingMore = data !== undefined && size > data.length && !error;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || error) return;
    void setSize(current => current + 1);
  }, [hasMore, isLoadingMore, error, setSize]);

  return { entries, total, hasMore, isLoading, isLoadingMore, error, loadMore, mutate };
}
