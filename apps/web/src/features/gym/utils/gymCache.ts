import type { GymExercise, GymPlanDetail } from '@omni/shared/gym';

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
