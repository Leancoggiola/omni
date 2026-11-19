import { useCallback } from 'react';
import useSWRImmutable from 'swr/immutable';

import { useAuth } from '@/core/auth';
import { readLastGymPlan, saveLastGymPlan } from '@/shared/api';

const LAST_PLAN_KEY = 'gym:last-plan';

/**
 * Último plan elegido en este dispositivo (por persona). Vive en la caché de SWR, con una key que no es de la API,
 * para que la pantalla del plan se entere cuando "Tus planes" elige otro. `lastPlanId` es `undefined` mientras se lee
 * y `null` si no hay. `setLastPlan(null)` lo olvida (se borró el plan).
 */
export function useLastGymPlan() {
  const { user } = useAuth();
  const username = user?.username ?? null;
  const { data, mutate } = useSWRImmutable(username ? [LAST_PLAN_KEY, username] : null, ([, name]: [string, string]) =>
    readLastGymPlan(name)
  );

  const setLastPlan = useCallback(
    async (planId: string | null) => {
      if (!username) return;
      await mutate(planId, { revalidate: false });
      await saveLastGymPlan(username, planId);
    },
    [mutate, username]
  );

  return { lastPlanId: username ? data : null, setLastPlan };
}
