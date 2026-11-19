import useSWR from 'swr';

import { buildQueryString, SWR_KEYS } from '@/shared/api';

import type { PaginatedResponse } from '@omni/shared/common';
import type { GymWeightEntry } from '@omni/shared/gym';

export const WEIGHT_HISTORY_PAGE_SIZE = 5;

/**
 * Una página del historial de peso de la variante del ejercicio (`exerciseId` es la fila del plan), del más nuevo al
 * más viejo. Se puede leer también en planes archivados. Con `enabled` en `false` no pide nada.
 */
export function useGymWeightHistory(exerciseId: string, page: number, enabled = true) {
  const key = enabled
    ? `${SWR_KEYS.gym.exerciseWeightHistory(exerciseId)}${buildQueryString({
        limit: WEIGHT_HISTORY_PAGE_SIZE,
        page,
      })}`
    : null;
  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<GymWeightEntry>>(key);

  return { entries: data?.items, total: data?.total, isLoading, error, mutate };
}
