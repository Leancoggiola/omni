import useSWR from 'swr';

import { SWR_KEYS } from '@/shared/api';

import type { GymPlanDetail } from '@omni/shared/gym';

/** Detalle de un plan (días de lunes a domingo con sus ejercicios en orden). Sin `planId` no pide nada. */
export function useGymPlan(planId: string | null | undefined) {
  const key = planId ? SWR_KEYS.gym.plan(planId) : null;
  const { data, isLoading, error, mutate } = useSWR<GymPlanDetail>(key);

  return { plan: data, isLoading, error, mutate };
}
