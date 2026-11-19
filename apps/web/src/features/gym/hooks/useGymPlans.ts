import useSWR from 'swr';

import { buildQueryString, fetcher, SWR_KEYS } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GymPlanSummary } from '@omni/shared/gym';

const PLANS_PAGE_LIMIT = 100;

/** Trae todas las páginas de planes (la API pagina de a 100 como máximo) y las junta en una sola lista. */
async function fetchAllPlans(firstPageKey: string): Promise<PaginatedResponse<GymPlanSummary>> {
  const first = await fetcher<PaginatedResponse<GymPlanSummary>>(firstPageKey);
  const items = [...first.items];
  for (let page = 2; items.length < first.total && page <= Math.ceil(first.total / PLANS_PAGE_LIMIT); page += 1) {
    const next = await fetcher<PaginatedResponse<GymPlanSummary>>(
      `${SWR_KEYS.gym.plans}${buildQueryString({ limit: PLANS_PAGE_LIMIT, page })}`
    );
    items.push(...next.items);
  }
  return { ...first, items };
}

/**
 * Todos los planes, activos y archivados, en una sola key; el filtro Activos / Archivados es del cliente. La API los
 * ordena con los activos primero y, dentro de cada estado, del más nuevo al más viejo.
 */
export function useGymPlans() {
  const key = `${SWR_KEYS.gym.plans}${buildQueryString({ limit: PLANS_PAGE_LIMIT })}`;
  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<GymPlanSummary>>(key, fetchAllPlans);

  return { plans: data?.items, isLoading, error, mutate };
}
