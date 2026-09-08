import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { GatheringDetail } from '@omni/shared/split-expenses';

export function useGathering(gatheringId: string | null | undefined) {
  const key = gatheringId ? SWR_KEYS.splitExpenses.gathering(gatheringId) : null;
  const { data, error, isLoading } = useSWR<GatheringDetail>(key);
  return { gathering: data ?? null, isLoading, error };
}
