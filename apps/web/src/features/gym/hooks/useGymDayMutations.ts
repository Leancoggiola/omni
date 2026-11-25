import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import type { GymPlanDetail, GymWeekday } from '@omni/shared/gym';

import { isGymKey } from '@omni/shared/gym';

/**
 * Escrituras sobre los días de un plan: pasar el día entero a otro día de la semana y borrarlo con sus ejercicios.
 * Los errores se propagan tal cual para que la UI los muestre.
 *
 * `changeDay` mueve todos los ejercicios juntos y la API responde 409 si el plan ya tiene el día elegido;
 * `deleteDay` borra el día y las variantes que ya no usa ningún plan, y revalida el plan, el catálogo y los
 * historiales.
 */
export function useGymDayMutations(planId: string) {
  const { mutate } = useSWRConfig();
  const planKey = SWR_KEYS.gym.plan(planId);

  const changeDay = useCallback(
    async (dayId: string, weekday: GymWeekday) => {
      const plan = await api.patch<GymPlanDetail>(SWR_KEYS.gym.day(dayId), { weekday });
      await mutate(planKey, plan, { revalidate: false });
      await mutate((key: unknown) => isGymKey(key) && key !== planKey).catch(() => undefined);
      return plan;
    },
    [mutate, planKey]
  );

  const deleteDay = useCallback(
    async (dayId: string) => {
      await api.delete(SWR_KEYS.gym.day(dayId));
      await mutate(isGymKey).catch(() => undefined);
    },
    [mutate]
  );

  return { changeDay, deleteDay };
}
