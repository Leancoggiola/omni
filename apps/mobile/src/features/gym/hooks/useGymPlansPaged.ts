import { gymPlansKey } from '@omni/shared/gym';
import { useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';

import { GYM_PLANS_LIST_PAGE_SIZE } from '../utils/gymKeys';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GymPlanStatus, GymPlanSummary } from '@omni/shared/gym';

type PlansPage = PaginatedResponse<GymPlanSummary>;

/**
 * Planes de un estado de a `GYM_PLANS_LIST_PAGE_SIZE` (la API ordena del más nuevo al más viejo): `loadMore` pide la
 * página siguiente ("Ver más" de "Tus planes"). Es la lista de la pantalla de planes; la pantalla del gimnasio usa
 * `useGymPlans`, que junta todas las páginas.
 */
export function useGymPlansPaged(status: GymPlanStatus) {
  const getKey = useCallback(
    (index: number, previous: PlansPage | null) => {
      if (previous && index * GYM_PLANS_LIST_PAGE_SIZE >= previous.total) return null;
      return gymPlansKey(status, index + 1, GYM_PLANS_LIST_PAGE_SIZE);
    },
    [status]
  );
  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite<PlansPage>(getKey);

  const plans = data?.flatMap(page => page.items);
  const hasMore = plans !== undefined && plans.length < (data?.[0]?.total ?? 0);
  const isLoadingMore = data !== undefined && size > data.length && !error;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || error) return;
    void setSize(current => current + 1);
  }, [hasMore, isLoadingMore, error, setSize]);

  return { plans, hasMore, isLoading, isLoadingMore, error, loadMore, mutate };
}
