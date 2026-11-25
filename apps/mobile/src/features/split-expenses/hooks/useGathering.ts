import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { GatheringDetail } from '@omni/shared/split-expenses';

/** Detalle de una juntada: participantes, gastos, transferencias y si está saldada. */
export function useGathering(gatheringId: string | undefined) {
  const key = gatheringId ? API_KEYS.splitExpenses.gathering(gatheringId) : null;
  const { data, error, isLoading, mutate } = useSWR<GatheringDetail>(key);
  return { gathering: data, isLoading, error, mutate };
}
