import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, SWR_KEYS } from '@/shared/api';

import { isGymKey, withExerciseWeight } from '../utils/gymCache';

import type {
  AddGymExercisePayload,
  GymExercise,
  GymPlanDetail,
  GymWeekday,
  UpdateGymExercisePayload,
} from '@omni/shared/gym';

/**
 * Escrituras sobre los ejercicios de un plan. El detalle del plan se actualiza con lo que devuelve la API y después
 * se revalida el resto del gimnasio: el peso y las variantes son compartidos con otros planes, y también el catálogo
 * y los historiales. Los errores se propagan tal cual para que la UI los muestre.
 *
 * `updateExercise` manda nombre, series y repeticiones de la variante (se ve en todos los planes que la usan);
 * `moveExercise` manda solo el día (la fila va al final del elegido y el de origen se borra si queda vacío);
 * `updateWeight` con `null` quita el peso (la API no registra nada en el historial); `deleteExercise` vuelve a
 * pedir el plan entero, porque si era el último del día la API borra el día; `reorderDay` guarda el orden del día
 * completo y la lista tiene que nombrar exactamente a los ejercicios actuales.
 */
export function useGymExerciseMutations(planId: string) {
  const { mutate } = useSWRConfig();
  const planKey = SWR_KEYS.gym.plan(planId);

  const revalidateOthers = useCallback(
    () => mutate((key: unknown) => isGymKey(key) && key !== planKey).catch(() => undefined),
    [mutate, planKey]
  );

  const storePlan = useCallback(
    async (plan: GymPlanDetail) => {
      await mutate(planKey, plan, { revalidate: false });
      await revalidateOthers();
      return plan;
    },
    [mutate, planKey, revalidateOthers]
  );

  const addExercise = useCallback(
    async (payload: AddGymExercisePayload) => storePlan(await api.post<GymPlanDetail>(SWR_KEYS.gym.exercises, payload)),
    [storePlan]
  );

  const updateExercise = useCallback(
    async (exerciseId: string, payload: UpdateGymExercisePayload) =>
      storePlan(await api.patch<GymPlanDetail>(SWR_KEYS.gym.exercise(exerciseId), payload)),
    [storePlan]
  );

  const moveExercise = useCallback(
    async (exerciseId: string, weekday: GymWeekday) =>
      storePlan(await api.patch<GymPlanDetail>(SWR_KEYS.gym.exercise(exerciseId), { weekday })),
    [storePlan]
  );

  const updateWeight = useCallback(
    async (exerciseId: string, weightKg: number | null) => {
      const exercise = await api.patch<GymExercise>(SWR_KEYS.gym.exerciseWeight(exerciseId), { weightKg });
      await mutate<GymPlanDetail>(planKey, current => (current ? withExerciseWeight(current, exercise) : current), {
        revalidate: false,
      });
      await revalidateOthers();
      return exercise;
    },
    [mutate, planKey, revalidateOthers]
  );

  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      await api.delete(SWR_KEYS.gym.exercise(exerciseId));
      await mutate(isGymKey).catch(() => undefined);
    },
    [mutate]
  );

  const reorderDay = useCallback(
    async (dayId: string, exerciseIds: string[]) =>
      storePlan(await api.put<GymPlanDetail>(SWR_KEYS.gym.dayExercisesOrder(dayId), { exerciseIds })),
    [storePlan]
  );

  return { addExercise, updateExercise, moveExercise, updateWeight, deleteExercise, reorderDay };
}
