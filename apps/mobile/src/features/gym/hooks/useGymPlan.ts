import useSWR from 'swr';

import { API_KEYS } from '@/shared/api';

import type { GymPlanDetail } from '@omni/shared/gym';

/** Plan con sus días (lunes a domingo, solo los que tienen ejercicios) y ejercicios. Sin `planId` no pide nada. */
export function useGymPlan(planId: string | null) {
  const { data, isLoading, error, mutate } = useSWR<GymPlanDetail>(planId ? API_KEYS.gym.plan(planId) : null);

  return { plan: data, isLoading, error, mutate };
}
