import { SWR_KEYS } from '@/shared/api';

import type { GymExercise, GymPlanDetail } from '@omni/shared/gym';

/**
 * Keys de SWR del gimnasio: el listado y el detalle de planes (`/plans…`) y el catálogo y los historiales
 * (`/exercises…`). Los días no tienen GET propio.
 */
export function isGymKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const { plans, exercises } = SWR_KEYS.gym;
  return key.startsWith(plans) || key.startsWith(exercises);
}

/**
 * El peso vive en la variante del catálogo: se aplica a todas las filas del plan con el mismo `catalogId` (la misma
 * variante puede estar en más de un día).
 */
export function withExerciseWeight(plan: GymPlanDetail, updated: GymExercise): GymPlanDetail {
  return {
    ...plan,
    days: plan.days.map(day => ({
      ...day,
      exercises: day.exercises.map(exercise =>
        exercise.catalogId === updated.catalogId ? { ...exercise, currentWeightKg: updated.currentWeightKg } : exercise
      ),
    })),
  };
}
