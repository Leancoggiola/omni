import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type { CreateGymPlanPayload, GymPlanDetail, UpdateGymPlanPayload } from '@omni/shared/gym';

import { isGymKey } from '@omni/shared/gym';

/**
 * Alta, renombre, archivo y baja de planes. Las que devuelven el plan lo guardan en su key (sin otro GET) y
 * revalidan el resto de las keys del gimnasio (el listado cambia de nombre, estado o contadores). `deletePlan` no
 * revalida el detalle del plan borrado (daría 404) y sí el resto (el catálogo pierde las variantes huérfanas).
 */
export function useGymPlanMutations() {
  const { mutate } = useSWRConfig();

  const storePlan = useCallback(
    async (plan: GymPlanDetail) => {
      const planKey = SWR_KEYS.gym.plan(plan.id);
      await mutate(planKey, plan, { revalidate: false });
      await mutate((key: unknown) => isGymKey(key) && key !== planKey).catch(() => undefined);
      return plan;
    },
    [mutate]
  );

  const createPlan = useCallback(
    async (payload: CreateGymPlanPayload) => storePlan(await api.post<GymPlanDetail>(SWR_KEYS.gym.plans, payload)),
    [storePlan]
  );

  const renamePlan = useCallback(
    async (planId: string, payload: UpdateGymPlanPayload) =>
      storePlan(await api.patch<GymPlanDetail>(SWR_KEYS.gym.plan(planId), payload)),
    [storePlan]
  );

  const archivePlan = useCallback(
    async (planId: string) => storePlan(await api.post<GymPlanDetail>(SWR_KEYS.gym.planArchive(planId))),
    [storePlan]
  );

  const unarchivePlan = useCallback(
    async (planId: string) => storePlan(await api.post<GymPlanDetail>(SWR_KEYS.gym.planUnarchive(planId))),
    [storePlan]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      await api.delete(SWR_KEYS.gym.plan(planId));
      const planKey = SWR_KEYS.gym.plan(planId);
      await mutate((key: unknown) => isGymKey(key) && key !== planKey).catch(() => undefined);
    },
    [mutate]
  );

  return { createPlan, renamePlan, archivePlan, unarchivePlan, deletePlan };
}
