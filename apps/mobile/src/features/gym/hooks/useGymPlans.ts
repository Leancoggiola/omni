import { GYM_PLANS_PAGE_LIMIT, gymPlansKey } from '@omni/shared/gym';
import useSWR from 'swr';

import { fetcher } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GymPlanStatus, GymPlanSummary } from '@omni/shared/gym';

/** Trae todas las páginas de planes (la API pagina) y las junta en una sola lista. */
async function fetchAllPlans(status: GymPlanStatus | undefined): Promise<PaginatedResponse<GymPlanSummary>> {
  const first = await fetcher<PaginatedResponse<GymPlanSummary>>(gymPlansKey(status));
  const items = [...first.items];
  const pages = Math.ceil(first.total / GYM_PLANS_PAGE_LIMIT);
  for (let page = 2; items.length < first.total && page <= pages; page += 1) {
    const next = await fetcher<PaginatedResponse<GymPlanSummary>>(gymPlansKey(status, page));
    items.push(...next.items);
  }
  return { ...first, items };
}

/**
 * Resúmenes de los planes de la persona (`dayCount`, `exerciseCount`). Sin `status` trae activos y archivados, en el
 * orden de la API: primero los activos, del más nuevo al más viejo. No es un dato compartido con el hogar: no se
 * refresca por intervalo.
 */
export function useGymPlans(status?: GymPlanStatus) {
  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<GymPlanSummary>>(gymPlansKey(status), () =>
    fetchAllPlans(status)
  );

  return { plans: data?.items, isLoading, error, mutate };
}
