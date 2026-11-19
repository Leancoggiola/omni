import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

import { api, API_KEYS } from '@/shared/api';

import { gymPlansPagesKey, isGymKey } from '../utils/gymKeys';

import type {
  AddGymExercisePayload,
  GymExercise,
  GymPlanDetail,
  GymWeekday,
  UpdateGymExercisePayload,
} from '@omni/shared/gym';

/**
 * Escrituras del gimnasio. Como en la alacena, ninguna escribe en la caché: cada una revalida las keys del gimnasio
 * (`isGymKey`), porque la variante de un ejercicio es compartida y una escritura puede cambiar otros planes, los
 * resúmenes y el catálogo. Todas tiran si la API responde error (409 de plan archivado, ejercicio repetido, orden
 * desactualizado…); el mensaje viene de la API. `deletePlan` no revalida el detalle del plan borrado (daría 404);
 * `reorderDay` recibe la lista completa del día en el orden nuevo (si no coincide con la de la API, 409); `updateWeight`
 * con `null` borra el peso, y el historial (`useGymWeightHistory`) lo revalida quien lo muestra. Las páginas de "Tus
 * planes" (`useGymPlansPaged`, `useSWRInfinite`) se guardan bajo otra key: cada escritura las descarta para que la
 * pantalla no muestre un instante un plan borrado o archivado, y se vuelven a pedir al montarla.
 */
export function useGymMutations() {
  const { mutate } = useSWRConfig();

  const revalidate = useCallback(
    (except?: string) =>
      Promise.all([
        mutate((key: unknown) => isGymKey(key) && key !== except).catch(() => undefined),
        mutate(gymPlansPagesKey('ACTIVE'), undefined, { revalidate: true }).catch(() => undefined),
        mutate(gymPlansPagesKey('ARCHIVED'), undefined, { revalidate: true }).catch(() => undefined),
      ]),
    [mutate]
  );

  const createPlan = useCallback(
    async (name: string) => {
      const plan = await api.post<GymPlanDetail>(API_KEYS.gym.plans, { name });
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const renamePlan = useCallback(
    async (planId: string, name: string) => {
      const plan = await api.patch<GymPlanDetail>(API_KEYS.gym.plan(planId), { name });
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const archivePlan = useCallback(
    async (planId: string) => {
      const plan = await api.post<GymPlanDetail>(API_KEYS.gym.planArchive(planId));
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const unarchivePlan = useCallback(
    async (planId: string) => {
      const plan = await api.post<GymPlanDetail>(API_KEYS.gym.planUnarchive(planId));
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      await api.delete(API_KEYS.gym.plan(planId));
      await revalidate(API_KEYS.gym.plan(planId));
    },
    [revalidate]
  );

  const addExercise = useCallback(
    async (payload: AddGymExercisePayload) => {
      const plan = await api.post<GymPlanDetail>(API_KEYS.gym.exercises, payload);
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const updateExercise = useCallback(
    async (exerciseId: string, payload: UpdateGymExercisePayload) => {
      const plan = await api.patch<GymPlanDetail>(API_KEYS.gym.exercise(exerciseId), payload);
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const changeDay = useCallback(
    async (dayId: string, weekday: GymWeekday) => {
      const plan = await api.patch<GymPlanDetail>(API_KEYS.gym.day(dayId), { weekday });
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const deleteDay = useCallback(
    async (dayId: string) => {
      await api.delete(API_KEYS.gym.day(dayId));
      await revalidate();
    },
    [revalidate]
  );

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      await api.delete(API_KEYS.gym.exercise(exerciseId));
      await revalidate();
    },
    [revalidate]
  );

  const reorderDay = useCallback(
    async (dayId: string, exerciseIds: string[]) => {
      const plan = await api.put<GymPlanDetail>(API_KEYS.gym.dayExercisesOrder(dayId), { exerciseIds });
      await revalidate();
      return plan;
    },
    [revalidate]
  );

  const updateWeight = useCallback(
    async (exerciseId: string, weightKg: number | null) => {
      const exercise = await api.patch<GymExercise>(API_KEYS.gym.exerciseWeight(exerciseId), { weightKg });
      await revalidate();
      return exercise;
    },
    [revalidate]
  );

  return {
    createPlan,
    renamePlan,
    archivePlan,
    unarchivePlan,
    deletePlan,
    addExercise,
    updateExercise,
    changeDay,
    deleteDay,
    removeExercise,
    reorderDay,
    updateWeight,
  };
}
